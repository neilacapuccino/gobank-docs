# The ledger: `src/server/ledger.ts`

**What you will learn:** the 296 lines that move every peso in GoBank Express. You will understand each function line by line, the guarantees it gives (no overdraft, no lost money, no double spend), and how it behaves when things happen at the same time or go wrong. **This is the page most worth mastering for the defense.**

Prerequisite: [Prisma and PostgreSQL](../01-foundations/04-prisma-and-postgresql.md) (transactions, conditional updates, row locks).

---

## 1. Why one ledger?

Every feature that touches money (deposit, transfer, bills, load, rewards, GoalSave, Bitcoin) calls the same few functions in this file. The rules are written **once**, so they cannot drift apart between features.

| Function | Does | Called by |
| --- | --- | --- |
| `post()` | change a user's balance and points **and** write the history row, atomically | everything below, plus deposit, rewards and Bitcoin |
| `spend()` | `post()` a payment with card and daily-limit checks, and award points | bills, load, and `transfer()` |
| `transfer()` | `spend()` from the sender + `post()` to the receiver, one reference | send money, paying a money request |
| `spentToday()` | how much was spent today (Manila time) | `spend()`, the `account.spending` screen data |
| `moveGoalMoney()` | move money between the main balance and a goal | GoalSave transfer in/out, closing a goal |
| `settleGoalInterest()` | add earned interest to a goal | every GoalSave read and change |

### The guarantees (invariants)

