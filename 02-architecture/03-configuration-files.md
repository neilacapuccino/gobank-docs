# Configuration files

**What you will learn:** what every configuration file in the project does, line by line: npm scripts and dependencies, environment variables, Next.js, ESLint, Prettier, PostCSS, Prisma and Playwright settings, git settings and the CI pipeline. Panels like to ask "what is this file for?" about these.

---

## 1. `gobank/package.json`: dependencies and scripts

<!-- code: gobank/package.json -->
**`gobank/package.json`** · all 77 lines

```json
 1 │ {
 2 │   "name": "gobank",
 3 │   "version": "0.1.0",
 4 │   "private": true,
 5 │   "type": "module",
 6 │   "scripts": {
 7 │     "build": "next build",
 8 │     "db:generate": "prisma migrate dev",
 9 │     "db:client": "prisma generate",
10 │     "db:migrate": "prisma migrate deploy",
11 │     "db:reset": "prisma migrate reset",
12 │     "db:seed": "prisma db seed",
13 │     "db:studio": "prisma studio",
14 │     "card:setup-key": "node --import tsx scripts/setup-card-key.ts",
15 │     "dev": "next dev --turbo -p 3001",
16 │     "format:check": "prettier --check \"**/*.{ts,tsx,mdx,json}\" --cache",
17 │     "format:write": "prettier --write \"**/*.{ts,tsx,mdx,json}\" --cache",
18 │     "lint": "eslint . --max-warnings 0",
19 │     "lint:fix": "eslint . --fix",
20 │     "postinstall": "prisma generate",
21 │     "preview": "next build && next start",
22 │     "start": "next start -p 3001",
23 │     "typecheck": "tsc --noEmit --incremental false",
24 │     "check:ci": "npm run format:check && npm run lint && npm run typecheck && npm test && npm run build",
25 │     "test": "npm run test:bitcoin && npm run test:profile && npm run test:savings && npm run test:auth && npm run test:card && npm run test:amount-input && npm run test:rewards",
26 │     "test:auth": "node --import tsx --test src/features/auth/auth.test.ts src/features/auth/google/signed-token.test.ts",
27 │     "test:integration": "node --conditions=react-server --import tsx scripts/verify-core.ts",
28 │     "test:card": "node --conditions=react-server --import tsx --test src/features/card/card-cvv.test.ts",
29 │     "test:amount-input": "node --import tsx --test src/shared/lib/amount-input.test.ts",
30 │     "test:savings": "node --import tsx --test src/shared/lib/savings-interest.test.ts src/features/goals/goals.rules.test.ts",
31 │     "test:rewards": "node --import tsx --test src/features/rewards/rewards.rules.test.ts",
32 │     "test:bitcoin": "node --import tsx --test src/features/bitcoin/bitcoin.test.ts src/features/bitcoin/bitcoin-trade-input.test.ts src/features/bitcoin/bitcoin-chart-geometry.test.ts",
33 │     "test:bitcoin:integration": "node --conditions=react-server --import tsx scripts/verify-bitcoin.ts",
34 │     "test:profile": "node --conditions=react-server --import tsx --test src/features/account/profile-photo.test.ts",
35 │     "test:e2e": "playwright test"
36 │   },
37 │   "dependencies": {
38 │     "@prisma/client": "^6.6.0",
39 │     "@t3-oss/env-nextjs": "^0.12.0",
40 │     "@tanstack/react-query": "^5.69.0",
41 │     "@trpc/client": "^11.0.0",
42 │     "@trpc/react-query": "^11.0.0",
43 │     "@trpc/server": "^11.0.0",
44 │     "lucide-react": "^1.34.0",
45 │     "next": "^15.2.3",
46 │     "react": "^19.0.0",
47 │     "react-dom": "^19.0.0",
48 │     "server-only": "^0.0.1",
49 │     "sharp": "0.34.5",
50 │     "superjson": "^2.2.1",
51 │     "zod": "^3.24.2"
52 │   },
53 │   "devDependencies": {
54 │     "@eslint/eslintrc": "^3.3.1",
55 │     "@playwright/test": "1.64.1",
56 │     "@tailwindcss/postcss": "^4.0.15",
57 │     "@types/node": "^20.14.10",
58 │     "@types/react": "^19.0.0",
59 │     "@types/react-dom": "^19.0.0",
60 │     "dotenv": "^18.0.3",
61 │     "eslint": "^9.23.0",
62 │     "eslint-config-next": "^15.2.3",
63 │     "jiti": "^2.7.0",
64 │     "postcss": "^8.5.3",
65 │     "prettier": "^3.5.3",
66 │     "prettier-plugin-tailwindcss": "^0.6.11",
67 │     "prisma": "^6.6.0",
68 │     "tailwindcss": "^4.0.15",
69 │     "tsx": "^4.23.15",
70 │     "typescript": "^5.8.2",
71 │     "typescript-eslint": "^8.27.0"
72 │   },
73 │   "ct3aMetadata": {
74 │     "initVersion": "7.40.0"
75 │   },
76 │   "packageManager": "npm@10.9.2"
77 │ }
```
<!-- /code -->

