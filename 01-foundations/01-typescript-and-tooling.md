# TypeScript and tooling

**What you will learn:** enough TypeScript and JavaScript to read every line of GoBank Express, plus what Node.js, npm, `tsx` and the compiler settings do. Every example below is real code from the project.

---

## 1. What TypeScript is (and why the project uses it)

TypeScript is JavaScript plus **types**. A type says what kind of value a variable may hold. The TypeScript compiler (`tsc`) checks the whole project *before it runs* and refuses code that mixes things up, for example passing a `string` where a `number` of centavos is expected. Browsers and Node.js cannot run TypeScript directly, so it is converted to plain JavaScript first (Next.js does this for the app; `tsx` does it for scripts and tests).

> **Concept: why types matter in a bank.** If `amount` could accidentally be the string `"100"`, then `"100" + 50` would be the string `"10050"`, not `150`. The compiler makes such mistakes impossible to ship. The project also runs `npm run typecheck` in CI, so a type error blocks every merge ([Configuration files](../02-architecture/03-configuration-files.md)).

---

## 2. Reading TypeScript: a tour using GoBank code

### Constants, arrow functions and numeric separators

<!-- code: gobank/src/shared/lib/money.ts -->
**`gobank/src/shared/lib/money.ts`** · all 18 lines

```ts
 1 │ export const MAX_GOALS = 5;
 2 │ export const MAX_TRANSACTION_CENTAVOS = 100_000_000;
 3 │ export const MAX_BALANCE_CENTAVOS = 2_147_483_647;
 4 │ export const MAX_REWARD_POINTS = 2_147_483_647;
 5 │ export const MIN_REDEEM_POINTS = 100;
 6 │
 7 │ const CENTAVOS_PER_POINT_EARNED = 5000;
 8 │ const CENTAVOS_PER_POINT_REDEEMED = 1;
 9 │
10 │ export const toCentavos = (pesos: number) => Math.round(pesos * 100);
11 │
12 │ export const toPesos = (centavos: number) => centavos / 100;
13 │
14 │ export const pointsEarned = (spent: number) =>
15 │   Math.floor(spent / CENTAVOS_PER_POINT_EARNED);
16 │
17 │ export const pointsValue = (points: number) =>
18 │   points * CENTAVOS_PER_POINT_REDEEMED;
```
<!-- /code -->

- `export const` declares a value other files can import and nobody can reassign.
- `100_000_000` is just `100000000`; the underscores (numeric separators) only make big numbers readable. It is ₱1,000,000 in centavos.
- `2_147_483_647` is the largest value a PostgreSQL `INTEGER` column can store (2³¹ − 1). That is why it is the maximum balance.
- `(pesos: number) => Math.round(pesos * 100)` is an **arrow function**: it takes a parameter `pesos` of type `number` and returns the expression after `=>`.
- `Math.floor(spent / CENTAVOS_PER_POINT_EARNED)` rounds *down*, so ₱99.99 spent earns 1 point, not 2.

### Types, unions and literal types

<!-- code: gobank/src/server/errors.ts 1-8 -->
**`gobank/src/server/errors.ts`** · lines 1–8

```ts
1 │ import { MAX_GOALS } from "~/shared/lib/money";
2 │
3 │ type ErrorCode =
4 │   | "BAD_REQUEST"
5 │   | "UNAUTHORIZED"
6 │   | "NOT_FOUND"
7 │   | "CONFLICT"
8 │   | "TOO_MANY_REQUESTS";
```
<!-- /code -->

`ErrorCode` is a **union of string literal types**: a value of type `ErrorCode` can only be one of those five exact strings. Typing `"BAD_REQEST"` (typo) would fail to compile.

### `as const`

<!-- code: gobank/src/features/card/card-brands.ts -->
**`gobank/src/features/card/card-brands.ts`** · all 32 lines

