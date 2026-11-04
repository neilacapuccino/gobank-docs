# Shared helpers, hooks and the tRPC client

**What you will learn:** the small pure helpers in `src/shared/lib` (money, formatting, contact rules, schemas, class names), the shared React hooks in `src/shared/hooks`, and the four files in `src/trpc` that connect the browser to the API.

| Folder | Files |
| --- | --- |
| `src/shared/lib` | `money.ts`, `format.ts`, `contact.ts`, `schemas.ts`, `amount-input.ts` (+ test), `savings-interest.ts` (+ test), `cn.ts` |
| `src/shared/hooks` | `use-debounced-value.ts`, `use-recipient-search.ts`, `use-spend-limit.ts` |
| `src/trpc` | `react.tsx`, `query-client.ts`, `server.ts`, `error-message.ts` |

Everything in `shared/lib` is **pure** (no database, no React): the same code runs in the browser and on the server, so both sides apply identical rules.

---

## `money.ts`: the money rules

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

| Name | Value | Meaning |
| --- | --- | --- |
| `MAX_GOALS` | 5 | GoalSave goals per user |
| `MAX_TRANSACTION_CENTAVOS` | 100,000,000 | ₱1,000,000.00, the largest single amount (the `centavos` schema's maximum) |
| `MAX_BALANCE_CENTAVOS` | 2,147,483,647 | about ₱21.47 million: PostgreSQL's `INTEGER` maximum (2³¹ − 1) |
| `MAX_REWARD_POINTS` | 2,147,483,647 | same limit for points |
| `MIN_REDEEM_POINTS` | 100 | smallest conversion, and its step |
| `CENTAVOS_PER_POINT_EARNED` | 5,000 | 1 point per ₱50 |
| `CENTAVOS_PER_POINT_REDEEMED` | 1 | 1 point = 1 centavo |
| `toCentavos(pesos)` | `Math.round(pesos × 100)` | rounding fixes floating-point noise: `12.34 × 100 = 1233.9999999999998` → `1234` |
| `toPesos(centavos)` | `centavos / 100` | for display only |
| `pointsEarned(spent)` | `floor(spent / 5000)` | |
| `pointsValue(points)` | `points × 1` | centavos of cash back |

## `format.ts`: how numbers and dates are shown

<!-- code: gobank/src/shared/lib/format.ts -->
**`gobank/src/shared/lib/format.ts`** · all 42 lines

```ts
 1 │ import { toPesos } from "./money";
 2 │
 3 │ const PESO = new Intl.NumberFormat("en-PH", {
 4 │   style: "currency",
 5 │   currency: "PHP",
 6 │   minimumFractionDigits: 2,
 7 │   maximumFractionDigits: 2,
 8 │ });
 9 │
10 │ const SHORT_DATE = new Intl.DateTimeFormat("en-PH", {
11 │   day: "numeric",
12 │   month: "short",
13 │ });
14 │
15 │ const DATE_TIME = new Intl.DateTimeFormat("en-PH", {
16 │   month: "short",
17 │   day: "numeric",
18 │   year: "numeric",
19 │   hour: "numeric",
20 │   minute: "2-digit",
21 │ });
22 │
23 │ export const peso = (centavos: number) => PESO.format(toPesos(centavos));
24 │
25 │ export const formatAccount = (accountNumber: string) =>
26 │   accountNumber.replace(/(\d{4})(?=\d)/g, "$1 ");
27 │
28 │ export const maskDigits = (value: string) =>
29 │   value.length <= 4
30 │     ? value
31 │     : `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
32 │
33 │ export const digitsOnly = (value: string, maxLength?: number) => {
34 │   const digits = value.replace(/\D/g, "");
35 │   return maxLength === undefined ? digits : digits.slice(0, maxLength);
36 │ };
37 │
38 │ export const shortDate = (date: Date | string) =>
39 │   SHORT_DATE.format(new Date(date));
40 │
41 │ export const dateTime = (date: Date | string) =>
42 │   DATE_TIME.format(new Date(date));
```
<!-- /code -->

The `Intl` formatters are created **once** (lines 3–21) and reused, which is much faster than creating one per call.

| Function | Example input | Output (checked with Node.js) |
| --- | --- | --- |
| `peso(centavos)` | `123450` / `-10000` | `₱1,234.50` / `-₱100.00` |
| `formatAccount(number)` | `"20042640684"` | `2004 2640 684` (a space after every 4 digits) |
| `maskDigits(value)` | `"00112233"` | `****2233` (only the last 4 visible) |
| `digitsOnly(value, max?)` | `"0917-123"`, 11 | `0917123` |
| `shortDate(date)` | 3 Nov 2026 | `Nov 3` |
| `dateTime(date)` | 3 Nov 2026 14:05 | `Nov 3, 2026, 2:05 PM` |

Dates are formatted in the **viewer's** time zone (the browser's). For users in the Philippines that is Manila time, matching the server's daily-limit day.

## `contact.ts` and `schemas.ts`

- `contact.ts` (mobile normalization and validation, full-name rule, Gmail normalization, mobile formatting) is explained in [Account and profile §3](../05-features/03-account-and-profile.md#3-contact-rules-srcsharedlibcontactts).
- `schemas.ts` (the shared Zod schemas `centavos`, `mobile`, `cardKind`, `optionalText`, `profileFields`) is explained in [tRPC, Zod and React Query §3](../01-foundations/03-trpc-zod-and-react-query.md#3-zod-checking-every-input-on-the-server). Its helper `blankToNull` turns an empty string into `null`, so "no note" and "no mobile" are stored as `NULL`, not as empty text.

## `amount-input.ts`

The amount-box rule (up to 7 digits and at most 2 decimals, allowing half-typed values) is explained in [Send money §3](../05-features/05-send-money.md#3-the-amount-box-amount-inputts). Its tests:

<!-- code: gobank/src/shared/lib/amount-input.test.ts -->
**`gobank/src/shared/lib/amount-input.test.ts`** · all 20 lines

```ts
 1 │ import assert from "node:assert/strict";
 2 │ import { test } from "node:test";
 3 │ import { isPesoInput } from "./amount-input";
 4 │ import { toCentavos } from "./money";
 5 │
 6 │ void test("half-typed peso amounts are allowed while typing", () => {
 7 │   for (const value of ["", ".", ".5", "12.", "12.34"]) {
 8 │     assert.equal(isPesoInput(value), true, value);
 9 │   }
10 │ });
11 │
12 │ void test("negative, over-precise and formatted amounts are blocked", () => {
13 │   for (const value of ["-5", "1.234", "1.2.3", "1e3", "1,000"]) {
14 │     assert.equal(isPesoInput(value), false, value);
15 │   }
16 │ });
17 │
18 │ void test("pesos convert to whole centavos without rounding errors", () => {
19 │   assert.equal(toCentavos(Number("12.34")), 1234);
20 │ });
```
<!-- /code -->

## `savings-interest.ts`

The compound-interest function. See [GoalSave §2](../05-features/08-goalsave.md#2-the-interest-math-savings-interestts).

## `cn.ts`

<!-- code: gobank/src/shared/lib/cn.ts -->
**`gobank/src/shared/lib/cn.ts`** · all 3 lines

```ts
1 │ export function cn(...parts: Array<string | false | null | undefined>) {
2 │   return parts.filter(Boolean).join(" ");
3 │ }
```
<!-- /code -->

Joins class names and drops `false`, `null`, `undefined` and empty strings, so components can write `cn("base", selected && "border-brand", className)`.

---

## Shared hooks

### `use-debounced-value.ts`

<!-- code: gobank/src/shared/hooks/use-debounced-value.ts -->
**`gobank/src/shared/hooks/use-debounced-value.ts`** · all 12 lines

```ts
 1 │ import { useEffect, useState } from "react";
 2 │
 3 │ export function useDebouncedValue<T>(value: T, delay: number) {
 4 │   const [debounced, setDebounced] = useState(value);
 5 │
 6 │   useEffect(() => {
 7 │     const timer = setTimeout(() => setDebounced(value), delay);
 8 │     return () => clearTimeout(timer);
 9 │   }, [value, delay]);
10 │
11 │   return debounced;
12 │ }
```
<!-- /code -->

Returns `value`, but only after it has stopped changing for `delay` ms. Every change starts a new timer, and the effect's cleanup (line 8) cancels the previous one. Used by the username availability check (380 ms).

### `use-recipient-search.ts` and `use-spend-limit.ts`

Explained line by line in [Send money §4–5](../05-features/05-send-money.md#4-finding-the-person-use-recipient-searchts).

---

## The tRPC client: `src/trpc`

### `react.tsx`: the browser's API client

<!-- code: gobank/src/trpc/react.tsx -->
**`gobank/src/trpc/react.tsx`** · all 66 lines

```tsx
 1 │ "use client";
 2 │
 3 │ import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
 4 │ import { httpBatchLink, httpBatchStreamLink, splitLink } from "@trpc/client";
 5 │ import { createTRPCReact } from "@trpc/react-query";
 6 │ import { type inferRouterOutputs } from "@trpc/server";
 7 │ import { useState } from "react";
 8 │ import SuperJSON from "superjson";
 9 │
10 │ import { type AppRouter } from "~/server/root";
11 │ import { createQueryClient } from "./query-client";
12 │ import { clientSessionId } from "~/features/auth/session.client";
13 │ import { SESSION_HEADER } from "~/features/auth/session.rules";
14 │
15 │ let clientQueryClientSingleton: QueryClient | undefined = undefined;
16 │ const getQueryClient = () => {
17 │   if (typeof window === "undefined") {
18 │     return createQueryClient();
19 │   }
20 │   clientQueryClientSingleton ??= createQueryClient();
21 │
22 │   return clientQueryClientSingleton;
23 │ };
24 │
25 │ export const api = createTRPCReact<AppRouter>();
26 │
27 │ export type RouterOutputs = inferRouterOutputs<AppRouter>;
28 │
29 │ const link = {
30 │   transformer: SuperJSON,
31 │   url: getBaseUrl() + "/api/trpc",
32 │   headers: () => {
33 │     const sessionId = clientSessionId();
34 │     return sessionId ? { [SESSION_HEADER]: sessionId } : {};
35 │   },
36 │ };
37 │
38 │ export function TRPCReactProvider(props: { children: React.ReactNode }) {
39 │   const queryClient = getQueryClient();
40 │
41 │   const [trpcClient] = useState(() =>
42 │     api.createClient({
43 │       links: [
44 │         splitLink({
45 │           condition: (op) => op.type === "mutation",
46 │           true: httpBatchLink(link),
47 │           false: httpBatchStreamLink(link),
48 │         }),
49 │       ],
50 │     }),
51 │   );
52 │
53 │   return (
54 │     <QueryClientProvider client={queryClient}>
55 │       <api.Provider client={trpcClient} queryClient={queryClient}>
56 │         {props.children}
57 │       </api.Provider>
58 │     </QueryClientProvider>
59 │   );
60 │ }
61 │
62 │ function getBaseUrl() {
63 │   if (typeof window !== "undefined") return window.location.origin;
64 │   if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
65 │   return `http://localhost:${process.env.PORT ?? 3001}`;
66 │ }
```
<!-- /code -->

| Lines | Meaning |
| --- | --- |
| 1 | a client module (it uses React state) |
| 15–23 | **one query cache per browser tab**, but **a new one for every server render**. Sharing one cache between server requests would leak one user's data into another user's page, so the server never reuses it |
| 25 | `api` is typed from `AppRouter`, imported **as a type only**, so no server code reaches the browser |
| 27 | `RouterOutputs`: the output type of every procedure, used by components (for example `RouterOutputs["card"]["get"]`) |
| 29–36 | every request: SuperJSON, the `/api/trpc` URL, and the `x-gb-session` header with this tab's session ID |
| 41–51 | the client is created once per provider (`useState` initializer); mutations use `httpBatchLink`, queries `httpBatchStreamLink` ([why](../01-foundations/03-trpc-zod-and-react-query.md#batching-and-streaming)) |
| 53–59 | both providers wrap the app |
| 62–66 | the base URL: the current site in the browser; the Vercel URL or `localhost:3001` during server rendering |

### `query-client.ts`

The cache rules: data is fresh for 30 seconds, and **every mutation invalidates every query** except sign-in-related ones. Explained in [tRPC, Zod and React Query §5](../01-foundations/03-trpc-zod-and-react-query.md#the-projects-cache-rules).

### `server.ts`

The direct (no HTTP) caller used by server components. Explained in [tRPC setup §3](../04-server-core/02-trpc-setup.md#from-server-components-a-direct-call).

### `error-message.ts`

Shows the first Zod field error if the input was rejected, otherwise the server's message. Explained in [tRPC, Zod and React Query §6](../01-foundations/03-trpc-zod-and-react-query.md#6-errors-from-server-to-screen).

---

## Check yourself

<details>
<summary>Why does <code>getQueryClient()</code> create a new client on every server render?</summary>

On the server, one process serves many users. A shared cache could show one user's cached data in another user's page. In the browser, the page belongs to one user, so one cache is reused.
</details>

<details>
<summary>What does <code>formatAccount("20353020719")</code> return?</summary>

`2035 3020 719`.
</details>
