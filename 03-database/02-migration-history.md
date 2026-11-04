# Migration history

**What you will learn:** all 19 database migrations in the order PostgreSQL applies them, what each changes and *why*. Read together, they tell the story of how GoBank's design matured: one card became two, a "Stash" became GoalSave, and a practice Bitcoin wallet became trades paid from the real balance. You will also learn professional migration techniques: data migrations, safety guards and enum rebuilding.

All 19 migrations were applied to an empty PostgreSQL 16 database while preparing these docs, and the result matched `schema.prisma` exactly.

---

## Rules for migrations (know these)

1. **Append-only.** An applied migration is never edited. A mistake is fixed by a *new* migration. That is why you see renames and removals instead of a clean rewrite.
2. **Ordered by folder name.** The timestamp prefix (`20260923000000_…`) fixes the order.
3. **Recorded.** Prisma stores each applied migration in the `_prisma_migrations` table, so `prisma migrate deploy` only runs new ones.
4. **Schema + data together.** When a structure changes, the existing rows must be converted in the same migration (backfills, copies, title rewrites).
5. **`BEGIN … COMMIT`** around multi-step migrations makes them all-or-nothing.

---

## Timeline

| # | Migration | One-line summary |
| --- | --- | --- |
| 1 | `20260923000000_init` | The first design: users, sessions, one card, "Stash" savings, billers, transactions, requests |
| 2 | `20260925000000_pin_lockout` | Count wrong PINs and lock the account |
| 3 | `20260925000100_session_expiry_index` | Make expired-session cleanup fast |
| 4 | `20261005000000_bitcoin_practice` | A separate practice wallet with fake cash |
| 5 | `20261005010000_account_funded_bitcoin` | Fund Bitcoin from the real account through a USD wallet |
| 6 | `20261005020000_direct_php_bitcoin` | Trade directly in PHP; orders get bank references |
| 7 | `20261005030000_remove_unused_bitcoin_tables` | Drop the practice and USD tables (with a safety guard) |
| 8 | `20261005040000_profile_photo` | Users can have a photo |
| 9 | `20261006000000_enrollment_gmail_cards` | `email` → `gmail`, required full name, card previews for sign-up |
| 10 | `20261006000100_discover_card_brand` | Add the Discover network |
| 11 | `20261006000200_discover_card_default` | Make Discover the default |
| 12 | `20261006000300_bitcoin_trade_history` | Verify, then replace wallets with a pure trade history |
| 13 | `20261006000400_stash_compound_interest` | Columns for exact daily compound interest |
| 14 | `20261008000000_card_cvv_encryption` | Store CVVs encrypted (instead of hashed) |
| 15 | `20261008010000_dual_cards_shared_policy` | Two cards per user; lock and limit move to the user |
| 16 | `20261010000000_clear_savings_bitcoin_names` | Rename Stash → SavingsGoal and clearer Bitcoin column names |
| 17 | `20261103000000_banking_transaction_titles` | Rewrite old history titles to standard banking names |
| 18 | `20261103010000_per_card_lock` | Each card can be locked separately again |
| 19 | `20261104000000_card_integrity` | Remove the legacy `gobank` brand and the CVV hashes; encrypted CVV required |

---

## 1. `init`: the first design

<!-- code: gobank/prisma/migrations/20260923000000_init/migration.sql -->
**`gobank/prisma/migrations/20260923000000_init/migration.sql`** · all 159 lines