### Scripts (lines 6–36)

| Script | Command | When you use it |
| --- | --- | --- |
| `dev` | `next dev --turbo -p 3001` | Run the app locally on port 3001 with the fast Turbopack bundler |
| `build` / `start` / `preview` | `next build`, `next start -p 3001` | Production build and server |
| `db:migrate` | `prisma migrate deploy` | Apply new migrations (safe to repeat) |
| `db:generate` | `prisma migrate dev` | *Create* a new migration from schema changes (development only) |
| `db:client` | `prisma generate` | Regenerate the Prisma client |
| `db:reset` | `prisma migrate reset` | Wipe the database and re-apply everything (destructive) |
| `db:seed` | `prisma db seed` | Add billers and the demo users ([Seed data](../03-database/03-seed-data.md)) |
| `db:studio` | `prisma studio` | Browse the database in a web UI |
| `card:setup-key` | runs `scripts/setup-card-key.ts` | Create `CARD_ENCRYPTION_KEY` in `.env` ([Cards](../05-features/04-cards.md)) |
| `postinstall` | `prisma generate` | Runs automatically after `npm install` so the client always exists |
| `format:check` / `format:write` | Prettier | Check / fix formatting |
| `lint` / `lint:fix` | `eslint . --max-warnings 0` | Fail on **any** lint warning |
| `typecheck` | `tsc --noEmit --incremental false` | Type-check everything without producing files |
| `test` | runs the seven `test:*` groups | All 63 unit tests ([Testing](../07-testing/01-testing.md)) |
| `test:integration` | `scripts/verify-core.ts` | Full banking flow against a real database |
| `test:bitcoin:integration` | `scripts/verify-bitcoin.ts` | Live Bitcoin quote + trades against a real database |
| `test:e2e` | `playwright test` | Browser tests |
| `check:ci` | format → lint → typecheck → test → build | Everything CI runs, in one command |

### Dependencies (lines 37–52)

| Package | Why it is needed |
| --- | --- |
| `next`, `react`, `react-dom` | The framework and UI library |
| `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query` | Typed API and the browser data cache |
| `zod` | Input validation |
| `superjson` | Dates and BigInts over JSON |
| `@prisma/client` | Database client runtime |
| `@t3-oss/env-nextjs` | Validates environment variables at startup |
| `server-only` | Build error if server code is imported in the browser |
| `sharp` (pinned to `0.34.5`) | Image processing for profile photos |
| `lucide-react` | Icons |

`devDependencies` (lines 53–72) are only needed to build and test: TypeScript, ESLint and its plugins, Prettier with the Tailwind class-sorting plugin, Tailwind and PostCSS, the Prisma CLI, `tsx`, `dotenv`, `jiti` (lets ESLint load `eslint.config.ts`), Playwright, and type packages.

> `"private": true` stops accidental publishing to npm. `"type": "module"` makes every file an ES module. `ct3aMetadata` shows the project started from the **create-t3-app** template (T3 stack: Next.js + tRPC + Prisma + Tailwind). `packageManager` pins npm 10.9.2.

---

