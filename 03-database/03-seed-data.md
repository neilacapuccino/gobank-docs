# Seed data

**What you will learn:** what `npm run db:seed` puts in a fresh database (the 8 billers and the two demo accounts), how the seed script works, and why it is safe to run more than once.

---

## How the seed is started

`npm run db:seed` runs `prisma db seed`, which reads the command from `prisma.config.ts`:

```text
node --conditions=react-server --import tsx prisma/seed.ts
```

`--conditions=react-server` is required because the seed imports server-only code (card number generation and CVV encryption). `CARD_ENCRYPTION_KEY` must already be in `.env`, otherwise encrypting the demo cards' CVVs fails.

---

## The script

<!-- code: gobank/prisma/seed.ts -->
**`gobank/prisma/seed.ts`** · all 92 lines

```ts
 1 │ import { PrismaClient, type BillerCategory } from "../generated/prisma";
 2 │ import { hashPin } from "../src/features/auth/pin";
 3 │ import { newCardCredentials } from "../src/features/card/card-credentials.server";
 4 │ import { virtualCardBrand } from "../src/features/card/card-generation.server";
 5 │ import { newAccountNumber, newReference } from "../src/server/identifiers";
 6 │
 7 │ const db = new PrismaClient();
 8 │
 9 │ const DEMO_PIN = "135790";
10 │ const OPENING_BALANCE_CENTAVOS = 500_000;
11 │
12 │ const BILLERS: [string, string, BillerCategory, string][] = [
13 │   ["meralco", "Meralco", "electric", "Power Utility Partner"],
14 │   ["aboitiz-power", "AboitizPower", "electric", "Power Utility Partner"],
15 │   ["manila-water", "Manila Water", "water", "Water Utility Partner"],
16 │   ["maynilad", "Maynilad", "water", "Water Utility Partner"],
17 │   ["pldt", "PLDT", "internet", "Internet Service Provider"],
18 │   ["converge", "Converge", "internet", "Internet Service Provider"],
19 │   ["bdo-credit-card", "BDO Credit Card", "credit_card", "Credit Card Payment"],
20 │   ["bpi-credit-card", "BPI Credit Card", "credit_card", "Credit Card Payment"],
21 │ ];
22 │
23 │ const DEMO_USERS = [
24 │   { username: "maricel", fullName: "Maricel Santos", mobile: "09171234567" },
25 │   { username: "dante", fullName: "Dante Reyes", mobile: "09181234567" },
26 │ ];
27 │
28 │ type DemoUser = (typeof DEMO_USERS)[number];
29 │
30 │ async function seedBillers() {
31 │   for (const [code, name, category, description] of BILLERS) {
32 │     await db.biller.upsert({
33 │       where: { code },
34 │       update: { name, category, description },
35 │       create: { code, name, category, description },
36 │     });
37 │   }
38 │ }
39 │
40 │ async function seedDemoUser(person: DemoUser, pinHash: string) {
41 │   const exists = await db.user.findUnique({
42 │     where: { username: person.username },
43 │   });
44 │   if (exists) return;
45 │
46 │   const physical = newCardCredentials("discover");
47 │   const virtual = newCardCredentials(
48 │     virtualCardBrand(physical.card.brand),
49 │     physical.cvv,
50 │   );
51 │
52 │   await db.user.create({
53 │     data: {
54 │       ...person,
55 │       pinHash,
56 │       accountNumber: newAccountNumber(),
57 │       balance: OPENING_BALANCE_CENTAVOS,
58 │       cards: {
59 │         create: [
60 │           { ...physical.card, kind: "physical" },
61 │           { ...virtual.card, kind: "virtual" },
62 │         ],
63 │       },
64 │       transactions: {
65 │         create: {
66 │           reference: newReference(),
67 │           kind: "deposit",
68 │           title: "Opening deposit",
69 │           amount: OPENING_BALANCE_CENTAVOS,
70 │           balanceAfter: OPENING_BALANCE_CENTAVOS,
71 │         },
72 │       },
73 │     },
74 │   });
75 │ }
76 │
77 │ async function main() {
78 │   await seedBillers();
79 │
80 │   const pinHash = await hashPin(DEMO_PIN);
81 │   for (const person of DEMO_USERS) {
82 │     await seedDemoUser(person, pinHash);
83 │   }
84 │ }
85 │
86 │ main()
87 │   .then(() => console.log("Seeded billers and demo users"))
88 │   .catch((error: unknown) => {
89 │     console.error(error);
90 │     process.exit(1);
91 │   })
92 │   .finally(() => void db.$disconnect());
```
<!-- /code -->

