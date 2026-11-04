# Deposit, bills and load

**What you will learn:** the three simplest money features and why each one calls a different ledger function: **deposit** adds money (`post`), while **bills** and **load** are card payments (`spend`) that count toward the daily limit, and bills also earn reward points. You will also see the bill-payment and load screens in detail.

| Feature | Files | Page |
| --- | --- | --- |
| Deposit | `src/features/deposit/deposit.rules.ts`, `deposit.router.ts`, `deposit.service.ts`, `components/deposit-form.tsx` | `src/app/(app)/deposit/page.tsx` → `/deposit` |
| Pay bills | `src/features/bills/bill-categories.ts`, `bills.router.ts`, `bills.service.ts`, `components/bill-payment.tsx`, `biller-card.tsx`, `category-card.tsx` | `src/app/(app)/bills/page.tsx` → `/bills` |
| Buy load | `src/features/load/load.rules.ts`, `load.router.ts`, `load.service.ts`, `components/load-form.tsx` | `src/app/(app)/load/page.tsx` → `/load` |

## Comparison

| | Deposit | Pay bills | Buy load |
| --- | --- | --- | --- |
| Ledger function | `post` (money in) | `spend` (money out) | `spend` (money out) |
| Needs an unlocked card | no | yes | yes |
| Counts toward the daily limit | no | yes | yes |
| Earns points | no | **yes**: 1 per ₱50 | no |
| Amount limits | ₱0.01 – ₱50,000 | ₱0.01 – ₱1,000,000, plus balance and daily limit | ₱10 – ₱10,000, plus balance and daily limit |
| History title | "Cash deposit" | "Bill payment · Meralco" | "Mobile load · 0917 123 4567" |
| `details` saved | none | `accountNumber`, card | `mobile`, card |

> **Simulated services:** a deposit does not pull money from a real bank or e-wallet, bills are not sent to real billers, and load is not sent to a telco. The bank side (balances, limits, history, receipts) is fully real. Connecting real payment partners is future work.

---

## 1. Deposit

<!-- code: gobank/src/features/deposit/deposit.rules.ts -->
**`gobank/src/features/deposit/deposit.rules.ts`** · all 1 lines

```ts
1 │ export const MAX_DEPOSIT_CENTAVOS = 5_000_000;
```
<!-- /code -->

<!-- code: gobank/src/features/deposit/deposit.router.ts -->
**`gobank/src/features/deposit/deposit.router.ts`** · all 11 lines

```ts
 1 │ import { z } from "zod";
 2 │ import { centavos } from "~/shared/lib/schemas";
 3 │ import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
 4 │ import { MAX_DEPOSIT_CENTAVOS } from "./deposit.rules";
 5 │ import { deposit } from "./deposit.service";
 6 │
 7 │ export const depositRouter = createTRPCRouter({
 8 │   create: protectedProcedure
 9 │     .input(z.object({ amount: centavos.max(MAX_DEPOSIT_CENTAVOS) }))
10 │     .mutation(({ ctx, input }) => deposit(ctx.userId, input.amount)),
11 │ });
```
<!-- /code -->

<!-- code: gobank/src/features/deposit/deposit.service.ts -->
**`gobank/src/features/deposit/deposit.service.ts`** · all 7 lines

```ts
1 │ import { db } from "~/server/db";
2 │ import { post } from "~/server/ledger";
3 │
4 │ export const deposit = (userId: string, amount: number) =>
5 │   db.$transaction((tx) =>
6 │     post(tx, { userId, kind: "deposit", title: "Cash deposit", amount }),
7 │   );
```
<!-- /code -->

The whole service is one line: in a transaction, `post()` a positive amount with kind `deposit`. `post()` still refuses a deposit that would push the balance past the column's maximum ("This transaction would exceed the account limit").

<!-- code: gobank/src/features/deposit/components/deposit-form.tsx 18-84 -->
**`gobank/src/features/deposit/components/deposit-form.tsx`** · lines 18–84

