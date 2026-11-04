# Cheat sheet

Every number, limit and rule on one page. Print it and review it the morning of the defense. Each value was read from the code at commit `7be1eb5`; the file is given so you can point at it.

---

## The pitch (30 seconds)

GoBank Express is a **mobile-first digital bank for students**: send and request money, pay bills, buy load, save in up to **5 goals at 4% a year compounded daily**, earn **reward points**, and practice **Bitcoin trading at live prices**. Every peso is an **integer number of centavos**, and every balance change goes through **one ledger** using **database transactions, row locks and conditional updates**.

## Five ideas to repeat

1. Money is **integer centavos** (₱100.00 = 10000).
2. **Only the ledger** (`src/server/ledger.ts`) changes balances.
3. Every money movement is **one database transaction** (all or nothing).
4. **Conditional updates + `SELECT … FOR UPDATE`** stop double spending (tested: 20 parallel transfers → 12 succeed, 8 refused, money conserved).
5. **Never trust the browser**: browser checks → Zod on the server → database `CHECK` constraints.

---

## Stack

TypeScript 5 · Next.js 15 (App Router) · React 19 · tRPC 11 · Zod 3 · SuperJSON · TanStack Query 5 · Prisma 6 · PostgreSQL (Neon, Singapore) · Tailwind CSS 4 · sharp · Node 22 test runner · Playwright · ESLint 9 · Prettier 3 · GitHub Actions.

## Codebase

| Thing | Count |
| --- | --- |
| TypeScript in `gobank/src` | ~15,600 lines, 211 files |
| Feature folders / components (`.tsx`) | 14 / 79 |
| tRPC procedures | 40 (7 public) |
| Pages / layouts / API route files | 21 / 3 / 4 |
| Tables / enums / migrations | 9 / 5 / 19 |
| Unit tests / files | 63 / 11 (all pass) |
| Integration scripts / browser tests | 2 / 3 |

---

## Limits (`money.ts`, `*.rules.ts`, routers)

| Item | Value |
| --- | --- |
| Single transaction maximum | ₱1,000,000.00 (100,000,000 centavos) |
| Balance maximum | ₱21,474,836.47 (2,147,483,647 centavos = INTEGER max) |
| Deposit | ₱0.01 – ₱50,000.00 |
| Send money / pay bills | balance and daily limit; up to ₱1,000,000 per transaction |
| Daily card limit | default **₱20,000**, max **₱100,000**, **₱0 blocks spending**; shared by both cards; resets at **Manila midnight**; counts transfers, bills, load |
| Buy load | **₱10 – ₱10,000** |
| Request money | up to **₱20,000** |
| Notes | up to 120 characters |
| GoalSave | **5 goals**, name 1–40 chars (unique per user), target ₱0.01–₱1,000,000, **4% p.a. daily compounding** |
| Rewards | **1 point per full ₱50** of transfers sent and bills; **100 points = ₱1.00**; convert in multiples of 100 |
| Bitcoin | fee **₱10** per trade; min buy **₱1.00**; max ₱20,000,000; quote cache 5 s; quote usable **< 60 s** old |
| Biller account number | 4–20 digits |
| Page size | 20 (max 50) |

## Accounts and sign-in (`auth.rules.ts`, `session.rules.ts`)

| Item | Value |
| --- | --- |
| Username | 3–20 chars, `a–z 0–9 _`, lowercase; 10 reserved names (admin, support, gobank, root, security, billing…) |
| PIN | 6 digits; not one repeated digit; not a consecutive run (`123456`, `987654`) |
| Lockout | **5 wrong PINs → 15 minutes** |
| Session | **30 minutes** after the last renewal; renewed **every 60 s** while the tab is visible; **15 s** after a tab closes; **one session per tab** |
| Session cookie | `gb_session`: httpOnly, SameSite=Lax, Secure in production; DB stores SHA-256(token) |
| Card preview | 30 minutes (cookie `gb_registration_card`, SameSite=Strict) |
| Google | OAuth cookie 10 min (path `/api/auth/google`); signed identity cookie 15 min; PIN always required after Google |
| Demo accounts | `@maricel` and `@dante`, PIN **135790**, ₱5,000.00 each |

