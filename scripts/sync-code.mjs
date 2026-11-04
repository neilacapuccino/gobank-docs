#!/usr/bin/env node
// Keeps every code excerpt in these docs identical to the GoBank Express source.
//
// In any Markdown file, a marker like
//
//   <!-- code: gobank/src/server/ledger.ts 80-115 -->
//
// is followed by the exact source lines 80 to 115, with line numbers, up to a
// closing <!-- /code --> marker. Leave out the range to include a whole file.
//
//   node scripts/sync-code.mjs              rewrite every excerpt from the source
//   node scripts/sync-code.mjs --check      fail if any excerpt differs from the source
//   node scripts/sync-code.mjs --coverage   list source files no document mentions
//
// The source checkout defaults to ../gobank-express next to this repository.
// Point it elsewhere with --source <path> or the GOBANK_SOURCE variable.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PIN_FILE = join(DOCS_ROOT, ".docs-source.json");

const OPEN = /^<!-- code: (\S+?)(?: (\d+)-(\d+))? -->$/;
const CLOSE = "<!-- /code -->";

const LANGUAGES = {
	".ts": "ts",
	".tsx": "tsx",
	".mjs": "js",
	".js": "js",
	".sql": "sql",
	".prisma": "prisma",
	".json": "json",
	".css": "css",
	".yml": "yaml",
	".yaml": "yaml",
	".toml": "toml",
	".md": "md",
};

const SPECIAL_LANGUAGES = {
	"pre-push": "sh",
	".env.example": "bash",
};

function parseArguments(argv) {
	const options = {
		check: false,
		coverage: false,
		source: process.env.GOBANK_SOURCE ?? resolve(DOCS_ROOT, "..", "gobank-express"),
	};

	for (let index = 0; index < argv.length; index++) {
		const argument = argv[index];
		if (argument === "--check") options.check = true;
		else if (argument === "--coverage") options.coverage = true;
		else if (argument === "--source") options.source = resolve(argv[++index] ?? "");
		else throw new Error(`Unknown option: ${argument}`);
	}

	return options;
}

function markdownFiles(directory) {
	const found = [];

	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.name === ".git" || entry.name === "node_modules") continue;

		const path = join(directory, entry.name);
		if (entry.isDirectory()) found.push(...markdownFiles(path));
		else if (entry.name.endsWith(".md")) found.push(path);
	}

	return found.sort();
}

function languageFor(path) {
	const name = basename(path);
	return SPECIAL_LANGUAGES[name] ?? LANGUAGES[extname(name)] ?? "text";
}

function sourceCommit(source) {
	try {
		return execFileSync("git", ["-C", source, "rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim();
	} catch {
		return null;
	}
}

function excerpt(source, path, start, end) {
	const file = join(source, path);
	if (!existsSync(file)) throw new Error(`Source file not found: ${path}`);

	const lines = readFileSync(file, "utf8").replace(/\n$/, "").split("\n");
	const first = start ?? 1;
	const last = end ?? lines.length;

	if (first < 1 || last > lines.length || first > last) {
		throw new Error(
			`${path} has ${lines.length} lines; range ${first}-${last} is outside it`,
		);
	}

	const width = String(last).length;
	const body = lines.slice(first - 1, last).map((line, offset) => {
		const number = String(first + offset).padStart(width, " ");
		const code = line.replaceAll("\t", "  ");
		return `${number} │ ${code}`.trimEnd();
	});

	if (body.some((line) => line.includes("```"))) {
		throw new Error(`${path} ${first}-${last} contains a code fence`);
	}

	const range =
		start === undefined
			? `all ${lines.length} lines`
			: first === last
				? `line ${first}`
				: `lines ${first}–${last}`;

	return [
		`**\`${path}\`** · ${range}`,
		"",
		"```" + languageFor(path),
		...body,
		"```",
	];
}

function closingIndex(lines, from) {
	for (let index = from; index < lines.length; index++) {
		if (lines[index] === CLOSE) return index;
		if (OPEN.test(lines[index])) return -1;
	}

	return -1;
}

function render(markdown, source) {
	const lines = markdown.split("\n");
	const output = [];
	const markers = [];
	let insideFence = false;

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		if (line.trimStart().startsWith("```")) insideFence = !insideFence;

		const match = insideFence ? null : OPEN.exec(line);

		if (!match) {
			output.push(line);
			continue;
		}

		const [, path, start, end] = match;
		const range = start === undefined ? undefined : [Number(start), Number(end)];
		markers.push(line);

		output.push(line, ...excerpt(source, path, range?.[0], range?.[1]), CLOSE);

		const close = closingIndex(lines, index + 1);
		if (close !== -1) index = close;
	}

	return { text: output.join("\n"), markers };
}

function trackedSourceFiles(source) {
	return execFileSync("git", ["-C", source, "ls-files"], { encoding: "utf8" })
		.split("\n")
		.filter(Boolean)
		.filter((path) => !path.endsWith("package-lock.json"))
		.filter((path) => !path.endsWith(".ico"));
}

function reportCoverage(source, documents) {
	const allText = documents.map((file) => readFileSync(file, "utf8")).join("\n");
	const missing = trackedSourceFiles(source).filter(
		(path) => !allText.includes(path),
	);

	if (missing.length === 0) {
		console.log("Every tracked source file is mentioned in the docs.");
		return true;
	}

	console.log(`${missing.length} source file(s) are not mentioned anywhere:`);
	for (const path of missing) console.log(`  ${path}`);
	return false;
}

function main() {
	const options = parseArguments(process.argv.slice(2));

	if (!existsSync(join(options.source, "gobank", "package.json"))) {
		throw new Error(
			`No GoBank Express checkout at ${options.source}. Use --source <path>.`,
		);
	}

	const documents = markdownFiles(DOCS_ROOT);

	if (options.coverage) {
		process.exitCode = reportCoverage(options.source, documents) ? 0 : 1;
		return;
	}

	const commit = sourceCommit(options.source);
	const pinned = existsSync(PIN_FILE)
		? JSON.parse(readFileSync(PIN_FILE, "utf8")).commit
		: null;

	let changedFiles = 0;
	let excerptCount = 0;

	for (const file of documents) {
		const before = readFileSync(file, "utf8");
		const { text, markers } = render(before, options.source);
		excerptCount += markers.length;

		if (text === before) continue;
		changedFiles++;

		if (options.check) {
			console.log(`Out of date: ${relative(DOCS_ROOT, file)}`);
		} else {
			writeFileSync(file, text);
			console.log(`Updated: ${relative(DOCS_ROOT, file)}`);
		}
	}

	if (options.check) {
		if (pinned && commit && pinned !== commit) {
			console.log(
				`Note: docs describe commit ${pinned.slice(0, 7)}, source is at ${commit.slice(0, 7)}.`,
			);
		}

		if (changedFiles > 0) {
			console.log(`${changedFiles} file(s) differ from the source.`);
			process.exitCode = 1;
			return;
		}

		console.log(
			`All ${excerptCount} code excerpts in ${documents.length} documents match the source.`,
		);
		return;
	}

	if (commit) {
		writeFileSync(
			PIN_FILE,
			`${JSON.stringify({ repository: "neilacapuccino/gobank-express", commit }, null, 2)}\n`,
		);
	}

	console.log(
		`${excerptCount} excerpts checked, ${changedFiles} file(s) updated from ${commit?.slice(0, 7) ?? "the source"}.`,
	);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 2;
}
