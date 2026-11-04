#!/usr/bin/env node
// Checks every relative link in these docs: the target file must exist and,
// if the link has a #fragment, the target must contain a matching heading
// (anchors are computed the way GitHub does it).
//
//   node scripts/check-links.mjs

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

function withoutCodeBlocks(markdown) {
	const lines = [];
	let insideFence = false;
	for (const line of markdown.split("\n")) {
		if (line.trimStart().startsWith("```")) {
			insideFence = !insideFence;
			continue;
		}
		if (!insideFence) lines.push(line);
	}
	return lines;
}

function slug(heading) {
	const text = heading
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[*`]/g, "")
		.trim()
		.toLowerCase();
	return text.replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");
}

const anchorCache = new Map();

function anchorsOf(file) {
	if (anchorCache.has(file)) return anchorCache.get(file);

	const anchors = new Set();
	const seen = new Map();
	for (const line of withoutCodeBlocks(readFileSync(file, "utf8"))) {
		const match = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
		if (!match) continue;
		const base = slug(match[2]);
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		anchors.add(count === 0 ? base : `${base}-${count}`);
	}

	anchorCache.set(file, anchors);
	return anchors;
}

function stripInlineCode(line) {
	return line.replace(/`+[^`]*`+/g, "");
}

let checked = 0;
const problems = [];

for (const file of markdownFiles(DOCS_ROOT)) {
	const lines = withoutCodeBlocks(readFileSync(file, "utf8"));

	for (const line of lines) {
		for (const match of stripInlineCode(line).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
			const target = match[1];
			if (/^(https?:|mailto:)/.test(target)) continue;
			checked++;

			const [pathPart, fragment] = target.split("#");
			const targetFile = pathPart ? resolve(dirname(file), pathPart) : file;
			const where = relative(DOCS_ROOT, file);

			if (!existsSync(targetFile)) {
				problems.push(`${where}: missing file ${target}`);
				continue;
			}

			if (fragment && targetFile.endsWith(".md") && !anchorsOf(targetFile).has(fragment)) {
				problems.push(`${where}: missing anchor ${target}`);
			}
		}
	}
}

if (problems.length > 0) {
	console.log(problems.join("\n"));
	console.log(`${problems.length} broken link(s) out of ${checked}.`);
	process.exitCode = 1;
} else {
	console.log(`All ${checked} internal links and anchors resolve.`);
}