```sql
  1 │ CREATE TYPE "CardBrand" AS ENUM ('visa', 'mastercard', 'jcb', 'gobank');
  2 │
  3 │ CREATE TYPE "BillerCategory" AS ENUM ('electric', 'water', 'internet', 'credit_card');
  4 │
  5 │ CREATE TYPE "TransactionKind" AS ENUM ('deposit', 'transfer', 'bill', 'load', 'stash', 'reward', 'interest');
  6 │
  7 │ CREATE TYPE "RequestStatus" AS ENUM ('pending', 'paid', 'declined', 'cancelled');
  8 │
  9 │ CREATE TABLE "User" (
 10 │     "id" TEXT NOT NULL,
 11 │     "username" TEXT NOT NULL,
 12 │     "pinHash" TEXT NOT NULL,
 13 │     "fullName" TEXT,
 14 │     "mobile" TEXT,
 15 │     "email" TEXT,
 16 │     "googleId" TEXT,
 17 │     "accountNumber" TEXT NOT NULL,
 18 │     "balance" INTEGER NOT NULL DEFAULT 0,
 19 │     "points" INTEGER NOT NULL DEFAULT 0,
 20 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 21 │     "updatedAt" TIMESTAMP(3) NOT NULL,
 22 │
 23 │     CONSTRAINT "User_pkey" PRIMARY KEY ("id")
 24 │ );
 25 │
 26 │ CREATE TABLE "Session" (
 27 │     "id" TEXT NOT NULL,
 28 │     "userId" TEXT NOT NULL,
 29 │     "expiresAt" TIMESTAMP(3) NOT NULL,
 30 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 31 │
 32 │     CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
 33 │ );
 34 │
 35 │ CREATE TABLE "Card" (
 36 │     "id" TEXT NOT NULL,
 37 │     "userId" TEXT NOT NULL,
 38 │     "brand" "CardBrand" NOT NULL DEFAULT 'gobank',
 39 │     "number" TEXT NOT NULL,
 40 │     "expiresAt" TIMESTAMP(3) NOT NULL,
 41 │     "locked" BOOLEAN NOT NULL DEFAULT false,
 42 │     "dailyLimit" INTEGER NOT NULL DEFAULT 2000000,
 43 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 44 │     "updatedAt" TIMESTAMP(3) NOT NULL,
 45 │
 46 │     CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
 47 │ );
 48 │
 49 │ CREATE TABLE "Stash" (
 50 │     "id" TEXT NOT NULL,
 51 │     "userId" TEXT NOT NULL,
 52 │     "name" TEXT NOT NULL,
 53 │     "goal" INTEGER,
 54 │     "balance" INTEGER NOT NULL DEFAULT 0,
 55 │     "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0.04,
 56 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 57 │     "updatedAt" TIMESTAMP(3) NOT NULL,
 58 │
 59 │     CONSTRAINT "Stash_pkey" PRIMARY KEY ("id")
 60 │ );
 61 │
 62 │ CREATE TABLE "Biller" (
 63 │     "id" TEXT NOT NULL,
 64 │     "code" TEXT NOT NULL,
 65 │     "name" TEXT NOT NULL,
 66 │     "category" "BillerCategory" NOT NULL,
 67 │     "description" TEXT NOT NULL,
 68 │     "active" BOOLEAN NOT NULL DEFAULT true,
 69 │
 70 │     CONSTRAINT "Biller_pkey" PRIMARY KEY ("id")
 71 │ );
 72 │
 73 │ CREATE TABLE "Transaction" (
 74 │     "id" TEXT NOT NULL,
 75 │     "reference" TEXT NOT NULL,
 76 │     "kind" "TransactionKind" NOT NULL,
 77 │     "title" TEXT NOT NULL,
 78 │     "amount" INTEGER NOT NULL,
 79 │     "balanceAfter" INTEGER NOT NULL,
 80 │     "points" INTEGER NOT NULL DEFAULT 0,
 81 │     "details" JSONB,
 82 │     "userId" TEXT NOT NULL,
 83 │     "counterpartyId" TEXT,
 84 │     "stashId" TEXT,
 85 │     "billerId" TEXT,
 86 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 87 │
 88 │     CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
 89 │ );
 90 │
 91 │ CREATE TABLE "MoneyRequest" (
 92 │     "id" TEXT NOT NULL,
 93 │     "requesterId" TEXT NOT NULL,
 94 │     "payerId" TEXT NOT NULL,
 95 │     "amount" INTEGER NOT NULL,
 96 │     "note" TEXT,
 97 │     "status" "RequestStatus" NOT NULL DEFAULT 'pending',
 98 │     "reference" TEXT,
 99 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
100 │     "updatedAt" TIMESTAMP(3) NOT NULL,
101 │
102 │     CONSTRAINT "MoneyRequest_pkey" PRIMARY KEY ("id")
103 │ );
104 │
105 │ CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
106 │
107 │ CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");
108 │
109 │ CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
110 │
111 │ CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
112 │
113 │ CREATE UNIQUE INDEX "User_accountNumber_key" ON "User"("accountNumber");
114 │
115 │ CREATE INDEX "Session_userId_idx" ON "Session"("userId");
116 │
117 │ CREATE UNIQUE INDEX "Card_userId_key" ON "Card"("userId");
118 │
119 │ CREATE UNIQUE INDEX "Card_number_key" ON "Card"("number");
120 │
121 │ CREATE UNIQUE INDEX "Stash_userId_name_key" ON "Stash"("userId", "name");
122 │
123 │ CREATE UNIQUE INDEX "Biller_code_key" ON "Biller"("code");
124 │
125 │ CREATE INDEX "Biller_category_idx" ON "Biller"("category");
126 │
127 │ CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt" DESC);
128 │
129 │ CREATE UNIQUE INDEX "Transaction_reference_userId_key" ON "Transaction"("reference", "userId");
130 │
131 │ CREATE INDEX "MoneyRequest_payerId_status_idx" ON "MoneyRequest"("payerId", "status");
132 │
133 │ CREATE INDEX "MoneyRequest_requesterId_idx" ON "MoneyRequest"("requesterId");
134 │
135 │ ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
136 │
137 │ ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
138 │
139 │ ALTER TABLE "Stash" ADD CONSTRAINT "Stash_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
140 │
141 │ ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
142 │
143 │ ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
144 │
145 │ ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_stashId_fkey" FOREIGN KEY ("stashId") REFERENCES "Stash"("id") ON DELETE SET NULL ON UPDATE CASCADE;
146 │
147 │ ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "Biller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
148 │
149 │ ALTER TABLE "MoneyRequest" ADD CONSTRAINT "MoneyRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
150 │
151 │ ALTER TABLE "MoneyRequest" ADD CONSTRAINT "MoneyRequest_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
152 │
153 │ ALTER TABLE "User" ADD CONSTRAINT "User_balance_check" CHECK ("balance" >= 0);
154 │
155 │ ALTER TABLE "User" ADD CONSTRAINT "User_points_check" CHECK ("points" >= 0);
156 │
157 │ ALTER TABLE "Stash" ADD CONSTRAINT "Stash_balance_check" CHECK ("balance" >= 0);
158 │
159 │ ALTER TABLE "Card" ADD CONSTRAINT "Card_dailyLimit_check" CHECK ("dailyLimit" >= 0);
```
<!-- /code -->

What to notice:

- **Lines 1–7:** the original enums. `CardBrand` included a house brand `gobank`; `TransactionKind` had no `exchange` yet.
- **Lines 9–24:** `User` had `email` (not `gmail`) and `fullName` was optional.
- **Lines 35–47 and 117:** `Card` had `dailyLimit` and `locked` on the card, and `Card_userId_key` made it **one card per user**.
- **Lines 49–60:** savings goals were called **Stash** with a `goal` column (the target).
- **Lines 105–133:** unique indexes and lookup indexes, including the two still used for history: `Transaction(userId, createdAt DESC)` and unique `(reference, userId)`.
- **Lines 135–151:** foreign keys. History links use `ON DELETE SET NULL`; ownership links use `ON DELETE CASCADE`.
- **Lines 153–159:** the hand-written **CHECK constraints**: no negative balances, points, stash balances or limits. They have protected every later version.

## 2. `pin_lockout`

<!-- code: gobank/prisma/migrations/20260925000000_pin_lockout/migration.sql -->
**`gobank/prisma/migrations/20260925000000_pin_lockout/migration.sql`** · all 2 lines

```sql
1 │ ALTER TABLE "User" ADD COLUMN     "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
2 │ ADD COLUMN     "lockedUntil" TIMESTAMP(3);
```
<!-- /code -->

