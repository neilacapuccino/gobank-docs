# Database client, errors, identifiers and pagination

**What you will learn:** the four small helpers in `gobank/src/server` that every feature uses: the single database client (`db.ts`), the error system and every user-facing error message (`errors.ts`), how account numbers and receipt references are generated (`identifiers.ts`), and how long lists are loaded page by page (`pagination.ts`).

---

## 1. `db.ts`: one database client for the whole app

<!-- code: gobank/src/server/db.ts -->
**`gobank/src/server/db.ts`** · all 17 lines

```ts
 1 │ import "server-only";
 2 │
 3 │ import { env } from "~/env";
 4 │ import { PrismaClient } from "../../generated/prisma";
 5 │
 6 │ const createPrismaClient = () =>
 7 │   new PrismaClient({
 8 │     log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
 9 │   });
10 │
11 │ const globalForPrisma = globalThis as unknown as {
12 │   prisma: ReturnType<typeof createPrismaClient> | undefined;
13 │ };
14 │
15 │ export const db = globalForPrisma.prisma ?? createPrismaClient();
16 │
17 │ if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```
<!-- /code -->

| Line | Meaning |
| --- | --- |
| 1 | `server-only`: importing this file from browser code fails the build, so database access can never leak to the client. |
| 4 | Imports the Prisma client generated into `gobank/generated/prisma`. |
| 6–9 | A factory that creates the client; in development it logs errors and warnings, in production only errors. |
| 11–13 | Treats `globalThis` (the one global object that survives hot reloads) as a place to keep the client. |
| 15 | Reuse the saved client if there is one, otherwise create one. |
| 17 | Outside production, save it globally. |

> **Why the global trick?** In development, Next.js reloads changed files many times a minute. Each reload would create a *new* `PrismaClient` with its own pool of database connections, and Neon would soon refuse with "too many connections". Keeping one client on `globalThis` avoids that. In production, modules load once, so it is not needed.

---

## 2. `errors.ts`: errors users can understand

<!-- code: gobank/src/server/errors.ts -->
**`gobank/src/server/errors.ts`** · all 55 lines