## 2. Environment variables

### `gobank/.env.example`: the template you copy to `.env`

<!-- code: gobank/.env.example -->
**`gobank/.env.example`** · all 5 lines

```bash
1 │ DATABASE_URL="postgresql://USER:PASSWORD@ep-example-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
2 │ DIRECT_URL="postgresql://USER:PASSWORD@ep-example-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
3 │ AUTH_SECRET=""
4 │ GOOGLE_CLIENT_ID=""
5 │ GOOGLE_CLIENT_SECRET=""
```
<!-- /code -->

`.env` is git-ignored, so real secrets never reach GitHub. `CARD_ENCRYPTION_KEY` is not in the template on purpose: `npm run card:setup-key` generates it.

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | the app (Prisma) | Neon **pooled** connection string |
| `DIRECT_URL` | migrations (Prisma) | Neon **direct** connection string |
| `CARD_ENCRYPTION_KEY` | CVV encryption | 64 hex characters; everyone sharing a database must use the same key, or existing CVVs cannot be decrypted |
| `AUTH_SECRET` | Google sign-in (HMAC signing) | at least 32 characters |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in | optional; empty hides the Google button |

### `gobank/src/env.ts`: refuse to start with bad settings

<!-- code: gobank/src/env.ts -->
**`gobank/src/env.ts`** · all 31 lines

```ts
 1 │ import { createEnv } from "@t3-oss/env-nextjs";
 2 │ import { z } from "zod";
 3 │
 4 │ export const env = createEnv({
 5 │   server: {
 6 │     DATABASE_URL: z.string().url(),
 7 │     CARD_ENCRYPTION_KEY: z
 8 │       .string()
 9 │       .regex(/^[a-f0-9]{64}$/i)
10 │       .optional(),
11 │     NODE_ENV: z
12 │       .enum(["development", "test", "production"])
13 │       .default("development"),
14 │     GOOGLE_CLIENT_ID: z.string().min(1).optional(),
15 │     GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
16 │     AUTH_SECRET: z.string().min(32).optional(),
17 │   },
18 │
19 │   client: {},
20 │
21 │   runtimeEnv: {
22 │     DATABASE_URL: process.env.DATABASE_URL,
23 │     CARD_ENCRYPTION_KEY: process.env.CARD_ENCRYPTION_KEY,
24 │     NODE_ENV: process.env.NODE_ENV,
25 │     GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
26 │     GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
27 │     AUTH_SECRET: process.env.AUTH_SECRET,
28 │   },
29 │   skipValidation: !!process.env.SKIP_ENV_VALIDATION,
30 │   emptyStringAsUndefined: true,
31 │ });
```
<!-- /code -->

- `createEnv` validates the variables with Zod when the app starts, so a typo fails immediately with a clear error instead of breaking a payment later.
- Line 9: the card key must be exactly 64 hex characters (32 bytes for AES-256).
- Line 16: `AUTH_SECRET` must be at least 32 characters.
- Lines 14–15: Google variables are optional.
- Line 29: `SKIP_ENV_VALIDATION` lets CI build without real secrets.
- Line 30: an empty value (`AUTH_SECRET=""`) counts as *missing*, which is why the template can list empty Google values safely.
- `DIRECT_URL` is not listed because only the Prisma CLI reads it, not the app.

---

## 3. Next.js, PostCSS and Prisma settings

<!-- code: gobank/next.config.ts -->
**`gobank/next.config.ts`** · all 8 lines

```ts
1 │ import type { NextConfig } from "next";
2 │ import "./src/env";
3 │
4 │ const config: NextConfig = {
5 │   distDir: process.env.NEXT_DIST_DIR ?? ".next",
6 │ };
7 │
8 │ export default config;
```
<!-- /code -->

- Line 2 imports `env.ts`, so **`next build` itself fails** if environment variables are invalid.
- Line 5: the build folder can be changed with `NEXT_DIST_DIR`. The pre-push hook builds into `.next-build` so it does not break a running `npm run dev` (which uses `.next`).

<!-- code: gobank/postcss.config.json -->
**`gobank/postcss.config.json`** · all 5 lines

