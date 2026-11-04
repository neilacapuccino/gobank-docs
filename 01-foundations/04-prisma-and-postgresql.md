# Prisma and PostgreSQL

**What you will learn:** how GoBank stores data in PostgreSQL, how Prisma turns TypeScript calls into SQL, and the four database ideas that keep money safe: **transactions**, **conditional updates**, **row locks** and **isolation levels**. If you understand this page, the [ledger](../04-server-core/04-ledger.md) will make complete sense.

---

## 1. Relational database basics

PostgreSQL stores data in **tables** (like spreadsheets). Each **row** is one record; each **column** has a fixed type.

| Idea | Meaning | GoBank example |
| --- | --- | --- |
| Primary key | The column that uniquely identifies a row | `User.id` (a random `cuid` string like `clx9k2…`) |
| Unique constraint | No two rows may share this value | `User.username`, `Card.number` |
| Compound unique | No two rows may share this *combination* | one card of each kind per user: `@@unique([userId, kind])` |
| Foreign key | A column pointing to another table's row; the database keeps the link valid | `Transaction.userId` → `User.id` |
| `ON DELETE CASCADE` / `SET NULL` | What happens to linked rows when a row is deleted | delete a user → their cards and sessions are deleted; delete a goal → its transactions keep existing with `savingsGoalId = NULL` |
| Index | A sorted structure that makes lookups fast | `Transaction(userId, createdAt DESC)` makes "my latest transactions" fast |
| Enum | A column limited to a fixed list | `TransactionKind`: deposit, transfer, bill, load, stash, reward, interest, exchange |
| JSONB | A column holding flexible JSON | `Transaction.details` stores the card used, a note, a biller account number… |
| CHECK constraint | A rule every row must satisfy | `"balance" >= 0` on `User` |

The complete GoBank design is in [Schema](../03-database/01-schema.md).

---

## 2. Prisma: the ORM

An **ORM** (Object-Relational Mapper) lets you write database queries as typed code instead of SQL strings. Prisma has three parts:

1. **`prisma/schema.prisma`**: one file describing every table (models), enum and relation.
2. **Prisma Client**: TypeScript code *generated* from the schema (`npx prisma generate`, run automatically after `npm install`). GoBank generates it into `gobank/generated/prisma` (git-ignored).
3. **Prisma Migrate**: turns schema changes into SQL migration files and applies them.

<!-- code: gobank/prisma/schema.prisma 1-10 -->
**`gobank/prisma/schema.prisma`** · lines 1–10

```prisma
 1 │ generator client {
 2 │   provider = "prisma-client-js"
 3 │   output   = "../generated/prisma"
 4 │ }
 5 │
 6 │ datasource db {
 7 │   provider  = "postgresql"
 8 │   url       = env("DATABASE_URL")
 9 │   directUrl = env("DIRECT_URL")
10 │ }
```
<!-- /code -->

- `output = "../generated/prisma"`: where the client is generated; the code imports it with relative paths such as `"../../generated/prisma"`.
- `url = env("DATABASE_URL")`: the **pooled** Neon connection the app uses. A pooler shares a few database connections among many short-lived serverless functions.
- `directUrl = env("DIRECT_URL")`: a **direct** connection used only by migrations, because schema changes need a real, unpooled session.

### Prisma Client calls you will see

| Call | SQL idea | Example in GoBank |
| --- | --- | --- |
| `findUnique({ where: { username } })` | `SELECT … WHERE username = $1` (unique field) | sign-in lookup |
| `findUniqueOrThrow(...)` | same, but throws `P2025` if missing | load the signed-in user |
| `findFirst / findMany({ where, orderBy, take })` | `SELECT … ORDER BY … LIMIT` | history, billers |
| `create({ data })` | `INSERT` | new transaction row |
| `update({ where, data: { balance: { increment: -500 } } })` | `UPDATE … SET balance = balance - 500 WHERE …` | the ledger |
| `updateMany({ where, data })` | `UPDATE … WHERE …` returning only a **count** | claiming a money request |
| `deleteMany`, `upsert`, `count`, `aggregate({ _sum })`, `groupBy` | as named | sessions cleanup, seed, goal limit, daily spending, recent recipients |
| `select: { … }` / `include: { … }` | choose columns / join related rows | `PARTY` fields for recipients |
| ``$queryRaw`…` `` | a raw SQL query | `SELECT … FOR UPDATE` locks |
| `$transaction(async (tx) => { … })` | `BEGIN … COMMIT` | every money movement |