Adds the brute-force protection state used by `checkPinAndUpdateAttempts` ([Registration and sign-in](../05-features/01-registration-and-sign-in.md)).

## 3. `session_expiry_index`

<!-- code: gobank/prisma/migrations/20260925000100_session_expiry_index/migration.sql -->
**`gobank/prisma/migrations/20260925000100_session_expiry_index/migration.sql`** · all 1 lines

```sql
1 │ CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
```
<!-- /code -->

Every sign-in deletes sessions `WHERE "expiresAt" < now`. Without this index, PostgreSQL would scan the whole table each time.

## 4–7. The Bitcoin story, part 1

### 4. `bitcoin_practice`: a separate play-money wallet

<!-- code: gobank/prisma/migrations/20261005000000_bitcoin_practice/migration.sql -->
**`gobank/prisma/migrations/20261005000000_bitcoin_practice/migration.sql`** · all 35 lines

```sql
 1 │ CREATE TABLE "BitcoinAccount" (
 2 │     "userId" TEXT NOT NULL,
 3 │     "cashCents" INTEGER NOT NULL DEFAULT 1000000,
 4 │     "satoshis" BIGINT NOT NULL DEFAULT 0,
 5 │     "costBasisCents" INTEGER NOT NULL DEFAULT 0,
 6 │     "realizedCents" INTEGER NOT NULL DEFAULT 0,
 7 │     "version" INTEGER NOT NULL DEFAULT 0,
 8 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 9 │     "updatedAt" TIMESTAMP(3) NOT NULL,
10 │     CONSTRAINT "BitcoinAccount_pkey" PRIMARY KEY ("userId"),
11 │     CONSTRAINT "BitcoinAccount_nonnegative" CHECK ("cashCents" >= 0 AND "satoshis" >= 0 AND "costBasisCents" >= 0),
12 │     CONSTRAINT "BitcoinAccount_empty_basis" CHECK ("satoshis" > 0 OR "costBasisCents" = 0)
13 │ );
14 │
15 │ CREATE TABLE "BitcoinOrder" (
16 │     "id" TEXT NOT NULL,
17 │     "accountId" TEXT NOT NULL,
18 │     "requestId" TEXT NOT NULL,
19 │     "side" TEXT NOT NULL,
20 │     "satoshis" BIGINT NOT NULL,
21 │     "cashCents" INTEGER NOT NULL,
22 │     "priceCents" INTEGER NOT NULL,
23 │     "realizedCents" INTEGER NOT NULL DEFAULT 0,
24 │     "cashAfter" INTEGER NOT NULL,
25 │     "satoshisAfter" BIGINT NOT NULL,
26 │     "quotedAt" TIMESTAMP(3) NOT NULL,
27 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
28 │     CONSTRAINT "BitcoinOrder_pkey" PRIMARY KEY ("id"),
29 │     CONSTRAINT "BitcoinOrder_valid" CHECK ("side" IN ('buy', 'sell') AND "satoshis" > 0 AND "cashCents" > 0 AND "priceCents" > 0 AND "cashAfter" >= 0 AND "satoshisAfter" >= 0)
30 │ );
31 │
32 │ CREATE UNIQUE INDEX "BitcoinOrder_accountId_requestId_key" ON "BitcoinOrder"("accountId", "requestId");
33 │ CREATE INDEX "BitcoinOrder_accountId_createdAt_idx" ON "BitcoinOrder"("accountId", "createdAt" DESC);
34 │ ALTER TABLE "BitcoinAccount" ADD CONSTRAINT "BitcoinAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
35 │ ALTER TABLE "BitcoinOrder" ADD CONSTRAINT "BitcoinOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BitcoinAccount"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
```
<!-- /code -->

The first idea was a **practice account**: every user got ₱10,000 of fake cash (`cashCents` default `1000000`) to trade with. Notice the professional touches that survived into the final design:

- `requestId` + unique `(accountId, requestId)` (line 32): the **idempotency key**, later renamed `submissionId`.
- `BitcoinAccount_empty_basis` (line 12): if you hold zero satoshis, your cost basis must be zero.
- `BitcoinOrder_valid` (line 29): only `buy`/`sell`, positive amounts.

### 5. `account_funded_bitcoin`: use real money through a USD wallet

<!-- code: gobank/prisma/migrations/20261005010000_account_funded_bitcoin/migration.sql -->
**`gobank/prisma/migrations/20261005010000_account_funded_bitcoin/migration.sql`** · all 55 lines