```tsx
18 │ export function DepositForm() {
19 │   const router = useRouter();
20 │   const [amount, setAmount] = useState("");
21 │   const deposit = api.deposit.create.useMutation();
22 │
23 │   const amountCentavos = toCentavos(Number(amount));
24 │   const overLimit = amountCentavos > MAX_DEPOSIT_CENTAVOS;
25 │   const validAmount = amountCentavos > 0 && !overLimit;
26 │
27 │   const submit = () => {
28 │     if (validAmount && !deposit.isPending) {
29 │       deposit.mutate({ amount: amountCentavos });
30 │     }
31 │   };
32 │
33 │   const finish = () => {
34 │     router.push("/dashboard");
35 │     router.refresh();
36 │   };
37 │
38 │   if (deposit.data) {
39 │     return (
40 │       <TransactionReceipt title="Deposit successful" onDone={finish}>
41 │         <TransactionSummary
42 │           amount={deposit.data.amount}
43 │           details={[
44 │             { label: "Reference", value: deposit.data.reference },
45 │             { label: "Date", value: dateTime(deposit.data.createdAt) },
46 │             { label: "Balance after", value: peso(deposit.data.balanceAfter) },
47 │           ]}
48 │         />
49 │       </TransactionReceipt>
50 │     );
51 │   }
52 │
53 │   return (
54 │     <form
55 │       className="flex flex-1 flex-col gap-7"
56 │       onSubmit={(event) => {
57 │         event.preventDefault();
58 │         submit();
59 │       }}
60 │     >
61 │       <PageHeader title="Deposit" back="/dashboard" />
62 │
63 │       <TextField
64 │         label="Amount (PHP)"
65 │         inputMode="decimal"
66 │         value={amount}
67 │         disabled={deposit.isPending}
68 │         aria-invalid={overLimit}
69 │         hint={`${overLimit ? "Maximum" : "Up to"} ${peso(MAX_DEPOSIT_CENTAVOS)}`}
70 │         onChange={(event) => {
71 │           if (isPesoInput(event.target.value)) setAmount(event.target.value);
72 │         }}
73 │       />
74 │
75 │       <FormError error={errorMessage(deposit.error)} />
76 │
77 │       <div className="mt-auto pt-4">
78 │         <Button type="submit" disabled={!validAmount || deposit.isPending}>
79 │           {deposit.isPending ? "Depositing…" : "Deposit"}
80 │         </Button>
81 │       </div>
82 │     </form>
83 │   );
84 │ }
```
<!-- /code -->

- **Lines 23–25:** the amount must be above 0 and at most ₱50,000. Over the limit, the hint turns into "Maximum ₱50,000.00" (line 69).
- **Lines 70–72:** only peso-shaped input is accepted while typing (`isPesoInput`).
- **Lines 38–51:** the receipt: "Deposit successful", the amount, reference, date and "Balance after".

---

## 2. Pay bills

### The biller catalogue

<!-- code: gobank/src/features/bills/bill-categories.ts -->
**`gobank/src/features/bills/bill-categories.ts`** · all 16 lines

```ts
 1 │ import { CreditCard, Droplets, Wifi, Zap, type LucideIcon } from "lucide-react";
 2 │ import type { RouterOutputs } from "~/trpc/react";
 3 │
 4 │ export type Biller = RouterOutputs["bills"]["billers"][number];
 5 │
 6 │ export type Category = Biller["category"];
 7 │
 8 │ export const CATEGORIES: { id: Category; label: string; icon: LucideIcon }[] = [
 9 │   { id: "electric", label: "Electric", icon: Zap },
10 │   { id: "water", label: "Water", icon: Droplets },
11 │   { id: "internet", label: "Internet", icon: Wifi },
12 │   { id: "credit_card", label: "Credit Card", icon: CreditCard },
13 │ ];
14 │
15 │ export const findCategory = (id: Category | null) =>
16 │   CATEGORIES.find((category) => category.id === id);
```
<!-- /code -->

