# Rewards (GoRewards points)

**What you will learn:** exactly how points are earned and converted to cash, the atomic conversion in the ledger, the rules behind the conversion buttons, and the Rewards screen with its history.

| Layer | Files |
| --- | --- |
| Money constants | `src/shared/lib/money.ts` (`pointsEarned`, `pointsValue`, `MIN_REDEEM_POINTS`) |
| Earning points | `src/server/ledger.ts` → `spend()` (`KINDS_THAT_EARN_POINTS`) |
| Rules | `src/features/rewards/rewards.rules.ts` (+ `rewards.rules.test.ts`) |
| API and service | `src/features/rewards/rewards.router.ts`, `rewards.service.ts` |
| Screens | `components/rewards-screen.tsx`, `components/reward-history.tsx`; page `src/app/(app)/rewards/page.tsx` (`/rewards`) |

---

## 1. The rules in one table

| Rule | Value | Where |
| --- | --- | --- |
| Earn | **1 point per full ₱50** of each transfer or bill payment: `floor(amount / 5000 centavos)` | `pointsEarned` in `money.ts`; applied in `spend()` |
| Earning kinds | **transfers (sent) and bills** only. Not load, deposits, received transfers, GoalSave moves or Bitcoin | `KINDS_THAT_EARN_POINTS` in `ledger.ts` |
| Value | **1 point = 1 centavo**, so **100 points = ₱1.00** | `pointsValue` in `money.ts` |
| Convert | at least 100 points, in **multiples of 100** | `rewards.router.ts` |
| Per transaction | points are computed per payment: two ₱49 bills earn 0; one ₱99 bill earns 1 | `Math.floor` |

<!-- code: gobank/src/shared/lib/money.ts 5-18 -->
**`gobank/src/shared/lib/money.ts`** · lines 5–18

```ts
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

> **Be ready for this question:** 1 point per ₱50, and a point is worth 1 centavo, so the cash-back rate is **0.02%** (₱1.00 back for every ₱5,000 spent). The amounts are intentionally small for a student prototype. Both rates are single constants (`CENTAVOS_PER_POINT_EARNED`, `CENTAVOS_PER_POINT_REDEEMED`), so a real program could tune them without changing any logic.

---

## 2. Earning happens inside the payment

When `spend()` debits a transfer or bill, it passes `points: pointsEarned(amount)` to `post()`, which adds the points **in the same conditional update** as the balance change ([The ledger §5 and §7](../04-server-core/04-ledger.md#5-post-the-only-code-that-changes-a-balance-lines-80115)). The history row records the points earned, so the Rewards history and every receipt can show them. Points can never be earned without the payment, or vice versa.

---

## 3. The API and service

<!-- code: gobank/src/features/rewards/rewards.router.ts -->
**`gobank/src/features/rewards/rewards.router.ts`** · all 36 lines

```ts
 1 │ import { z } from "zod";
 2 │ import { MAX_REWARD_POINTS, MIN_REDEEM_POINTS } from "~/shared/lib/money";
 3 │ import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
 4 │ import {
 5 │   getRewardsSummary,
 6 │   listRewardActivity,
 7 │   redeemPoints,
 8 │ } from "./rewards.service";
 9 │
