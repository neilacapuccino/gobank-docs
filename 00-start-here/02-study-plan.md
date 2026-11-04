# Study plan

**What you will learn:** how to go from "I roughly know the app" to "I can explain any file the panel points at" in five focused days. Each day ends with a self-test. If you have less time, do the ⭐ items only.

---

## Before day 1: set up a way to see the code

1. Open the source on GitHub at the exact version these docs describe: `https://github.com/neilacapuccino/gobank-express/tree/7be1eb5`.
2. Optional but very helpful: run the app locally (follow "Quick start" in the project's `README.md`) and sign in as `@maricel` with PIN `135790`. Click every screen while you read about it.
3. Keep [the glossary](03-glossary.md) open in another tab.

---

## Day 1: the big picture and the foundations

| Read | Goal |
| --- | --- |
| ⭐ [Project overview](01-project-overview.md) | Pitch the project in 30 seconds |
| [TypeScript and tooling](../01-foundations/01-typescript-and-tooling.md) | Read any line of TypeScript in the project |
| [Next.js and React](../01-foundations/02-nextjs-and-react.md) | Know which code runs in the browser and which on the server |
| ⭐ [tRPC, Zod and React Query](../01-foundations/03-trpc-zod-and-react-query.md) | Explain how a button press reaches the server |
| ⭐ [Prisma and PostgreSQL](../01-foundations/04-prisma-and-postgresql.md) | Explain a transaction, a row lock and a migration |
| ⭐ [Security concepts](../01-foundations/05-security-concepts.md) | Explain hashing vs encryption, salt, HMAC, PKCE |

**Self-test:** explain to a friend (or a mirror) why money is stored in centavos and what a database transaction guarantees.

---

## Day 2: architecture and the database

| Read | Goal |
| --- | --- |
| ⭐ [Layers and folders](../02-architecture/01-layers-and-folders.md) | Draw the four layers from memory |
| ⭐ [Life of a request](../02-architecture/02-request-lifecycle.md) | Trace "Send money" through every file |
| ⭐ [Schema](../03-database/01-schema.md) | Draw the ERD from memory and explain every table |
| [Migration history](../03-database/02-migration-history.md) | Tell the story of how the design changed |
| [Seed data](../03-database/03-seed-data.md) | Know the demo accounts and billers |
| [Configuration files](../02-architecture/03-configuration-files.md) | Know what each config file is for |

**Self-test:** on paper, draw the ERD and the request flow without looking. Then compare.

---

## Day 3: the server core (most important day)

| Read | Goal |
| --- | --- |
| [Database client, errors, IDs, pagination](../04-server-core/01-db-errors-identifiers-pagination.md) | Know the small helpers by name |
| ⭐ [tRPC setup](../04-server-core/02-trpc-setup.md) | Explain middleware, error translation and the sign-in guard |
| ⭐ [Sessions](../04-server-core/03-sessions.md) | Explain how sign-in is remembered and when it ends |
| ⭐⭐ [The ledger](../04-server-core/04-ledger.md) | Explain `post`, `spend` and `transfer` line by line |

**Self-test:** answer, without notes, "What happens if I press Send twice very fast?" and "What happens if the server crashes in the middle of a transfer?" (Answers are in the ledger page.)

---

## Day 4: every feature

Read all twelve pages in [section 5](../README.md#5-features-backend-and-frontend-together). For each feature, be able to say:

1. which screen(s) the user sees,
2. which tRPC procedure(s) the screen calls,
3. which rules are checked (and where: browser, router, service, ledger, database),
4. what gets written to the database.

The four you will most likely be asked about: ⭐ [Send money](../05-features/05-send-money.md), ⭐ [Cards](../05-features/04-cards.md), ⭐ [GoalSave](../05-features/08-goalsave.md), ⭐ [Bitcoin](../05-features/12-bitcoin.md).

**Self-test:** pick a random screen in the running app and name the procedure it calls and the service function behind it.

---

## Day 5: frontend, quality, security and rehearsal

| Read | Goal |
| --- | --- |
| [Pages and routing](../06-frontend/01-pages-and-routing.md), [Shared UI kit](../06-frontend/02-shared-ui-kit.md), [Shared helpers](../06-frontend/03-shared-lib-hooks-and-trpc-client.md), [Styling](../06-frontend/04-styling-and-accessibility.md) | Explain the UI building blocks |
| [Testing](../07-testing/01-testing.md) | Say what is tested and how |
| ⭐ [Security model](../08-security/01-security-model.md) | Answer any "how do you protect…" question |
| ⭐⭐ [Panel questions](../09-defense/01-panel-questions.md) | Practice answers out loud |
| ⭐ [Live demo script](../09-defense/02-demo-script.md) | Rehearse the demo twice |
| ⭐ [Limitations](../09-defense/03-limitations-and-future-work.md) | Admit weaknesses confidently |
| ⭐ [Cheat sheet](../09-defense/04-cheat-sheet.md) | Print it; review it the morning of the defense |

**Final self-test:** have someone read random questions from [Panel questions](../09-defense/01-panel-questions.md) and answer each in under a minute.

---

## How to answer a question you did not expect

1. **Restate** the question in one sentence ("You're asking how we stop a negative balance").
2. **Name the layer** that handles it (browser check, Zod on the server, the ledger, or a database rule).
3. **Point at the file**: "That is in `ledger.ts`, the `post` function, line 89."
4. **Give the reason**: "We do it in the database update itself, so two requests at the same time cannot both pass."
5. If you do not know: say what you *do* know and how you would find out. Panels respect "I would check X" more than guessing.