1. **A balance is never negative.** (`post()`'s condition + the database `CHECK`)
2. **A balance never exceeds 2,147,483,647 centavos**, the `INTEGER` limit. (`post()`'s condition)
3. **Points are never negative or overflow.** (same condition)
4. **Every balance change has exactly one history row**, written in the same transaction, with the balance right after it.
5. **A transfer creates no money and loses none:** the two rows share one reference and sum to zero.
6. **A locked card cannot pay, and card spending today never exceeds the daily limit**, even with simultaneous requests (row lock).
7. **A goal balance is never negative and interest is never paid twice** (conditional updates + compare-and-set).

---

## 2. Types and constants (lines 1–36)

<!-- code: gobank/src/server/ledger.ts 1-36 -->
**`gobank/src/server/ledger.ts`** · lines 1–36

```ts
 1 │ import {
 2 │   MAX_BALANCE_CENTAVOS,
 3 │   MAX_REWARD_POINTS,
 4 │   pointsEarned,
 5 │ } from "~/shared/lib/money";
 6 │ import { compoundInterest } from "~/shared/lib/savings-interest";
 7 │ import { newReference } from "~/server/identifiers";
 8 │ import { asDatabaseError, fail, MESSAGES } from "~/server/errors";
 9 │ import type {
10 │   CardKind,
11 │   Prisma,
12 │   SavingsGoal,
13 │   TransactionKind,
14 │ } from "../../generated/prisma";
15 │
16 │ type Tx = Prisma.TransactionClient;
17 │
18 │ type Party = { id: string; username: string };
19 │
20 │ type Entry = {
21 │   userId: string;
22 │   kind: TransactionKind;
23 │   title: string;
24 │   amount: number;
25 │   reference?: string;
26 │   points?: number;
27 │   counterpartyId?: string;
28 │   savingsGoalId?: string;
29 │   billerId?: string;
30 │   details?: Prisma.InputJsonObject;
31 │ };
32 │
33 │ type Spending = Omit<Entry, "points"> & { card: CardKind };
34 │
35 │ const SPENDING_KINDS: TransactionKind[] = ["transfer", "bill", "load"];
36 │ const KINDS_THAT_EARN_POINTS: TransactionKind[] = ["transfer", "bill"];
```
<!-- /code -->

- **Line 16:** `Tx` is Prisma's *transaction client*. Every ledger function takes `tx` as its first argument, which **forces callers to run it inside `db.$transaction`**; there is no way to call the ledger outside a transaction by accident.
- **Line 18:** `Party`: what a transfer needs to know about each person.
- **Lines 20–31:** `Entry`: one history row to post. `amount` is signed (+ in, − out). `reference` is optional (a new one is generated unless the caller shares one). `details` is the flexible JSON.
- **Line 33:** `Spending` = an `Entry` without `points` (the ledger decides points) plus the `card` used.
- **Line 35:** the kinds that count toward the **daily limit**: transfer, bill, load. (Deposits, GoalSave moves, rewards and Bitcoin trades do not.)
- **Line 36:** the kinds that **earn points**: transfer and bill. (Load counts toward the limit but earns no points.)

---

## 3. `startOfManilaDay()`: when does "today" begin? (lines 38–44)

<!-- code: gobank/src/server/ledger.ts 38-44 -->
**`gobank/src/server/ledger.ts`** · lines 38–44

```ts
38 │ const startOfManilaDay = (now: Date) => {
39 │   const manilaDate = now.toLocaleDateString("en-CA", {
40 │     timeZone: "Asia/Manila",
41 │   });
42 │
43 │   return new Date(`${manilaDate}T00:00:00+08:00`);
44 │ };
```
<!-- /code -->

Servers usually run in UTC, but the daily limit must reset at **midnight in the Philippines** (UTC+8).

1. `toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })` gives the Manila calendar date as `YYYY-MM-DD` (the Canadian English format happens to be ISO-like).
2. That date at `00:00:00+08:00` is the exact instant Manila's day started.

Example: at 2026-11-03 **17:30 UTC** it is already 2026-11-04 01:30 in Manila, so "today" starts at 2026-11-04 00:00 +08:00 (= 2026-11-03 16:00 UTC). A payment made at 23:59 Manila time and one at 00:01 count toward different days.

---

## 4. Turning "no row matched" into a clear message (lines 46–78)

<!-- code: gobank/src/server/ledger.ts 46-78 -->
**`gobank/src/server/ledger.ts`** · lines 46–78

```ts
46 │ async function orFailWith<T>(
47 │   conditionalUpdate: Promise<T>,
48 │   explainFailure: string | (() => Promise<string>),
49 │ ) {
50 │   try {
51 │     return await conditionalUpdate;
52 │   } catch (error) {
53 │     const noRowMatched = asDatabaseError(error)?.code === "P2025";
54 │     if (!noRowMatched) throw error;
55 │
56 │     const message =
57 │       typeof explainFailure === "string"
58 │         ? explainFailure
59 │         : await explainFailure();
60 │     return fail("BAD_REQUEST", message);
61 │   }
62 │ }
63 │
64 │ async function whyPostFailed(
65 │   tx: Tx,
66 │   userId: string,
67 │   amount: number,
68 │   points: number,
69 │ ) {
70 │   const current = await tx.user.findUniqueOrThrow({
71 │     where: { id: userId },
72 │     select: { balance: true, points: true },
73 │   });
74 │
75 │   if (current.balance + amount < 0) return MESSAGES.insufficientBalance;
76 │   if (current.points + points < 0) return MESSAGES.notEnoughPoints;
77 │   return MESSAGES.accountLimit;
78 │ }
```
<!-- /code -->

**`orFailWith(update, explain)`** runs a *conditional* update (lines 50–51). If the condition was false, no row matched and Prisma throws `P2025` (line 53). Any other error is re-thrown unchanged (line 54). For `P2025`, it gets a message (a fixed string, or a function that works it out, lines 56–59) and throws `fail("BAD_REQUEST", message)` (line 60).

**`whyPostFailed()`** works out *which* condition failed by reading the current values inside the same transaction:

| Check (lines 75–77) | Message |
| --- | --- |
| balance + amount < 0 | Insufficient balance |
| points + points change < 0 | Not enough points |
| otherwise (must be the upper limit) | This transaction would exceed the account limit |

> **Why not check first and update after?** Because between "check" and "update" another request could change the balance (a race). The update *is* the check; the explanation is only computed after it has already failed safely.

---

## 5. `post()`: the only code that changes a balance (lines 80–115)

<!-- code: gobank/src/server/ledger.ts 80-115 -->
**`gobank/src/server/ledger.ts`** · lines 80–115

```ts
 80 │ export async function post(
 81 │   tx: Tx,
 82 │   { userId, amount, points = 0, reference = newReference(), ...rest }: Entry,
 83 │ ) {
 84 │   const moneyOut = Math.max(0, -amount);
 85 │   const moneyIn = Math.max(0, amount);
 86 │   const pointsOut = Math.max(0, -points);
 87 │   const pointsIn = Math.max(0, points);
 88 │
 89 │   const user = await orFailWith(
 90 │     tx.user.update({
 91 │       where: {
 92 │         id: userId,
 93 │         balance: { gte: moneyOut, lte: MAX_BALANCE_CENTAVOS - moneyIn },
 94 │         points: { gte: pointsOut, lte: MAX_REWARD_POINTS - pointsIn },
 95 │       },
 96 │       data: {
 97 │         balance: { increment: amount },
 98 │         points: { increment: points },
 99 │       },
100 │       select: { balance: true },
101 │     }),
102 │     () => whyPostFailed(tx, userId, amount, points),
103 │   );
104 │
105 │   return tx.transaction.create({
106 │     data: {
107 │       ...rest,
108 │       userId,
109 │       amount,
110 │       points,
111 │       reference,
112 │       balanceAfter: user.balance,
113 │     },
114 │   });
115 │ }
```
<!-- /code -->

### Line by line

| Lines | What happens |
| --- | --- |
| 82 | Destructure the entry; `points` defaults to 0 and `reference` to a fresh `GB…` code |
| 84–87 | Split the signed change into "out" and "in" parts. For −₱100: `moneyOut = 10000`, `moneyIn = 0`. For +₱100: `moneyOut = 0`, `moneyIn = 10000`. Same for points |
| 90–101 | **The conditional update.** Find the user **only if** `moneyOut ≤ balance ≤ MAX − moneyIn` and `pointsOut ≤ points ≤ MAX − pointsIn`, then add `amount` and `points` in the same SQL statement. Return the **new** balance |
| 102 | If no row matched, explain why (section 4) |
| 105–114 | Insert the history row with everything from the entry, plus the final `balanceAfter` |

### The real SQL

This is what PostgreSQL actually received for a deposit, captured from its statement log while preparing these docs (`$1…$9` are parameters, sent separately from the SQL text):

```sql
BEGIN;
UPDATE "public"."User"
SET "balance" = ("public"."User"."balance" + $1),
    "points"  = ("public"."User"."points" + $2),
    "updatedAt" = $3
WHERE ("public"."User"."id" = $4
  AND ("public"."User"."balance" >= $5 AND "public"."User"."balance" <= $6
   AND "public"."User"."points"  >= $7 AND "public"."User"."points"  <= $8))
RETURNING "public"."User"."id", "public"."User"."balance";
INSERT INTO "public"."Transaction" ("id","reference","kind","title","amount","balanceAfter","points","userId","createdAt")
VALUES ($1,$2,CAST($3::text AS "public"."TransactionKind"),$4,$5,$6,$7,$8,$9) RETURNING …;
COMMIT;
```

The comparison and the change happen in **one atomic `UPDATE` statement**. If another transaction is changing the same row, PostgreSQL makes this one wait, then re-checks the `WHERE` against the new values before updating. No request can slip in between the check and the change. If the `WHERE` matches no row, `RETURNING` gives nothing, Prisma raises `P2025`, and `orFailWith` explains it.

### Worked examples

| Balance | Entry | Result |
| --- | --- | --- |
| ₱500.00 | −₱100.00 | ✅ balance ₱400.00, history row with `balanceAfter` 40000 |
| ₱50.00 | −₱100.00 | ❌ no row matched → "Insufficient balance" → transaction rolled back |
| ₱21,474,800.00 | +₱100.00 | ❌ would exceed 2,147,483,647 centavos → "This transaction would exceed the account limit" |
| 150 points | +₱1.00, −100 points (reward redemption) | ✅ balance +100, points 50 |
| 50 points | +₱1.00, −100 points | ❌ "Not enough points" |

---

## 6. `spentToday()`: card spending since Manila midnight (lines 117–129)

<!-- code: gobank/src/server/ledger.ts 117-129 -->
**`gobank/src/server/ledger.ts`** · lines 117–129

```ts
117 │ export async function spentToday(tx: Tx, userId: string) {
118 │   const today = await tx.transaction.aggregate({
119 │     where: {
120 │       userId,
121 │       kind: { in: SPENDING_KINDS },
122 │       amount: { lt: 0 },
123 │       createdAt: { gte: startOfManilaDay(new Date()) },
124 │     },
125 │     _sum: { amount: true },
126 │   });
127 │
128 │   return -(today._sum.amount ?? 0);
129 │ }
```
<!-- /code -->

Sums the user's **outgoing** (`amount < 0`) rows of the spending kinds since the start of the Manila day, using the `(userId, createdAt DESC)` index. The sum is negative, so line 128 flips the sign (and treats "no rows" as 0). One shared total covers **both** cards: the daily limit is per account, not per card.

---

## 7. `spend()`: paying with a card (lines 131–169)

<!-- code: gobank/src/server/ledger.ts 131-169 -->
**`gobank/src/server/ledger.ts`** · lines 131–169

```ts
131 │ export async function spend(tx: Tx, { card, ...entry }: Spending) {
132 │   await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${entry.userId} FOR UPDATE`;
133 │
134 │   const user = await tx.user.findUniqueOrThrow({
135 │     where: { id: entry.userId },
136 │     select: {
137 │       cardDailyLimit: true,
138 │       cards: {
139 │         where: { kind: card },
140 │         select: { brand: true, number: true, locked: true },
141 │       },
142 │     },
143 │   });
144 │
145 │   const usedCard = user.cards[0];
146 │   if (!usedCard) return fail("NOT_FOUND", MESSAGES.cardNotFound);
147 │   if (usedCard.locked) fail("BAD_REQUEST", MESSAGES.cardLocked);
148 │
149 │   const spent = await spentToday(tx, entry.userId);
150 │   if (spent + entry.amount > user.cardDailyLimit) {
151 │     fail("BAD_REQUEST", MESSAGES.overDailyLimit);
152 │   }
153 │
154 │   const earnsPoints = KINDS_THAT_EARN_POINTS.includes(entry.kind);
155 │
156 │   return post(tx, {
157 │     ...entry,
158 │     amount: -entry.amount,
159 │     points: earnsPoints ? pointsEarned(entry.amount) : 0,
160 │     details: {
161 │       ...entry.details,
162 │       card: {
163 │         kind: card,
164 │         network: usedCard.brand,
165 │         last4: usedCard.number.slice(-4),
166 │       },
167 │     },
168 │   });
169 │ }
```
<!-- /code -->

| Lines | Step | Why |
| --- | --- | --- |
| **132** | `SELECT … FOR UPDATE` on the user's row | **Locks the account.** Any other spending by the same user waits here until this transaction ends, so the daily total computed below cannot be invalidated by a simultaneous payment |
| 134–143 | Read the daily limit and the **chosen card** (`kind`) | Only the fields needed |
| 145–146 | No such card → "Your card details were not found." | Defensive |
| 147 | Card locked → "This card is locked. Unlock it or pay with your other card." | Per-card lock |
| 149–152 | spent today + this amount > limit → "This goes over your daily limit" | A limit of ₱0 blocks all spending |
| 154 | Does this kind earn points? | transfer, bill |
| 156–168 | `post()` the **negative** amount, `floor(amount / 5000)` points if earned, and record the card used: `{ kind, network, last4 }` | The receipt and history can show "Paid with Physical · Discover •••• 8954" without storing the full card number in the history |

> **Why is a row lock needed here when `post()` already has a conditional update?** The balance rule involves one row, so a conditional update can enforce it alone. The daily-limit rule involves the **sum of many rows** (today's payments). Without the lock, two ₱15,000 payments against a ₱20,000 limit could both compute "₱0 spent today" at the same time and both pass. The lock makes them run one after the other, so the second one sees ₱15,000 already spent and is refused.

---

## 8. `transfer()`: person to person (lines 171–210)

<!-- code: gobank/src/server/ledger.ts 171-210 -->
**`gobank/src/server/ledger.ts`** · lines 171–210

```ts
171 │ export async function transfer(
172 │   tx: Tx,
173 │   from: Party,
174 │   to: Party,
175 │   amount: number,
176 │   card: CardKind,
177 │   note?: string | null,
178 │ ) {
179 │   await tx.$queryRaw`
180 │     SELECT "id" FROM "User"
181 │     WHERE "id" IN (${from.id}, ${to.id})
182 │     ORDER BY "id" FOR UPDATE
183 │   `;
184 │
185 │   const reference = newReference();
186 │   const details = note ? { note } : undefined;
187 │
188 │   const sent = await spend(tx, {
189 │     userId: from.id,
190 │     kind: "transfer",
191 │     title: `Transfer to @${to.username}`,
192 │     amount,
193 │     reference,
194 │     counterpartyId: to.id,
195 │     details,
196 │     card,
197 │   });
198 │
199 │   await post(tx, {
200 │     userId: to.id,
201 │     kind: "transfer",
202 │     title: `Transfer from @${from.username}`,
203 │     amount,
204 │     reference,
205 │     counterpartyId: from.id,
206 │     details,
207 │   });
208 │
209 │   return sent;
210 │ }
```
<!-- /code -->

1. **Lines 179–183: lock both people, always in ID order.** If Ana sends to Ben while Ben sends to Ana, both transactions try to lock the *lower ID first*. One waits for the other instead of each holding one lock and waiting forever (a **deadlock**).
2. **Line 185:** one reference for both sides.
3. **Line 186:** the note is stored only if there is one.
4. **Lines 188–197:** the sender's side is a full `spend()`: card, lock, daily limit, balance, points, "Transfer to @ben".
5. **Lines 199–207:** the receiver's side is a plain `post()` credit: no card, no limit, no points, "Transfer from @ana". It can still fail if the receiver's balance would exceed the maximum, in which case the **whole transfer** rolls back, including the sender's debit.
6. **Line 209:** return the sender's row; it becomes the receipt.

The integration test checks that the two rows of a transfer exist, share the reference and **sum to exactly zero** (`verify-core.ts`, `checkTransfersAndRequests`).

---

## 9. `moveGoalMoney()`: main balance ⇄ GoalSave (lines 212–235)

<!-- code: gobank/src/server/ledger.ts 212-235 -->
**`gobank/src/server/ledger.ts`** · lines 212–235

```ts
212 │ export async function moveGoalMoney(
213 │   tx: Tx,
214 │   userId: string,
215 │   savingsGoalId: string,
216 │   amount: number,
217 │ ) {
218 │   const savingsGoal = await orFailWith(
219 │     tx.savingsGoal.update({
220 │       where: { id: savingsGoalId, userId, balance: { gte: -amount } },
221 │       data: { balance: { increment: amount } },
222 │     }),
223 │     MESSAGES.notEnoughInGoal,
224 │   );
225 │
226 │   const action = amount > 0 ? "deposit" : "withdrawal";
227 │
228 │   return post(tx, {
229 │     userId,
230 │     kind: "stash",
231 │     title: `GoalSave ${action} · ${savingsGoal.name}`,
232 │     amount: -amount,
233 │     savingsGoalId,
234 │   });
235 │ }
```
<!-- /code -->

`amount > 0` means "into the goal", `amount < 0` means "out of the goal".

1. **Lines 218–224:** update the goal **only if** it belongs to this user **and** holds at least what is being taken out (`balance >= -amount`; for a deposit `-amount` is negative, so this is always true). Otherwise: "Not enough in this goal".
2. **Lines 226–234:** `post()` the **opposite** amount to the main balance with kind `stash` (the historical name of GoalSave) and a link to the goal: moving ₱500 *into* a goal posts −₱500 to the main balance ("GoalSave deposit · Laptop").

If the main balance is too low for a deposit, `post()` fails and the goal's increment from step 1 is rolled back too. Money moves between the two places atomically or not at all.

---

## 10. GoalSave interest (lines 237–296)

<!-- code: gobank/src/server/ledger.ts 237-296 -->
**`gobank/src/server/ledger.ts`** · lines 237–296

```ts
237 │ async function recordInterest(
238 │   tx: Tx,
239 │   savingsGoal: SavingsGoal,
240 │   result: ReturnType<typeof compoundInterest>,
241 │ ) {
242 │   const user = await tx.user.findUniqueOrThrow({
243 │     where: { id: savingsGoal.userId },
244 │     select: { balance: true },
245 │   });
246 │
247 │   await tx.transaction.create({
248 │     data: {
249 │       userId: savingsGoal.userId,
250 │       savingsGoalId: savingsGoal.id,
251 │       reference: newReference(),
252 │       kind: "interest",
253 │       title: `Interest earned · ${savingsGoal.name}`,
254 │       amount: result.earned,
255 │       balanceAfter: user.balance,
256 │       details: {
257 │         savingsBalanceAfter: result.balance,
258 │         annualRate: savingsGoal.annualInterestRate,
259 │         days: result.days,
260 │       },
261 │     },
262 │   });
263 │ }
264 │
265 │ export async function settleGoalInterest(
266 │   tx: Tx,
267 │   savingsGoal: SavingsGoal,
268 │   persist = false,
269 │ ) {
270 │   const result = compoundInterest(savingsGoal, new Date());
271 │
272 │   const nothingToSave = result.days === 0 || (result.earned === 0 && !persist);
273 │   if (nothingToSave) return savingsGoal;
274 │
275 │   const settled = {
276 │     balance: result.balance,
277 │     interestRemainder: result.interestRemainder,
278 │     interestCalculatedAt: result.interestCalculatedAt,
279 │     updatedAt: result.interestCalculatedAt,
280 │   };
281 │
282 │   const updated = await tx.savingsGoal.updateMany({
283 │     where: {
284 │       id: savingsGoal.id,
285 │       userId: savingsGoal.userId,
286 │       balance: savingsGoal.balance,
287 │       interestCalculatedAt: savingsGoal.interestCalculatedAt,
288 │     },
289 │     data: settled,
290 │   });
291 │   if (updated.count !== 1) fail("CONFLICT", MESSAGES.savingsChanged);
292 │
293 │   if (result.earned > 0) await recordInterest(tx, savingsGoal, result);
294 │
295 │   return { ...savingsGoal, ...settled };
296 │ }
```
<!-- /code -->

### `settleGoalInterest(tx, goal, persist)`

1. **Line 270:** compute interest from `interestCalculatedAt` until now with `compoundInterest()` (the math is explained in [GoalSave](../05-features/08-goalsave.md)).
2. **Lines 272–273:** nothing to save if no time passed, or if less than one whole centavo was earned and we are only *reading* (`persist = false`). The fraction is not lost: `interestCalculatedAt` does not move, so the next calculation covers the longer period.
3. **Lines 275–280:** the new state: whole-centavo balance, the leftover fraction of a centavo, and the new "settled until" time.
4. **Lines 282–291: compare-and-set.** Update the goal **only if** its balance and settle time are still exactly what we read. If another request settled or changed it meanwhile, `count` is 0 and we throw `CONFLICT` "Your savings changed"; `savingsTransaction` in `goals.service.ts` then retries the whole operation (up to 4 times). Interest can therefore **never be paid twice**.
5. **Line 293:** if at least one centavo was earned, write an `interest` history row.
6. **Line 295:** return the goal with its settled values.

`persist = true` is used right before a goal's balance changes (moving money, editing, closing): the books must be closed at that instant even if less than a centavo was earned, so the new balance starts earning from now.

### `recordInterest()` (lines 237–263)

Writes the `interest` row. Interest goes into the **goal**, not the main balance, so `amount` is the interest earned while `balanceAfter` is the **unchanged** main balance (lines 242–245, 255). The details keep the goal's new balance, the rate and the number of days, which is enough to audit the calculation. These rows are excluded from the main history and shown in the goal's Transactions tab.

---

## 11. Scenarios panels ask about

| Scenario | What happens |
| --- | --- |
| **Double tap on "Send"** | The UI ignores the second tap while the first is pending. Even if both reach the server, `spend()` locks the account, so they run one after the other, and the second is checked against the reduced balance and today's new total |
| **20 payments at the same instant** | Measured: 20 × ₱400 from ₱5,000 → exactly 12 succeeded, 8 "Insufficient balance", final ₱200, total money unchanged ([experiment](../experiments/concurrent-transfers.ts)) |
| **Ana → Ben and Ben → Ana at the same time** | Both lock the two rows in ID order, so one waits and then proceeds. No deadlock |
| **Server crash halfway through a transfer** | No `COMMIT` → PostgreSQL rolls back both balance updates and both history rows |
| **Receiver's balance at the maximum** | The receiver's `post()` fails ("exceed the account limit") → the sender's debit is rolled back too |
| **Paying with a locked card** | Refused before any money moves; the other card still works |
| **Two ₱15,000 bills against a ₱20,000 daily limit, at once** | The row lock serializes them; the second is refused with "This goes over your daily limit" |
| **Moving ₱1,000 out of a goal holding ₱600** | The goal's conditional update matches no row → "Not enough in this goal"; nothing changes |
| **Opening the same goal on two devices while interest is due** | Both try to settle; one wins the compare-and-set; the other gets a conflict and retries, sees the settled state, and pays nothing twice |

---

## Defense questions

**Q: How do you prevent negative balances?**
A: Three layers. The balance update in `post()` only matches the row if `balance >= amount to take out`, which is checked and applied in one atomic SQL statement. If it fails, the whole transaction rolls back with "Insufficient balance". And the database has a `CHECK (balance >= 0)` constraint as a final safety net.

**Q: How do you make sure a transfer is all-or-nothing?**
A: `transfer()` runs inside a single database transaction: lock both accounts, debit the sender, write the sender's row, credit the receiver, write the receiver's row. Any error, including a refused rule, throws and PostgreSQL rolls back every step.

**Q: Why lock the rows if the update is already conditional?**
A: The balance rule is about one row, but the daily-limit rule is about the sum of today's payments, many rows. Locking the account row makes concurrent payments by the same user wait for each other, so the daily total each one reads is current.

**Q: How do you avoid deadlocks?**
A: Transfers lock both users in a fixed order (by ID) before doing anything else, so two opposite transfers always request locks in the same order.

**Q: Why record `balanceAfter` in every transaction?**
A: It makes every receipt and statement self-explanatory and auditable without recalculating history, and it is written in the same atomic step as the balance change, so it is always correct.

---

## Check yourself

<details>
<summary>Why does every ledger function take <code>tx</code> instead of using <code>db</code>?</summary>

So it can only run inside a database transaction. All of its writes then commit or roll back together with the caller's other writes.
</details>

<details>
<summary>A user has a ₱20,000 daily limit and already paid ₱19,950 in bills today. They buy ₱100 of load. What happens?</summary>

Load is a spending kind, so `spentToday` = ₱19,950 and ₱19,950 + ₱100 > ₱20,000 → "This goes over your daily limit". (Load earns no points either way.)
</details>

<details>
<summary>Does buying Bitcoin count toward the daily card limit?</summary>

No. Bitcoin trades are `exchange` rows posted with `post()`, not `spend()`, and `exchange` is not in `SPENDING_KINDS`.
</details>

<details>
<summary>Why is the interest row's <code>balanceAfter</code> not increased by the interest?</summary>

`balanceAfter` always means the **main** balance. Interest is added to the goal's balance, not the main balance.
</details>