## Cryptography

| Use | Algorithm |
| --- | --- |
| PIN | **scrypt**, 16-byte random salt, 64-byte key, `salt:key` (161 chars), `timingSafeEqual` |
| Session and preview tokens | 32 random bytes; stored as **SHA-256** |
| CVV | **AES-256-GCM**, 12-byte nonce, 16-byte tag, AAD = card number, format `v1.nonce.tag.ciphertext` |
| Google pending identity | **HMAC-SHA256** signed token |
| Google OAuth | Authorization Code + **PKCE (S256)** + `state` |
| Randomness | `node:crypto` (`randomBytes`, `randomInt`) |

## Identifiers

| ID | Format |
| --- | --- |
| Account number | `20` + 9 random digits (11 digits) |
| Reference | `GB` + 8 chars from 32 (no I, O, 0, 1) |
| Card number | 4-digit network prefix (Visa 4242, Mastercard 5555, JCB 3566, Discover 6011) + 11 random + Luhn digit |
| Card expiry | last day of the issue month, 5 years later |
| Virtual card | different network (Visa → Mastercard, others → Visa), different CVV |

## Concurrency toolbox

| Where | Technique |
| --- | --- |
| `post()` | conditional `UPDATE … WHERE balance >= x` (P2025 = condition failed) |
| `spend()` | `SELECT … FOR UPDATE` on the account, then daily limit and card checks |
| `transfer()` | lock **both** accounts **ORDER BY id** (no deadlocks) |
| Requests | `updateMany … WHERE status = 'pending'` claim |
| GoalSave | **Serializable** + compare-and-set + up to **4 retries** |
| Bitcoin | **Serializable** + **idempotency key** `(userId, submissionId)` + up to 4 retries; portfolio read in **Repeatable Read** |

## Prisma error codes

`P2002` unique violated → "That X is already taken" · `P2025` no row matched → condition failed / not found · `P2034` serialization conflict → retry · `P1001` database unreachable (Neon waking up).

## Database rules (CHECK constraints)

`User.balance ≥ 0` · `User.points ≥ 0` · `User.cardDailyLimit ≥ 0` · `SavingsGoal.balance ≥ 0` · interest rate in [0, 1] and remainder in [0, 1) · Bitcoin trades: action buy/sell, all amounts > 0.

## Worked numbers

| Example | Result |
| --- | --- |
| ₱1,000 in GoalSave for 1 year | **₱1,040.80** (0.85 centavo carried) |
| ₱1,000 in GoalSave for 30 days | ₱1,003.29 |
| Send ₱149.99 | 2 points |
| Buy ₱100 of BTC at ₱100,000.01, then sell it all | charged ₱110.00, credited ₱89.99, loss **₱20.01** (two fees + 1 centavo rounding) |
| Luhn check digit of `601123073557895` | 4 |

---

## Where is…? (point at these)

| Topic | File |
| --- | --- |
| Every balance change | `gobank/src/server/ledger.ts` |
| Sign-in guard and error translation | `gobank/src/server/trpc.ts` |
| Sessions | `gobank/src/server/session.ts`, `features/auth/components/session-guard.tsx` |
| PIN hashing | `gobank/src/features/auth/pin.ts` |
| Lockout | `gobank/src/features/auth/auth.service.ts` |
| CVV encryption | `gobank/src/features/card/card-cvv.server.ts` |
| Card numbers (Luhn) | `gobank/src/features/card/card-generation.server.ts` |
| Interest formula | `gobank/src/shared/lib/savings-interest.ts` |
| Bitcoin math | `gobank/src/features/bitcoin/bitcoin.rules.ts` |
| Database design | `gobank/prisma/schema.prisma` |
| All API endpoints | `gobank/src/server/root.ts` |
| Integration test | `gobank/scripts/verify-core.ts` |
| CI pipeline | `.github/workflows/ci.yml` |