```ts
 1 │ export const CARD_BRANDS = [
 2 │   {
 3 │     id: "visa",
 4 │     name: "Visa",
 5 │     numberPrefix: "4242",
 6 │   },
 7 │   {
 8 │     id: "mastercard",
 9 │     name: "Mastercard",
10 │     numberPrefix: "5555",
11 │   },
12 │   {
13 │     id: "jcb",
14 │     name: "JCB",
15 │     numberPrefix: "3566",
16 │   },
17 │   {
18 │     id: "discover",
19 │     name: "Discover",
20 │     numberPrefix: "6011",
21 │   },
22 │ ] as const;
23 │
24 │ type CardBrand = (typeof CARD_BRANDS)[number];
25 │ export type CardBrandId = CardBrand["id"];
26 │
27 │ export const isSupportedCardBrand = (id: unknown): id is CardBrandId =>
28 │   typeof id === "string" && CARD_BRANDS.some((brand) => brand.id === id);
29 │
30 │ export function getBrand(id: CardBrandId): CardBrand {
31 │   return CARD_BRANDS.find((brand) => brand.id === id) ?? CARD_BRANDS[3];
32 │ }
```
<!-- /code -->

- `as const` (line 22) freezes the array and makes TypeScript remember the *exact* values, so `CardBrandId` becomes `"visa" | "mastercard" | "jcb" | "discover"` instead of just `string`.
- `(typeof CARD_BRANDS)[number]` means "the type of any element of that array".
- `CardBrand["id"]` picks the type of the `id` property.
- Line 27 is a **type guard**: `id is CardBrandId` tells the compiler "if this returns `true`, treat `id` as a `CardBrandId` from now on". It is used to validate untrusted input (the card network a new user picks).

### Discriminated unions

<!-- code: gobank/src/features/auth/auth.rules.ts 22-28 -->
**`gobank/src/features/auth/auth.rules.ts`** · lines 22–28

```ts
22 │ export type UsernameCheck =
23 │   | { state: "idle" }
24 │   | { state: "checking" }
25 │   | { state: "invalid"; message: string }
26 │   | { state: "taken"; message: string }
27 │   | { state: "error"; message: string }
28 │   | { state: "available" };
```
<!-- /code -->

Every option has a `state` field with a different literal value. When code checks `if (check.state === "invalid")`, TypeScript knows `check.message` exists. This pattern is used all over the project: `UsernameCheck`, `CvvState` in `use-card-secrets.ts`, and `BitcoinTrade` (`{ action: "buy"; cashCentavos } | { action: "sell"; bitcoinUnits }`).

### Functions that never return

<!-- code: gobank/src/server/errors.ts 33-44 -->
**`gobank/src/server/errors.ts`** · lines 33–44

```ts
33 │ export class AppError extends Error {
34 │   constructor(
35 │     readonly code: ErrorCode,
36 │     message: string,
37 │   ) {
38 │     super(message);
39 │   }
40 │ }
41 │
42 │ export function fail(code: ErrorCode, message: string): never {
43 │   throw new AppError(code, message);
44 │ }
```
<!-- /code -->

`fail()` always throws, so its return type is `never`. That lets services write `if (!user) return fail("NOT_FOUND", …)` and TypeScript knows that after this line `user` is defined.

### Generics

<!-- code: gobank/src/server/pagination.ts -->
**`gobank/src/server/pagination.ts`** · all 11 lines

```ts
 1 │ export const pageArgs = (cursor: string | null | undefined, limit: number) => ({
 2 │   take: limit + 1,
 3 │   ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
 4 │ });
 5 │
 6 │ export function toPage<T extends { id: string }>(rows: T[], limit: number) {
 7 │   const items = rows.slice(0, limit);
 8 │   const next = rows.length > limit ? (items.at(-1)?.id ?? null) : null;
 9 │
10 │   return { items, next };
11 │ }
```
<!-- /code -->

`toPage<T extends { id: string }>` works for *any* row type `T` as long as it has an `id` string. The same helper pages transactions, reward history and money requests.