Four categories with icons. The `Biller` type is **inferred from the API's output** (`RouterOutputs["bills"]["billers"][number]`), so the screen and the server can never disagree about a biller's fields.

<!-- code: gobank/src/features/bills/bills.router.ts -->
**`gobank/src/features/bills/bills.router.ts`** · all 34 lines

```ts
 1 │ import { z } from "zod";
 2 │ import { cardKind, centavos } from "~/shared/lib/schemas";
 3 │ import {
 4 │   createTRPCRouter,
 5 │   protectedProcedure,
 6 │   publicProcedure,
 7 │ } from "~/server/trpc";
 8 │ import { listBillers, payBill } from "./bills.service";
 9 │
10 │ export const billsRouter = createTRPCRouter({
11 │   billers: publicProcedure.query(() => listBillers()),
12 │
13 │   pay: protectedProcedure
14 │     .input(
15 │       z.object({
16 │         billerId: z.string().min(1),
17 │         accountNumber: z
18 │           .string()
19 │           .trim()
20 │           .regex(/^\d{4,20}$/, "Check the account number"),
21 │         amount: centavos,
22 │         card: cardKind,
23 │       }),
24 │     )
25 │     .mutation(({ ctx, input }) =>
26 │       payBill(
27 │         ctx.userId,
28 │         input.billerId,
29 │         input.accountNumber,
30 │         input.amount,
31 │         input.card,
32 │       ),
33 │     ),
34 │ });
```
<!-- /code -->

- `billers` is **public**: the list contains no personal data.
- `pay` checks the biller's account number is **4 to 20 digits** ("Check the account number"), the amount in centavos and the card.

<!-- code: gobank/src/features/bills/bills.service.ts -->
**`gobank/src/features/bills/bills.service.ts`** · all 35 lines

```ts
 1 │ import { db } from "~/server/db";
 2 │ import { fail } from "~/server/errors";
 3 │ import { spend } from "~/server/ledger";
 4 │ import type { CardKind } from "../../../generated/prisma";
 5 │
 6 │ export const listBillers = () =>
 7 │   db.biller.findMany({
 8 │     where: { active: true },
 9 │     orderBy: [{ category: "asc" }, { name: "asc" }],
10 │   });
11 │
12 │ export async function payBill(
13 │   userId: string,
14 │   billerId: string,
15 │   accountNumber: string,
16 │   amount: number,
17 │   card: CardKind,
18 │ ) {
19 │   const biller = await db.biller.findFirst({
20 │     where: { id: billerId, active: true },
21 │   });
22 │   if (!biller) return fail("NOT_FOUND", "This biller is not available.");
23 │
24 │   return db.$transaction((tx) =>
25 │     spend(tx, {
26 │       userId,
27 │       kind: "bill",
28 │       title: `Bill payment · ${biller.name}`,
29 │       amount,
30 │       billerId: biller.id,
31 │       details: { accountNumber },
32 │       card,
33 │     }),
34 │   );
35 │ }
```
<!-- /code -->

| Lines | Behavior |
| --- | --- |
| 6–10 | list only **active** billers, sorted by category, then name |
| 19–22 | the biller must exist **and** be active, otherwise "This biller is not available." (shown if a biller is switched off while someone is paying) |
| 24–33 | `spend()` with kind `bill`: card checks, daily limit, balance, **points**, a link to the biller (`billerId`) and the biller account number in `details` |

### The screen: `bill-payment.tsx`

<!-- code: gobank/src/features/bills/components/bill-payment.tsx 90-152 -->
**`gobank/src/features/bills/components/bill-payment.tsx`** · lines 90–152