```sql
 1 │ ALTER TYPE "TransactionKind" ADD VALUE 'exchange';
 2 │ ALTER TABLE "BitcoinAccount" ALTER COLUMN "cashCents" SET DEFAULT 0;
 3 │
 4 │ CREATE TABLE "InvestmentWallet" (
 5 │   "userId" TEXT NOT NULL PRIMARY KEY,
 6 │   "cashCents" INTEGER NOT NULL DEFAULT 0,
 7 │   "satoshis" BIGINT NOT NULL DEFAULT 0,
 8 │   "costBasisCents" INTEGER NOT NULL DEFAULT 0,
 9 │   "realizedCents" INTEGER NOT NULL DEFAULT 0,
10 │   "version" INTEGER NOT NULL DEFAULT 0,
11 │   "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
12 │   "updatedAt" TIMESTAMP(3) NOT NULL,
13 │   CONSTRAINT "InvestmentWallet_nonnegative" CHECK ("cashCents" >= 0 AND "satoshis" >= 0 AND "costBasisCents" >= 0),
14 │   CONSTRAINT "InvestmentWallet_empty_basis" CHECK ("satoshis" > 0 OR "costBasisCents" = 0),
15 │   CONSTRAINT "InvestmentWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
16 │ );
17 │
18 │ CREATE TABLE "InvestmentOrder" (
19 │   "id" TEXT NOT NULL PRIMARY KEY,
20 │   "accountId" TEXT NOT NULL,
21 │   "requestId" TEXT NOT NULL,
22 │   "side" TEXT NOT NULL,
23 │   "satoshis" BIGINT NOT NULL,
24 │   "cashCents" INTEGER NOT NULL,
25 │   "priceCents" INTEGER NOT NULL,
26 │   "realizedCents" INTEGER NOT NULL DEFAULT 0,
27 │   "cashAfter" INTEGER NOT NULL,
28 │   "satoshisAfter" BIGINT NOT NULL,
29 │   "quotedAt" TIMESTAMP(3) NOT NULL,
30 │   "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
31 │   CONSTRAINT "InvestmentOrder_valid" CHECK ("side" IN ('buy', 'sell') AND "satoshis" > 0 AND "cashCents" > 0 AND "priceCents" > 0 AND "cashAfter" >= 0 AND "satoshisAfter" >= 0),
32 │   CONSTRAINT "InvestmentOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentWallet"("userId") ON DELETE CASCADE ON UPDATE CASCADE
33 │ );
34 │ CREATE UNIQUE INDEX "InvestmentOrder_accountId_requestId_key" ON "InvestmentOrder"("accountId", "requestId");
35 │ CREATE INDEX "InvestmentOrder_accountId_createdAt_idx" ON "InvestmentOrder"("accountId", "createdAt" DESC);
36 │
37 │ CREATE TABLE "CurrencyConversion" (
38 │   "id" TEXT NOT NULL PRIMARY KEY,
39 │   "accountId" TEXT NOT NULL,
40 │   "requestId" TEXT NOT NULL,
41 │   "reference" TEXT NOT NULL,
42 │   "direction" TEXT NOT NULL,
43 │   "phpCentavos" INTEGER NOT NULL,
44 │   "usdCents" INTEGER NOT NULL,
45 │   "rateScaled" BIGINT NOT NULL,
46 │   "rateDate" TEXT NOT NULL,
47 │   "phpAfter" INTEGER NOT NULL,
48 │   "usdAfter" INTEGER NOT NULL,
49 │   "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
50 │   CONSTRAINT "CurrencyConversion_valid" CHECK ("direction" IN ('buy_usd', 'sell_usd') AND "phpCentavos" > 0 AND "usdCents" > 0 AND "rateScaled" > 0 AND "phpAfter" >= 0 AND "usdAfter" >= 0),
51 │   CONSTRAINT "CurrencyConversion_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentWallet"("userId") ON DELETE CASCADE ON UPDATE CASCADE
52 │ );
53 │ CREATE UNIQUE INDEX "CurrencyConversion_accountId_requestId_key" ON "CurrencyConversion"("accountId", "requestId");
54 │ CREATE UNIQUE INDEX "CurrencyConversion_reference_key" ON "CurrencyConversion"("reference");
55 │ CREATE INDEX "CurrencyConversion_accountId_createdAt_idx" ON "CurrencyConversion"("accountId", "createdAt" DESC);
```
<!-- /code -->

- Line 1: the new `exchange` transaction kind, so Bitcoin purchases appear in the main history.
- Line 2: practice accounts no longer get free cash.
- Lines 4–35: `InvestmentWallet` and `InvestmentOrder`, the same shape as the practice tables but funded from the user's account.
- Lines 37–55: `CurrencyConversion` for PHP ⇄ USD conversions with a scaled exchange rate (`rateScaled`), idempotent per `requestId`.

### 6. `direct_php_bitcoin`: skip the USD step

<!-- code: gobank/prisma/migrations/20261005020000_direct_php_bitcoin/migration.sql -->
**`gobank/prisma/migrations/20261005020000_direct_php_bitcoin/migration.sql`** · all 4 lines

```sql
1 │ -- Add bank references for direct PHP Bitcoin trades. Existing USD records and
2 │ -- balances are preserved; the active app no longer exposes conversion endpoints.
3 │ ALTER TABLE "InvestmentOrder" ADD COLUMN "reference" TEXT;
4 │ CREATE UNIQUE INDEX "InvestmentOrder_reference_key" ON "InvestmentOrder"("reference");
```
<!-- /code -->

Trades now debit or credit PHP directly, and every order gets a unique bank `reference` (the same reference as its `exchange` history row).

### 7. `remove_unused_bitcoin_tables`: clean up, but safely

<!-- code: gobank/prisma/migrations/20261005030000_remove_unused_bitcoin_tables/migration.sql -->
**`gobank/prisma/migrations/20261005030000_remove_unused_bitcoin_tables/migration.sql`** · all 15 lines

```sql
 1 │ -- User-requested removal of obsolete preview and currency-conversion tables.
 2 │ -- A local JSON backup was exported before applying this migration.
 3 │ -- Refuse cleanup if the unused USD field contains account funds.
 4 │ DO $$ BEGIN
 5 │   IF EXISTS (SELECT 1 FROM "InvestmentWallet" WHERE "cashCents" <> 0) THEN
 6 │     RAISE EXCEPTION 'USD balances exist; preserve account funds before cleanup';
 7 │   END IF;
 8 │ END $$;
 9 │
10 │ DROP TABLE "BitcoinOrder";
11 │ DROP TABLE "BitcoinAccount";
12 │ DROP TABLE "CurrencyConversion";
13 │ ALTER TABLE "InvestmentWallet" DROP CONSTRAINT "InvestmentWallet_nonnegative";
14 │ ALTER TABLE "InvestmentWallet" DROP COLUMN "cashCents";
15 │ ALTER TABLE "InvestmentWallet" ADD CONSTRAINT "InvestmentWallet_nonnegative" CHECK ("satoshis" >= 0 AND "costBasisCents" >= 0);
```
<!-- /code -->

- **Lines 4–8: a safety guard.** A PL/pgSQL `DO` block checks whether any wallet still holds USD cash. If so, it raises an exception, which **aborts the migration** before anything is dropped. Money is never destroyed by a cleanup.
- Lines 10–15: drop the practice tables and the USD conversion table, and remove the unused `cashCents` column.

## 8. `profile_photo`

<!-- code: gobank/prisma/migrations/20261005040000_profile_photo/migration.sql -->
**`gobank/prisma/migrations/20261005040000_profile_photo/migration.sql`** · all 1 lines

