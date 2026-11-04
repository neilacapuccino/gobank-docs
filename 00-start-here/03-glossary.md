# Glossary

Every technical term used in this guide, in plain words, A to Z. Where a term is tied to specific code, the file is named.

| Term | Meaning | In this project |
| --- | --- | --- |
| **AAD (additional authenticated data)** | Extra data that AES-GCM "signs" together with the ciphertext without encrypting it. Decryption fails if the AAD is different. | The card number is the AAD of each encrypted CVV, so a CVV cannot be moved to another card (`card-cvv.server.ts`). |
| **AES-256-GCM** | A modern symmetric encryption algorithm (one secret key encrypts and decrypts). "GCM" adds an authentication tag that detects tampering. | Encrypts card CVVs (`card-cvv.server.ts`). |
| **API** | Application Programming Interface: the set of operations one program offers another. | The 40 tRPC procedures are GoBank's API. |
| **App Router** | Next.js's folder-based routing: a folder under `src/app` with a `page.tsx` becomes a URL. | `src/app/(app)/transfer/page.tsx` → `/transfer`. |
| **Atomic** | All-or-nothing. An atomic operation either completes fully or has no effect. | Every money movement runs inside one database transaction. |
| **Auth tag** | The 16-byte value AES-GCM produces to prove ciphertext was not changed. | Stored inside each encrypted CVV string. |
| **Base64 / base64url** | A way to write bytes using letters, digits and two symbols. The "url" variant uses `-` and `_` so it is safe in URLs and cookies. | Session tokens, OAuth `state`, signed tokens. |
| **BigInt** | A JavaScript number type for whole numbers of any size, written `100n`. Normal numbers lose precision above about 9 quadrillion. | Bitcoin amounts in satoshis (`bitcoin.types.ts`). |
| **Biller** | A company you pay bills to (Meralco, PLDT…). | `Biller` table, seeded by `prisma/seed.ts`. |
| **CHECK constraint** | A database rule that rejects rows breaking a condition. | `"balance" >= 0` on `User` (migration `20260923000000_init`). |
| **Client component** | A React component that also runs in the browser, marked with `"use client"`. Can use state, effects and clicks. | `transfer-form.tsx`. |
| **Code challenge / verifier** | The two halves of PKCE: a random secret (verifier) and its SHA-256 hash (challenge). | `google.server.ts`. |
| **Compound interest** | Interest that also earns interest. Daily compounding adds interest every day. | GoalSave, `savings-interest.ts`. |
| **Concurrency** | Several things happening at the same time (two requests, two tabs). | Handled with row locks and conditional updates in `ledger.ts`. |
| **Cookie** | A small value the browser stores and sends back to the same site on every request. | `gb_session` holds the session token. |
| **`httpOnly` cookie** | A cookie page JavaScript cannot read, which protects it from XSS theft. | All GoBank cookies are `httpOnly`. |
| **CSRF** | Cross-Site Request Forgery: a bad site tricks your browser into sending a request to a site you are signed in to. | Blocked by `SameSite` cookies, the `x-gb-session` header and the `Origin` check ([Security model](../08-security/01-security-model.md)). |
| **CSPRNG** | Cryptographically Secure Pseudo-Random Number Generator. Unpredictable enough for secrets. | `randomBytes` and `randomInt` from `node:crypto`. |
| **Cursor pagination** | Loading a list page by page by saying "give me the 20 items after item X". Faster and more stable than page numbers. | `src/server/pagination.ts`. |
| **CVV** | The 3-digit card security code. | Encrypted at rest; revealed on demand (`card.service.ts`). |
| **Deadlock** | Two transactions each wait for a lock the other holds, forever. The database then kills one. | Avoided by locking users in ID order in `transfer()`. |
| **Debounce** | Wait until the user stops typing for a short time before acting. | Username check (380 ms), recipient search (300 ms). |
| **Enum** | A column that can only hold values from a fixed list. | `TransactionKind`, `CardKind`, `RequestStatus`… |
| **ERD** | Entity-Relationship Diagram: a picture of tables and how they connect. | [Schema](../03-database/01-schema.md). |
| **Event sourcing** | Storing every event (trade) and computing the current state by replaying them, instead of storing only the state. | Bitcoin holdings are computed from `BitcoinTrade` rows (`summarizeTrades`). |
| **Foreign key** | A column that points to a row in another table; the database keeps the link valid. | `Transaction.userId` → `User.id`. |
| **Hash (cryptographic)** | A one-way fingerprint of data. You cannot get the input back. | Session IDs are SHA-256 hashes of tokens; PINs use scrypt. |
| **HMAC** | A hash mixed with a secret key, used to prove a message was created by someone who knows the key and was not changed. | Signs the pending Google identity cookie (`signed-token.ts`). |
| **Hook (React)** | A function starting with `use` that gives a component state or behavior. | `useSpendLimit`, `useRecipientSearch`, `useBitcoinFeed`. |
| **Idempotent** | Doing it twice has the same effect as doing it once. | Bitcoin trades with the same `submissionId` run once. |
| **Index (database)** | A sorted lookup structure that makes searches fast. | `@@index([userId, createdAt(sort: Desc)])` on `Transaction`. |
| **Isolation level** | How much simultaneous transactions can see of each other. PostgreSQL's default is Read Committed; Serializable is the strictest. | GoalSave and Bitcoin trades use Serializable. |
| **Ledger** | The book where every money movement is recorded. | `src/server/ledger.ts` and the `Transaction` table. |
| **Luhn algorithm** | A checksum digit at the end of a card number that catches typing mistakes. | `card-generation.server.ts`. |
| **Middleware (tRPC)** | Code that runs before or after every procedure, like a checkpoint. | `friendlyErrors` and `requireSession` in `trpc.ts`. |
| **Migration** | A versioned SQL file that changes the database structure. Applied in order. | 19 folders in `prisma/migrations`. |
| **Mutation / query** | In tRPC and React Query, a *query* reads data; a *mutation* changes data. | `api.transfers.send.useMutation()`. |
| **Nonce** | "Number used once": random bytes that make each encryption unique. | 12-byte nonce per encrypted CVV. |
| **OAuth 2.0** | The standard that lets "Continue with Google" work without giving GoBank your Google password. | `src/features/auth/google`. |
| **ORM** | Object-Relational Mapper: a library that turns code calls into SQL. | Prisma. |
| **Optimistic concurrency** | Update a row only if it still has the values you read ("compare and set"); if not, retry. | `settleGoalInterest` updates only if `balance` and `interestCalculatedAt` are unchanged. |
| **PKCE** | Proof Key for Code Exchange: an OAuth add-on that stops a stolen login code from being used by someone else. | `code_challenge_method: "S256"` in `google.server.ts`. |
| **Procedure (tRPC)** | One API endpoint, written as a function. | `transfers.send`, `goals.move`… |
| **Race condition** | A bug where the result depends on which of two simultaneous actions finishes first. | Prevented by conditional updates and locks. |
| **Reference** | The receipt code of a transaction, like `GB7KQ2M9XA`. | `newReference()` in `identifiers.ts`. |
| **Route group** | A Next.js folder in parentheses, like `(app)`, that groups pages under a shared layout without changing the URL. | `(app)` = signed-in pages, `(auth)` = sign-in pages. |
| **Row lock (`SELECT … FOR UPDATE`)** | Locks rows so other transactions must wait before changing them. | `spend()`, `transfer()`, PIN checks. |
| **Salt** | Random data mixed into a password hash so equal passwords give different hashes. | 16-byte salt per PIN in `pin.ts`. |
| **SameSite** | A cookie setting that controls whether the cookie is sent on requests from other sites. | `lax` for the session cookie, `strict` for the card preview. |
| **Satoshi** | The smallest unit of Bitcoin: 1 BTC = 100,000,000 satoshis. | Stored in `BitcoinTrade.bitcoinUnits`. |
| **Schema (Zod)** | A description of the shape an input must have, used to validate it. | `centavos`, `mobile`, `pin`, `username`… |
| **scrypt** | A deliberately slow, memory-hungry password-hashing function that makes guessing expensive. | `hashPin` in `pin.ts`. |
| **Seed** | A script that fills a fresh database with starting data. | `prisma/seed.ts`. |
| **Serializable** | The strictest isolation level: the database guarantees the result is the same as if transactions ran one after another; otherwise it cancels one with a serialization error (Prisma code `P2034`). | `goals.service.ts`, `bitcoin.service.ts`. |
| **Server component** | A React component that runs only on the server; can read the database directly; sends HTML to the browser. | `src/app/(app)/layout.tsx`, `dashboard/page.tsx`. |
| **Session** | The server's memory that "this browser is signed in as this user". | `Session` table + `gb_session` cookie. |
| **SuperJSON** | A JSON extension that keeps `Date`, `BigInt`, `Map` and `undefined` intact across the network. | Transformer in `trpc.ts` and `react.tsx`. |
| **Timing attack** | Guessing a secret by measuring how long comparisons take. | Prevented with `timingSafeEqual`. |
| **Transaction (database)** | A group of database operations that succeed or fail together (atomic). | `db.$transaction(...)` everywhere money moves. |
| **Transaction (banking)** | A money movement shown in history. | A row in the `Transaction` table. Do not confuse the two meanings! |
| **tRPC** | A library that makes server functions callable from the browser with full TypeScript types, no hand-written REST endpoints. | `src/server/trpc.ts`, `*.router.ts`. |
| **TTL** | Time To Live: how long something stays valid. | Sessions: 30 minutes idle. Quote cache: 5 seconds. |
| **Zod** | A TypeScript validation library. | Every router input. |