### Utility types you will see

| Type | Meaning | Example in the project |
| --- | --- | --- |
| `Omit<T, "points">` | `T` without the `points` field | `type Spending = Omit<Entry, "points"> & { card: CardKind }` in `ledger.ts` |
| `Partial<T>` | every field optional | `onChange: (patch: Partial<ProfileValues>) => void` in `profile-fields.tsx` |
| `Record<K, V>` | an object with keys `K` and values `V` | `const ICONS: Record<ActivityEntry["kind"], LucideIcon>` in `activity-icon.tsx` |
| `ReturnType<typeof f>` | whatever `f` returns | `type TradePreview = ReturnType<typeof calculateTrade>` |
| `Awaited<…>` | the value inside a `Promise` | `type Quote = Awaited<ReturnType<typeof getBitcoinQuote>>` |
| `Parameters<typeof f>` | the argument list of `f` | `function priceTrade(...input: Parameters<typeof calculateTrade>)` |
| `z.infer<typeof schema>` | the type a Zod schema produces | `type GoogleIdentity = z.infer<typeof identity>` |

### Modern JavaScript syntax used everywhere

| Syntax | Meaning | Example |
| --- | --- | --- |
| `a ?? b` | `a`, unless it is `null`/`undefined`, then `b` | `env.GOOGLE_CLIENT_ID ?? ""` |
| `a?.b` | `a.b`, or `undefined` if `a` is null | `store.get(COOKIE)?.value` |
| `x ??= y` | assign `y` only if `x` is null/undefined | `submissionId.current ??= crypto.randomUUID()` |
| `{ ...a, b: 1 }` | copy `a`'s fields, then set `b` | `data: { ...profile, pinHash }` |
| `const { a, ...rest } = obj` | take `a`, keep the rest | `const { googleId, ...details } = profile` |
| `const [x = "", y = ""] = list` | array destructuring with defaults | `const [salt = "", hash = ""] = stored.split(":")` |
| `` `Hi ${name}` `` | template literal | `` `Transfer to @${to.username}` `` |
| `async`/`await` | wait for a Promise without blocking the server | almost every service function |
| `Promise.all([...])` | run several async jobs at the same time and wait for all | `getRewardsSummary` runs three queries at once |
| `100n` | BigInt literal | `UNITS_PER_BITCOIN = 100_000_000n` |
| `list.at(-1)` | last element | `items.at(-1)?.id` |

---

## 3. The compiler settings (`tsconfig.json`)

<!-- code: gobank/tsconfig.json -->
**`gobank/tsconfig.json`** · all 40 lines

```json
 1 │ {
 2 │   "compilerOptions": {
 3 │     /* Base Options: */
 4 │     "esModuleInterop": true,
 5 │     "skipLibCheck": true,
 6 │     "target": "es2022",
 7 │     "allowJs": false,
 8 │     "resolveJsonModule": true,
 9 │     "moduleDetection": "force",
10 │     "isolatedModules": true,
11 │     "verbatimModuleSyntax": true,
12 │     /* Strictness */
13 │     "strict": true,
14 │     "noUncheckedIndexedAccess": true,
15 │     /* Bundled projects */
16 │     "lib": ["dom", "dom.iterable", "ES2022"],
17 │     "noEmit": true,
18 │     "module": "ESNext",
19 │     "moduleResolution": "Bundler",
20 │     "jsx": "preserve",
21 │     "plugins": [
22 │       {
23 │         "name": "next"
24 │       }
25 │     ],
26 │     "incremental": true,
27 │     /* Path Aliases */
28 │     "paths": {
29 │       "~/*": ["./src/*"]
30 │     }
31 │   },
32 │   "include": [
33 │     "**/*.ts",
34 │     "**/*.tsx",
35 │     ".next/types/**/*.ts",
36 │     "next-env.d.ts",
37 │     ".next-build/types/**/*.ts"
38 │   ],
39 │   "exclude": ["node_modules", "generated"]
40 │ }
```
<!-- /code -->