10 │ export const rewardsRouter = createTRPCRouter({
11 │   summary: protectedProcedure.query(({ ctx }) => getRewardsSummary(ctx.userId)),
12 │   history: protectedProcedure
13 │     .input(
14 │       z.object({
15 │         cursor: z.string().nullish(),
16 │         limit: z.number().int().min(1).max(50).default(20),
17 │       }),
18 │     )
19 │     .query(({ ctx, input }) =>
20 │       listRewardActivity(ctx.userId, input.cursor, input.limit),
21 │     ),
22 │   redeem: protectedProcedure
23 │     .input(
24 │       z.object({
25 │         points: z
26 │           .number()
27 │           .int()
28 │           .min(MIN_REDEEM_POINTS)
29 │           .max(MAX_REWARD_POINTS)
30 │           .refine((value) => value % MIN_REDEEM_POINTS === 0, {
31 │             message: `Redeem in multiples of ${MIN_REDEEM_POINTS} points.`,
32 │           }),
33 │       }),
34 │     )
35 │     .mutation(({ ctx, input }) => redeemPoints(ctx.userId, input.points)),
36 │ });
```
<!-- /code -->

`redeem` validates: a whole number ≥ 100, ≤ the maximum, **and** divisible by 100 ("Redeem in multiples of 100 points."). `history` uses cursor pages of 1–50 items (default 20).

<!-- code: gobank/src/features/rewards/rewards.service.ts -->
**`gobank/src/features/rewards/rewards.service.ts`** · all 55 lines

```ts
 1 │ import { pointsValue } from "~/shared/lib/money";
 2 │ import { activityFields } from "~/features/activity/activity.fields";
 3 │ import { db } from "~/server/db";
 4 │ import { post } from "~/server/ledger";
 5 │ import { pageArgs, toPage } from "~/server/pagination";
 6 │
 7 │ export const redeemPoints = (userId: string, points: number) =>
 8 │   db.$transaction((tx) =>
 9 │     post(tx, {
10 │       userId,
11 │       kind: "reward",
12 │       title: `Cash back · ${points.toLocaleString("en-PH")} points`,
13 │       amount: pointsValue(points),
14 │       points: -points,
15 │     }),
16 │   );
17 │
18 │ export async function getRewardsSummary(userId: string) {
19 │   const [user, earned, redeemed] = await Promise.all([
20 │     db.user.findUniqueOrThrow({
21 │       where: { id: userId },
22 │       select: { points: true },
23 │     }),
24 │     db.transaction.aggregate({
25 │       where: { userId, points: { gt: 0 } },
26 │       _sum: { points: true },
27 │     }),
28 │     db.transaction.aggregate({
29 │       where: { userId, kind: "reward", points: { lt: 0 } },
30 │       _sum: { points: true, amount: true },
31 │     }),
32 │   ]);
33 │
34 │   return {
35 │     points: user.points,
36 │     lifetimeEarned: earned._sum.points ?? 0,
37 │     lifetimeRedeemed: Math.abs(redeemed._sum.points ?? 0),
38 │     cashBackReceived: redeemed._sum.amount ?? 0,
39 │   };
40 │ }
41 │
42 │ export async function listRewardActivity(
43 │   userId: string,
44 │   cursor: string | null | undefined,
45 │   limit: number,
46 │ ) {
47 │   const rows = await db.transaction.findMany({
48 │     where: { userId, points: { not: 0 } },
49 │     select: activityFields,
50 │     orderBy: [{ createdAt: "desc" }, { id: "desc" }],
51 │     ...pageArgs(cursor, limit),
52 │   });
53 │
54 │   return toPage(rows, limit);
55 │ }
```
<!-- /code -->

### `redeemPoints` (lines 7–16): converting is just one `post()`

Lines 8–15 call `post()` with kind `reward`, a **positive** `amount` of `pointsValue(points)` centavos, a **negative** `points` change, and a title such as "Cash back · 1,000 points" (`toLocaleString("en-PH")` adds the thousands separator). The balance goes **up** and the points go **down** in one atomic, conditional update. If the user does not have enough points, the condition `points >= pointsOut` fails and `whyPostFailed` explains "Not enough points". Two simultaneous conversions cannot both spend the same points.

### `getRewardsSummary` (lines 18–40)

Runs three queries in parallel:

| Field | Computed as |
| --- | --- |
| `points` | the user's current points |
| `lifetimeEarned` | sum of all positive `points` in their history |
| `lifetimeRedeemed` | the absolute sum of negative `points` on `reward` rows |
| `cashBackReceived` | the sum of `amount` on those `reward` rows |

The current screen displays only `points`. The three lifetime totals are returned but no screen uses them yet (checked with `grep`); they are left over from a richer Rewards screen that was simplified (commit `41214ec`, "simplify Rewards to points, convert and history").

### `listRewardActivity` (lines 42–55)

Every history row whose `points` is not zero (earning and converting), newest first, with the shared cursor pagination.

---

## 4. Conversion options: `rewards.rules.ts`

<!-- code: gobank/src/features/rewards/rewards.rules.ts -->
**`gobank/src/features/rewards/rewards.rules.ts`** · all 17 lines

```ts
 1 │ import { MIN_REDEEM_POINTS } from "~/shared/lib/money";
 2 │
 3 │ const REDEEM_PRESETS = [100, 500, 1000, 5000];
 4 │ const MAX_OPTIONS = 4;
 5 │
 6 │ export const pointsToNextPeso = (points: number) =>
 7 │   points >= MIN_REDEEM_POINTS ? 0 : MIN_REDEEM_POINTS - points;
 8 │
 9 │ export const redeemablePoints = (points: number) =>