```ts
 1 │ import { MAX_GOALS } from "~/shared/lib/money";
 2 │
 3 │ type ErrorCode =
 4 │   | "BAD_REQUEST"
 5 │   | "UNAUTHORIZED"
 6 │   | "NOT_FOUND"
 7 │   | "CONFLICT"
 8 │   | "TOO_MANY_REQUESTS";
 9 │
10 │ export const MESSAGES = {
11 │   signInRequired: "Sign in to continue",
12 │   wrongCredentials: "Wrong username or PIN",
13 │   wrongPin: "That PIN is not right",
14 │   pinLocked: (minutes: number) =>
15 │     `Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
16 │   insufficientBalance: "Insufficient balance",
17 │   notEnoughPoints: "Not enough points",
18 │   accountLimit: "This transaction would exceed the account limit",
19 │   notEnoughInGoal: "Not enough in this goal",
20 │   cardLocked: "This card is locked. Unlock it or pay with your other card.",
21 │   cardNotFound: "Your card details were not found.",
22 │   accountNotFound: "This account no longer exists.",
23 │   savingsChanged: "Your savings changed. Please try again.",
24 │   overDailyLimit: "This goes over your daily limit",
25 │   recipientNotFound: "No GoBank account matches that",
26 │   ownAccount: "That is your own account",
27 │   goalLimit: `You can have up to ${MAX_GOALS} goals`,
28 │   requestClosed: "This request is no longer open",
29 │   notFound: "Not found",
30 │   unexpected: "Something went wrong. Please try again.",
31 │ } as const;
32 │
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
45 │
46 │ type DatabaseError = { code: string; meta?: { target?: unknown } };
47 │
48 │ export const asDatabaseError = (error: unknown) =>
49 │   typeof error === "object" &&
50 │   error !== null &&
51 │   "code" in error &&
52 │   typeof error.code === "string" &&
53 │   /^P\d{4}$/.test(error.code)
54 │     ? (error as DatabaseError)
55 │     : null;
```
<!-- /code -->

### `MESSAGES`: every user-facing error in one place (lines 10–31)

| Key | Message | Raised when |
| --- | --- | --- |
| `signInRequired` | Sign in to continue | No valid session, or the request came from a tab that does not own the session |
| `wrongCredentials` | Wrong username or PIN | Sign-in failed. The same text is used for "no such user" and "wrong PIN", so it does not reveal which usernames exist |
| `wrongPin` | That PIN is not right | Wrong *current* PIN when changing the PIN, or a wrong PIN after Google |
| `pinLocked(m)` | Too many wrong PINs. Try again in m minute(s). | 5 wrong PINs; counts down. Note the plural handling (line 15) |
| `insufficientBalance` | Insufficient balance | `post()` would make the balance negative |
| `notEnoughPoints` | Not enough points | Converting more points than you have |
| `accountLimit` | This transaction would exceed the account limit | A credit would push a balance past ₱21,474,836.47 |
| `notEnoughInGoal` | Not enough in this goal | Moving more out of a goal than it holds |
| `cardLocked` | This card is locked. Unlock it or pay with your other card. | Paying with a locked card |
| `cardNotFound` | Your card details were not found. | The chosen card kind does not exist |
| `accountNotFound` | This account no longer exists. | PIN check for a deleted user |
| `savingsChanged` | Your savings changed. Please try again. | GoalSave conflicts after 4 retries |
| `overDailyLimit` | This goes over your daily limit | Card spending today + this payment > daily limit |
| `recipientNotFound` | No GoBank account matches that | Unknown username / account number / mobile / Gmail |
| `ownAccount` | That is your own account | Sending to or requesting from yourself |
| `goalLimit` | You can have up to 5 goals | Creating a sixth goal |
| `requestClosed` | This request is no longer open | Paying, declining or cancelling a request that is not pending (or not yours) |
| `notFound` | Not found | A record lookup failed (Prisma `P2025`) |
| `unexpected` | Something went wrong. Please try again. | Any unexpected error in production (details hidden) |

`as const` (line 31) makes every message a fixed literal type, so a typo such as `MESSAGES.insuficientBalance` fails to compile.

### `AppError` and `fail()` (lines 33–44)

`AppError` is a normal `Error` with a `code` from the `ErrorCode` list. `fail(code, message)` throws one; its return type `never` tells TypeScript that the code after it does not run. Services use it like this:

```ts
if (!biller) return fail("NOT_FOUND", "This biller is not available.");
```

The tRPC middleware later turns every `AppError` into a proper API error with the same code and message ([tRPC setup](02-trpc-setup.md)).

### `asDatabaseError()` (lines 46–55)

Prisma's errors carry a code like `P2002`. This helper checks, without trusting the error's class, that `error` is an object with a string `code` matching `P` + 4 digits, and returns it typed as `{ code, meta? }`, or `null` otherwise. Services then write readable checks such as `asDatabaseError(error)?.code === "P2034"`.

---

## 3. `identifiers.ts`: references and account numbers

<!-- code: gobank/src/server/identifiers.ts -->
**`gobank/src/server/identifiers.ts`** · all 13 lines

```ts
 1 │ import { randomInt } from "node:crypto";
 2 │
 3 │ const REFERENCE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 4 │ const DIGITS = "0123456789";
 5 │
 6 │ const randomString = (characters: string, length: number) =>
 7 │   Array.from({ length }, () => characters[randomInt(characters.length)]).join(
 8 │     "",
 9 │   );
