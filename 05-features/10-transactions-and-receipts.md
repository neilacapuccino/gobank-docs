# Transactions and receipts

**What you will learn:** how the transaction history is loaded page by page with All / Incoming / Outgoing filters, how rows are grouped by day, how a receipt is found and protected so nobody can open someone else's, and the dashboard's "Recent transactions" list.

| Layer | Files |
| --- | --- |
| Shared field list | `src/features/activity/activity.fields.ts` |
| Rules | `src/features/activity/activity.rules.ts` |
| API and service | `src/features/activity/activity.router.ts`, `activity.service.ts` |
| Screens | `components/activity-screen.tsx`, `activity-row.tsx`, `activity-icon.tsx`, `recent-activity.tsx`, `receipt-screen.tsx` |
| Pages | `src/app/(app)/transactions/page.tsx` (`/transactions`), `src/app/(app)/transactions/[reference]/page.tsx` (`/transactions/<reference>`) |

---

## 1. What the history contains

The `Transaction` table holds every money movement ([Schema](../03-database/01-schema.md#transaction-the-history-and-audit-trail)). The **main** history shows every kind **except `interest`**, because interest is credited to a GoalSave goal, not to the main balance. Interest rows appear in the goal's own Transactions tab.

| Kind | Typical title | Sign |
| --- | --- | --- |
| deposit | Cash deposit / Opening deposit | + |
| transfer | Transfer to @dante / Transfer from @maricel | − / + |
| bill | Bill payment · Meralco | − |
| load | Mobile load · 0917 123 4567 | − |
| stash | GoalSave deposit · Laptop / GoalSave withdrawal · Laptop | − / + |
| reward | Cash back · 1,000 points | + |
| exchange | Bitcoin purchase / Bitcoin sale | − / + |
| interest *(goal only)* | Interest earned · Laptop | + (to the goal) |

---

## 2. Fields, filters and grouping

<!-- code: gobank/src/features/activity/activity.fields.ts -->
**`gobank/src/features/activity/activity.fields.ts`** · all 17 lines

```ts
 1 │ import type { Prisma } from "../../../generated/prisma";
 2 │
 3 │ export const activityFields = {
 4 │   id: true,
 5 │   reference: true,
 6 │   kind: true,
 7 │   title: true,
 8 │   amount: true,
 9 │   points: true,
10 │   createdAt: true,
11 │ } as const;
12 │
13 │ export const MAIN_ACCOUNT_KINDS = { not: "interest" } as const;
14 │
15 │ export type ActivityEntry = Prisma.TransactionGetPayload<{
16 │   select: typeof activityFields;
17 │ }>;
```
<!-- /code -->

- `activityFields`: the **only** columns a list row needs (no details JSON, no balance). Lists stay small and fast. Reused by the dashboard and the rewards history.
- `MAIN_ACCOUNT_KINDS` = "kind is not interest".
- `ActivityEntry` (lines 15–17): the row type is **derived** from the `select` object with `Prisma.TransactionGetPayload`, so adding a field to `activityFields` updates the type everywhere.

<!-- code: gobank/src/features/activity/activity.rules.ts -->
**`gobank/src/features/activity/activity.rules.ts`** · all 51 lines

```ts
 1 │ export const ACTIVITY_FILTERS = ["all", "in", "out"] as const;
 2 │ export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];
 3 │
 4 │ export const FILTER_LABELS: Record<ActivityFilter, string> = {
 5 │   all: "All",
 6 │   in: "Incoming",
 7 │   out: "Outgoing",
 8 │ };
 9 │
10 │ type AmountWhere = { amount?: { gt: number } | { lt: number } };
11 │
12 │ const FILTER_WHERE: Record<ActivityFilter, AmountWhere> = {
13 │   all: {},
14 │   in: { amount: { gt: 0 } },
15 │   out: { amount: { lt: 0 } },
16 │ };
17 │
18 │ export const filterWhere = (filter: ActivityFilter) => FILTER_WHERE[filter];
19 │
20 │ const dayKey = (date: Date) =>
21 │   `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
22 │
23 │ function dayLabel(date: Date, now: Date = new Date()) {
24 │   const yesterday = new Date(now);
25 │   yesterday.setDate(now.getDate() - 1);
26 │   if (dayKey(date) === dayKey(now)) return "Today";
27 │   if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
28 │   return date.toLocaleDateString("en-PH", {
29 │     month: "short",
30 │     day: "numeric",
31 │     year: "numeric",
32 │   });
33 │ }
34 │
35 │ export function groupByDay<T extends { createdAt: Date }>(
36 │   items: T[],
37 │   now: Date = new Date(),
38 │ ) {
39 │   const groups: { key: string; label: string; items: T[] }[] = [];
40 │   for (const item of items) {
41 │     const key = dayKey(item.createdAt);
42 │     const last = groups.at(-1);
43 │     if (last?.key === key) {
44 │       last.items.push(item);
45 │     } else {
46 │       groups.push({ key, label: dayLabel(item.createdAt, now), items: [item] });
47 │     }
48 │   }
49 │
50 │   return groups;
51 │ }
```
<!-- /code -->

| Function | Behavior |
| --- | --- |
| `ACTIVITY_FILTERS`, `FILTER_LABELS` (1–8) | `all` / `in` / `out`, shown as All / Incoming / Outgoing |
| `filterWhere` (10–18) | Incoming = `amount > 0`, Outgoing = `amount < 0` |
| `dayKey` (20–21) | year-month-day in the **browser's** local time |
| `dayLabel` (23–33) | "Today", "Yesterday", or a date such as "Nov 3, 2026" |
| `groupByDay` (35–51) | walks the newest-first list and starts a new group whenever the day changes |

---

## 3. The API and service

<!-- code: gobank/src/features/activity/activity.router.ts -->
**`gobank/src/features/activity/activity.router.ts`** · all 22 lines

```ts
 1 │ import { z } from "zod";
 2 │ import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
 3 │ import { ACTIVITY_FILTERS } from "./activity.rules";
 4 │ import { getTransaction, listActivity } from "./activity.service";
 5 │
 6 │ export const activityRouter = createTRPCRouter({
 7 │   list: protectedProcedure
 8 │     .input(
 9 │       z.object({
10 │         filter: z.enum(ACTIVITY_FILTERS).default("all"),
11 │         cursor: z.string().nullish(),
12 │         limit: z.number().int().min(1).max(50).default(20),
13 │       }),
14 │     )
15 │     .query(({ ctx, input }) =>
16 │       listActivity(ctx.userId, input.cursor, input.limit, input.filter),
17 │     ),
18 │
19 │   transaction: protectedProcedure
20 │     .input(z.object({ reference: z.string() }))
21 │     .query(({ ctx, input }) => getTransaction(ctx.userId, input.reference)),
22 │ });
```
<!-- /code -->

<!-- code: gobank/src/features/activity/activity.service.ts -->
**`gobank/src/features/activity/activity.service.ts`** · all 30 lines

```ts
 1 │ import { db } from "~/server/db";
 2 │ import { pageArgs, toPage } from "~/server/pagination";
 3 │ import { activityFields, MAIN_ACCOUNT_KINDS } from "./activity.fields";
 4 │ import { filterWhere, type ActivityFilter } from "./activity.rules";
 5 │
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
21 │
22 │ export const getTransaction = (userId: string, reference: string) =>
23 │   db.transaction.findUniqueOrThrow({
24 │     where: { reference_userId: { reference, userId } },
25 │     include: {
26 │       biller: { select: { name: true } },
27 │       savingsGoal: { select: { name: true } },
28 │       counterparty: { select: { username: true } },
29 │     },
30 │   });
```
<!-- /code -->

- `listActivity` (lines 6–20): my rows, main kinds only, the chosen filter, newest first with `id` as a tie-breaker, in cursor pages ([pagination](../04-server-core/01-db-errors-identifiers-pagination.md#4-paginationts-loading-lists-page-by-page)).
- `getTransaction` (lines 22–30): find **one** row by the compound key `(reference, userId)`, together with the biller's name, the goal's name and the counterparty's username.

> **Why the receipt is safe:** the lookup key includes `userId` from the session. Visiting `/transactions/GB7KQ2M9XA` for someone else's reference finds nothing, which becomes a 404 page. It does not even reveal that the reference exists. The integration test checks that another user cannot open a receipt. Also note that a transfer has **two** rows with the same reference; this key returns *your* side.

---

## 4. The history screen: `activity-screen.tsx`

<!-- code: gobank/src/features/activity/components/activity-screen.tsx 77-161 -->
**`gobank/src/features/activity/components/activity-screen.tsx`** · lines 77–161

```tsx
 77 │ export function ActivityScreen() {
 78 │   const [filter, setFilter] = useState<ActivityFilter>("all");
 79 │
 80 │   const activity = api.activity.list.useInfiniteQuery(
 81 │     { filter, limit: 20 },
 82 │     {
 83 │       getNextPageParam: (page) => page.next ?? undefined,
 84 │       staleTime: 0,
 85 │       refetchOnMount: "always",
 86 │     },
 87 │   );
 88 │
 89 │   const items = activity.data?.pages.flatMap((page) => page.items) ?? [];
 90 │   const groups = groupByDay(items);
 91 │   const isEmpty = !activity.isLoading && !activity.error && items.length === 0;
 92 │
 93 │   const retry = () => {
 94 │     if (activity.isFetchNextPageError) void activity.fetchNextPage();
 95 │     else void activity.refetch();
 96 │   };
 97 │
 98 │   return (
 99 │     <div className="flex flex-1 flex-col">
100 │       <PageHeader title="Transactions" back="/dashboard" />
101 │
102 │       <div className="pt-7">
103 │         <FilterSwitch selected={filter} onSelect={setFilter} />
104 │
105 │         {activity.isLoading ? (
106 │           <p
107 │             role="status"
108 │             className="text-ink-muted py-8 text-center text-[14px]"
109 │           >
110 │             Loading activity…
111 │           </p>
112 │         ) : null}
113 │
114 │         {isEmpty ? <NoActivity filter={filter} /> : null}
115 │
116 │         {items.length > 0 ? (
117 │           <div className="space-y-6">
118 │             {groups.map((group) => (
119 │               <section key={group.key}>
120 │                 <h2 className="text-ink-muted mb-3 text-[12px] font-medium">
121 │                   {group.label}
122 │                 </h2>
123 │                 <ul className="space-y-4">
124 │                   {group.items.map((entry) => (
125 │                     <li key={entry.id}>
126 │                       <ActivityRow entry={entry} detail={entryDetail(entry)} />
127 │                     </li>
128 │                   ))}
129 │                 </ul>
130 │               </section>
131 │             ))}
132 │           </div>
133 │         ) : null}
134 │
135 │         {activity.error ? (
136 │           <div className="mt-5">
137 │             <FormError error={errorMessage(activity.error)} />
138 │             <Button
139 │               variant="ghost"
140 │               disabled={activity.isFetching}
141 │               onClick={retry}
142 │             >
143 │               {activity.isFetching ? "Retrying…" : "Retry"}
144 │             </Button>
145 │           </div>
146 │         ) : null}
147 │
148 │         {!activity.error && activity.hasNextPage ? (
149 │           <Button
150 │             variant="outline"
151 │             className="mt-5"
152 │             disabled={activity.isFetching}
153 │             onClick={() => void activity.fetchNextPage()}
154 │           >
155 │             {activity.isFetchingNextPage ? "Loading…" : "Load more"}
156 │           </Button>
157 │         ) : null}
158 │       </div>
159 │     </div>
160 │   );
161 │ }
```
<!-- /code -->

| Lines | Behavior |
| --- | --- |
| 78 | the selected filter |
| 80–87 | `useInfiniteQuery` with the filter in the input: changing the filter is a new query with its own pages. `staleTime: 0` + `refetchOnMount: "always"`: the history is always fresh when opened |
| 89–90 | flatten all loaded pages into one list and group it by day |
| 91 | empty only when loading finished without error and nothing came back |
| 93–96 | **Retry** retries the failed next page if that is what failed, otherwise reloads |
| 103 | the All / Incoming / Outgoing switch (`aria-pressed` buttons) |
| 116–133 | day headings and rows; each row's detail is the date and time, plus points if any (" · +2 pts") |
| 148–157 | **Load more** while there are more pages |

Empty states: "No activity yet", "No incoming yet", "No outgoing yet".

### A row: `activity-row.tsx` and `activity-icon.tsx`

<!-- code: gobank/src/features/activity/components/activity-row.tsx -->
**`gobank/src/features/activity/components/activity-row.tsx`** · all 44 lines

```tsx
 1 │ import Link from "next/link";
 2 │ import { cn } from "~/shared/lib/cn";
 3 │ import { peso } from "~/shared/lib/format";
 4 │ import type { ActivityEntry } from "../activity.fields";
 5 │ import { activityIcon } from "./activity-icon";
 6 │
 7 │ export function ActivityRow({
 8 │   entry,
 9 │   detail,
10 │ }: {
11 │   entry: ActivityEntry;
12 │   detail: string;
13 │ }) {
14 │   const incoming = entry.amount > 0;
15 │   const Icon = activityIcon(entry);
16 │
17 │   return (
18 │     <Link
19 │       href={`/transactions/${entry.reference}`}
20 │       className="group flex items-center gap-3.5"
21 │     >
22 │       <span className="bg-surface-sunken text-ink-soft grid h-10 w-10 shrink-0 place-items-center rounded-full">
23 │         <Icon size={16} strokeWidth={1.9} aria-hidden />
24 │       </span>
25 │
26 │       <span className="min-w-0 flex-1">
27 │         <span className="text-ink group-hover:text-brand block truncate text-[14px] font-medium transition-colors">
28 │           {entry.title}
29 │         </span>
30 │         <span className="text-ink-muted block text-[12px]">{detail}</span>
31 │       </span>
32 │
33 │       <span
34 │         className={cn(
35 │           "shrink-0 text-[14px] font-semibold tabular-nums",
36 │           incoming ? "text-brand" : "text-danger",
37 │         )}
38 │       >
39 │         {incoming ? "+" : "−"}
40 │         {peso(Math.abs(entry.amount))}
41 │       </span>
42 │     </Link>
43 │   );
44 │ }
```
<!-- /code -->

Each row is a link to its receipt: an icon, the title, a detail line, and the amount in **green with +** (money in) or **red with −** (money out). The minus is the real minus sign `−`, not a hyphen.

<!-- code: gobank/src/features/activity/components/activity-icon.tsx -->
**`gobank/src/features/activity/components/activity-icon.tsx`** · all 32 lines

```tsx
 1 │ import type { LucideIcon } from "lucide-react";
 2 │ import {
 3 │   ArrowDownLeft,
 4 │   ArrowDownToLine,
 5 │   ArrowLeftRight,
 6 │   ArrowUpRight,
 7 │   PiggyBank,
 8 │   Receipt,
 9 │   Smartphone,
10 │   Sparkles,
11 │   TrendingUp,
12 │ } from "lucide-react";
13 │ import type { ActivityEntry } from "../activity.fields";
14 │
15 │ const ICONS: Record<ActivityEntry["kind"], LucideIcon> = {
16 │   deposit: ArrowDownToLine,
17 │   transfer: ArrowUpRight,
18 │   bill: Receipt,
19 │   load: Smartphone,
20 │   stash: PiggyBank,
21 │   reward: Sparkles,
22 │   interest: TrendingUp,
23 │   exchange: ArrowLeftRight,
24 │ };
25 │
26 │ export function activityIcon(
27 │   entry: Pick<ActivityEntry, "kind" | "amount">,
28 │ ): LucideIcon {
29 │   const receivedTransfer = entry.kind === "transfer" && entry.amount > 0;
30 │
31 │   return receivedTransfer ? ArrowDownLeft : ICONS[entry.kind];
32 │ }
```
<!-- /code -->

One icon per kind (`Record<kind, icon>`, so TypeScript forces an icon for every kind). A **received** transfer gets an arrow pointing in instead of out (lines 29–31).

### On the dashboard: `recent-activity.tsx`

<!-- code: gobank/src/features/activity/components/recent-activity.tsx -->
**`gobank/src/features/activity/components/recent-activity.tsx`** · all 39 lines

```tsx
 1 │ import Link from "next/link";
 2 │ import { shortDate } from "~/shared/lib/format";
 3 │ import { SectionHeader } from "~/shared/ui/section-header";
 4 │ import type { ActivityEntry } from "../activity.fields";
 5 │ import { ActivityRow } from "./activity-row";
 6 │
 7 │ function NoTransactions() {
 8 │   return (
 9 │     <div className="bg-surface-sunken flex flex-col items-center gap-1 rounded-2xl px-6 py-8 text-center">
10 │       <p className="text-ink text-[14px] font-medium">No transactions yet</p>
11 │       <Link
12 │         href="/deposit"
13 │         className="text-brand hover:text-brand-hover mt-2 text-[13px] font-medium transition-colors"
14 │       >
15 │         Make a deposit
16 │       </Link>
17 │     </div>
18 │   );
19 │ }
20 │
21 │ export function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
22 │   return (
23 │     <section>
24 │       <SectionHeader title="Recent transactions" href="/transactions" />
25 │
26 │       {entries.length === 0 ? (
27 │         <NoTransactions />
28 │       ) : (
29 │         <ul className="flex flex-col gap-4">
30 │           {entries.map((entry) => (
31 │             <li key={entry.reference}>
32 │               <ActivityRow entry={entry} detail={shortDate(entry.createdAt)} />
33 │             </li>
34 │           ))}
35 │         </ul>
36 │       )}
37 │     </section>
38 │   );
39 │ }
```
<!-- /code -->

The 5 latest transactions (loaded on the server with the dashboard), with **See all** → `/transactions`. With no transactions: "No transactions yet" and a **Make a deposit** link.

---

## 5. The receipt: `/transactions/<reference>`

<!-- code: gobank/src/app/(app)/transactions/[reference]/page.tsx -->
**`gobank/src/app/(app)/transactions/[reference]/page.tsx`** · all 28 lines

```tsx
 1 │ import type { Metadata } from "next";
 2 │ import { TRPCError } from "@trpc/server";
 3 │ import { notFound } from "next/navigation";
 4 │ import { ReceiptScreen } from "~/features/activity/components/receipt-screen";
 5 │ import { api } from "~/trpc/server";
 6 │
 7 │ export const metadata: Metadata = {
 8 │   title: "Receipt",
 9 │ };
10 │
11 │ export default async function ReceiptPage({
12 │   params,
13 │ }: {
14 │   params: Promise<{ reference: string }>;
15 │ }) {
16 │   const { reference } = await params;
17 │
18 │   try {
19 │     return (
20 │       <ReceiptScreen
21 │         transaction={await api.activity.transaction({ reference })}
22 │       />
23 │     );
24 │   } catch (error) {
25 │     if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
26 │     throw error;
27 │   }
28 │ }
```
<!-- /code -->

A **server** page: it loads the receipt with the server-side tRPC caller. A `NOT_FOUND` error (wrong reference, or someone else's) becomes Next.js's 404 page (`notFound()`); any other error is re-thrown.

<!-- code: gobank/src/features/activity/components/receipt-screen.tsx -->
**`gobank/src/features/activity/components/receipt-screen.tsx`** · all 58 lines

```tsx
 1 │ import Link from "next/link";
 2 │ import { cn } from "~/shared/lib/cn";
 3 │ import { dateTime, peso } from "~/shared/lib/format";
 4 │ import { buttonClass } from "~/shared/ui/button";
 5 │ import { PageHeader } from "~/shared/ui/page-header";
 6 │ import { TransactionSummary } from "~/shared/ui/transaction-summary";
 7 │ import type { RouterOutputs } from "~/trpc/react";
 8 │ import { paidWithDetail } from "~/features/card/card-label";
 9 │
10 │ type Transaction = RouterOutputs["activity"]["transaction"];
11 │ type Detail = { label: string; value: string };
12 │
13 │ function receiptDetails(transaction: Transaction): Detail[] {
14 │   const { counterparty, biller, savingsGoal, points } = transaction;
15 │
16 │   const details: Detail[] = [
17 │     { label: "Reference", value: transaction.reference },
18 │     { label: "Date", value: dateTime(transaction.createdAt) },
19 │     { label: "Balance after", value: peso(transaction.balanceAfter) },
20 │   ];
21 │
22 │   if (counterparty) {
23 │     const direction = transaction.amount < 0 ? "To" : "From";
24 │     details.push({ label: direction, value: `@${counterparty.username}` });
25 │   }
26 │
27 │   if (biller) details.push({ label: "Biller", value: biller.name });
28 │   if (savingsGoal) details.push({ label: "GoalSave", value: savingsGoal.name });
29 │   if (points) {
30 │     details.push({ label: "Points", value: points.toLocaleString("en-PH") });
31 │   }
32 │
33 │   return [...details, ...paidWithDetail(transaction.details)];
34 │ }
35 │
36 │ export function ReceiptScreen({ transaction }: { transaction: Transaction }) {
37 │   const spent = transaction.amount < 0;
38 │
39 │   return (
40 │     <div className="flex flex-1 flex-col gap-7">
41 │       <PageHeader title="Receipt" back="/transactions" />
42 │
43 │       <TransactionSummary
44 │         amount={transaction.amount}
45 │         amountClassName={spent ? "text-danger" : "text-brand"}
46 │         details={receiptDetails(transaction)}
47 │       >
48 │         <h2 className="text-ink text-[16px] font-medium">
49 │           {transaction.title}
50 │         </h2>
51 │       </TransactionSummary>
52 │
53 │       <Link href="/dashboard" className={cn(buttonClass(), "mt-auto")}>
54 │         Done
55 │       </Link>
56 │     </div>
57 │   );
58 │ }
```
<!-- /code -->

| Lines | Detail row | Shown when |
| --- | --- | --- |
| 16–20 | Reference, Date, Balance after | always |
| 22–25 | **To** @username or **From** @username | transfers (direction from the sign) |
| 27 | Biller | bill payments |
| 28 | GoalSave | goal movements |
| 29–31 | Points | points were earned or used |
| 33 | **Paid with** Physical · Discover •••• 8954 | card payments ([Cards](04-cards.md#6-paid-with--on-receipts-card-labelts)) |

The amount is red for money out and green for money in (line 45). It is formatted by `peso()`, which shows a negative amount as `-₱100.00`. **Done** returns to the dashboard.

---

## Defense questions

**Q: Can a user view another user's receipt by guessing its reference?**
A: No. Receipts are looked up by the pair (reference, user ID), and the user ID comes from the server-side session. Someone else's reference simply returns "not found", shown as a 404 page.

**Q: How do you handle thousands of transactions?**
A: The list loads 20 at a time with cursor pagination, backed by an index on `(userId, createdAt DESC)`. "Load more" fetches the next page after the last row's ID, so the database never scans the whole history and pages do not shift when new transactions arrive.

**Q: Why are interest entries not in the main history?**
A: Interest is credited to the savings goal, not the main balance. Showing it in the main history would make the main balance look like it should have changed. It appears in the goal's Transactions tab instead.

---

## Check yourself

<details>
<summary>Which component decides whether a row is green or red?</summary>

`ActivityRow`: `amount > 0` is incoming (green, +); otherwise red with −. On the receipt, `ReceiptScreen` makes the same choice for the large amount.
</details>

<details>
<summary>Why is <code>ActivityEntry</code> derived from <code>activityFields</code> instead of written by hand?</summary>

So the type always matches the selected columns. Adding or removing a field in the `select` object automatically updates every component that uses the type.
</details>
