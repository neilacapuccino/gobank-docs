# GoalSave (savings goals with interest)

**What you will learn:** how up to five savings goals work; the exact **4% a year, compounded daily** interest formula and why it never loses or double-pays a fraction of a centavo; why interest is calculated "lazily" when a goal is viewed instead of by a nightly job; why GoalSave uses the strictest database isolation level with automatic retries; and every GoalSave screen.

| Layer | Files |
| --- | --- |
| Interest math | `src/shared/lib/savings-interest.ts` (+ `savings-interest.test.ts`) |
| Rules | `src/features/goals/goals.rules.ts` (+ `goals.rules.test.ts`) |
| API and service | `src/features/goals/goals.router.ts`, `goals.service.ts` |
| Money movement | `src/server/ledger.ts` → `moveGoalMoney`, `settleGoalInterest` ([The ledger §9–10](../04-server-core/04-ledger.md#9-movegoalmoney-main-balance--goalsave-lines-212235)) |
| Screens | `goalsave-screen.tsx`, `create-goal-form.tsx`, `goal-detail.tsx`, `goal-transfer-form.tsx`, `goal-settings-form.tsx`, `goal-tabs.tsx`, `goal-bubble.tsx`, `goal-art.tsx`, `goal-icon-picker.tsx` |
| Hook | `src/features/goals/hooks/use-goal-icon.ts` |
| Pages | `src/app/(app)/goals/page.tsx` (`/goals`), `src/app/(app)/goals/[id]/page.tsx` (`/goals/<id>`) |

---

## 1. What the user can do

| Action | Rule |
| --- | --- |
| Create a goal | at most **5** goals; name 1–40 characters, unique per user; optional target ₱0.01–₱1,000,000 |
| Transfer in | from the main balance (cannot exceed it) |
| Transfer out | back to the main balance (cannot exceed the goal's balance) |
| Earn interest | **4% per year, compounded daily**, credited to the goal |
| Edit | rename, change or remove the target, change the icon |
| Close | all money (including interest) returns to the main balance; the goal is deleted; its history stays |

---

## 2. The interest math: `savings-interest.ts`

<!-- code: gobank/src/shared/lib/savings-interest.ts -->
**`gobank/src/shared/lib/savings-interest.ts`** · all 40 lines

```ts
 1 │ const DAY_MS = 24 * 60 * 60 * 1000;
 2 │ const DAYS_PER_YEAR = 365;
 3 │ const MAX_SAVINGS_CENTAVOS = 2_000_000_000;
 4 │
 5 │ type Savings = {
 6 │   balance: number;
 7 │   annualInterestRate: number;
 8 │   interestRemainder: number;
 9 │   interestCalculatedAt: Date;
10 │ };
11 │
12 │ const daysBetween = (from: Date, to: Date) =>
13 │   Math.max(0, (to.getTime() - from.getTime()) / DAY_MS);
14 │
15 │ const dailyGrowth = (annualRate: number, days: number) =>
16 │   Math.exp(days * Math.log1p(annualRate / DAYS_PER_YEAR));
17 │
18 │ export function compoundInterest(savings: Savings, now: Date) {
19 │   const days = daysBetween(savings.interestCalculatedAt, now);
20 │   if (!Number.isFinite(days)) throw new Error("Invalid savings date.");
21 │   if (days === 0) return { ...savings, earned: 0, days: 0 };
22 │
23 │   const exactBalance =
24 │     (savings.balance + savings.interestRemainder) *
25 │     dailyGrowth(savings.annualInterestRate, days);
26 │   const balance = Math.floor(exactBalance);
27 │
28 │   if (!Number.isSafeInteger(balance) || balance > MAX_SAVINGS_CENTAVOS) {
29 │     throw new Error("Savings interest exceeds the account limit.");
30 │   }
31 │
32 │   return {
33 │     ...savings,
34 │     balance,
35 │     interestRemainder: exactBalance - balance,
36 │     interestCalculatedAt: now,
37 │     earned: balance - savings.balance,
38 │     days,
39 │   };
40 │ }
```
<!-- /code -->

### The formula

Daily compounding at annual rate *r* for *d* days:

```text
balance_after = balance × (1 + r / 365) ^ d
```

- **Line 12–13:** *d* is the exact time since interest was last settled, in **days with fractions** (milliseconds ÷ 86,400,000). Half a day counts as 0.5 days.
- **Lines 15–16:** `(1 + r/365)^d` is computed as `exp(d × log1p(r/365))`. Both are mathematically equal; `Math.log1p(x)` computes `log(1 + x)` accurately even when *x* is tiny (here *x* = 0.04 / 365 ≈ 0.0001096), where adding 1 first would throw away digits.
- **Line 21:** no time passed → nothing earned.
- **Lines 23–25:** grow `balance + interestRemainder`, the stored whole centavos **plus** the fraction of a centavo carried over from last time.
- **Line 26:** the new balance is rounded **down** to whole centavos (a bank never pays a fraction of a centavo it does not have).
- **Line 35:** the fraction that was rounded off is kept as the new `interestRemainder` (always between 0 and 1).
- **Lines 28–30:** safety: the result must be a safe integer and at most ₱20,000,000.
- **Lines 32–39:** a **new** object is returned; the input is never modified (tested).

### Worked examples (computed with this exact code)

| Saved | Time | Exact result (centavos) | New balance | Earned | Carried fraction |
| --- | --- | --- | --- | --- | --- |
| ₱1,000.00 | 1 day | 100,010.9589 | ₱1,000.10 | ₱0.10 | 0.9589 centavo |
| ₱1,000.00 | 30 days | 100,329.2901 | ₱1,003.29 | ₱3.29 | 0.2901 |
| ₱10,000.00 | 30 days | 1,003,292.9008 | ₱10,032.92 | ₱32.92 | 0.9008 |
| ₱1,000.00 | 365 days | 104,080.8493 | **₱1,040.80** | **₱40.80** | 0.8493 |
| ₱1.00 | 365 days | 104.0808 | ₱1.04 | ₱0.04 | 0.0808 |

For comparison, simple interest on ₱1,000 at 4% gives ₱1,040.00 after a year, and continuous compounding gives ₱1,040.81. Daily compounding sits in between, as expected.

### Why checking often does not change the result

Because the carried fraction is added back every time, splitting the time into pieces gives the same answer as one big step:

```text
(b × g(d1)) × g(d2)  =  b × g(d1 + d2)      where g(d) = (1 + r/365)^d
```

Settling ₱1.00 once a day for 365 days, and settling it once after 365 days, both end at **104 centavos with the same 0.0808 remainder** (verified by running both). This is what makes **lazy settlement** safe (section 4).

### The tests

<!-- code: gobank/src/shared/lib/savings-interest.test.ts -->
**`gobank/src/shared/lib/savings-interest.test.ts`** · all 50 lines

```ts
 1 │ import assert from "node:assert/strict";
 2 │ import test from "node:test";
 3 │ import { compoundInterest } from "./savings-interest";
 4 │
 5 │ const START = new Date("2026-01-01T00:00:00Z");
 6 │ const ONE_DAY = 86_400_000;
 7 │
 8 │ const savings = {
 9 │   balance: 100_000,
10 │   annualInterestRate: 0.04,
11 │   interestRemainder: 0,
12 │   interestCalculatedAt: START,
13 │ };
14 │
15 │ const daysLater = (days: number) => new Date(START.getTime() + days * ONE_DAY);
16 │
17 │ void test("a year of daily compounding at 4% earns the expected interest", () => {
18 │   const result = compoundInterest(savings, daysLater(365));
19 │
20 │   assert.equal(result.balance, 104_080);
21 │   assert.equal(result.earned, 4_080);
22 │ });
23 │
24 │ void test("calculating interest does not change the original savings", () => {
25 │   compoundInterest(savings, daysLater(365));
26 │
27 │   assert.equal(savings.balance, 100_000);
28 │ });
29 │
30 │ void test("interest is never paid twice for the same days", () => {
31 │   const afterOneYear = compoundInterest(savings, daysLater(365));
32 │
33 │   assert.equal(compoundInterest(afterOneYear, daysLater(365)).earned, 0);
34 │   assert.equal(compoundInterest(afterOneYear, START).earned, 0);
35 │ });
36 │
37 │ void test("checking every day earns the same as checking once a year", () => {
38 │   let checkedDaily = { ...savings, balance: 100 };
39 │   for (let day = 1; day <= 365; day++) {
40 │     checkedDaily = compoundInterest(checkedDaily, daysLater(day));
41 │   }
42 │
43 │   const checkedOnce = compoundInterest(
44 │     { ...savings, balance: 100 },
45 │     daysLater(365),
46 │   );
47 │
48 │   assert.equal(checkedDaily.balance, checkedOnce.balance);
49 │   assert.equal(checkedDaily.balance, 104);
50 │ });
```
<!-- /code -->

| Test | Proves |
| --- | --- |
| a year at 4% | ₱1,000.00 → ₱1,040.80 (earned ₱40.80) |
| no mutation | the original object is unchanged |
| never paid twice | settling again at the same moment, or for an *earlier* moment, earns 0 |
| daily = yearly | 365 daily settlements of ₱1.00 equal one yearly settlement: 104 centavos |

---

## 3. Rules shared by the screens: `goals.rules.ts`

<!-- code: gobank/src/features/goals/goals.rules.ts -->
**`gobank/src/features/goals/goals.rules.ts`** · all 31 lines

```ts
 1 │ import { peso } from "~/shared/lib/format";
 2 │ import { MAX_TRANSACTION_CENTAVOS } from "~/shared/lib/money";
 3 │
 4 │ export const GOAL_NAME_MAX = 40;
 5 │
 6 │ export type GoalTransfer = "in" | "out";
 7 │
 8 │ export const isValidGoalName = (name: string) => {
 9 │   const length = name.trim().length;
10 │   return length > 0 && length <= GOAL_NAME_MAX;
11 │ };
12 │
13 │ export function goalAmountError(
14 │   typed: string,
15 │   centavos: number,
16 │   available = MAX_TRANSACTION_CENTAVOS,
17 │   direction?: GoalTransfer,
18 │ ) {
19 │   if (!typed.trim()) return null;
20 │   if (!(centavos > 0)) return "Enter an amount above ₱0.00";
21 │
22 │   if (centavos > MAX_TRANSACTION_CENTAVOS) {
23 │     return `Maximum ${peso(MAX_TRANSACTION_CENTAVOS)}`;
24 │   }
25 │
26 │   if (centavos <= available) return null;
27 │
28 │   return direction === "out"
29 │     ? `Only ${peso(available)} is in this goal`
30 │     : `Insufficient balance. You have ${peso(available)}`;
31 │ }
```
<!-- /code -->

| Function | Behavior |
| --- | --- |
| `isValidGoalName` | 1 to 40 characters after trimming |
| `goalAmountError(typed, centavos, available, direction)` | empty → no message; ₱0 → "Enter an amount above ₱0.00"; over ₱1,000,000 → "Maximum ₱1,000,000.00"; more than available → "Only ₱X is in this goal" (out) or "Insufficient balance. You have ₱X" (in) |

<!-- code: gobank/src/features/goals/goals.rules.test.ts -->
**`gobank/src/features/goals/goals.rules.test.ts`** · all 40 lines

```ts
 1 │ import assert from "node:assert/strict";
 2 │ import { test } from "node:test";
 3 │ import { goalAmountError, isValidGoalName } from "./goals.rules";
 4 │
 5 │ void test("an empty amount shows no error while the user is still typing", () => {
 6 │   assert.equal(goalAmountError("", 0), null);
 7 │   assert.equal(goalAmountError("   ", 0), null);
 8 │ });
 9 │
10 │ void test("a zero amount is refused", () => {
11 │   assert.equal(goalAmountError("0", 0), "Enter an amount above ₱0.00");
12 │ });
13 │
14 │ void test("an amount above the transaction limit is refused", () => {
15 │   assert.match(goalAmountError("2000000", 200_000_000) ?? "", /^Maximum/);
16 │ });
17 │
18 │ void test("moving out more than the goal holds names the goal balance", () => {
19 │   assert.equal(
20 │     goalAmountError("700", 70_000, 63_801, "out"),
21 │     "Only ₱638.01 is in this goal",
22 │   );
23 │ });
24 │
25 │ void test("moving in more than the main balance names the main balance", () => {
26 │   assert.equal(
27 │     goalAmountError("700", 70_000, 50_000, "in"),
28 │     "Insufficient balance. You have ₱500.00",
29 │   );
30 │ });
31 │
32 │ void test("an amount within the available balance is accepted", () => {
33 │   assert.equal(goalAmountError("100", 10_000, 50_000, "in"), null);
34 │ });
35 │
36 │ void test("a goal name needs 1 to 40 characters", () => {
37 │   assert.equal(isValidGoalName("Trip"), true);
38 │   assert.equal(isValidGoalName("   "), false);
39 │   assert.equal(isValidGoalName("x".repeat(41)), false);
40 │ });
```
<!-- /code -->

---

## 4. The service: `goals.service.ts`

<!-- code: gobank/src/features/goals/goals.service.ts -->
**`gobank/src/features/goals/goals.service.ts`** · all 119 lines

```ts
  1 │ import { MAX_GOALS } from "~/shared/lib/money";
  2 │ import { db } from "~/server/db";
  3 │ import { AppError, asDatabaseError, fail, MESSAGES } from "~/server/errors";
  4 │ import { moveGoalMoney, settleGoalInterest } from "~/server/ledger";
  5 │ import type { Prisma } from "../../../generated/prisma";
  6 │
  7 │ type SavingsGoalFields = { name?: string; targetAmount?: number | null };
  8 │
  9 │ async function savingsTransaction<T>(
 10 │   work: (tx: Prisma.TransactionClient) => Promise<T>,
 11 │ ) {
 12 │   for (let attempt = 0; attempt < 4; attempt++) {
 13 │     try {
 14 │       return await db.$transaction(work, { isolationLevel: "Serializable" });
 15 │     } catch (error) {
 16 │       const writeConflict = asDatabaseError(error)?.code === "P2034";
 17 │       const changedMeanwhile =
 18 │         error instanceof AppError && error.code === "CONFLICT";
 19 │
 20 │       if (!writeConflict && !changedMeanwhile) throw error;
 21 │     }
 22 │   }
 23 │
 24 │   return fail("CONFLICT", MESSAGES.savingsChanged);
 25 │ }
 26 │
 27 │ export const listGoals = (userId: string) =>
 28 │   savingsTransaction(async (tx) => {
 29 │     const savingsGoals = await tx.savingsGoal.findMany({
 30 │       where: { userId },
 31 │       orderBy: { createdAt: "asc" },
 32 │     });
 33 │
 34 │     const settled: typeof savingsGoals = [];
 35 │     for (const savingsGoal of savingsGoals) {
 36 │       settled.push(await settleGoalInterest(tx, savingsGoal));
 37 │     }
 38 │
 39 │     return settled;
 40 │   });
 41 │
 42 │ const settleOwnedGoal = async (
 43 │   tx: Prisma.TransactionClient,
 44 │   userId: string,
 45 │   id: string,
 46 │   persist = false,
 47 │ ) =>
 48 │   settleGoalInterest(
 49 │     tx,
 50 │     await tx.savingsGoal.findUniqueOrThrow({ where: { id, userId } }),
 51 │     persist,
 52 │   );
 53 │
 54 │ export const getGoal = (userId: string, id: string) =>
 55 │   savingsTransaction(async (tx) => {
 56 │     const savingsGoal = await settleOwnedGoal(tx, userId, id);
 57 │     const transactions = await tx.transaction.findMany({
 58 │       where: { savingsGoalId: id, userId },
 59 │       orderBy: { createdAt: "desc" },
 60 │       take: 20,
 61 │     });
 62 │     return { ...savingsGoal, transactions };
 63 │   });
 64 │
 65 │ export const createGoal = (
 66 │   userId: string,
 67 │   name: string,
 68 │   targetAmount?: number | null,
 69 │ ) =>
 70 │   savingsTransaction(async (tx) => {
 71 │     const count = await tx.savingsGoal.count({ where: { userId } });
 72 │     if (count >= MAX_GOALS) fail("BAD_REQUEST", MESSAGES.goalLimit);
 73 │     return tx.savingsGoal.create({
 74 │       data: {
 75 │         userId,
 76 │         name,
 77 │         targetAmount,
 78 │         interestCalculatedAt: new Date(),
 79 │       },
 80 │     });
 81 │   });
 82 │
 83 │ export const updateGoal = (
 84 │   userId: string,
 85 │   id: string,
 86 │   fields: SavingsGoalFields,
 87 │ ) =>
 88 │   savingsTransaction(async (tx) => {
 89 │     await settleOwnedGoal(tx, userId, id, true);
 90 │     return tx.savingsGoal.update({ where: { id, userId }, data: fields });
 91 │   });
 92 │
 93 │ export const moveMoney = (
 94 │   userId: string,
 95 │   id: string,
 96 │   amountCentavos: number,
 97 │   direction: "in" | "out",
 98 │ ) =>
 99 │   savingsTransaction(async (tx) => {
100 │     await settleOwnedGoal(tx, userId, id, true);
101 │     return moveGoalMoney(
102 │       tx,
103 │       userId,
104 │       id,
105 │       direction === "in" ? amountCentavos : -amountCentavos,
106 │     );
107 │   });
108 │
109 │ export const removeGoal = (userId: string, id: string) =>
110 │   savingsTransaction(async (tx) => {
111 │     const savingsGoal = await settleOwnedGoal(tx, userId, id, true);
112 │
113 │     if (savingsGoal.balance > 0) {
114 │       await moveGoalMoney(tx, userId, savingsGoal.id, -savingsGoal.balance);
115 │     }
116 │
117 │     await tx.savingsGoal.delete({ where: { id, userId, balance: 0 } });
118 │     return { returned: savingsGoal.balance };
119 │   });
```
<!-- /code -->

### `savingsTransaction` (lines 9–25): Serializable + retries

Every GoalSave operation runs through this helper at the **Serializable** isolation level and is retried up to 4 times if PostgreSQL reports a conflict (`P2034`) or if the ledger's compare-and-set saw the goal change (`CONFLICT`).

> **A concrete race it prevents:** a user with 4 goals taps "Create" on two devices at once. At the default isolation level, both transactions could count 4 goals and both insert, ending with **6**. Under Serializable, PostgreSQL notices that the two transactions read and wrote the same set of rows and cancels one; the retry then counts 5 and refuses with "You can have up to 5 goals".

### The operations

| Function | Lines | Steps |
| --- | --- | --- |
| `listGoals` | 27–40 | all goals, oldest first; settle each goal's interest (saved only if at least one centavo was earned) |
| `settleOwnedGoal` | 42–52 | load the goal **by ID and owner** (`where: { id, userId }`): another user's goal ID gives "Not found" |
| `getGoal` | 54–63 | settle, then the goal's last 20 history rows (moves and interest) |
| `createGoal` | 65–81 | refuse a 6th goal; create with `interestCalculatedAt = now`. A duplicate name fails the unique constraint → "That name is already taken" (checked on a real database) |
| `updateGoal` | 83–91 | settle **with `persist = true`**, then save the name and/or target (`null` removes the target) |
| `moveMoney` | 93–107 | settle with `persist = true`, then `moveGoalMoney` (+ in / − out) |
| `removeGoal` | 109–119 | settle with `persist = true`; move the whole balance back to the main account; delete the goal **only if its balance is now 0** (a final guard); return the amount returned |

> **Why `persist = true` before changing a balance?** Interest up to *this moment* must be closed off at the *old* balance before the balance changes; otherwise money moved in now would earn interest for days before it arrived. With `persist`, the settle time and remainder are saved even when less than a centavo was earned.

### Lazy settlement: interest without a background job

GoBank never runs a nightly interest job. Interest is calculated **whenever a goal is read or changed**, from the last settle time to now. Because of the path-independence property in section 2, the result is identical to settling every day. And because settling uses compare-and-set (`settleGoalInterest` updates only if the balance and settle time are unchanged), two simultaneous reads cannot both pay the same interest.

Interest rows (`kind: "interest"`, title "Interest earned · Laptop") record the days, the rate and the goal's new balance. They appear in the goal's **Transactions** tab, not in the main history.

---

## 5. The API

<!-- code: gobank/src/features/goals/goals.router.ts -->
**`gobank/src/features/goals/goals.router.ts`** · all 47 lines

```ts
 1 │ import { z } from "zod";
 2 │ import { centavos } from "~/shared/lib/schemas";
 3 │ import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
 4 │ import { GOAL_NAME_MAX } from "./goals.rules";
 5 │ import {
 6 │   createGoal,
 7 │   getGoal,
 8 │   listGoals,
 9 │   moveMoney,
10 │   removeGoal,
11 │   updateGoal,
12 │ } from "./goals.service";
13 │
14 │ const id = z.object({ id: z.string() });
15 │ const name = z.string().trim().min(1).max(GOAL_NAME_MAX);
16 │
17 │ export const goalsRouter = createTRPCRouter({
18 │   list: protectedProcedure.query(({ ctx }) => listGoals(ctx.userId)),
19 │
20 │   get: protectedProcedure
21 │     .input(id)
22 │     .query(({ ctx, input }) => getGoal(ctx.userId, input.id)),
23 │
24 │   create: protectedProcedure
25 │     .input(z.object({ name, targetAmount: centavos.nullish() }))
26 │     .mutation(({ ctx, input }) =>
27 │       createGoal(ctx.userId, input.name, input.targetAmount),
28 │     ),
29 │
30 │   update: protectedProcedure
31 │     .input(
32 │       id.extend({ name: name.optional(), targetAmount: centavos.nullish() }),
33 │     )
34 │     .mutation(({ ctx, input: { id, ...fields } }) =>
35 │       updateGoal(ctx.userId, id, fields),
36 │     ),
37 │
38 │   move: protectedProcedure
39 │     .input(id.extend({ amount: centavos, direction: z.enum(["in", "out"]) }))
40 │     .mutation(({ ctx, input }) =>
41 │       moveMoney(ctx.userId, input.id, input.amount, input.direction),
42 │     ),
43 │
44 │   remove: protectedProcedure
45 │     .input(id)
46 │     .mutation(({ ctx, input }) => removeGoal(ctx.userId, input.id)),
47 │ });
```
<!-- /code -->

All protected. Names are trimmed and limited to 40 characters (line 15). `targetAmount` is `nullish`: a number sets it, `null` removes it, leaving it out keeps it. `move` takes a positive amount plus a direction (`in` / `out`) rather than a signed number, so the meaning is explicit.

---

## 6. The screens

### `/goals`: `goalsave-screen.tsx`

<!-- code: gobank/src/features/goals/components/goalsave-screen.tsx 120-220 -->
**`gobank/src/features/goals/components/goalsave-screen.tsx`** · lines 120–220

```tsx
120 │ export function GoalSaveScreen() {
121 │   const router = useRouter();
122 │   const utils = api.useUtils();
123 │   const goals = api.goals.list.useQuery(undefined, {
124 │     refetchInterval: REFRESH_EVERY_MS,
125 │   });
126 │   const [creating, setCreating] = useState(false);
127 │   const [notice, setNotice] = useState("");
128 │
129 │   const count = goals.data?.length ?? 0;
130 │   const full = count >= MAX_GOALS;
131 │
132 │   const startCreating = () => {
133 │     setNotice("");
134 │     setCreating(true);
135 │   };
136 │
137 │   const showCreatedGoal = (goal: Goal) => {
138 │     utils.goals.list.setData(undefined, (current) => [
139 │       ...(current ?? []).filter((item) => item.id !== goal.id),
140 │       goal,
141 │     ]);
142 │     setCreating(false);
143 │     setNotice(`“${goal.name}” created.`);
144 │     router.refresh();
145 │   };
146 │
147 │   if (creating) {
148 │     return (
149 │       <CreateGoalForm
150 │         onCancel={() => setCreating(false)}
151 │         onCreated={showCreatedGoal}
152 │       />
153 │     );
154 │   }
155 │
156 │   return (
157 │     <div className="bg-surface-sunken text-ink -mx-6 -mt-8 -mb-10 flex flex-1 flex-col gap-6 px-5 pt-7 pb-28">
158 │       <PageHeader title="GoalSave" back="/dashboard" />
159 │
160 │       <SavingsOverview goals={goals.data} />
161 │
162 │       {notice ? (
163 │         <p
164 │           role="status"
165 │           className="bg-surface-raised text-ink-soft rounded-2xl p-3 text-[12px]"
166 │         >
167 │           {notice}
168 │         </p>
169 │       ) : null}
170 │
171 │       {goals.isPending ? (
172 │         <p role="status" className="text-center text-sm">
173 │           Loading your goals…
174 │         </p>
175 │       ) : null}
176 │
177 │       {goals.isError ? (
178 │         <div role="alert">
179 │           <p className="text-danger mb-3 text-sm">
180 │             {errorMessage(goals.error)}
181 │           </p>
182 │           <button
183 │             type="button"
184 │             disabled={goals.isFetching}
185 │             onClick={() => void goals.refetch()}
186 │             className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-[12px] font-medium focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50"
187 │           >
188 │             Try again
189 │           </button>
190 │         </div>
191 │       ) : null}
192 │
193 │       {goals.data ? (
194 │         <>
195 │           <div className="grid grid-cols-2 items-start gap-x-5 gap-y-8 py-3">
196 │             <NewGoalButton
197 │               full={full}
198 │               wide={count === 0}
199 │               onClick={startCreating}
200 │             />
201 │             {goals.data.map((goal) => (
202 │               <GoalTile key={goal.id} goal={goal} />
203 │             ))}
204 │           </div>
205 │
206 │           {full ? (
207 │             <p
208 │               id="goal-limit"
209 │               className="text-ink-muted text-center text-[11px]"
210 │             >
211 │               Goal limit reached
212 │             </p>
213 │           ) : null}
214 │         </>
215 │       ) : null}
216 │
217 │       <GoMenu />
218 │     </div>
219 │   );
220 │ }
```
<!-- /code -->

- **Lines 123–125:** the list re-fetches every **15 seconds**, so balances visibly grow as interest accrues (each fetch settles interest on the server).
- **Lines 137–145:** after creating a goal, it is added to the cached list immediately (`setData`), a status message says "“Laptop” created.", and the server page is refreshed.
- The overview card (`SavingsOverview`, lines 22–54) shows **Total saved** and "N / 5 goals" with five small bars.
- The **New goal** button is disabled at 5 goals, with "Goal limit reached" as its description (lines 56–82, 206–213).
- Each `GoalTile` shows the progress bubble, name, balance, "4.00% p.a." and the target.

### Creating a goal: `create-goal-form.tsx`

Two steps on one card: **name** (with a live `n/40` counter), then an optional **target** ("Leave blank for no target.", must be ₱0.01–₱1,000,000). The chosen icon (default "Savings") is saved in the browser once the server confirms the goal.

### `/goals/<id>`: `goal-detail.tsx`

<!-- code: gobank/src/features/goals/components/goal-detail.tsx 61-135 -->
**`gobank/src/features/goals/components/goal-detail.tsx`** · lines 61–135

```tsx
 61 │ function GoalContent({ goal }: { goal: Goal }) {
 62 │   const { icon, setIcon } = useGoalIcon(goal.id, goal.name);
 63 │   const [action, setAction] = useState<Action | null>(null);
 64 │   const [message, setMessage] = useState("");
 65 │   const saving = useIsMutating(SAVINGS_CHANGES) > 0;
 66 │
 67 │   const open = (next: Action) => {
 68 │     setMessage("");
 69 │     setAction(next);
 70 │   };
 71 │
 72 │   const finish = (doneMessage: string) => {
 73 │     setAction(null);
 74 │     setMessage(doneMessage);
 75 │   };
 76 │
 77 │   const close = () => setAction(null);
 78 │
 79 │   return (
 80 │     <div className="bg-surface-sunken text-ink -mx-6 -mt-8 -mb-10 flex flex-1 flex-col pt-7">
 81 │       <div className="px-5">
 82 │         <PageHeader title={goal.name} back="/goals" />
 83 │       </div>
 84 │
 85 │       <section className="px-8 pt-7 pb-4 text-center">
 86 │         <GoalBubble
 87 │           icon={icon}
 88 │           balance={goal.balance}
 89 │           target={goal.targetAmount}
 90 │           label={goal.name}
 91 │           large
 92 │         />
 93 │         <h1 className="mt-4 text-[36px] font-bold tracking-tight break-all tabular-nums">
 94 │           {peso(goal.balance)}
 95 │         </h1>
 96 │       </section>
 97 │
 98 │       <ActionButtons disabled={saving} onSelect={open} />
 99 │
100 │       <div className="bg-surface flex-1 rounded-t-[30px] px-5 pt-5 pb-10 shadow-[0_-8px_24px_-20px_#00000080]">
101 │         {message ? (
102 │           <p
103 │             role="status"
104 │             className="bg-brand-soft text-ink-soft mb-4 rounded-2xl p-3 text-sm"
105 │           >
106 │             {message}
107 │           </p>
108 │         ) : null}
109 │
110 │         {action === "in" || action === "out" ? (
111 │           <GoalTransferForm
112 │             key={action}
113 │             goalId={goal.id}
114 │             goalBalance={goal.balance}
115 │             direction={action}
116 │             onDone={finish}
117 │             onCancel={close}
118 │           />
119 │         ) : null}
120 │
121 │         {action === "settings" ? (
122 │           <GoalSettingsForm
123 │             goal={goal}
124 │             icon={icon}
125 │             onIconChange={setIcon}
126 │             onDone={finish}
127 │             onCancel={close}
128 │           />
129 │         ) : null}
130 │
131 │         <GoalTabs goal={goal} />
132 │       </div>
133 │     </div>
134 │   );
135 │ }
```
<!-- /code -->

- **Line 65:** `useIsMutating` with the key `[["goals"]]` matches **any** GoalSave mutation in progress (tRPC mutation keys start with the path), so all action buttons are disabled while anything is saving.
- A large progress bubble, the balance, and three actions: **Transfer in**, **Transfer out**, **Settings**.
- Below: the open form (if any), a success message ("Transfer complete." / "Goal settings saved."), and the tabs.
- The detail also refreshes every 15 seconds (lines 137–141).

### Moving money: `goal-transfer-form.tsx`

<!-- code: gobank/src/features/goals/components/goal-transfer-form.tsx 30-65 -->
**`gobank/src/features/goals/components/goal-transfer-form.tsx`** · lines 30–65

```tsx
30 │ export function GoalTransferForm({
31 │   goalId,
32 │   goalBalance,
33 │   direction,
34 │   onDone,
35 │   onCancel,
36 │ }: {
37 │   goalId: string;
38 │   goalBalance: number;
39 │   direction: GoalTransfer;
40 │   onDone: (message: string) => void;
41 │   onCancel: () => void;
42 │ }) {
43 │   const [amount, setAmount] = useState("");
44 │   const spending = api.account.spending.useQuery();
45 │   const move = api.goals.move.useMutation({
46 │     onSuccess: () => onDone("Transfer complete."),
47 │   });
48 │
49 │   const mainBalance = spending.data?.balance;
50 │   const available =
51 │     direction === "out"
52 │       ? goalBalance
53 │       : (mainBalance ?? MAX_TRANSACTION_CENTAVOS);
54 │
55 │   const centavos = toCentavos(Number(amount));
56 │   const error = goalAmountError(amount, centavos, available, direction);
57 │   const valid = centavos > 0 && !error;
58 │
59 │   const hint = transferHint(direction, goalBalance, mainBalance);
60 │
61 │   const submit = () => {
62 │     if (!valid || move.isPending) return;
63 │
64 │     move.mutate({ id: goalId, amount: centavos, direction });
65 │   };
```
<!-- /code -->

"Transfer out" is limited by the goal balance ("Available: ₱X"); "Transfer in" by the main balance, loaded from `account.spending` ("From your main balance of ₱X"). Errors come from `goalAmountError`, and the server checks again.

### Settings and closing: `goal-settings-form.tsx`

Change the icon, rename, change or clear the target, **Save settings**. **Close goal** asks for confirmation first: "Close this goal? ₱X will return to your main account. This goal will be removed, and past transfers will stay in your account activity." Then **Close goal and return savings** ("Closing goal…"), which returns to `/goals`.

### The tabs: `goal-tabs.tsx`

<!-- code: gobank/src/features/goals/components/goal-tabs.tsx 57-148 -->
**`gobank/src/features/goals/components/goal-tabs.tsx`** · lines 57–148

```tsx
 57 │ function GoalTransactions({ goal }: { goal: Goal }) {
 58 │   if (goal.transactions.length === 0) {
 59 │     return (
 60 │       <p className="text-ink-muted py-7 text-center text-sm">
 61 │         No transfers yet
 62 │       </p>
 63 │     );
 64 │   }
 65 │
 66 │   return (
 67 │     <ul className="divide-line divide-y">
 68 │       {goal.transactions.map((entry) => {
 69 │         const movedIntoGoal = entry.kind === "stash" && entry.amount > 0;
 70 │
 71 │         return (
 72 │           <li
 73 │             key={entry.id}
 74 │             className="flex items-center justify-between gap-4 py-4"
 75 │           >
 76 │             <div>
 77 │               <p className="text-[13px] font-medium">{entry.title}</p>
 78 │               <p className="text-ink-muted mt-1 text-[11px]">
 79 │                 {shortDate(entry.createdAt)}
 80 │               </p>
 81 │             </div>
 82 │             <span
 83 │               className={cn(
 84 │                 "text-[13px] font-semibold tabular-nums",
 85 │                 movedIntoGoal ? "text-ink" : "text-brand",
 86 │               )}
 87 │             >
 88 │               {movedIntoGoal ? "−" : "+"}
 89 │               {peso(Math.abs(entry.amount))}
 90 │             </span>
 91 │           </li>
 92 │         );
 93 │       })}
 94 │     </ul>
 95 │   );
 96 │ }
 97 │
 98 │ export function GoalTabs({ goal }: { goal: Goal }) {
 99 │   const [tab, setTab] = useState<Tab>("overview");
100 │
101 │   const switchWithArrows = (event: KeyboardEvent) => {
102 │     if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
103 │
104 │     event.preventDefault();
105 │     const next = otherTab(tab);
106 │     setTab(next);
107 │     document.getElementById(`goal-${next}`)?.focus();
108 │   };
109 │
110 │   return (
111 │     <>
112 │       <div
113 │         role="tablist"
114 │         aria-label="Goal details"
115 │         className="mb-5 flex rounded-2xl border border-white/[.07] bg-[#121214] p-1"
116 │       >
117 │         {TABS.map(({ id, label }) => (
118 │           <button
119 │             key={id}
120 │             id={`goal-${id}`}
121 │             role="tab"
122 │             aria-selected={tab === id}
123 │             aria-controls="goal-panel"
124 │             tabIndex={tab === id ? 0 : -1}
125 │             onKeyDown={switchWithArrows}
126 │             onClick={() => setTab(id)}
127 │             className={cn(
128 │               "focus-visible:outline-sky h-11 flex-1 rounded-xl text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
129 │               tab === id
130 │                 ? "bg-tile-hover text-white"
131 │                 : "text-ink-muted hover:text-white",
132 │             )}
133 │           >
134 │             {label}
135 │           </button>
136 │         ))}
137 │       </div>
138 │
139 │       <div id="goal-panel" role="tabpanel" aria-labelledby={`goal-${tab}`}>
140 │         {tab === "overview" ? (
141 │           <GoalOverview goal={goal} />
142 │         ) : (
143 │           <GoalTransactions goal={goal} />
144 │         )}
145 │       </div>
146 │     </>
147 │   );
148 │ }
```
<!-- /code -->

- **Overview:** annual growth rate (`4.00% p.a.`), target ("Not set"), progress (rounded down, capped at 100%, "—" without a target).
- **Transactions:** up to 20 movements and interest rows. The stored `amount` is from the **main account's** point of view (moving ₱500 *into* the goal is −₱500 for the main account), so for a `stash` row a positive amount means money **left** the goal. The screen therefore shows `−` for positive `stash` amounts and `+` for everything else, including interest. (The variable is named `movedIntoGoal`, but true actually means "moved into the main account", so read the logic, not the name.)
- **Accessibility (lines 101–108, 112–145):** a real ARIA tab pattern: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, only the active tab is focusable (`tabIndex`), and the **Left/Right arrow keys** switch tabs.

### The pictures: `goal-bubble.tsx`, `goal-art.tsx`, `goal-icon-picker.tsx`, `use-goal-icon.ts`

- `GoalBubble` draws a circular progress ring in SVG. `pathLength="100"` makes the circle 100 units long, so `strokeDasharray="45 100"` draws exactly 45%. Its label reads "Laptop: 45% of target".
- `GoalArt` has six icons: Savings, Travel, Home, Gifts, Car, Health. `iconForGoal` guesses one from the name with regular expressions (`trip|travel|holiday|vacation` → Travel, `home|house|rent` → Home, `car|drive` → Car, `birthday|gift|wedding|party` → Gifts, `health|emergency|family` → Health, otherwise Savings).
- `GoalIconPicker` opens a native `<dialog>` bottom sheet with the six options (`aria-pressed`).
- `use-goal-icon.ts` stores the chosen icon in **`localStorage`** under `gobank:goal-icon:<goalId>`, wrapped in `try/catch` because storage can be unavailable. The icon is a *display preference only*: it is not in the database, so it does not follow the user to another device ([Limitations](../09-defense/03-limitations-and-future-work.md)).

---

## 7. Tests on a real database

`scripts/verify-core.ts` → `checkSavings`:

1. Create a goal with a ₱1,000 target and move ₱100 in.
2. Pretend a year passed (set `interestCalculatedAt` one year back).
3. Opening the goal gives a balance between ₱104.00 and ₱104.20 (the year's interest).
4. Opening it **again** gives the **same** balance (no double payment) and the **main balance is unchanged** (interest goes to the goal).
5. Another user cannot open or close the goal.
6. Closing returns exactly the goal's balance to the main account and deletes the goal.

---

## Defense questions

**Q: How is the interest computed?**
A: Daily compounding at 4% a year: balance × (1 + 0.04/365)^days, where days include fractions. The result is rounded down to whole centavos, and the fraction is carried in `interestRemainder` so it is never lost. ₱1,000 for one year becomes ₱1,040.80.

**Q: Do you run a scheduled job every night to add interest?**
A: No. Interest is settled whenever a goal is viewed or changed, covering the exact time since the last settlement. Because compounding is multiplicative and we carry the remainder, settling once or every day gives the same result; our unit test proves 365 daily settlements equal one yearly settlement.

**Q: How do you stop interest from being paid twice if the goal is opened on two devices?**
A: Settlement updates the goal only if its balance and last-settled time are still what we read (compare-and-set). The second device's update matches nothing, so its transaction retries, sees the already-settled goal, and pays nothing more. GoalSave transactions also run at the Serializable isolation level.

**Q: Why the 5-goal limit?**
A: It keeps the feature simple for students and bounds the work done when settling interest on every list. It is the constant `MAX_GOALS` in `money.ts`, enforced on the server and shown in the UI.

---

## Check yourself

<details>
<summary>₱1,000 has been in a goal for exactly one day. What does the user see, and what is stored?</summary>

₱1,000.10 (earned ₱0.10). The stored `interestRemainder` is about 0.9589 centavo, and the settle time moves to now.
</details>

<details>
<summary>Why does <code>removeGoal</code> delete with <code>where: { id, userId, balance: 0 }</code>?</summary>

As a final guard: the goal is deleted only if all its money has been moved back to the main balance. If anything had gone wrong, the delete would fail and the whole transaction would roll back.
</details>

<details>
<summary>Why is <code>updateGoal</code> settled with <code>persist = true</code> even though it only renames the goal?</summary>

Every operation that writes to a goal (update, move, remove) first settles it with `persist = true`, which keeps one simple rule: a goal is always fully settled right before any change. For a rename, this also means interest earned *before* the rename is recorded under the old name ("Interest earned · Old name"), and interest after it under the new one.
</details>