10 │   Math.floor(points / MIN_REDEEM_POINTS) * MIN_REDEEM_POINTS;
11 │
12 │ export function convertOptions(points: number) {
13 │   const max = redeemablePoints(points);
14 │   const smallerPresets = REDEEM_PRESETS.filter((preset) => preset < max);
15 │
16 │   return [...smallerPresets, max].slice(-MAX_OPTIONS);
17 │ }
```
<!-- /code -->

| Function | Behavior | Examples |
| --- | --- | --- |
| `pointsToNextPeso(points)` | how many more points until 100 | 41 → 59; 100 or more → 0 |
| `redeemablePoints(points)` | round down to whole hundreds | 99 → 0; 250 → 200 |
| `convertOptions(points)` | the presets 100, 500, 1,000, 5,000 that are **smaller** than the maximum, then the maximum itself; at most the **last 4** | 250 → [100, 200]; 500 → [100, 500]; 6,000 → [500, 1,000, 5,000, 6,000] |

<!-- code: gobank/src/features/rewards/rewards.rules.test.ts -->
**`gobank/src/features/rewards/rewards.rules.test.ts`** · all 27 lines

```ts
 1 │ import assert from "node:assert/strict";
 2 │ import { test } from "node:test";
 3 │ import {
 4 │   convertOptions,
 5 │   pointsToNextPeso,
 6 │   redeemablePoints,
 7 │ } from "./rewards.rules";
 8 │
 9 │ void test("the progress bar counts points left until the first ₱1.00", () => {
10 │   assert.equal(pointsToNextPeso(41), 59);
11 │   assert.equal(pointsToNextPeso(100), 0);
12 │   assert.equal(pointsToNextPeso(150), 0);
13 │ });
14 │
15 │ void test("only whole hundreds of points can be converted", () => {
16 │   assert.equal(redeemablePoints(99), 0);
17 │   assert.equal(redeemablePoints(250), 200);
18 │ });
19 │
20 │ void test("convert options end with converting every point you can", () => {
21 │   assert.deepEqual(convertOptions(250), [100, 200]);
22 │   assert.deepEqual(convertOptions(500), [100, 500]);
23 │ });
24 │
25 │ void test("at most four convert options are shown", () => {
26 │   assert.deepEqual(convertOptions(6_000), [500, 1_000, 5_000, 6_000]);
27 │ });
```
<!-- /code -->

---

## 5. The screens

### `rewards-screen.tsx`

<!-- code: gobank/src/features/rewards/components/rewards-screen.tsx 24-128 -->
**`gobank/src/features/rewards/components/rewards-screen.tsx`** · lines 24–128

```tsx
 24 │ export function RewardsScreen() {
 25 │   const summary = api.rewards.summary.useQuery(undefined, {
 26 │     staleTime: 0,
 27 │     refetchOnMount: "always",
 28 │   });
 29 │   const redeem = api.rewards.redeem.useMutation();
 30 │   const [converting, setConverting] = useState(false);
 31 │
 32 │   if (redeem.data) {
 33 │     return (
 34 │       <TransactionReceipt
 35 │         title="Cash back credited"
 36 │         onDone={() => {
 37 │           redeem.reset();
 38 │           setConverting(false);
 39 │         }}
 40 │       >
 41 │         <TransactionSummary
 42 │           amount={Math.abs(redeem.data.amount)}
 43 │           amountClassName="text-brand"
 44 │           details={[
 45 │             {
 46 │               label: "Points used",
 47 │               value: formatPoints(Math.abs(redeem.data.points)),
 48 │             },
 49 │             { label: "Reference", value: redeem.data.reference },
 50 │             { label: "Date", value: dateTime(redeem.data.createdAt) },
 51 │             { label: "Main balance", value: peso(redeem.data.balanceAfter) },
 52 │           ]}
 53 │         />
 54 │       </TransactionReceipt>
 55 │     );
 56 │   }
 57 │
 58 │   const stopConverting = () => {
 59 │     redeem.reset();
 60 │     setConverting(false);
 61 │   };
 62 │
 63 │   return (
 64 │     <div className="flex flex-1 flex-col">
 65 │       <PageHeader title="Rewards" back="/dashboard" />
 66 │
 67 │       {summary.isPending ? (
 68 │         <div
 69 │           role="status"
 70 │           aria-label="Loading"
 71 │           className="bg-surface-raised mt-6 h-56 animate-pulse rounded-[24px]"
 72 │         />
 73 │       ) : null}
 74 │
 75 │       {summary.error ? (
 76 │         <div className="pt-7">
 77 │           <FormError error={errorMessage(summary.error)} />
 78 │           <Button
 79 │             variant="outline"
 80 │             className="mt-4"
 81 │             onClick={() => void summary.refetch()}
 82 │           >
 83 │             Try again
 84 │           </Button>
 85 │         </div>
 86 │       ) : null}
 87 │
 88 │       {summary.data ? (
 89 │         <div className="space-y-8 pt-6">
 90 │           <PointsCard points={summary.data.points}>
 91 │             {converting ? (
 92 │               <ConvertPanel
 93 │                 points={summary.data.points}
 94 │                 pending={redeem.isPending}
 95 │                 error={errorMessage(redeem.error)}
 96 │                 onConfirm={(points) => redeem.mutate({ points })}
 97 │                 onCancel={stopConverting}
 98 │               />
 99 │             ) : (
100 │               <Progress points={summary.data.points}>
101 │                 <Button
102 │                   className="mt-5"
103 │                   disabled={summary.data.points < MIN_REDEEM_POINTS}
104 │                   onClick={() => setConverting(true)}
105 │                 >
106 │                   Convert to cash
107 │                 </Button>
108 │               </Progress>
109 │             )}
110 │           </PointsCard>
111 │
112 │           <section aria-labelledby="history-heading">
113 │             <div className="mb-3 flex items-baseline justify-between">
114 │               <h2
115 │                 id="history-heading"
116 │                 className="text-ink text-[15px] font-semibold"
117 │               >
118 │                 History
119 │               </h2>
120 │               <p className="text-ink-muted text-[12px]">1 pt per ₱50 spent</p>
121 │             </div>
122 │             <RewardHistory />
123 │           </section>
124 │         </div>
125 │       ) : null}
126 │     </div>
127 │   );
128 │ }
```
<!-- /code -->

| Lines | Behavior |
| --- | --- |
| 25–28 | the summary always reloads when the screen opens (`staleTime: 0`, `refetchOnMount: "always"`), so points are never shown stale |
| 32–56 | after converting: "Cash back credited", the amount in green, points used, reference, date, the new main balance |
| 67–73 | a pulsing placeholder while loading |
| 75–86 | an error with **Try again** |
| 90–110 | the points card: below 100 points, a progress bar and **Convert to cash** (disabled); otherwise the conversion panel |
| 112–123 | **History**, with the reminder "1 pt per ₱50 spent" |

The rest of the file:

- `PointsCard`: the points in large type, "Cash value" (`pointsValue(points)`) and "Conversion rate" "100 pts = ₱1.00".
- `Progress`: an accessible progress bar (`role="progressbar"` with `aria-valuemin`/`max`/`now`) and "N pts more to convert to cash".
- `ConvertPanel`: a **radio group** of the options from `convertOptions` (the maximum is labelled **All** when there is more than one option), preselected to the maximum, then "Get ₱X for N pts" ("Converting…") and **Cancel**.

### `reward-history.tsx`

An infinite list (Load more / Retry). Each row links to that transaction's **receipt** and shows:

| Row type | Icon | Text | Right side |
| --- | --- | --- | --- |
| earned on a bill | receipt | the bill title, date · "₱X spent" | **+N pts** |
| earned on a transfer | arrow | the transfer title, date · "₱X spent" | **+N pts** |
| conversion | banknote, green | "Cash back", date | **−N pts** and **+₱X** in green |

Empty state: "No points yet. Send money or pay a bill to start earning."

Points also appear on the dashboard's balance card and the **GoRewards** shortcut ([Dashboard](11-dashboard-and-navigation.md)).

---

## Defense questions

**Q: How do rewards work?**
A: Every transfer you send and every bill you pay earns one point per full ₱50, credited in the same database transaction as the payment. One hundred points can be converted into ₱1.00 of cash back, in multiples of 100. The conversion is a single ledger entry that adds the cash and removes the points atomically.

**Q: Why don't loads or deposits earn points?**
A: The rewards policy only counts spending to other people and billers; load and deposits are excluded. It is one constant in the ledger and could be changed.

**Q: Can I convert the same points twice by double-tapping?**
A: No. The conversion subtracts points with a conditional update that only succeeds if you still have enough points, so the second attempt fails with "Not enough points".

---

## Check yourself

<details>
<summary>A user sends ₱149.99 to a friend. How many points do they earn?</summary>

**2 points**: `floor(14999 / 5000) = 2`, because ₱149.99 contains two full ₱50 amounts. (₱99.99 would earn 1 point, and ₱49.99 none.)
</details>

<details>
<summary>A user has 1,250 points. What conversion buttons do they see?</summary>

`convertOptions(1250)`: the maximum is 1,200; presets below it are 100, 500, 1,000 → [100, 500, 1,000, 1,200], with 1,200 labelled "All".
</details>