### Lines 1–5: reuse the real app code

The seed does not invent its own logic: it imports the same `hashPin`, `newCardCredentials`, `virtualCardBrand`, `newAccountNumber` and `newReference` the app uses, so demo accounts look exactly like real ones.

### Lines 9–10: demo constants

- PIN **`135790`** for both demo users. It passes the PIN rules: six digits, not one repeated digit, and not part of `0123456789` or `9876543210`.
- Opening balance `500_000` centavos = **₱5,000.00**.

### Lines 12–21: the billers

| Code | Name | Category | Description |
| --- | --- | --- | --- |
| `meralco` | Meralco | electric | Power Utility Partner |
| `aboitiz-power` | AboitizPower | electric | Power Utility Partner |
| `manila-water` | Manila Water | water | Water Utility Partner |
| `maynilad` | Maynilad | water | Water Utility Partner |
| `pldt` | PLDT | internet | Internet Service Provider |
| `converge` | Converge | internet | Internet Service Provider |
| `bdo-credit-card` | BDO Credit Card | credit_card | Credit Card Payment |
| `bpi-credit-card` | BPI Credit Card | credit_card | Credit Card Payment |

### Lines 23–26: the demo users

| Username | Full name | Mobile |
| --- | --- | --- |
| `maricel` | Maricel Santos | 09171234567 |
| `dante` | Dante Reyes | 09181234567 |

### Lines 30–38: `seedBillers()` uses `upsert`

`upsert` means "update if a biller with this `code` exists, otherwise create it". Running the seed twice therefore never duplicates billers, and it also refreshes their names and descriptions.

### Lines 40–75: `seedDemoUser()`

1. **Lines 41–44:** if the username already exists, do nothing. The seed is safe to repeat and never resets a demo account you have been using.
2. **Line 46:** generate a **Discover** physical card (number, encrypted CVV, expiry).
3. **Lines 47–50:** generate the virtual card on a *different* network (`virtualCardBrand("discover")` returns `"visa"`) and pass the physical CVV so the virtual card gets a **different CVV**.
4. **Lines 52–74:** one nested `create` makes the user, both cards and an **"Opening deposit"** history row of ₱5,000 with `balanceAfter` ₱5,000. Because the balance and the history row are created together, the account's history explains its balance from the very first moment.

### Lines 77–92: `main()`

Seeds billers, hashes the demo PIN **once** (scrypt is slow on purpose) and reuses the hash for both users, then disconnects. Any error prints and exits with code 1 so the failure is visible.

---

## What a freshly seeded account looks like

Values from a test database built for these docs (numbers are random each time you seed):

| Field | Example |
| --- | --- |
| Account number | `20042640684` (`"20"` + 9 random digits) |
| Balance / points / daily limit | 500000 / 0 / 2000000 centavos |
| PIN hash length | 161 characters (`salt:key`) |
| Physical card | Discover `6011 2307 3557 8954`, expires 30 Nov 2031 (end of the month, 5 years ahead) |
| Virtual card | Visa `4242 7261 1473 6242` |
| Encrypted CVV | `v1.<24 hex>.<32 hex>.<6 hex>` |
| History | one `deposit` row, "Opening deposit", +₱5,000.00 |

---

## Demo tips

- To demo a transfer *between* the demo users, open them in **two different browsers** (for example Chrome and Edge, or Chrome and an Incognito window). A session belongs to one tab, so opening a second GoBank tab in the same browser signs the first one out ([Sessions](../04-server-core/03-sessions.md)).
- Do **not** demo the PIN lockout with a demo account: five wrong PINs lock it for 15 minutes. Register a throwaway account for that ([Live demo script](../09-defense/02-demo-script.md)).

---

## Check yourself

<details>
<summary>What happens if you run <code>npm run db:seed</code> twice?</summary>

Billers are upserted (no duplicates, details refreshed). Demo users that already exist are skipped, so balances and history you created during testing are kept.
</details>

<details>
<summary>Why does the seed pass <code>physical.cvv</code> into <code>newCardCredentials</code> for the virtual card?</summary>

So the virtual card's random CVV is guaranteed to differ from the physical card's CVV (`randomCvv` loops until it gets a different value).
</details>