```sql
1 │ ALTER TABLE "User" ADD COLUMN "profilePhoto" TEXT;
```
<!-- /code -->

A `TEXT` column that will hold a small WebP `data:` URL ([Account and profile](../05-features/03-account-and-profile.md)).

## 9. `enrollment_gmail_cards`: the registration redesign

<!-- code: gobank/prisma/migrations/20261006000000_enrollment_gmail_cards/migration.sql -->
**`gobank/prisma/migrations/20261006000000_enrollment_gmail_cards/migration.sql`** · all 21 lines

```sql
 1 │ ALTER TABLE "User" RENAME COLUMN "email" TO "gmail";
 2 │ ALTER INDEX "User_email_key" RENAME TO "User_gmail_key";
 3 │
 4 │ UPDATE "User" SET "fullName" = "username"
 5 │ WHERE "fullName" IS NULL OR btrim("fullName") = '';
 6 │ ALTER TABLE "User" ALTER COLUMN "fullName" SET NOT NULL;
 7 │
 8 │ ALTER TABLE "Card" ADD COLUMN "cvvHash" TEXT;
 9 │
10 │ CREATE TABLE "RegistrationCard" (
11 │     "id" TEXT NOT NULL,
12 │     "brand" "CardBrand" NOT NULL,
13 │     "number" TEXT NOT NULL,
14 │     "cvvHash" TEXT NOT NULL,
15 │     "expiresAt" TIMESTAMP(3) NOT NULL,
16 │     "validUntil" TIMESTAMP(3) NOT NULL,
17 │     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
18 │     CONSTRAINT "RegistrationCard_pkey" PRIMARY KEY ("id")
19 │ );
20 │ CREATE UNIQUE INDEX "RegistrationCard_number_key" ON "RegistrationCard"("number");
21 │ CREATE INDEX "RegistrationCard_validUntil_idx" ON "RegistrationCard"("validUntil");
```
<!-- /code -->

- Lines 1–2: rename `email` → `gmail` (and its unique index); only Gmail addresses are linked.
- Lines 4–6: a **backfill before a constraint**. Existing users without a name get their username as their name, *then* the column becomes `NOT NULL`. Reversing the order would fail on the old rows.
- Line 8: cards get a `cvvHash` (replaced by encryption in migration 14, removed in 19).
- Lines 10–21: the `RegistrationCard` table for card previews during sign-up.

## 10–11. Adding Discover, in two steps

<!-- code: gobank/prisma/migrations/20261006000100_discover_card_brand/migration.sql -->
**`gobank/prisma/migrations/20261006000100_discover_card_brand/migration.sql`** · all 1 lines

```sql
1 │ ALTER TYPE "CardBrand" ADD VALUE 'discover';
```
<!-- /code -->

<!-- code: gobank/prisma/migrations/20261006000200_discover_card_default/migration.sql -->
**`gobank/prisma/migrations/20261006000200_discover_card_default/migration.sql`** · all 1 lines

```sql
1 │ ALTER TABLE "Card" ALTER COLUMN "brand" SET DEFAULT 'discover';
```
<!-- /code -->

> **Why two migrations for one change?** PostgreSQL does not allow a newly added enum value to be *used* (for example as a default) until the transaction that added it has committed. Prisma runs each migration in its own step, so the value is added in one migration and used in the next.

## 12. `bitcoin_trade_history`: from wallets to event sourcing

<!-- code: gobank/prisma/migrations/20261006000300_bitcoin_trade_history/migration.sql -->
**`gobank/prisma/migrations/20261006000300_bitcoin_trade_history/migration.sql`** · all 57 lines

```sql
 1 │ BEGIN;
 2 │ LOCK TABLE "InvestmentWallet", "InvestmentOrder" IN ACCESS EXCLUSIVE MODE;
 3 │
 4 │ -- Refuse removal if replaying history would change anyone's holdings or profit.
 5 │ DO $$
 6 │ DECLARE
 7 │   wallet RECORD;
 8 │   trade RECORD;
 9 │   held BIGINT;
10 │   basis BIGINT;
11 │   profit BIGINT;
12 │   sold_basis BIGINT;
13 │ BEGIN
14 │   FOR wallet IN SELECT * FROM "InvestmentWallet" LOOP
15 │     held := 0; basis := 0; profit := 0;
16 │     FOR trade IN SELECT * FROM "InvestmentOrder"
17 │       WHERE "accountId" = wallet."userId" ORDER BY "createdAt", "id" LOOP
18 │       IF trade."side" = 'buy' THEN
19 │         held := held + trade."satoshis";
20 │         basis := basis + trade."cashCents";
21 │       ELSE
22 │         IF held < trade."satoshis" THEN
23 │           RAISE EXCEPTION 'Bitcoin history cannot reproduce an existing wallet';
24 │         END IF;
25 │         sold_basis := floor(basis::numeric * trade."satoshis" / held);
26 │         held := held - trade."satoshis";
27 │         basis := basis - sold_basis;
28 │         profit := profit + trade."cashCents" - sold_basis;
29 │       END IF;
30 │     END LOOP;
31 │     IF held <> wallet."satoshis" OR basis <> wallet."costBasisCents" OR profit <> wallet."realizedCents" THEN
32 │       RAISE EXCEPTION 'Bitcoin history differs from an existing wallet; migration cancelled';
33 │     END IF;
34 │   END LOOP;
35 │ END $$;
36 │
37 │ ALTER TABLE "InvestmentOrder" DROP CONSTRAINT "InvestmentOrder_accountId_fkey";
38 │ ALTER TABLE "InvestmentOrder" DROP CONSTRAINT "InvestmentOrder_valid";
39 │ ALTER TABLE "InvestmentOrder" RENAME TO "BitcoinTrade";
40 │ ALTER TABLE "BitcoinTrade" RENAME COLUMN "accountId" TO "userId";
41 │ ALTER TABLE "BitcoinTrade" RENAME COLUMN "cashCents" TO "phpCentavos";
42 │ ALTER TABLE "BitcoinTrade" RENAME COLUMN "priceCents" TO "priceCentavos";
43 │ ALTER TABLE "BitcoinTrade"
44 │   DROP COLUMN "realizedCents",
45 │   DROP COLUMN "cashAfter",
46 │   DROP COLUMN "satoshisAfter",
47 │   DROP COLUMN "quotedAt";
48 │ ALTER TABLE "BitcoinTrade" RENAME CONSTRAINT "InvestmentOrder_pkey" TO "BitcoinTrade_pkey";
49 │ ALTER INDEX "InvestmentOrder_accountId_requestId_key" RENAME TO "BitcoinTrade_userId_requestId_key";
50 │ ALTER INDEX "InvestmentOrder_reference_key" RENAME TO "BitcoinTrade_reference_key";
51 │ ALTER INDEX "InvestmentOrder_accountId_createdAt_idx" RENAME TO "BitcoinTrade_userId_createdAt_idx";
52 │ ALTER TABLE "BitcoinTrade" ADD CONSTRAINT "BitcoinTrade_userId_fkey"
53 │   FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
54 │ ALTER TABLE "BitcoinTrade" ADD CONSTRAINT "BitcoinTrade_valid"
55 │   CHECK ("side" IN ('buy', 'sell') AND "satoshis" > 0 AND "phpCentavos" > 0 AND "priceCentavos" > 0);
56 │ DROP TABLE "InvestmentWallet";
57 │ COMMIT;
```
<!-- /code -->

