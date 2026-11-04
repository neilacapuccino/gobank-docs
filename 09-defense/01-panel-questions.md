# Panel questions with model answers

**How to use this page:** read a question, answer it out loud *before* reading the model answer, then compare. Each answer is short enough to say in under a minute and ends with **Where** (the file to point at) and a link to the page that explains it in depth. Facts and numbers here were checked against the code and a real database while writing these docs.

Jump to: [Project](#a-project-and-scope) · [Technology](#b-technology-choices) · [Architecture](#c-architecture-and-design) · [Database](#d-database) · [Money and the ledger](#e-money-and-the-ledger) · [Security](#f-security) · [Sessions and sign-in](#g-sessions-and-sign-in) · [Features](#h-features) · [Frontend](#i-frontend-ux-and-accessibility) · [Testing](#j-testing-and-quality) · [Deployment](#k-deployment-performance-and-scalability) · [Limits](#l-limitations-and-future-work) · ["What if"](#m-what-if-questions) · [Explain this line](#n-explain-this-line)

---

## A. Project and scope

**1. What is GoBank Express?**
A mobile-first digital bank web app for students. You can send and request money, pay bills, buy load, save in up to five goals that earn 4% a year, earn reward points, and practice Bitcoin trading at live prices. Every peso is tracked on the server through one carefully locked ledger. *Where:* [Project overview](../00-start-here/01-project-overview.md).

**2. Who are the users?**
Students who manage small, frequent amounts: allowances, splitting bills, load, saving for a gadget or a trip. There is one user role, the account holder; there is no admin screen.

**3. Is it a real bank? Can it move real money?**
No. It is a working prototype of the bank side. Balances, limits, locks, interest, rewards and receipts are real and stored in PostgreSQL, but deposits, bills and load are simulated, and Bitcoin uses real prices without real Bitcoin. Connecting real payment networks requires BSP licensing, which is outside a capstone's scope. *Where:* [Limitations](03-limitations-and-future-work.md).

**4. What are the main features?**
Registration with a 4-step flow and a card preview; sign-in with username + 6-digit PIN or Google + PIN; two cards (physical and virtual) with separate locks and a shared daily limit; send and request money; bills and load; GoalSave; rewards; transaction history with receipts; profile with photo; Bitcoin trading.

**5. What makes your project different from a CRUD app?**
Correctness under concurrency. Money moves only through a ledger that uses database transactions, row locks and conditional updates, and we proved it with 20 simultaneous transfers that never overdrew or lost money. It also has real cryptography (scrypt, AES-256-GCM, HMAC, PKCE) and exact money math (integer centavos, BigInt satoshis, compound interest without rounding loss).

**6. How big is the system?**
About 15,600 lines of TypeScript in 211 source files: 14 feature folders, 40 API procedures, 21 pages, 9 database tables, 19 migrations, 63 unit tests, 2 integration scripts and 3 browser tests.

**7. What was the hardest part?**
Concurrency-safe money movement: making sure two simultaneous payments, a double-tap or a crash can never create, lose or overdraw money. The answer was the ledger: every balance change is one conditional SQL update inside a transaction, with the account row locked while limits are checked. *Where:* `gobank/src/server/ledger.ts`.

**8. Why the name "Express"?**
Answer from your manuscript. In the code, the brand appears in the logo (`gobank-logo.tsx`) and the page titles ("· GoBank Express").

---

## B. Technology choices

**9. What is your tech stack?**
TypeScript; Next.js 15 (App Router) with React 19; tRPC 11 with Zod for the API; PostgreSQL (Neon) with Prisma 6; TanStack Query for client data; Tailwind CSS 4; sharp for images; Node's test runner, Playwright and GitHub Actions. *Where:* `gobank/package.json`.

**10. Why TypeScript instead of JavaScript?**
The compiler catches mistakes before the app runs, for example passing pesos where centavos are expected. Strict mode plus `noUncheckedIndexedAccess` forces handling of missing values, and CI fails on any type error.

**11. Why Next.js?**
One project holds the screens, the API and the server logic. Server components can check the session and load data before sending HTML, file-based routing keeps pages organized, and it deploys easily to Vercel.

**12. Why tRPC instead of REST?**
Browser and server share TypeScript types end to end: if a procedure's input or output changes, the browser fails to compile instead of failing in production. It also gives batching and a clean place for Zod validation and middleware. *Where:* `gobank/src/server/trpc.ts`.

**13. Why Zod?**
To validate every input on the server at runtime. TypeScript types disappear when the code runs, so we need real checks on data coming from the network. Zod schemas also give friendly field messages.

**14. Why PostgreSQL?**
Banking data is relational and needs ACID transactions, row locks, foreign keys, unique constraints and CHECK constraints. PostgreSQL provides all of them.

**15. Why Prisma?**
Type-safe queries generated from the schema, automatic parameterization (no SQL injection), and versioned migrations. Raw SQL is still possible where needed (row locks, CHECK constraints).

**16. Why Neon?**
A managed, serverless PostgreSQL with a free tier, hosted in Singapore (close to the Philippines), with a connection pooler that suits serverless functions. The app uses the pooled URL; migrations use the direct URL.

**17. Why SuperJSON?**
Plain JSON loses `Date` objects and cannot carry `BigInt`. SuperJSON keeps both, so dates and Bitcoin satoshi amounts arrive in the browser with their real types.

**18. Why Tailwind?**
Styles live with the markup, theme tokens keep colors consistent, unused CSS is never shipped, and the class order is auto-sorted by Prettier.

---

## C. Architecture and design

**19. Describe your architecture.**
Four layers: React components → tRPC routers (Zod validation, session check) → services (business rules) → the ledger and PostgreSQL. Code is organized by feature; each feature folder holds its router, service, pure rules, tests and components. *Where:* [Layers and folders](../02-architecture/01-layers-and-folders.md).

**20. Is this MVC?**
Not strictly. It is a layered, feature-based architecture. Mapped to MVC: components are the View, routers act as Controllers, and services, the ledger and Prisma models are the Model.

**21. Walk us through what happens when I send money.**
The form converts pesos to centavos and calls the `transfers.send` mutation. The server checks the session cookie and the tab header, and Zod validates the input. The service finds the recipient again and opens a transaction, and the ledger locks both accounts, checks the card, daily limit and balance, debits, credits and writes two history rows. PostgreSQL commits and the receipt comes back. *Where:* [Life of a request](../02-architecture/02-request-lifecycle.md).

**22. Why separate routers, services and rules?**
Routers declare the API and validate input; services hold the business logic; `*.rules.ts` files are pure functions shared by browser and server and unit-tested without a database. Each piece has one job.

**23. What is a server component and where do you use one?**
A React component that runs only on the server. We use them to check the session (`(app)/layout.tsx`) and to load the dashboard, settings and receipts before sending HTML.

**24. How does the browser know the API's types without the server code?**
The browser imports `AppRouter` from `server/root.ts` **as a type only**. Types are erased at build time, so no server code is bundled.

**25. Why is all money logic in one ledger file?**
So the rules are written once and every feature gets the same guarantees: atomic updates, locks, limits and history rows. Services never update balances directly.

**26. What design patterns did you use?**
Layered architecture; repository-like data access through Prisma; middleware (tRPC); compare-and-set (optimistic concurrency); pessimistic locking (`FOR UPDATE`); idempotency keys (Bitcoin trades); event sourcing (Bitcoin holdings); custom hooks for reusable UI logic.

---

## D. Database

**27. Explain your ERD.**
`User` is the center: two `Card`s, many `Session`s, up to five `SavingsGoal`s, many `Transaction`s, `MoneyRequest`s as requester or payer, and `BitcoinTrade`s. `Transaction` can also point to a counterparty user, a goal or a `Biller`. `RegistrationCard` holds the card preview before an account exists. *Where:* [Schema](../03-database/01-schema.md).

**28. Why store money as integers?**
Floats cannot represent most decimals exactly (0.1 + 0.2 = 0.30000000000000004). Centavos as integers are exact. ₱100.00 is stored as 10000.

**29. Why keep both a balance column and a transaction history?**
The balance gives fast reads; the history is the audit trail. They cannot disagree because `post()` updates the balance and inserts the history row in the same transaction, recording `balanceAfter`.

**30. Why does a transfer create two rows?**
Each person sees their own side: the sign, title and their own balance after. Both share one reference, and together they always sum to zero (checked by the integration test).

**31. What are CHECK constraints and which do you have?**
Database rules every row must satisfy: balance ≥ 0, points ≥ 0, daily limit ≥ 0, goal balance ≥ 0, interest rate in [0, 1] with remainder in [0, 1), and valid Bitcoin trades. They are a final safety net if application code ever had a bug.

**32. What is a migration? How many do you have?**
A versioned SQL script that changes the database structure, applied in order by `prisma migrate deploy`. We have 19; they apply cleanly to an empty PostgreSQL 16. *Where:* [Migration history](../03-database/02-migration-history.md).

**33. Is your database normalized?**
Mostly to third normal form, with deliberate denormalization for speed and auditability: `balance`, `balanceAfter`, `title` and card details in the history row. All are written atomically by the ledger.

**34. What is the `details` JSON column for?**
Kind-specific extras: the card used, a transfer note, a biller account number, a load mobile number, interest calculation details or Bitcoin trade details. JSON avoids many mostly empty columns.

**35. Why are IDs random strings (cuid) instead of 1, 2, 3?**
They cannot be guessed and do not reveal how many users or transactions exist.

**36. What indexes do you have and why?**
`Transaction(userId, createdAt DESC)` for history and today's spending; unique `(reference, userId)` for receipts; `Session(expiresAt)` for cleanup; request indexes for the two inbox lists; Bitcoin trade indexes; and every unique field.

**37. What happens to history if a goal is deleted or a biller removed?**
The links use `ON DELETE SET NULL`, so history rows stay with their stored titles. Deleting a user cascades to their own data.

**38. Why is there no Bitcoin balance column?**
Holdings are computed by replaying the trade history (event sourcing), so they can never disagree with the records. A migration proved the replay matched every old wallet before the wallet table was dropped.

---

## E. Money and the ledger

**39. How do you prevent negative balances?**
The balance update in `post()` only matches the row when `balance >= amount to take out`; the check and the change are one atomic SQL statement. If it fails: "Insufficient balance", and everything rolls back. The database `CHECK (balance >= 0)` backs it up. *Where:* `ledger.ts`, `post()`, lines 89–103.

**40. What if I tap Pay twice very fast?**
The form ignores the second tap while the first is pending. If both still reach the server, `spend()` locks my account row, so they run one after the other, and the second is checked against the new balance and daily total.

**41. Did you test concurrency?**
Yes. We fired 20 transfers of ₱400 at the same moment from a ₱5,000 account: exactly 12 succeeded, 8 were refused with "Insufficient balance", the balance ended at ₱200, and the total money in both accounts was unchanged. *Where:* `experiments/concurrent-transfers.ts` in the docs repo.

**42. What is a database transaction and where do you use one?**
A group of operations that all succeed or all fail. Every money movement uses one: deposits, transfers, bills, load, request payments, rewards, GoalSave moves and Bitcoin trades.

**43. What does `SELECT … FOR UPDATE` do?**
It locks the selected rows until the transaction ends, so other transactions that want to change them must wait. We use it on the account before checking the daily limit, on both accounts in a transfer, and on the PIN attempt counter.

**44. How do you avoid deadlocks?**
A transfer locks both accounts in a fixed order (by ID) at the start, so two opposite transfers request locks in the same order and one simply waits.

**45. How is the daily limit computed?**
The sum of today's outgoing transfers, bills and load since midnight **Manila time**, plus the new payment, must not exceed the limit (default ₱20,000, max ₱100,000, ₱0 blocks spending). It is checked inside the transaction while the account is locked. *Where:* `ledger.ts`, `spentToday`, `spend`.

**46. Why is the daily limit shared by both cards?**
A product decision: it limits total spending per day regardless of card. Locks are per card, so you can lock one and keep using the other.

**47. What isolation levels do you use and why?**
Read Committed (the default) with locks and conditional updates for most money movement; Repeatable Read for a consistent Bitcoin portfolio read; Serializable with automatic retries for GoalSave and Bitcoin trades, which read many rows and then write.

**48. What does "idempotent" mean in your system?**
Repeating an operation has the same effect as doing it once. Each Bitcoin trade carries a client-generated `submissionId`, and a unique constraint makes a repeated submission return the original trade instead of trading again.

**49. How do you make sure interest is never paid twice?**
Settlement updates the goal only if its balance and last-settled time are unchanged (compare-and-set). A concurrent settlement fails that condition, retries, and finds nothing left to pay.

**50. What happens if the receiver's account is at the maximum balance?**
The receiver's credit fails ("This transaction would exceed the account limit"), and the whole transfer rolls back, including the sender's debit.

---

## F. Security

**51. How are PINs stored?**
As scrypt hashes with a random 16-byte salt per user, stored as `salt:key`; never the PIN. Verification uses a constant-time comparison. *Where:* `features/auth/pin.ts`.

**52. Why scrypt and not SHA-256 or MD5?**
SHA-256 and MD5 are fast, so attackers can test billions of guesses per second. scrypt is deliberately slow and memory-hard, and the salt defeats precomputed tables.

**53. What stops brute-forcing a PIN?**
Five wrong PINs lock the account for 15 minutes (even the right PIN is refused during the lock). The attempt counter is read with a row lock, so parallel guesses still count one by one. New PINs also cannot be repeated digits or sequences.

**54. How is the CVV protected?**
AES-256-GCM with a 256-bit key from the environment, a random nonce per encryption, and the card number as authenticated data, so a copied or modified ciphertext fails to decrypt. It is decrypted only when the owner taps "show", it is not cached in the browser, and it is hidden when the card is locked. *Where:* `card-cvv.server.ts`.

**55. Why encrypt the CVV but hash the PIN?**
A PIN only needs to be checked (one-way hash). A CVV must be shown back to the owner (reversible encryption).

**56. Where is the encryption key?**
In the `CARD_ENCRYPTION_KEY` environment variable: never in code or the database. `npm run card:setup-key` generates it and refuses to run unless `.env` is git-ignored. `env.ts` validates it is 64 hex characters.

**57. How do you prevent SQL injection?**
Prisma sends all values as parameters. Our three raw queries are tagged templates, which are also parameterized.

**58. How do you prevent XSS?**
React escapes everything it renders, there is no `dangerouslySetInnerHTML` in the codebase, and the session cookie is httpOnly.

**59. How do you prevent CSRF?**
The session cookie is `SameSite=Lax`; protected API calls must carry the `x-gb-session` header, which other sites cannot set; `/api/session` checks the `Origin` header; the card-preview cookie is `SameSite=Strict`.

**60. Can a user see another user's data by changing an ID?**
No. Every query is filtered by the signed-in user's ID from the server-side session: receipts by (reference, user), goals by (id, user), cards by (user, kind). Another user's reference returns 404.

**61. How do you validate input?**
In the browser for instant feedback, then with Zod on every server procedure (the real gate), then with database constraints.

**62. Is the profile photo upload safe?**
Only JPEG, PNG and WebP (no SVG), at most 200 KB after decoding. sharp checks the real format, applies a pixel limit against decompression bombs, and re-encodes to a 256×256 WebP, which also strips EXIF metadata such as GPS location (proven by a unit test).

**63. What do users see when the server has a bug?**
In production, only "Something went wrong. Please try again."; internal details are hidden by the tRPC error formatter. Expected problems show friendly messages.

**64. What is the weakest point of your security?**
The 6-digit PIN without a second factor. We mitigate it with the lockout, PIN rules and scrypt, but production would add device binding or OTPs, rate limiting and security headers. *Where:* [Security model §3](../08-security/01-security-model.md#3-known-gaps-be-honest-and-show-you-know-the-fix).

**65. How do you handle secrets in CI?**
CI does not use real secrets: it sets dummy database URLs and `SKIP_ENV_VALIDATION`, and only builds and runs unit tests. The workflow's token is read-only.

---

## G. Sessions and sign-in

**66. How does the app remember that I signed in?**
A random 256-bit token in an httpOnly cookie; the database stores only its SHA-256 hash, the user and an expiry. Each request hashes the cookie and looks it up. *Where:* `server/session.ts`.

**67. Why not JWT?**
Database sessions can be ended instantly (sign out, PIN change, new tab), and a leaked database does not contain usable tokens. A JWT stays valid until it expires unless you add a blocklist.

**68. When does a session expire?**
After 30 minutes without renewal. The open, visible tab renews every minute; a closed tab's session ends 15 seconds later. A reload keeps you signed in.

**69. Why does opening a new tab sign me out?**
A deliberate rule: one session belongs to one tab. The tab proves ownership with its session ID, kept in per-tab storage; a page without it ends the session. It stops a session from being silently shared or used from a second window.

**70. What happens when I change my PIN?**
The current PIN is verified with the lockout rules, the new scrypt hash is saved in the same update, and every other session of the account is deleted.

**71. How does Google sign-in work?**
OAuth 2.0 with PKCE and a `state` check. After Google confirms a verified email, we find the account by Google ID (or linked Gmail); the user must still enter the PIN. New Google users go through registration with their name prefilled. *Where:* [Google sign-in](../05-features/02-google-sign-in.md).

**72. What is PKCE?**
Proof Key for Code Exchange. We send Google a hash of a secret verifier; to exchange the returned code for a token we must present the verifier itself. An intercepted code is useless without it.

**73. Why is a PIN still needed after Google?**
Google proves who you are on Google; the PIN proves you own this bank account. A compromised Google session alone cannot open the bank account.

---

## H. Features

**74. How do you find a recipient?**
One search box accepts a username, account number, Philippine mobile number or linked Gmail; `@username` searches usernames only. Results reveal only username, full name and photo. You cannot send to yourself. *Where:* `transfers.service.ts`.

**75. How do money requests work?**
The requester creates a pending request (up to ₱20,000). The payer can pay (a real transfer with card, limit and balance checks) or decline; the requester can cancel. The status change and payment happen in one transaction, so a request can never be paid twice.

**76. How are card numbers generated?**
Network prefix + random digits + a Luhn check digit, 16 digits total; expiry is the last day of the month, 5 years ahead. They are simulated (test prefixes) but valid-format. *Where:* `card-generation.server.ts`.

**77. What is the Luhn algorithm?**
A checksum: from the right, double every second digit, subtract 9 from results over 9, sum everything; the check digit makes the total a multiple of 10. It catches single-digit typos and most swaps.

**78. Why two cards?**
A physical card for everyday use and a virtual card for online use, on different networks with different numbers and CVVs. Each can be locked separately, and every payment records which card was used.

**79. How is GoalSave interest computed?**
Daily compounding at 4% a year: balance × (1 + 0.04/365)^days, with fractional days. The result is rounded down to whole centavos and the fraction is carried, so nothing is lost. ₱1,000 for a year becomes ₱1,040.80. *Where:* `shared/lib/savings-interest.ts`.

**80. Do you run a nightly interest job?**
No. Interest is settled whenever a goal is viewed or changed, for the exact time elapsed. Compounding is multiplicative and the remainder is carried, so settling daily or once a year gives the same result (proven by a unit test).

**81. How do rewards work?**
1 point per full ₱50 on sent transfers and bills, credited in the same transaction as the payment. 100 points convert to ₱1.00 cash back, in multiples of 100. Conversion is one ledger entry adding cash and subtracting points atomically.

**82. Isn't 0.02% cash back very small?**
Yes, deliberately modest for a prototype. Both rates are single constants in `money.ts` and could be tuned by the business.

**83. Where do Bitcoin prices come from?**
Binance's BTC/USDT price × Binance.US's USDT/USD price × the Frankfurter USD→PHP reference rate. Every response is validated; quotes are cached 5 seconds and refused if older than 60 seconds. The browser also streams live prices over a WebSocket for display.

**84. How is a Bitcoin trade priced?**
Buying: satoshis rounded down, cost rounded up, plus a ₱10 fee. Selling: proceeds rounded down, minus ₱10. Everything uses BigInt and centavos, and the server prices the trade with its own fresh quote.

**85. What happens if Binance is down?**
Requests fail with "Bitcoin market data is unavailable", the status shows "Feed offline", and trading pauses because there is no fresh price. The rest of GoBank is unaffected.

---

## I. Frontend, UX and accessibility

**86. How did you design for mobile?**
Mobile-first: a single 440-px column, large touch targets, fluid font sizes with `clamp`, numeric keyboards (`inputMode`), a PIN pad, and layouts tested from 320 px wide to desktop. Zoom is allowed.

**87. How do you show errors?**
Inline, next to the field, in red with `role="alert"` so screen readers announce them. Server messages are friendly ("Insufficient balance. You have ₱500.00").

**88. Is the app accessible?**
Semantic HTML, labels on every input, ARIA names on icon buttons, `aria-pressed` toggles, live regions, accessible tabs and dialogs with focus management, keyboard support, visible focus, reduced-motion support. The browser tests find elements by role and label, which double-checks labeling. *Where:* [Styling and accessibility](../06-frontend/04-styling-and-accessibility.md).

**89. How does data stay fresh after an action?**
After any mutation, the client invalidates all cached queries and the screen calls `router.refresh()` to re-render server components. Lists such as GoalSave also refetch every 15 seconds.

**90. Why does sign-in submit automatically?**
The PIN pad submits on the sixth digit, like mobile banking apps, saving a tap. A wrong PIN clears the pad and shakes the dots.

**91. How do you protect card details on screen?**
The number and CVV are hidden until tapped; the CVV is fetched only on demand and never cached; a locked card is blurred, made `inert` and hidden from screen readers.

---

## J. Testing and quality

**92. How did you test the system?**
63 unit tests for rules and calculations run in CI on every push; an integration script runs the real services against PostgreSQL, covering every money flow, rollback and access-control case; Playwright tests drive the real app in Chrome on a phone-sized screen; and a concurrency experiment. *Where:* [Testing](../07-testing/01-testing.md).

**93. Do your tests pass?**
Yes: all 63 unit tests, typecheck, lint with zero warnings, all 19 migrations, the seed, and the core integration test passed on the final commit.

**94. How do you know a failed payment leaves no partial data?**
The integration test makes payments fail on purpose (insufficient balance, locked card) and asserts that the account overview is identical before and after.

**95. What does your CI pipeline do?**
On every push and pull request to main, staging and develop: install with `npm ci`, then format check, lint (zero warnings), typecheck, unit tests and a production build. *Where:* `.github/workflows/ci.yml`.

**96. What is not tested?**
React components have no component tests, there are only 3 browser tests, the integration scripts are not in CI (they need a database), and there is no load testing. Logic is concentrated in tested pure functions and services to compensate.

---

## K. Deployment, performance and scalability

**97. How is it deployed?**
It is designed for Vercel with a Neon PostgreSQL database: set the root directory to `gobank`, add the environment variables, run `npm run db:migrate` once, and register the Google callback URL. *Where:* project README, "Deploying (Vercel)".

**98. How would it handle more users?**
The server is stateless (sessions live in the database), so more instances can be added. Queries use indexes and cursor pagination, market data is cached, and locks are **per account**, so one user's payments never wait for another's. The exception is a very popular receiver: transfers to the same account wait for each other briefly.

**99. Why cursor pagination?**
It loads the next 20 rows after a known row using an index, so pages stay fast and stable even when new transactions arrive.

**100. What happens when the database is asleep?**
Neon's free tier sleeps when idle; the first request may fail with `P1001` while it wakes. Run it again; for the defense, open the app a few minutes early. *Where:* README troubleshooting.

**101. How do you avoid "too many connections" in development?**
One Prisma client is kept on `globalThis` so hot reloads reuse it; in production the pooled Neon URL shares connections among functions. *Where:* `server/db.ts`.

---

## L. Limitations and future work

**102. What are the limitations?**
Simulated money rails; no second factor beyond the PIN; no general rate limiting or security headers; simulated card numbers stored in plain text; "notifications" are only the request inbox; goal icons saved per browser; English and PHP only; no admin back office. *Where:* [Limitations](03-limitations-and-future-work.md).

**103. What would you add next?**
OTP or passkeys and device binding; rate limiting and security headers; real payment partners for cash-in, bills and load; push notifications; monthly statements; an admin and fraud-monitoring console; integration tests in CI.

---

## M. "What if" questions

**104. What if two people send each other money at the same time?**
Both transfers lock the two accounts in the same ID order; one waits for the other. No deadlock, and both complete correctly.

**105. What if the server crashes after debiting the sender?**
The debit is inside the uncommitted transaction, so PostgreSQL rolls it back. There is never a debit without its credit.

**106. What if someone edits the request to send a negative amount?**
Zod refuses it: `amount` must be a positive whole number of centavos.

**107. What if someone edits the request to pay from another user's account?**
Impossible: the sender is taken from the server-side session, not from the request.

**108. What if the encryption key is lost?**
Existing CVVs cannot be decrypted; users see "Your card security details are temporarily unavailable." The key must be backed up securely; the setup script refuses to overwrite an existing key.

**109. What if a user opens the same goal on two phones while interest is due?**
Both try to settle; one wins the compare-and-set, and the other retries and finds nothing left to pay. Interest is paid exactly once.

**110. What if a user creates goals on two devices at once while at 4 goals?**
Goal operations run at the Serializable level: PostgreSQL cancels one of the two conflicting transactions, and the retry counts 5 goals and refuses with "You can have up to 5 goals".

**111. What if the Bitcoin price changes between preview and confirm?**
The server executes at its own fresh quote (at most 5 seconds old, never older than 60 seconds), and the dialog warns: "Your final fill uses the latest PHP quote when confirmed."

**112. What if a payment is refused because the card is locked?**
Nothing changes (tested). The message says to unlock it or pay with the other card, and the card picker disables the locked card.

---

## N. Explain this line

| If the panel points at… | Say |
| --- | --- |
| `db.$transaction(async (tx) => …)` | "Everything inside is one database transaction: all or nothing." |
| `SELECT … FOR UPDATE` | "Locks the account row until the transaction ends, so concurrent payments wait." |
| `balance: { gte: moneyOut, lte: MAX_BALANCE_CENTAVOS - moneyIn }` | "The update only matches if the balance stays between 0 and the maximum: check and change in one atomic step." |
| `asDatabaseError(error)?.code === "P2025"` | "Prisma's 'no row matched': here it means the conditional update's rule failed." |
| `isolationLevel: "Serializable"` | "The strictest isolation: PostgreSQL cancels conflicting transactions, and we retry." |
| `protectedProcedure` | "Only works with a valid session from the tab that owns it; provides `ctx.userId`." |
| `.input(z.object({ … }))` | "Zod validates the request before our code runs." |
| `import "server-only"` | "The build fails if browser code imports this file." |
| `"use client"` | "This component also runs in the browser: it has state or event handlers." |
| `httpOnly: true` | "JavaScript cannot read this cookie, which protects it from XSS." |
| `timingSafeEqual` | "Compares secrets in constant time to prevent timing attacks." |
| `randomBytes(32)` / `randomInt` | "Cryptographically secure randomness." |
| `createCipheriv("aes-256-gcm", …)` + `setAAD` | "Authenticated encryption bound to the card number." |
| `Math.floor(spent / 5000)` | "1 reward point per full ₱50." |
| `Math.exp(days * Math.log1p(rate / 365))` | "(1 + r/365)^days, computed accurately." |
| `100_000_000n` | "A BigInt: satoshis per Bitcoin, exact integer math." |
| `useRef` | "A value that survives renders without causing one: here a lock, a DOM element or a request counter." |
| `useMutation` / `useQuery` | "React Query hooks: change data / read and cache data." |
| `router.refresh()` | "Re-render the server components with fresh data." |
| `as const` | "Freeze the value and keep its exact literal types." |
| `inert` | "The element and its children cannot be focused or clicked." |
| `aria-pressed` | "Tells screen readers this toggle button is on or off." |