```json
1 │ {
2 │   "plugins": {
3 │     "@tailwindcss/postcss": {}
4 │   }
5 │ }
```
<!-- /code -->

Tailwind CSS 4 runs as a PostCSS plugin; that is all the configuration it needs (the theme lives in `globals.css`).

<!-- code: gobank/prisma.config.ts -->
**`gobank/prisma.config.ts`** · all 10 lines

```ts
 1 │ import { config } from "dotenv";
 2 │ import { defineConfig } from "prisma/config";
 3 │
 4 │ config({ quiet: true });
 5 │
 6 │ export default defineConfig({
 7 │   migrations: {
 8 │     seed: "node --conditions=react-server --import tsx prisma/seed.ts",
 9 │   },
10 │ });
```
<!-- /code -->

When a `prisma.config.ts` exists, the Prisma CLI no longer loads `.env` by itself, so line 4 loads it with `dotenv`. Line 8 defines how `prisma db seed` runs the seed: with `tsx`, and with `--conditions=react-server` because the seed imports server-only code (card encryption).

<!-- code: gobank/prisma/migrations/migration_lock.toml -->
**`gobank/prisma/migrations/migration_lock.toml`** · all 1 lines

```toml
1 │ provider = "postgresql"
```
<!-- /code -->

Records that the migrations were written for PostgreSQL; Prisma refuses to apply them to another database type.

---

## 4. Code-quality settings

### ESLint: `gobank/eslint.config.ts`

<!-- code: gobank/eslint.config.ts -->
**`gobank/eslint.config.ts`** · all 55 lines

```ts
 1 │ import { FlatCompat } from "@eslint/eslintrc";
 2 │ import tseslint from "typescript-eslint";
 3 │
 4 │ const compat = new FlatCompat({
 5 │   baseDirectory: import.meta.dirname,
 6 │ });
 7 │
 8 │ export default tseslint.config(
 9 │   {
10 │     ignores: [
11 │       ".next/**",
12 │       ".next-*/**",
13 │       "generated/**",
14 │       "playwright-report/**",
15 │       "test-results/**",
16 │       "next-env.d.ts",
17 │     ],
18 │   },
19 │   ...compat.extends("next/core-web-vitals"),
20 │   {
21 │     files: ["**/*.ts", "**/*.tsx"],
22 │     extends: [
23 │       ...tseslint.configs.recommended,
24 │       ...tseslint.configs.recommendedTypeChecked,
25 │       ...tseslint.configs.stylisticTypeChecked,
26 │     ],
27 │     rules: {
28 │       "@typescript-eslint/array-type": "off",
29 │       "@typescript-eslint/consistent-type-definitions": "off",
30 │       "@typescript-eslint/consistent-type-imports": [
31 │         "warn",
32 │         { prefer: "type-imports", fixStyle: "inline-type-imports" },
33 │       ],
34 │       "@typescript-eslint/no-unused-vars": [
35 │         "warn",
36 │         { argsIgnorePattern: "^_" },
37 │       ],
38 │       "@typescript-eslint/require-await": "off",
39 │       "@typescript-eslint/no-misused-promises": [
40 │         "error",
41 │         { checksVoidReturn: { attributes: false } },
42 │       ],
43 │     },
44 │   },
45 │   {
46 │     linterOptions: {
47 │       reportUnusedDisableDirectives: true,
48 │     },
49 │     languageOptions: {
50 │       parserOptions: {
51 │         projectService: true,
52 │       },
53 │     },
54 │   },
55 │ );
```
<!-- /code -->

| Lines | Setting | Effect |
| --- | --- | --- |
| 10–17 | `ignores` | Do not lint build output, the generated Prisma client or test reports |
| 19 | `next/core-web-vitals` | Next.js and React best-practice rules (for example, the rules of hooks) |
| 22–26 | typescript-eslint recommended + **type-checked** + stylistic | Rules that use type information, for example catching a forgotten `await` |
| 30–33 | `consistent-type-imports` | Type-only imports must use `type` |
| 34–37 | `no-unused-vars` except names starting with `_` | e.g. `onSettled: (_data, _error, …)` in `query-client.ts` |
| 38 | `require-await: off` | Allow `async` functions without `await` |
| 39–42 | `no-misused-promises` with `attributes: false` | Allow `onClick={async () => …}` in JSX, still catch other misuse |
| 46–48 | `reportUnusedDisableDirectives` | Flag pointless `eslint-disable` comments |
| 50–52 | `projectService: true` | Let rules read the TypeScript project |