> **Concept: `$queryRaw` and SQL injection.** `` tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${entry.userId} FOR UPDATE` `` looks like string building, but it is a *tagged template*: Prisma sends `${entry.userId}` as a separate **parameter**, never pasted into the SQL text. A malicious value cannot change the query. Every other Prisma call is parameterized automatically, so the project has no SQL-injection surface.

### Prisma error codes the project handles

| Code | Meaning | How GoBank uses it |
| --- | --- | --- |
| `P2002` | Unique constraint violated | Turned into `CONFLICT` "That `<field>` is already taken" (`trpc.ts`); also detects duplicate Bitcoin submissions |
| `P2025` | The record to update/find was not found | Used on purpose: a *conditional* update that matches no row means "the condition failed", for example insufficient balance (`orFailWith` in `ledger.ts`) |
| `P2034` | Transaction failed because of a write conflict or deadlock | Retried up to 4 times (`goals.service.ts`, `bitcoin.service.ts`) |
| `P1001` | Cannot reach the database | Usually Neon waking from sleep; just run the command again (README troubleshooting) |

---

## 3. Migrations

A **migration** is a SQL file that changes the database from one version to the next. They live in `prisma/migrations/<timestamp>_<name>/migration.sql` and run **in timestamp order**. Prisma records the applied ones in a `_prisma_migrations` table, so `npm run db:migrate` (`prisma migrate deploy`) only applies new ones and is safe to repeat.

GoBank's 19 migrations tell the story of the project: from one card to two, from a "Stash" to "GoalSave", from a practice Bitcoin wallet to trades paid from the real balance. See [Migration history](../03-database/02-migration-history.md).

> **Why some rules are written in SQL by hand:** Prisma's schema language cannot express `CHECK` constraints, so rules such as "balance can never be negative" were added in raw SQL inside migrations. They are invisible in `schema.prisma` but enforced by PostgreSQL forever.

---

## 4. The four ideas that keep money safe

### Idea 1: Transactions (all-or-nothing)

A **database transaction** groups several statements so they **all succeed or all fail**. A transfer is several writes (debit sender, write sender's history row, credit receiver, write receiver's history row). If anything throws halfway, PostgreSQL **rolls back** every write.

```ts
db.$transaction((tx) => transfer(tx, sender, receiver, amount, card, note));
```

Inside the callback, every query uses `tx`, so they belong to the same transaction. Throwing an error (including our `fail(...)`) aborts and rolls back.

> **Concept: ACID.** Transactions are **A**tomic (all or nothing), **C**onsistent (rules such as CHECK constraints always hold), **I**solated (concurrent transactions do not see each other's half-finished work) and **D**urable (once committed, it survives a crash).

### Idea 2: Conditional updates (compare-and-set)

Wrong way (a race condition):

```ts
const user = await tx.user.findUnique(...);  // balance = 100
if (user.balance >= 80) {                    // two requests both see 100…
  await tx.user.update({ data: { balance: user.balance - 80 } }); // …both write 20!
}
```

GoBank's way puts the check **inside** the update:

<!-- code: gobank/src/server/ledger.ts 89-103 -->
**`gobank/src/server/ledger.ts`** · lines 89–103

```ts
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
```
<!-- /code -->

PostgreSQL evaluates `balance >= moneyOut` and applies the increment **in one atomic step**. If the condition is false, no row matches, Prisma throws `P2025`, and `orFailWith` turns that into a friendly message such as "Insufficient balance". The `lte` part also stops a balance from growing past the column's maximum.

### Idea 3: Row locks (`SELECT … FOR UPDATE`)

Some rules need more than one row: "spending today plus this payment must stay under the daily limit" reads *many* transaction rows. A conditional update cannot express that. So `spend()` first **locks the user's row**:

<!-- code: gobank/src/server/ledger.ts 131-132 -->
**`gobank/src/server/ledger.ts`** · lines 131–132

```ts
131 │ export async function spend(tx: Tx, { card, ...entry }: Spending) {
132 │   await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${entry.userId} FOR UPDATE`;
```
<!-- /code -->

Until this transaction ends, any other transaction that tries to lock the same user **waits**. Two payments from the same account are therefore checked one after the other, never at the same time.

> **Concept: deadlock and lock ordering.** If transaction 1 locks Ana then wants Ben, while transaction 2 locks Ben then wants Ana, both wait forever: a **deadlock**. `transfer()` avoids it by locking *both* users in a fixed order (`ORDER BY "id"`) at the start, so every transfer takes locks in the same order:

<!-- code: gobank/src/server/ledger.ts 179-183 -->
**`gobank/src/server/ledger.ts`** · lines 179–183

```ts
179 │   await tx.$queryRaw`
180 │     SELECT "id" FROM "User"
181 │     WHERE "id" IN (${from.id}, ${to.id})
182 │     ORDER BY "id" FOR UPDATE
183 │   `;
```
<!-- /code -->

### Idea 4: Isolation levels

| Level | Protects against | Used in GoBank |
| --- | --- | --- |
| Read Committed (PostgreSQL default) | reading uncommitted data | most transactions, made safe by conditional updates and row locks |
| Repeatable Read | the data you read changing during your transaction | `getBitcoinPortfolio` reads the balance and all trades from one consistent snapshot |
| **Serializable** | every anomaly: the result equals *some* one-at-a-time order; otherwise PostgreSQL cancels a transaction (`P2034`) | GoalSave operations and Bitcoin trades, **with automatic retries** |

<!-- code: gobank/src/features/goals/goals.service.ts 9-25 -->
**`gobank/src/features/goals/goals.service.ts`** · lines 9–25

```ts
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
```
<!-- /code -->

This helper runs the work at `Serializable`. If PostgreSQL reports a conflict (`P2034`) or our own check sees that the goal changed meanwhile (`CONFLICT`), it simply runs the work again, up to 4 attempts, before telling the user "Your savings changed. Please try again."

---

## 5. Proof it works

The docs repository contains an [experiment](../experiments/concurrent-transfers.ts) that fires **20 transfers of ₱400 at the same instant** from an account holding ₱5,000. Run against the real code on PostgreSQL 16, the result was:

```text
Sender balance before:  500000 centavos
Fired at once:          20 transfers of 40000
Affordable at most:     12
Succeeded:              12
Refused (8):          Insufficient balance
Sender balance after:   20000 centavos
Money before / after:   1000000 / 1000000
PASS: no overdraft, no money created or lost.
```

Exactly 12 succeeded (12 × ₱400 = ₱4,800), the other 8 were refused, the sender kept ₱200, and the total money in the two accounts never changed. That is ideas 1–3 working together.

---

## Defense questions

**Q: What happens if the server crashes in the middle of a transfer?**
A: Every transfer runs in one database transaction. If the server dies before `COMMIT`, PostgreSQL rolls back all of it: nobody is debited without being credited and no half-written history rows remain.

**Q: How do you prevent double spending if I tap Pay twice quickly?**
A: Both requests reach the ledger, which locks my account row (`SELECT … FOR UPDATE`), so they run one after the other. The second one sees the reduced balance, and the balance update itself only succeeds if the balance is still enough. We tested 20 simultaneous transfers: only the affordable ones succeeded and no money was created or lost.

**Q: Why PostgreSQL and not MongoDB or Firebase?**
A: Banking data is relational (users, cards, transactions, requests all reference each other) and needs strong transactions, row locks, foreign keys and CHECK constraints. PostgreSQL provides all of these.

**Q: Why use an ORM?**
A: Prisma gives type-safe queries generated from the schema, parameterized SQL (no injection), and versioned migrations. Where we need raw SQL (row locks, CHECK constraints), we still can.

---

## Check yourself

<details>
<summary>Why does a "not found" error (<code>P2025</code>) mean "insufficient balance" in <code>post()</code>?</summary>

Because the update's `where` includes `balance >= moneyOut`. If the balance is too low, no row matches the `where`, so Prisma reports "record to update not found". `whyPostFailed` then reads the balance to explain which condition failed.
</details>

<details>
<summary>Why does <code>transfer()</code> lock users with <code>ORDER BY "id"</code>?</summary>

To always take locks in the same order and avoid deadlocks when two people send to each other at the same time.
</details>

<details>
<summary>What does Prisma error <code>P2034</code> mean and what does GoBank do with it?</summary>

A transaction was cancelled because of a write conflict or deadlock (for example under Serializable isolation). GoBank retries the whole transaction up to 4 times.
</details>