```tsx
 90 │ export function BillPayment() {
 91 │   const router = useRouter();
 92 │   const [categoryId, setCategoryId] = useState<Category | null>(null);
 93 │   const [billerId, setBillerId] = useState<string | null>(null);
 94 │   const [accountNumber, setAccountNumber] = useState("");
 95 │   const [amount, setAmount] = useState("");
 96 │   const [reviewing, setReviewing] = useState(false);
 97 │
 98 │   const catalogue = api.bills.billers.useQuery();
 99 │   const pay = api.bills.pay.useMutation();
100 │   const limit = useSpendLimit(MAX_TRANSACTION_CENTAVOS);
101 │
102 │   const category = findCategory(categoryId);
103 │   const billers =
104 │     catalogue.data?.filter((item) => item.category === categoryId) ?? [];
105 │   const biller = billers.find((item) => item.id === billerId);
106 │
107 │   const amountCentavos = toCentavos(Number(amount));
108 │   const validDetails =
109 │     Boolean(biller) &&
110 │     ACCOUNT_NUMBER.test(accountNumber) &&
111 │     limit.valid(amountCentavos);
112 │
113 │   const clearPaymentDetails = () => {
114 │     setAccountNumber("");
115 │     setAmount("");
116 │   };
117 │
118 │   const chooseCategory = (id: Category) => {
119 │     if (categoryId === id) return;
120 │
121 │     setCategoryId(id);
122 │     setBillerId(null);
123 │     clearPaymentDetails();
124 │   };
125 │
126 │   const chooseBiller = (id: string) => {
127 │     if (billerId === id) return;
128 │
129 │     setBillerId(id);
130 │     clearPaymentDetails();
131 │   };
132 │
133 │   const leaveReview = () => {
134 │     pay.reset();
135 │     setReviewing(false);
136 │   };
137 │
138 │   const payBill = () => {
139 │     if (!biller || !validDetails || pay.isPending) return;
140 │
141 │     pay.mutate({
142 │       billerId: biller.id,
143 │       accountNumber,
144 │       amount: amountCentavos,
145 │       card: limit.card,
146 │     });
147 │   };
148 │
149 │   const finish = () => {
150 │     router.push("/dashboard");
151 │     router.refresh();
152 │   };
```
<!-- /code -->

| Lines | Behavior |
| --- | --- |
| 92–96 | state: category, biller, biller account number, amount, and whether we are reviewing |
| 98–100 | load the catalogue once; prepare the pay mutation; spend limit (max ₱1,000,000 per transaction) |
| 102–105 | the billers of the chosen category, and the chosen biller |
| 108–111 | ready to review = a biller is chosen, the account number is 4–20 digits, and the amount passes `useSpendLimit` |
| 118–131 | choosing another category or biller **clears** the account number and amount, so a number typed for Meralco is never sent to PLDT |
| 138–147 | pay with the chosen card; guarded against double taps |

The form shows: **Category** (four `CategoryCard` toggle buttons) → **Biller** (`BillerCard` list with "Loading billers…", **Retry** on error and "No billers in this category.") → **Biller account number** (digits only, "4 to 20 digits, as printed on your bill.") and **Amount** (with the balance / daily-left hint) → **Review** (summary, **Pay with** card picker, "Pay ₱X").

The receipt ("Payment successful", lines 154–172 of the file) shows the account number **masked** (`maskDigits` keeps the last 4 digits: `00112233` becomes `****2233`), the reference, the date, **"Points earned +N"**, the new balance and "Paid with …".

`category-card.tsx` and `biller-card.tsx` are buttons with `aria-pressed`, so screen readers announce which one is selected; the selected biller also shows a check mark.

---

## 3. Buy load

<!-- code: gobank/src/features/load/load.rules.ts -->
**`gobank/src/features/load/load.rules.ts`** · all 2 lines

```ts
1 │ export const MIN_LOAD_CENTAVOS = 1_000;
2 │ export const MAX_LOAD_CENTAVOS = 1_000_000;
```
<!-- /code -->

<!-- code: gobank/src/features/load/load.router.ts -->
**`gobank/src/features/load/load.router.ts`** · all 19 lines