This is the most sophisticated migration in the project.

1. **Line 2:** lock both tables completely (`ACCESS EXCLUSIVE`), so no trade can happen while history is checked.
2. **Lines 5–35: prove the history is complete.** For every wallet, replay its orders oldest-first. A buy adds satoshis and cost. A sell removes satoshis and a proportional share of the cost (`floor(basis × sold / held)`, the *average cost* method) and adds `proceeds − share` to profit. If the replay does not reproduce the stored holdings, cost basis and profit **exactly**, raise an exception and cancel everything.
3. **Lines 37–55:** turn `InvestmentOrder` into `BitcoinTrade`: rename columns, drop columns that can be derived (`cashAfter`, `satoshisAfter`, `realizedCents`, `quotedAt`), point it at `User`, add a simpler validity check.
4. **Line 56:** drop `InvestmentWallet`. Holdings are now **computed from trades** by `summarizeTrades()` in `bitcoin.rules.ts`, which uses the same average-cost math as this SQL.

> **Defense angle:** "We removed a stored balance only after proving, inside the migration, that it could be recomputed exactly from the trade history; otherwise the migration refuses to run."

## 13. `stash_compound_interest`

<!-- code: gobank/prisma/migrations/20261006000400_stash_compound_interest/migration.sql -->
**`gobank/prisma/migrations/20261006000400_stash_compound_interest/migration.sql`** · all 5 lines

```sql
1 │ ALTER TABLE "Stash"
2 │   ADD COLUMN "interestCarry" DOUBLE PRECISION NOT NULL DEFAULT 0,
3 │   ADD COLUMN "interestUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
4 │ ALTER TABLE "Stash" ADD CONSTRAINT "Stash_valid_interest"
5 │   CHECK ("interestRate" >= 0 AND "interestRate" <= 1 AND "interestCarry" >= 0 AND "interestCarry" < 1);
```
<!-- /code -->

`interestCarry` (now `interestRemainder`) holds the fraction of a centavo not yet paid; `interestUpdatedAt` (now `interestCalculatedAt`) is when interest was last settled. The `CHECK` keeps the rate between 0% and 100% and the remainder below one centavo ([GoalSave](../05-features/08-goalsave.md)).

## 14. `card_cvv_encryption`

<!-- code: gobank/prisma/migrations/20261008000000_card_cvv_encryption/migration.sql -->
**`gobank/prisma/migrations/20261008000000_card_cvv_encryption/migration.sql`** · all 2 lines

```sql
1 │ ALTER TABLE "Card" ADD COLUMN "cvvEncrypted" TEXT;
2 │ ALTER TABLE "RegistrationCard" ADD COLUMN "cvvEncrypted" TEXT;
```
<!-- /code -->

A hash can only *verify* a CVV, but users need to *see* their CVV, so the design switched to AES-256-GCM encryption. The columns start nullable because existing rows had only hashes at that moment; migration 19 makes them required.

## 15. `dual_cards_shared_policy`: two cards per user

<!-- code: gobank/prisma/migrations/20261008010000_dual_cards_shared_policy/migration.sql -->
**`gobank/prisma/migrations/20261008010000_dual_cards_shared_policy/migration.sql`** · all 21 lines

```sql
 1 │ BEGIN;
 2 │
 3 │ CREATE TYPE "CardKind" AS ENUM ('physical', 'virtual');
 4 │
 5 │ ALTER TABLE "User"
 6 │ ADD COLUMN "cardLocked" BOOLEAN NOT NULL DEFAULT false,
 7 │ ADD COLUMN "cardDailyLimit" INTEGER NOT NULL DEFAULT 2000000;
 8 │
 9 │ UPDATE "User" AS account
10 │ SET "cardLocked" = card."locked", "cardDailyLimit" = card."dailyLimit"
11 │ FROM "Card" AS card
12 │ WHERE account."id" = card."userId";
13 │
14 │ ALTER TABLE "Card" ADD COLUMN "kind" "CardKind" NOT NULL DEFAULT 'physical';
15 │ DROP INDEX "Card_userId_key";
16 │ CREATE UNIQUE INDEX "Card_userId_kind_key" ON "Card"("userId", "kind");
17 │
18 │ ALTER TABLE "Card" DROP COLUMN "locked", DROP COLUMN "dailyLimit";
19 │ ALTER TABLE "User" ADD CONSTRAINT "User_cardDailyLimit_check" CHECK ("cardDailyLimit" >= 0);
20 │
21 │ COMMIT;
```
<!-- /code -->