10 │
11 │ export const newReference = () => `GB${randomString(REFERENCE_CHARACTERS, 8)}`;
12 │
13 │ export const newAccountNumber = () => `20${randomString(DIGITS, 9)}`;
```
<!-- /code -->

| Line | Meaning |
| --- | --- |
| 1 | `randomInt` from `node:crypto` is a **cryptographically secure** random generator: the values cannot be predicted, unlike `Math.random()` |
| 3 | The reference alphabet has 32 characters: letters and digits **without `I`, `O`, `0` and `1`**, which are easy to confuse when someone reads a receipt aloud |
| 6–9 | Pick `length` random characters from an alphabet |
| 11 | Reference = `GB` + 8 characters, for example `GB7KQ2M9XA` |
| 13 | Account number = `20` + 9 random digits, 11 digits total |

How unique are they?

| Identifier | Possibilities | Uniqueness enforced by |
| --- | --- | --- |
| Reference | 32⁸ ≈ 1.1 trillion | `@@unique([reference, userId])`: unique per user |
| Account number | 10⁹ = 1 billion | `accountNumber @unique` |

If a random value ever repeated, the unique constraint would reject the insert (Prisma `P2002`) and the whole transaction would roll back, so nothing is corrupted. The code does not retry automatically; with thousands of users the chance is tiny but not zero, which is noted in [Limitations](../09-defense/03-limitations-and-future-work.md).

---

## 4. `pagination.ts`: loading lists page by page

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

GoBank uses **cursor pagination**: "give me the next 20 rows *after this row's ID*".

| Line | Meaning |
| --- | --- |
| 2 | Ask for **one extra row** (`limit + 1`). If it comes back, we know a next page exists, without a separate `COUNT` query. |
| 3 | If a cursor was given, start at that row (`cursor: { id }`) and `skip: 1` so the cursor row itself is not repeated. |
| 7 | Keep only `limit` rows. |
| 8 | If there was an extra row, the next cursor is the ID of the last row we kept; otherwise `null` (no more pages). |

How it is used, in the transaction history service:

<!-- code: gobank/src/features/activity/activity.service.ts 6-20 -->
**`gobank/src/features/activity/activity.service.ts`** · lines 6–20

```ts
 6 │ export async function listActivity(
 7 │   userId: string,
 8 │   cursor: string | null | undefined,
 9 │   limit: number,
10 │   filter: ActivityFilter = "all",
11 │ ) {
12 │   const rows = await db.transaction.findMany({
13 │     where: { userId, kind: MAIN_ACCOUNT_KINDS, ...filterWhere(filter) },
14 │     select: activityFields,
15 │     orderBy: [{ createdAt: "desc" }, { id: "desc" }],
16 │     ...pageArgs(cursor, limit),
17 │   });
18 │
19 │   return toPage(rows, limit);
20 │ }
```
<!-- /code -->

Line 16 spreads `pageArgs` into the query, and line 19 returns `{ items, next }`. In the browser, `useInfiniteQuery` passes `page.next` as the cursor of the next request when the user taps **Load more** ([Transactions and receipts](../05-features/10-transactions-and-receipts.md)). The same pair of helpers pages the reward history; the notifications list uses `toPage` with its own cursor query.

> **Why cursors instead of page numbers?** With `OFFSET 40`, if three new transactions arrive while you scroll, every page shifts and you see duplicates. A cursor says "after this exact row", so new rows at the top do not disturb the pages you are loading. The second sort key `id` breaks ties when two rows share the same `createdAt`, so the order is always stable.

---

## Check yourself

<details>
<summary>Why does <code>pageArgs</code> ask for <code>limit + 1</code> rows?</summary>

The extra row proves there is a next page without running a separate count query; `toPage` removes it.
</details>

<details>
<summary>Why are <code>I</code>, <code>O</code>, <code>0</code> and <code>1</code> missing from references?</summary>

They are easily confused (I/1, O/0) when a reference is read or typed by a person.
</details>

<details>
<summary>What does <code>fail()</code> return?</summary>

Nothing: it always throws an `AppError`. Its type is `never`.
</details>