```ts
 1 │ import { z } from "zod";
 2 │ import { cardKind, mobile, centavos } from "~/shared/lib/schemas";
 3 │ import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
 4 │ import { MAX_LOAD_CENTAVOS, MIN_LOAD_CENTAVOS } from "./load.rules";
 5 │ import { buyLoad } from "./load.service";
 6 │
 7 │ export const loadRouter = createTRPCRouter({
 8 │   buy: protectedProcedure
 9 │     .input(
10 │       z.object({
11 │         mobile: mobile.pipe(z.string({ message: "Enter a mobile number" })),
12 │         amount: centavos.min(MIN_LOAD_CENTAVOS).max(MAX_LOAD_CENTAVOS),
13 │         card: cardKind,
14 │       }),
15 │     )
16 │     .mutation(({ ctx, input }) =>
17 │       buyLoad(ctx.userId, input.mobile, input.amount, input.card),
18 │     ),
19 │ });
```
<!-- /code -->

Line 11 is a neat Zod trick. The shared `mobile` schema allows an *empty* mobile (it is optional on a profile) and turns it into `null`. For load, the result is piped into `z.string(...)`, which rejects `null` with "Enter a mobile number". So the same normalization is reused, but the number becomes **required** here.

<!-- code: gobank/src/features/load/load.service.ts -->
**`gobank/src/features/load/load.service.ts`** · all 21 lines

```ts
 1 │ import { formatMobile } from "~/shared/lib/contact";
 2 │ import { db } from "~/server/db";
 3 │ import { spend } from "~/server/ledger";
 4 │ import type { CardKind } from "../../../generated/prisma";
 5 │
 6 │ export const buyLoad = (
 7 │   userId: string,
 8 │   mobile: string,
 9 │   amount: number,
10 │   card: CardKind,
11 │ ) =>
12 │   db.$transaction((tx) =>
13 │     spend(tx, {
14 │       userId,
15 │       kind: "load",
16 │       title: `Mobile load · ${formatMobile(mobile)}`,
17 │       amount,
18 │       details: { mobile },
19 │       card,
20 │     }),
21 │   );
```
<!-- /code -->

`spend()` with kind `load`: card, daily limit and balance checks apply; **no points** (load is not in `KINDS_THAT_EARN_POINTS`); the title shows the formatted number.

<!-- code: gobank/src/features/load/components/load-form.tsx 28-110 -->
**`gobank/src/features/load/components/load-form.tsx`** · lines 28–110

```tsx
 28 │ const LOAD_PRESETS = [10, 15, 20, 50, 100, 300, 500, 1000];
 29 │ const MOBILE_LENGTH = 11;
 30 │
 31 │ function LoadPresets({
 32 │   selectedCentavos,
 33 │   onPick,
 34 │ }: {
 35 │   selectedCentavos: number;
 36 │   onPick: (pesos: number) => void;
 37 │ }) {
 38 │   return (
 39 │     <div className="mt-4 grid grid-cols-4 gap-2" aria-label="Load amounts">
 40 │       {LOAD_PRESETS.map((pesos) => {
 41 │         const selected = selectedCentavos === toCentavos(pesos);
 42 │
 43 │         return (
 44 │           <button
 45 │             key={pesos}
 46 │             type="button"
 47 │             aria-pressed={selected}
 48 │             onClick={() => onPick(pesos)}
 49 │             className={cn(
 50 │               "h-12 rounded-xl border px-2 text-[13px] font-medium transition-colors",
 51 │               selected
 52 │                 ? "border-brand bg-brand-soft text-brand"
 53 │                 : "border-line bg-surface-sunken text-ink hover:bg-surface-raised",
 54 │             )}
 55 │           >
 56 │             ₱{pesos.toLocaleString("en-PH")}
 57 │           </button>
 58 │         );
 59 │       })}
 60 │     </div>
 61 │   );
 62 │ }
 63 │
 64 │ export function LoadForm() {
 65 │   const router = useRouter();
 66 │   const [mobile, setMobile] = useState("");
 67 │   const [amount, setAmount] = useState("");
 68 │   const [reviewing, setReviewing] = useState(false);
 69 │
 70 │   const load = api.load.buy.useMutation();
 71 │   const limit = useSpendLimit(MAX_LOAD_CENTAVOS, MIN_LOAD_CENTAVOS);
 72 │
 73 │   const amountCentavos = toCentavos(Number(amount));
 74 │   const mobileComplete = mobile.length === MOBILE_LENGTH;
 75 │   const mobileError = mobileComplete ? validateMobile(mobile) : null;
 76 │   const validDetails =
 77 │     mobileComplete && !mobileError && limit.valid(amountCentavos);
 78 │
 79 │   const leaveReview = () => {
 80 │     load.reset();
 81 │     setReviewing(false);
 82 │   };
 83 │
 84 │   const buyLoad = () => {
 85 │     if (!validDetails || load.isPending) return;
 86 │
 87 │     load.mutate({ mobile, amount: amountCentavos, card: limit.card });
 88 │   };
 89 │
 90 │   const finish = () => {
 91 │     router.push("/dashboard");
 92 │     router.refresh();
 93 │   };
 94 │
 95 │   if (load.data) {
 96 │     return (
 97 │       <TransactionReceipt title="Load successful" onDone={finish}>
 98 │         <TransactionSummary
 99 │           amount={Math.abs(load.data.amount)}
100 │           details={[
101 │             { label: "Mobile", value: formatMobile(mobile) },
102 │             { label: "Reference", value: load.data.reference },
103 │             { label: "Date", value: dateTime(load.data.createdAt) },
104 │             { label: "Balance", value: peso(load.data.balanceAfter) },
105 │             ...paidWithDetail(load.data.details),
106 │           ]}
107 │         />
108 │       </TransactionReceipt>
109 │     );
110 │   }
```
<!-- /code -->