- Line 3: the `CardKind` enum.
- Lines 5–12: copy each card's `locked` and `dailyLimit` up to the user, because they became shared by both cards.
- Lines 14–16: every existing card becomes the `physical` card; the one-card unique index is replaced by **one card per kind** (`userId, kind`).
- Line 18: remove the old card-level columns. Line 19: a `CHECK` on the new user-level limit.
- Lines 1 and 21: wrapped in `BEGIN`/`COMMIT`, so a failure leaves nothing half-done.

## 16. `clear_savings_bitcoin_names`

<!-- code: gobank/prisma/migrations/20261010000000_clear_savings_bitcoin_names/migration.sql -->
**`gobank/prisma/migrations/20261010000000_clear_savings_bitcoin_names/migration.sql`** · all 26 lines

```sql
 1 │ BEGIN;
 2 │
 3 │ -- Rename existing tables and columns only. Values, types and relationships stay intact.
 4 │ ALTER TABLE "Stash" RENAME TO "SavingsGoal";
 5 │ ALTER TABLE "SavingsGoal" RENAME COLUMN "goal" TO "targetAmount";
 6 │ ALTER TABLE "SavingsGoal" RENAME COLUMN "interestRate" TO "annualInterestRate";
 7 │ ALTER TABLE "SavingsGoal" RENAME COLUMN "interestCarry" TO "interestRemainder";
 8 │ ALTER TABLE "SavingsGoal" RENAME COLUMN "interestUpdatedAt" TO "interestCalculatedAt";
 9 │ ALTER TABLE "Transaction" RENAME COLUMN "stashId" TO "savingsGoalId";
10 │
11 │ ALTER TABLE "SavingsGoal" RENAME CONSTRAINT "Stash_pkey" TO "SavingsGoal_pkey";
12 │ ALTER TABLE "SavingsGoal" RENAME CONSTRAINT "Stash_userId_fkey" TO "SavingsGoal_userId_fkey";
13 │ ALTER TABLE "SavingsGoal" RENAME CONSTRAINT "Stash_balance_check" TO "SavingsGoal_balance_check";
14 │ ALTER TABLE "SavingsGoal" RENAME CONSTRAINT "Stash_valid_interest" TO "SavingsGoal_valid_interest";
15 │ ALTER INDEX "Stash_userId_name_key" RENAME TO "SavingsGoal_userId_name_key";
16 │ ALTER TABLE "Transaction" RENAME CONSTRAINT "Transaction_stashId_fkey" TO "Transaction_savingsGoalId_fkey";
17 │
18 │ ALTER TABLE "BitcoinTrade" RENAME COLUMN "side" TO "action";
19 │ ALTER TABLE "BitcoinTrade" RENAME COLUMN "requestId" TO "submissionId";
20 │ ALTER TABLE "BitcoinTrade" RENAME COLUMN "satoshis" TO "bitcoinUnits";
21 │ ALTER TABLE "BitcoinTrade" RENAME COLUMN "phpCentavos" TO "amountCentavos";
22 │ ALTER TABLE "BitcoinTrade" RENAME COLUMN "priceCentavos" TO "unitPriceCentavos";
23 │ ALTER INDEX "BitcoinTrade_userId_requestId_key" RENAME TO "BitcoinTrade_userId_submissionId_key";
24 │
25 │ -- PostgreSQL preserves all existing check expressions and foreign-key targets on rename.
26 │ COMMIT;
```
<!-- /code -->

Pure renames for readability: `Stash` → `SavingsGoal`, `goal` → `targetAmount`, `interestRate` → `annualInterestRate`, `interestCarry` → `interestRemainder`, `interestUpdatedAt` → `interestCalculatedAt`, `stashId` → `savingsGoalId`, and the Bitcoin columns `side` → `action`, `requestId` → `submissionId`, `satoshis` → `bitcoinUnits`, `phpCentavos` → `amountCentavos`, `priceCentavos` → `unitPriceCentavos`. No data changes; PostgreSQL keeps constraints and foreign keys pointing at the renamed columns (line 25). The `TransactionKind` value `stash` was **not** renamed, which is why history rows for GoalSave still have kind `stash`.

## 17. `banking_transaction_titles`: a data-only migration

<!-- code: gobank/prisma/migrations/20261103000000_banking_transaction_titles/migration.sql -->
**`gobank/prisma/migrations/20261103000000_banking_transaction_titles/migration.sql`** · all 12 lines

```sql
 1 │ UPDATE "Transaction" SET "title" = 'Transfer to ' || substring("title" from 9) WHERE "kind" = 'transfer' AND "title" LIKE 'Sent to %';
 2 │ UPDATE "Transaction" SET "title" = 'Transfer from ' || substring("title" from 15) WHERE "kind" = 'transfer' AND "title" LIKE 'Received from %';
 3 │ UPDATE "Transaction" SET "title" = 'Cash deposit' WHERE "kind" = 'deposit' AND "title" = 'Cash in';
 4 │ UPDATE "Transaction" SET "title" = 'Cash deposit · ' || substring("title" from 12) WHERE "kind" = 'deposit' AND "title" LIKE 'Deposit to %';
 5 │ UPDATE "Transaction" SET "title" = 'Bill payment · ' || left("title", length("title") - 5) WHERE "kind" = 'bill' AND "title" LIKE '% bill';
 6 │ UPDATE "Transaction" SET "title" = 'Mobile load · ' || substring("title" from 10) WHERE "kind" = 'load' AND "title" LIKE 'Load for %';
 7 │ UPDATE "Transaction" SET "title" = 'GoalSave deposit · ' || substring("title" from 10) WHERE "kind" = 'stash' AND "title" LIKE 'Moved to %';
 8 │ UPDATE "Transaction" SET "title" = 'GoalSave withdrawal · ' || substring("title" from 12) WHERE "kind" = 'stash' AND "title" LIKE 'Moved from %';
 9 │ UPDATE "Transaction" SET "title" = 'Cash back · ' || substring("title" from 10) WHERE "kind" = 'reward' AND "title" LIKE 'Redeemed %';
10 │ UPDATE "Transaction" SET "title" = 'Interest earned · ' || substring("title" from 13) WHERE "kind" = 'interest' AND "title" LIKE 'Interest in %';
11 │ UPDATE "Transaction" SET "title" = 'Bitcoin purchase' WHERE "kind" = 'exchange' AND "title" = 'Bought Bitcoin';
12 │ UPDATE "Transaction" SET "title" = 'Bitcoin sale' WHERE "kind" = 'exchange' AND "title" = 'Sold Bitcoin';
```
<!-- /code -->