### Prettier: `gobank/.prettierrc.json` and `.prettierignore`

<!-- code: gobank/.prettierrc.json -->
**`gobank/.prettierrc.json`** · all 9 lines

```json
1 │ {
2 │   "plugins": ["prettier-plugin-tailwindcss"],
3 │   "overrides": [
4 │     {
5 │       "files": ["*.ts", "*.tsx"],
6 │       "options": { "useTabs": true, "tabWidth": 2 }
7 │     }
8 │   ]
9 │ }
```
<!-- /code -->

TypeScript files are indented with **tabs** (shown as 2 spaces in these docs). The Tailwind plugin sorts class names in a standard order, so diffs stay clean.

<!-- code: gobank/.prettierignore -->
**`gobank/.prettierignore`** · all 4 lines

```text
1 │ generated/
2 │ .next/
3 │ node_modules/
4 │ package-lock.json
```
<!-- /code -->

### `gobank/.gitignore`

<!-- code: gobank/.gitignore -->
**`gobank/.gitignore`** · all 36 lines

```text
 1 │ /node_modules
 2 │ /.pnp
 3 │ .pnp.js
 4 │
 5 │ /coverage
 6 │ /test-results
 7 │ /playwright-report
 8 │
 9 │ /generated
10 │ /prisma/db.sqlite
11 │ /prisma/db.sqlite-journal
12 │ db.sqlite
13 │
14 │ /.next/
15 │ /.next-*/
16 │ /out/
17 │ next-env.d.ts
18 │
19 │ /build
20 │
21 │ .DS_Store
22 │ *.pem
23 │
24 │ npm-debug.log*
25 │ yarn-debug.log*
26 │ yarn-error.log*
27 │ .pnpm-debug.log*
28 │
29 │ .env
30 │ .env*.local
31 │
32 │ .vercel
33 │
34 │ *.tsbuildinfo
35 │
36 │ .idea
```
<!-- /code -->

Key entries: `/node_modules`, `/generated` (Prisma client), `.next` and `.next-*` build folders, Playwright reports, and **`.env` / `.env*.local`** so secrets are never committed. `setup-card-key.ts` refuses to write a key unless `git check-ignore` confirms `.env` is ignored.

---

## 5. Test runner settings: `gobank/playwright.config.ts`

<!-- code: gobank/playwright.config.ts -->
**`gobank/playwright.config.ts`** · all 17 lines

```ts
 1 │ import { defineConfig, devices } from "@playwright/test";
 2 │
 3 │ export default defineConfig({
 4 │   testDir: "e2e",
 5 │   timeout: 90_000,
 6 │   use: {
 7 │     ...devices["Pixel 7"],
 8 │     baseURL: "http://localhost:3001",
 9 │     channel: "chrome",
10 │   },
11 │   webServer: {
12 │     command: "npm run dev",
13 │     url: "http://localhost:3001",
14 │     reuseExistingServer: true,
15 │     timeout: 120_000,
16 │   },
17 │ });
```
<!-- /code -->

Browser tests emulate a **Pixel 7** phone (line 7) in real Google Chrome (line 9), allow 90 seconds per test (line 5), and start `npm run dev` automatically, reusing it if it is already running (lines 11–16).

---

## 6. Git and GitHub settings

<!-- code: .gitattributes -->
**`.gitattributes`** · all 3 lines

```text
1 │ # Keep formatting identical on Windows and in CI.
2 │ * text=auto eol=lf
3 │ .githooks/* text eol=lf
```
<!-- /code -->

Every text file is stored with **LF** line endings, even on Windows. Without this, Windows checkouts get CRLF line endings and the Prettier format check in CI fails.