| Line | Setting | What it means for you |
| --- | --- | --- |
| 6 | `"target": "es2022"` | Output modern JavaScript (BigInt, `at()`, `??=` are allowed). |
| 10 | `isolatedModules` | Every file must compile on its own (required by Next.js and `tsx`). |
| 11 | `verbatimModuleSyntax` | Imports used only as types **must** say `import type`. That is why you see `import type { Prisma } from …` and `import { type AppRouter } from …`: the import disappears from the JavaScript output. |
| 13 | `strict` | Turns on every safety check: no implicit `any`, `null` must be handled, and so on. |
| 14 | `noUncheckedIndexedAccess` | `list[0]` has type `T \| undefined`, so you must handle "maybe missing". This is why the code is full of `?? ""`, `?.` and `if (!first) return`. |
| 17 | `noEmit` | `tsc` only checks; Next.js and `tsx` produce the JavaScript. |
| 19 | `moduleResolution: "Bundler"` | Resolve imports the way modern bundlers do. |
| 28–30 | `paths: { "~/*": ["./src/*"] }` | `import { db } from "~/server/db"` means `gobank/src/server/db.ts`. No `../../..` chains. |
| 39 | `exclude: ["generated"]` | Do not type-check the generated Prisma client code itself. |

> **Why `noUncheckedIndexedAccess` matters:** without it, `stored.split(":")[1]` would be typed as `string` even when the string has no `:`. With it, the compiler forces the default `= ""`, so a malformed PIN hash cannot crash `verifyPin`; it simply fails to match.

---

## 4. Node.js, npm, and running TypeScript

| Tool | Role in GoBank Express |
| --- | --- |
| **Node.js 22** | The JavaScript runtime for the Next.js server, scripts and tests. Built-in modules are imported with the `node:` prefix: `node:crypto` (hashing, encryption, random numbers), `node:test` and `node:assert` (testing), `node:fs` (files). |
| **npm** | Installs packages listed in `package.json`. `npm ci` installs the *exact* versions in `package-lock.json` (used in CI so builds are reproducible). |
| **`package.json` scripts** | Named commands: `npm run dev`, `npm test`, `npm run db:migrate`… All explained in [Configuration files](../02-architecture/03-configuration-files.md). |
| **tsx** | Runs a TypeScript file directly with Node: `node --import tsx scripts/verify-core.ts`. Used by tests, the seed and helper scripts. |
| **`"type": "module"`** | All files use modern `import`/`export` (ES modules), not `require`. |

> **Concept: `--conditions=react-server`.** Server-only files start with `import "server-only"`. That package deliberately throws an error when imported anywhere except a React *server* environment, so secret code (database, encryption keys) can never end up in the browser bundle. Scripts and some tests run outside Next.js, so they pass `--conditions=react-server` to tell Node "treat this as the server environment", which makes `server-only` load its harmless server version. You will see this flag in the `test:card`, `test:profile` and `test:integration` scripts.

---

## Check yourself

<details>
<summary>Why does <code>verifyPin</code> write <code>const [salt = "", hash = ""] = stored.split(":")</code> instead of <code>const [salt, hash] = …</code>?</summary>

Because of `noUncheckedIndexedAccess`: array elements might be missing, so their type is `string | undefined`. The defaults make them plain `string` and keep a broken hash from crashing the function.
</details>

<details>
<summary>What does <code>import type { Prisma } from "../../generated/prisma"</code> produce in the final JavaScript?</summary>

Nothing. Type-only imports are erased; they exist only for the compiler (`verbatimModuleSyntax` requires the `type` keyword so this is explicit).
</details>

<details>
<summary>What is the type of <code>fail()</code>'s return value and why is that useful?</summary>

`never`, because it always throws. After `if (!usedCard) return fail(...)`, TypeScript knows `usedCard` is defined.
</details>