Old history rows are rewritten to match the new standard titles produced by the code. How the string surgery works (SQL strings start at position 1):

| Old title | Rule | New title |
| --- | --- | --- |
| `Sent to @dante` | `substring(title from 9)` skips `"Sent to "` (8 characters) | `Transfer to @dante` |
| `Received from @maricel` | skips `"Received from "` (14) | `Transfer from @maricel` |
| `Meralco bill` | `left(title, length(title) - 5)` drops `" bill"` | `Bill payment · Meralco` |
| `Moved to Laptop` | skips `"Moved to "` (9) | `GoalSave deposit · Laptop` |
| `Interest in Laptop` | skips `"Interest in "` (12) | `Interest earned · Laptop` |

Each `UPDATE` also filters by `kind`, so only the intended rows change.

## 18. `per_card_lock`

<!-- code: gobank/prisma/migrations/20261103010000_per_card_lock/migration.sql -->
**`gobank/prisma/migrations/20261103010000_per_card_lock/migration.sql`** · all 12 lines

```sql
 1 │ BEGIN;
 2 │
 3 │ ALTER TABLE "Card" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;
 4 │
 5 │ UPDATE "Card" AS card
 6 │ SET "locked" = account."cardLocked"
 7 │ FROM "User" AS account
 8 │ WHERE account."id" = card."userId";
 9 │
10 │ ALTER TABLE "User" DROP COLUMN "cardLocked";
11 │
12 │ COMMIT;
```
<!-- /code -->

Product decision: users should be able to lock one card and keep paying with the other. `locked` returns to `Card`, copied from the user's shared flag, and the shared flag is dropped. The **daily limit stays shared** on `User`.

## 19. `card_integrity`: final cleanup and stronger rules

<!-- code: gobank/prisma/migrations/20261104000000_card_integrity/migration.sql -->
**`gobank/prisma/migrations/20261104000000_card_integrity/migration.sql`** · all 28 lines

```sql
 1 │ BEGIN;
 2 │
 3 │ DELETE FROM "RegistrationCard"
 4 │ WHERE "cvvEncrypted" IS NULL OR "brand"::text = 'gobank';
 5 │
 6 │ CREATE TYPE "CardBrand_new" AS ENUM ('visa', 'mastercard', 'jcb', 'discover');
 7 │
 8 │ ALTER TABLE "Card" ALTER COLUMN "brand" DROP DEFAULT;
 9 │ ALTER TABLE "Card"
10 │   ALTER COLUMN "brand" TYPE "CardBrand_new" USING ("brand"::text::"CardBrand_new");
11 │ ALTER TABLE "RegistrationCard"
12 │   ALTER COLUMN "brand" TYPE "CardBrand_new" USING ("brand"::text::"CardBrand_new");
13 │
14 │ ALTER TYPE "CardBrand" RENAME TO "CardBrand_old";
15 │ ALTER TYPE "CardBrand_new" RENAME TO "CardBrand";
16 │ DROP TYPE "CardBrand_old";
17 │
18 │ ALTER TABLE "Card" ALTER COLUMN "brand" SET DEFAULT 'discover';
19 │
20 │ ALTER TABLE "Card"
21 │   DROP COLUMN "cvvHash",
22 │   ALTER COLUMN "cvvEncrypted" SET NOT NULL;
23 │
24 │ ALTER TABLE "RegistrationCard"
25 │   DROP COLUMN "cvvHash",
26 │   ALTER COLUMN "cvvEncrypted" SET NOT NULL;
27 │
28 │ COMMIT;
```
<!-- /code -->

1. **Lines 3–4:** delete card *previews* that are unusable (no encrypted CVV, or the retired `gobank` brand). Previews are temporary, so this is safe.
2. **Lines 6–16: rebuild an enum.** PostgreSQL cannot remove a value from an enum, so the migration creates `CardBrand_new` without `gobank`, converts both columns through `text`, renames the types and drops the old one. If any real card still used `gobank`, the cast would fail and the whole migration would roll back, so no card can be silently broken.
3. **Line 18:** restore the column default (it had to be dropped while the type changed).
4. **Lines 20–26:** drop the unused `cvvHash` columns and make `cvvEncrypted` **required**. Every card must now have an encrypted CVV.

---

## Defense questions

**Q: What is a migration and why not just edit the tables?**
A: A migration is a versioned SQL script that changes the database structure. It is stored in git and applied in order by `prisma migrate deploy`, so every environment (my laptop, a teammate's, production) ends up with exactly the same schema, and data is converted safely along the way.

**Q: How do you avoid losing data during migrations?**
A: Multi-step migrations run inside `BEGIN … COMMIT`, existing rows are backfilled before constraints are added, and destructive migrations contain guards: one refuses to drop the USD wallet if any USD balance exists, and another replays the whole Bitcoin trade history and refuses to drop wallets unless the replay reproduces them exactly.

**Q: Why are there so many renames?**
A: Names were improved as the product matured ("Stash" became GoalSave; Bitcoin columns got clearer names). Because applied migrations are never edited, renames are done with new migrations, which preserve all data.

---

## Check yourself

<details>
<summary>Why does migration 9 update <code>fullName</code> before setting it <code>NOT NULL</code>?</summary>

Existing rows with an empty name would make `SET NOT NULL` fail. Backfilling them with the username first makes the constraint valid.
</details>

<details>
<summary>Why can't PostgreSQL just remove <code>gobank</code> from the <code>CardBrand</code> enum?</summary>

PostgreSQL does not support removing enum values. The migration creates a new enum type without it, converts the columns, and swaps the type names.
</details>