<!-- code: .githooks/pre-push -->
**`.githooks/pre-push`** · all 4 lines

```sh
1 │ #!/bin/sh
2 │ set -eu
3 │ cd "$(git rev-parse --show-toplevel)/gobank"
4 │ NEXT_DIST_DIR=.next-build npm run check:ci
```
<!-- /code -->

An optional hook that runs the whole `check:ci` before every `git push`. It is not active by default; enable it once per clone with:

```bash
git config core.hooksPath .githooks
```

<!-- code: .github/CODEOWNERS -->
**`.github/CODEOWNERS`** · all 1 lines

```text
1 │ *   @neilacapuccino
```
<!-- /code -->

GitHub automatically requests a review from `@neilacapuccino` on every pull request that touches any file.

### The CI pipeline: `.github/workflows/ci.yml`

<!-- code: .github/workflows/ci.yml -->
**`.github/workflows/ci.yml`** · all 58 lines

```yaml
 1 │ name: CI
 2 │
 3 │ on:
 4 │   push:
 5 │     branches: [main, staging, develop]
 6 │   pull_request:
 7 │     branches: [main, staging, develop]
 8 │
 9 │ concurrency:
10 │   group: ${{ github.workflow }}-${{ github.ref }}
11 │   cancel-in-progress: true
12 │
13 │ permissions:
14 │   contents: read
15 │
16 │ defaults:
17 │   run:
18 │     working-directory: gobank
19 │
20 │ jobs:
21 │   check:
22 │     name: Lint, typecheck & build
23 │     runs-on: ubuntu-latest
24 │     timeout-minutes: 15
25 │
26 │     env:
27 │       DATABASE_URL: postgresql://postgres:postgres@localhost:5432/gobank
28 │       DIRECT_URL: postgresql://postgres:postgres@localhost:5432/gobank
29 │       SKIP_ENV_VALIDATION: "1"
30 │
31 │     steps:
32 │       - name: Checkout
33 │         uses: actions/checkout@v5
34 │
35 │       - name: Set up Node
36 │         uses: actions/setup-node@v5
37 │         with:
38 │           node-version: 22
39 │           cache: npm
40 │           cache-dependency-path: gobank/package-lock.json
41 │
42 │       - name: Install dependencies
43 │         run: npm ci
44 │
45 │       - name: Format check
46 │         run: npm run format:check
47 │
48 │       - name: Lint
49 │         run: npm run lint
50 │
51 │       - name: Typecheck
52 │         run: npm run typecheck
53 │
54 │       - name: Unit tests
55 │         run: npm test
56 │
57 │       - name: Build
58 │         run: npm run build
```
<!-- /code -->

| Lines | What it does |
| --- | --- |
| 3–7 | Run on pushes and pull requests to `main`, `staging` and `develop` |
| 9–11 | If you push again, cancel the older run for the same branch |
| 13–14 | The workflow token can only **read** the repository (least privilege) |
| 16–18 | All commands run inside `gobank/` |
| 22–24 | One job on Ubuntu, killed after 15 minutes |
| 26–29 | Dummy database URLs and `SKIP_ENV_VALIDATION` so the build does not need real secrets |
| 32–40 | Check out the code; install Node 22 with the npm cache keyed on the lockfile |
| 42–58 | `npm ci`, then format check, lint, typecheck, unit tests and production build, in that order. Any failure stops the pipeline and marks the commit red. |

> The integration and browser tests are **not** in CI because they need a real database and a browser; they are run locally ([Testing](../07-testing/01-testing.md)).

---

## Defense questions

**Q: How do you keep code quality consistent?**
A: TypeScript in strict mode, ESLint with type-aware rules and zero warnings allowed, Prettier formatting, and a GitHub Actions pipeline that runs format check, lint, typecheck, unit tests and a production build on every push and pull request. An optional pre-push hook runs the same checks locally.

**Q: Where are secrets stored?**
A: In a `.env` file that is git-ignored, validated at startup by `env.ts`. In production they are set as environment variables in the hosting platform (Vercel). The card encryption key is generated by a script that refuses to write it unless `.env` is git-ignored.