| Lines | Behavior |
| --- | --- |
| 28 | quick amounts: ₱10, 15, 20, 50, 100, 300, 500, 1,000 |
| 31–62 | the preset buttons; the one equal to the typed amount is highlighted (`aria-pressed`) |
| 71 | spend limit with **minimum ₱10** and maximum ₱10,000 |
| 74–77 | the mobile is checked only once all 11 digits are typed (no error while still typing) |
| 95–110 | the receipt: "Load successful" with the mobile, reference, date, balance and "Paid with …" |

While typing, the mobile field converts `+63` to `0` and keeps at most 11 digits (`digitsOnly(normalizeMobile(...), 11)`), so `+63 917 123 4567` becomes `09171234567` automatically.

---

## 4. Tests

`scripts/verify-core.ts` → `checkBillsAndLoad`, on a real database:

1. Deposit ₱1,000 → pay a ₱50 bill with the **physical** card → buy ₱100 load with the **virtual** card → the balance is exactly **₱850.00**.
2. Points = **1**: the ₱50 bill earns `floor(5000 / 5000) = 1` point; the load earns none.
3. The bill's receipt can be opened by its owner and **not** by another user.
4. Buying ₱1,000 of load with only ₱850 fails with "Insufficient balance" and the account is **exactly unchanged** (rollback).

`checkCardLocks` also proves a ₱0 daily limit blocks a load purchase ("This goes over your daily limit").

---

## Defense questions

**Q: Where does deposited money come from?**
A: The deposit is simulated: it records a cash-in through the ledger, as a real cash-in at a partner outlet or bank would. In production, this endpoint would be called only after a payment provider confirms the funds.

**Q: Why do bills earn points but load does not?**
A: That is the rewards policy in the code: `KINDS_THAT_EARN_POINTS` is transfers and bills. Load still counts toward the daily spending limit. Both rules are one-line constants in the ledger, easy to change.

**Q: What prevents paying a biller that has been removed?**
A: Billers have an `active` flag. Inactive billers are not listed, and `payBill` refuses them with "This biller is not available."

---

## Check yourself

<details>
<summary>Does a deposit count toward the daily card limit?</summary>

No. Deposits use `post()` directly, not `spend()`, and `deposit` is not one of the spending kinds.
</details>

<details>
<summary>Why does choosing a different biller clear the amount and account number?</summary>

To avoid accidentally paying one biller with an account number typed for another.
</details>
