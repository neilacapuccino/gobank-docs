# File index: every file, categorized

All **258** files tracked in `gobank-express` at commit `7be1eb5`, grouped by category, each with a one-line description and the page that explains it. `node scripts/sync-code.mjs --coverage` checks that no project file is missing from these docs.

**Legend:** 🖥️ server only · 🌐 runs in the browser · ⚙️ configuration · 🧪 test · 🗄️ database

| Category | Files |
| --- | --- |
| [1. Repository root and GitHub](#1-repository-root-and-github) | 5 |
| [2. App configuration](#2-app-configuration-gobank) | 13 |
| [3. Database (Prisma)](#3-database-prisma) | 22 |
| [4. Scripts and browser tests](#4-scripts-and-browser-tests) | 4 |
| [5. Server core and environment](#5-server-core-and-environment) | 9 |
| [6. tRPC client](#6-trpc-client) | 4 |
| [7. Routes: layouts, pages and API](#7-routes-layouts-pages-and-api-gobanksrcapp) | 29 |
| [8. Features](#8-features-gobanksrcfeatures) | 144 |
| [9. Shared code and styles](#9-shared-code-and-styles) | 28 |
| **Total** | **258** |

---

## 1. Repository root and GitHub

| File | What it is | Explained in |
| --- | --- | --- |
| `.gitattributes` | ⚙️ force LF line endings for all text files | [Configuration files §6](../02-architecture/03-configuration-files.md) |
| `.githooks/pre-push` | ⚙️ optional hook: run `check:ci` before pushing | [Configuration files §6](../02-architecture/03-configuration-files.md) |
| `.github/CODEOWNERS` | ⚙️ default reviewer for every file | [Configuration files §6](../02-architecture/03-configuration-files.md) |
| `.github/workflows/ci.yml` | ⚙️ CI: format, lint, typecheck, unit tests, build | [Configuration files §6](../02-architecture/03-configuration-files.md) |
| `README.md` | project README: features, stack, setup, architecture, limits | [Project overview](../00-start-here/01-project-overview.md) |

## 2. App configuration (`gobank/`)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/package.json` | ⚙️ dependencies and npm scripts | [Configuration files §1](../02-architecture/03-configuration-files.md) |
| `gobank/package-lock.json` | ⚙️ exact dependency versions for `npm ci` (generated) | [TypeScript and tooling §4](../01-foundations/01-typescript-and-tooling.md) |
| `gobank/tsconfig.json` | ⚙️ TypeScript compiler settings, `~/` alias | [TypeScript and tooling §3](../01-foundations/01-typescript-and-tooling.md) |
| `gobank/next.config.ts` | ⚙️ Next.js settings; validates env at build | [Configuration files §3](../02-architecture/03-configuration-files.md) |
| `gobank/eslint.config.ts` | ⚙️ lint rules | [Configuration files §4](../02-architecture/03-configuration-files.md) |
| `gobank/.prettierrc.json` | ⚙️ formatting (tabs, Tailwind class sorting) | [Configuration files §4](../02-architecture/03-configuration-files.md) |
| `gobank/.prettierignore` | ⚙️ files Prettier skips | [Configuration files §4](../02-architecture/03-configuration-files.md) |
| `gobank/.gitignore` | ⚙️ never commit `.env`, builds, generated client | [Configuration files §4](../02-architecture/03-configuration-files.md) |
| `gobank/.env.example` | ⚙️ template for `.env` | [Configuration files §2](../02-architecture/03-configuration-files.md) |
| `gobank/postcss.config.json` | ⚙️ Tailwind 4 plugin | [Configuration files §3](../02-architecture/03-configuration-files.md) |
| `gobank/prisma.config.ts` | ⚙️ Prisma CLI: load `.env`, seed command | [Configuration files §3](../02-architecture/03-configuration-files.md) |
| `gobank/playwright.config.ts` | ⚙️ browser tests: Pixel 7, Chrome, dev server | [Configuration files §5](../02-architecture/03-configuration-files.md) |
| `gobank/public/favicon.ico` | browser tab icon (image) | [Next.js and React §5](../01-foundations/02-nextjs-and-react.md) |

## 3. Database (Prisma)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/prisma/schema.prisma` | 🗄️ all 9 models and 5 enums | [Schema](../03-database/01-schema.md) |
| `gobank/prisma/seed.ts` | 🗄️ 8 billers and 2 demo users | [Seed data](../03-database/03-seed-data.md) |
| `gobank/prisma/migrations/migration_lock.toml` | 🗄️ migrations are for PostgreSQL | [Configuration files §3](../02-architecture/03-configuration-files.md) |
| `gobank/prisma/migrations/20260923000000_init/migration.sql` | 🗄️ first design + CHECK constraints | [Migration history §1](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20260925000000_pin_lockout/migration.sql` | 🗄️ wrong-PIN counter and lock | [Migration history §2](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20260925000100_session_expiry_index/migration.sql` | 🗄️ index for session cleanup | [Migration history §3](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261005000000_bitcoin_practice/migration.sql` | 🗄️ practice Bitcoin wallet | [Migration history §4](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261005010000_account_funded_bitcoin/migration.sql` | 🗄️ account-funded wallet, `exchange` kind | [Migration history §5](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261005020000_direct_php_bitcoin/migration.sql` | 🗄️ PHP trades get references | [Migration history §6](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261005030000_remove_unused_bitcoin_tables/migration.sql` | 🗄️ guarded cleanup | [Migration history §7](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261005040000_profile_photo/migration.sql` | 🗄️ profile photo column | [Migration history §8](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261006000000_enrollment_gmail_cards/migration.sql` | 🗄️ Gmail, required name, card previews | [Migration history §9](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261006000100_discover_card_brand/migration.sql` | 🗄️ add Discover | [Migration history §10–11](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261006000200_discover_card_default/migration.sql` | 🗄️ Discover by default | [Migration history §10–11](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261006000300_bitcoin_trade_history/migration.sql` | 🗄️ verified switch to trade history | [Migration history §12](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261006000400_stash_compound_interest/migration.sql` | 🗄️ interest remainder and timestamp | [Migration history §13](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261008000000_card_cvv_encryption/migration.sql` | 🗄️ encrypted CVV columns | [Migration history §14](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261008010000_dual_cards_shared_policy/migration.sql` | 🗄️ two cards per user | [Migration history §15](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261010000000_clear_savings_bitcoin_names/migration.sql` | 🗄️ Stash → SavingsGoal renames | [Migration history §16](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261103000000_banking_transaction_titles/migration.sql` | 🗄️ rewrite history titles | [Migration history §17](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261103010000_per_card_lock/migration.sql` | 🗄️ per-card lock | [Migration history §18](../03-database/02-migration-history.md) |
| `gobank/prisma/migrations/20261104000000_card_integrity/migration.sql` | 🗄️ drop `gobank` brand and CVV hashes | [Migration history §19](../03-database/02-migration-history.md) |

## 4. Scripts and browser tests

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/scripts/setup-card-key.ts` | 🖥️ creates `CARD_ENCRYPTION_KEY` safely | [Cards §4](../05-features/04-cards.md) |
| `gobank/scripts/verify-core.ts` | 🧪 integration test of every money flow | [Testing §4](../07-testing/01-testing.md) |
| `gobank/scripts/verify-bitcoin.ts` | 🧪 live Bitcoin integration test | [Testing §5](../07-testing/01-testing.md) |
| `gobank/e2e/smoke.spec.ts` | 🧪 3 Playwright browser tests | [Testing §7](../07-testing/01-testing.md) |

## 5. Server core and environment

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/env.ts` | 🖥️ validated environment variables | [Configuration files §2](../02-architecture/03-configuration-files.md) |
| `gobank/src/server/db.ts` | 🖥️ the single Prisma client | [DB, errors, IDs, pagination §1](../04-server-core/01-db-errors-identifiers-pagination.md) |
| `gobank/src/server/errors.ts` | 🖥️ `AppError`, `fail()`, every user message | [DB, errors, IDs, pagination §2](../04-server-core/01-db-errors-identifiers-pagination.md) |
| `gobank/src/server/identifiers.ts` | 🖥️ references and account numbers | [DB, errors, IDs, pagination §3](../04-server-core/01-db-errors-identifiers-pagination.md) |
| `gobank/src/server/pagination.ts` | 🖥️ cursor pagination helpers | [DB, errors, IDs, pagination §4](../04-server-core/01-db-errors-identifiers-pagination.md) |
| `gobank/src/server/trpc.ts` | 🖥️ tRPC init, error translation, session guard | [tRPC setup](../04-server-core/02-trpc-setup.md) |
| `gobank/src/server/root.ts` | 🖥️ combines the 13 routers; `AppRouter` type | [tRPC setup §2](../04-server-core/02-trpc-setup.md) |
| `gobank/src/server/session.ts` | 🖥️ start, find, renew, close, end sessions | [Sessions](../04-server-core/03-sessions.md) |
| `gobank/src/server/ledger.ts` | 🖥️ **every balance change** | [The ledger](../04-server-core/04-ledger.md) |

## 6. tRPC client

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/trpc/react.tsx` | 🌐 browser API client and providers | [Shared helpers §tRPC](../06-frontend/03-shared-lib-hooks-and-trpc-client.md) |
| `gobank/src/trpc/query-client.ts` | 🌐 cache rules, invalidate after mutations | [tRPC, Zod and React Query §5](../01-foundations/03-trpc-zod-and-react-query.md) |
| `gobank/src/trpc/server.ts` | 🖥️ direct caller for server components | [tRPC setup §3](../04-server-core/02-trpc-setup.md) |
| `gobank/src/trpc/error-message.ts` | 🌐 picks the message to show | [tRPC, Zod and React Query §6](../01-foundations/03-trpc-zod-and-react-query.md) |

## 7. Routes: layouts, pages and API (`gobank/src/app`)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/app/layout.tsx` | root layout: font, styles, providers | [Next.js and React §5](../01-foundations/02-nextjs-and-react.md) |
| `gobank/src/app/template.tsx` | page-change animation | [Pages and routing §1](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/page.tsx` | `/` welcome page | [Pages and routing §2](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/google-linked/page.tsx` | `/google-linked` popup result | [Google sign-in §7](../05-features/02-google-sign-in.md) |
| `gobank/src/app/(auth)/layout.tsx` | frame for sign-in pages | [Pages and routing §1](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(auth)/register/page.tsx` | `/register` | [Pages and routing §2](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(auth)/signin/page.tsx` | `/signin` | [Pages and routing §2](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/layout.tsx` | 🖥️ server session check + `SessionGuard` | [Next.js and React §3](../01-foundations/02-nextjs-and-react.md) |
| `gobank/src/app/(app)/dashboard/page.tsx` | `/dashboard` (server data) | [Dashboard §1](../05-features/11-dashboard-and-navigation.md) |
| `gobank/src/app/(app)/transfer/page.tsx` | `/transfer` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/request/page.tsx` | `/request` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/deposit/page.tsx` | `/deposit` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/bills/page.tsx` | `/bills` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/load/page.tsx` | `/load` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/goals/page.tsx` | `/goals` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/goals/[id]/page.tsx` | `/goals/<id>` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/rewards/page.tsx` | `/rewards` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/transactions/page.tsx` | `/transactions` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/transactions/[reference]/page.tsx` | `/transactions/<reference>` receipt (server data, 404) | [Transactions §5](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/app/(app)/notifications/page.tsx` | `/notifications` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/card/page.tsx` | `/card` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/bitcoin/page.tsx` | `/bitcoin` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/settings/page.tsx` | `/settings` (server data) | [Pages and routing §2](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/settings/profile/page.tsx` | `/settings/profile` (server data) | [Pages and routing §2](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/(app)/settings/pin/page.tsx` | `/settings/pin` | [Pages and routing](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/app/api/trpc/[trpc]/route.ts` | 🖥️ tRPC over HTTP | [Life of a request §3](../02-architecture/02-request-lifecycle.md) |
| `gobank/src/app/api/session/route.ts` | 🖥️ renew / close / end session | [Sessions §5](../04-server-core/03-sessions.md) |
| `gobank/src/app/api/auth/google/route.ts` | 🖥️ start Google OAuth | [Google sign-in §2](../05-features/02-google-sign-in.md) |
| `gobank/src/app/api/auth/google/callback/route.ts` | 🖥️ finish Google OAuth | [Google sign-in §3](../05-features/02-google-sign-in.md) |

## 8. Features (`gobank/src/features`)

### `account` (14)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/account/account.router.ts` | 🖥️ overview, spending, profile, updateProfile | [Account and profile](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/account.service.ts` | 🖥️ the four account queries/updates | [Account and profile §2](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/account.rules.ts` | display name rule | [Account and profile §2](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/profile-photo.schema.ts` | photo types and size limits | [Account and profile §4](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/profile-photo.client.ts` | 🌐 crop and compress in the browser | [Account and profile §4](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/profile-photo.server.ts` | 🖥️ verify and re-encode with sharp | [Account and profile §4](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/profile-photo.test.ts` | 🧪 4 photo tests | [Account and profile §4](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/components/profile-screen.tsx` | `/settings` screen | [Account and profile §5](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/components/edit-profile-form.tsx` | 🌐 edit name, mobile, photo | [Account and profile §5](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/components/profile-fields.tsx` | name and mobile fields | [Account and profile §5](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/components/profile-photo-picker.tsx` | 🌐 choose or remove a photo | [Account and profile §5](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/components/profile-avatar.tsx` | photo or default icon | [Account and profile §5](../05-features/03-account-and-profile.md) |
| `gobank/src/features/account/components/gmail-link.tsx` | 🌐 linked Gmail / Link Google popup | [Google sign-in §7](../05-features/02-google-sign-in.md) |
| `gobank/src/features/account/components/google-link-result.tsx` | 🌐 popup result + broadcast | [Google sign-in §7](../05-features/02-google-sign-in.md) |

### `activity` (9)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/activity/activity.fields.ts` | list columns, main kinds, row type | [Transactions §2](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/features/activity/activity.rules.ts` | filters, day grouping | [Transactions §2](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/features/activity/activity.router.ts` | 🖥️ list, transaction | [Transactions §3](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/features/activity/activity.service.ts` | 🖥️ history pages, receipt lookup | [Transactions §3](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/features/activity/components/activity-screen.tsx` | 🌐 history with filters | [Transactions §4](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/features/activity/components/activity-row.tsx` | one history row | [Transactions §4](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/features/activity/components/activity-icon.tsx` | icon per kind | [Transactions §4](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/features/activity/components/recent-activity.tsx` | dashboard's last 5 | [Transactions §4](../05-features/10-transactions-and-receipts.md) |
| `gobank/src/features/activity/components/receipt-screen.tsx` | receipt details | [Transactions §5](../05-features/10-transactions-and-receipts.md) |

### `auth` (32)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/auth/auth.rules.ts` | username, PIN and lock rules | [Registration §2](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/auth.schemas.ts` | Zod schemas for auth | [Registration §3](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/auth.router.ts` | 🖥️ 7 auth procedures | [Registration §4](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/auth.service.ts` | 🖥️ register, sign in, lockout, change PIN | [Registration §6–7](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/auth.test.ts` | 🧪 7 auth tests | [Registration §10](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/card-preview.service.ts` | 🖥️ card preview before sign-up | [Registration §5](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/pin.ts` | 🖥️ scrypt hash and verify | [Security concepts §2](../01-foundations/05-security-concepts.md) |
| `gobank/src/features/auth/session.rules.ts` | session constants | [Sessions §2](../04-server-core/03-sessions.md) |
| `gobank/src/features/auth/session.client.ts` | 🌐 which tab owns the session | [Sessions §4](../04-server-core/03-sessions.md) |
| `gobank/src/features/auth/hooks/use-username-check.ts` | 🌐 live username check | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/google/google.rules.ts` | Google cookie names and messages | [Google sign-in §4](../05-features/02-google-sign-in.md) |
| `gobank/src/features/auth/google/google.server.ts` | 🖥️ OAuth URLs, PKCE, profile fetch | [Google sign-in §2–3](../05-features/02-google-sign-in.md) |
| `gobank/src/features/auth/google/google.service.ts` | 🖥️ find, link, sign in with PIN | [Google sign-in §5](../05-features/02-google-sign-in.md) |
| `gobank/src/features/auth/google/google-identity.server.ts` | 🖥️ signed identity cookie | [Google sign-in §6](../05-features/02-google-sign-in.md) |
| `gobank/src/features/auth/google/signed-token.ts` | 🖥️ HMAC sign and verify | [Google sign-in §6](../05-features/02-google-sign-in.md) |
| `gobank/src/features/auth/google/signed-token.test.ts` | 🧪 4 token tests | [Google sign-in §6](../05-features/02-google-sign-in.md) |
| `gobank/src/features/auth/components/welcome-screen.tsx` | welcome page | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/welcome-actions.tsx` | Create account / Log in / Google | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/welcome-mascot.tsx` | Gobi the mascot (SVG) | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/auth-heading.tsx` | title + subtitle | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/or-divider.tsx` | "or" divider | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/google-button.tsx` | link to start Google | [Google sign-in](../05-features/02-google-sign-in.md) |
| `gobank/src/features/auth/components/google-mark.tsx` | Google "G" logo (SVG) | [Google sign-in](../05-features/02-google-sign-in.md) |
| `gobank/src/features/auth/components/registration-flow.tsx` | 🌐 4-step sign-up controller | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/step-identity.tsx` | 🌐 username + PIN steps | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/step-card.tsx` | 🌐 choose card network | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/step-details.tsx` | 🌐 name and mobile | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/step-review.tsx` | 🌐 review, reveal, terms | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/sign-in-flow.tsx` | 🌐 username → PIN pad | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/change-pin-flow.tsx` | 🌐 change PIN (3 pads) | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/sign-out-button.tsx` | 🌐 Sign out | [Registration §9](../05-features/01-registration-and-sign-in.md) |
| `gobank/src/features/auth/components/session-guard.tsx` | 🌐 keeps the session alive, one tab | [Sessions §5](../04-server-core/03-sessions.md) |

### `bills` (6)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/bills/bill-categories.ts` | categories and icons | [Deposit, bills and load §2](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/bills/bills.router.ts` | 🖥️ billers (public), pay | [Deposit, bills and load §2](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/bills/bills.service.ts` | 🖥️ list active billers, pay via `spend()` | [Deposit, bills and load §2](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/bills/components/bill-payment.tsx` | 🌐 pay-bills screen | [Deposit, bills and load §2](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/bills/components/biller-card.tsx` | one biller button | [Deposit, bills and load §2](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/bills/components/category-card.tsx` | one category button | [Deposit, bills and load §2](../05-features/07-deposit-bills-and-load.md) |

### `bitcoin` (23)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/bitcoin/bitcoin.types.ts` | units, constants, formatting, freshness | [Bitcoin §2](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin.rules.ts` | trade math, average cost, replay | [Bitcoin §4](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin-trade-input.ts` | input parsing, previews, presets | [Bitcoin §8](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin-cache.ts` | de-duplicating TTL cache | [Bitcoin §3](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin-fx.server.ts` | 🖥️ USD → PHP rate | [Bitcoin §3](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin-market.server.ts` | 🖥️ quote and chart from Binance | [Bitcoin §3](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin.router.ts` | 🖥️ quote, chart, portfolio, trade | [Bitcoin §5](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin.service.ts` | 🖥️ portfolio, idempotent Serializable trades | [Bitcoin §5](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/live-socket.ts` | 🌐 reconnecting WebSocket | [Bitcoin §6](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin-candles.ts` | live candle parsing and merging | [Bitcoin §6](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin-chart-geometry.ts` | chart scales and shapes | [Bitcoin §7](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/hooks/use-bitcoin-feed.ts` | 🌐 snapshot + live price | [Bitcoin §6](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/hooks/use-bitcoin-candles.ts` | 🌐 history + live candles | [Bitcoin §6](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/components/bitcoin-screen.tsx` | 🌐 page layout | [Bitcoin §8](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/components/bitcoin-market.tsx` | 🌐 price and 24 h stats | [Bitcoin §8](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/components/bitcoin-chart.tsx` | 🌐 SVG chart | [Bitcoin §7](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/components/bitcoin-holdings.tsx` | 🌐 holdings and profit | [Bitcoin §8](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/components/bitcoin-trade-form.tsx` | 🌐 buy/sell form | [Bitcoin §8](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/components/bitcoin-trade-review.tsx` | 🌐 confirmation dialog | [Bitcoin §8](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/components/bitcoin-history.tsx` | 🌐 latest 20 trades | [Bitcoin §8](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin.test.ts` | 🧪 8 trade-math tests | [Bitcoin §9](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin-trade-input.test.ts` | 🧪 9 input tests | [Bitcoin §9](../05-features/12-bitcoin.md) |
| `gobank/src/features/bitcoin/bitcoin-chart-geometry.test.ts` | 🧪 5 chart tests | [Bitcoin §9](../05-features/12-bitcoin.md) |

### `card` (18)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/card/card-brands.ts` | the four networks and prefixes | [Cards §2](../05-features/04-cards.md) |
| `gobank/src/features/card/card-generation.server.ts` | 🖥️ card numbers (Luhn), expiry, virtual network | [Cards §3](../05-features/04-cards.md) |
| `gobank/src/features/card/card-cvv.server.ts` | 🖥️ AES-256-GCM CVV encryption | [Cards §4](../05-features/04-cards.md) |
| `gobank/src/features/card/card-credentials.server.ts` | 🖥️ number + encrypted CVV + expiry | [Cards §4](../05-features/04-cards.md) |
| `gobank/src/features/card/card-label.ts` | "Paid with …" from history details | [Cards §6](../05-features/04-cards.md) |
| `gobank/src/features/card/card.rules.ts` | ₱100,000 daily-limit maximum | [Cards §5](../05-features/04-cards.md) |
| `gobank/src/features/card/card.router.ts` | 🖥️ get, revealCvv, update | [Cards §5](../05-features/04-cards.md) |
| `gobank/src/features/card/card.service.ts` | 🖥️ cards, locks, limit, CVV reveal | [Cards §5](../05-features/04-cards.md) |
| `gobank/src/features/card/card-cvv.test.ts` | 🧪 8 card and CVV tests | [Cards §8](../05-features/04-cards.md) |
| `gobank/src/features/card/hooks/use-card-secrets.ts` | 🌐 reveal number/CVV safely | [Cards §7](../05-features/04-cards.md) |
| `gobank/src/features/card/components/my-card-screen.tsx` | 🌐 My card screen | [Cards §7](../05-features/04-cards.md) |
| `gobank/src/features/card/components/my-card-screen.module.css` | blur, overlay, card-switch animation | [Styling §3](../06-frontend/04-styling-and-accessibility.md) |
| `gobank/src/features/card/components/card-details.tsx` | 🌐 card face + CVV box | [Cards §7](../05-features/04-cards.md) |
| `gobank/src/features/card/components/card-settings.tsx` | 🌐 lock button, daily limit | [Cards §7](../05-features/04-cards.md) |
| `gobank/src/features/card/components/bank-card.tsx` | 🌐 the card drawing | [Cards §7](../05-features/04-cards.md) |
| `gobank/src/features/card/components/card-brand-logo.tsx` | network logos (SVG) | [Cards §7](../05-features/04-cards.md) |
| `gobank/src/features/card/components/card-picker.tsx` | "Pay with" chooser | [Cards §7](../05-features/04-cards.md) |
| `gobank/src/features/card/components/card-locked-notice.tsx` | "Both cards are locked" notice | [Cards §7](../05-features/04-cards.md) |

### `dashboard` (4)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/dashboard/components/dashboard-screen.tsx` | home layout and header | [Dashboard §2](../05-features/11-dashboard-and-navigation.md) |
| `gobank/src/features/dashboard/components/balance-card.tsx` | 🌐 balance, hide, copy | [Dashboard §3](../05-features/11-dashboard-and-navigation.md) |
| `gobank/src/features/dashboard/components/quick-actions.tsx` | Send / Deposit / Request | [Dashboard §4](../05-features/11-dashboard-and-navigation.md) |
| `gobank/src/features/dashboard/components/feature-grid.tsx` | feature cards and shortcuts | [Dashboard §4](../05-features/11-dashboard-and-navigation.md) |

### `deposit` (4), `load` (4), `notifications` (3), `requests` (4), `rewards` (6), `transfers` (3)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/deposit/deposit.rules.ts` | ₱50,000 maximum | [Deposit, bills and load §1](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/deposit/deposit.router.ts` | 🖥️ create | [Deposit, bills and load §1](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/deposit/deposit.service.ts` | 🖥️ `post()` a deposit | [Deposit, bills and load §1](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/deposit/components/deposit-form.tsx` | 🌐 deposit screen | [Deposit, bills and load §1](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/load/load.rules.ts` | ₱10–₱10,000 | [Deposit, bills and load §3](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/load/load.router.ts` | 🖥️ buy (mobile required) | [Deposit, bills and load §3](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/load/load.service.ts` | 🖥️ `spend()` a load | [Deposit, bills and load §3](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/load/components/load-form.tsx` | 🌐 buy-load screen | [Deposit, bills and load §3](../05-features/07-deposit-bills-and-load.md) |
| `gobank/src/features/notifications/notifications.router.ts` | 🖥️ list requests | [Request money §4](../05-features/06-request-money-and-notifications.md) |
| `gobank/src/features/notifications/notifications.service.ts` | 🖥️ received/sent request pages | [Request money §4](../05-features/06-request-money-and-notifications.md) |
| `gobank/src/features/notifications/components/notifications-screen.tsx` | 🌐 request inbox, pay/decline/cancel | [Request money §5](../05-features/06-request-money-and-notifications.md) |
| `gobank/src/features/requests/requests.rules.ts` | ₱20,000 maximum | [Request money §2](../05-features/06-request-money-and-notifications.md) |
| `gobank/src/features/requests/requests.router.ts` | 🖥️ create, respond, cancel | [Request money §2](../05-features/06-request-money-and-notifications.md) |
| `gobank/src/features/requests/requests.service.ts` | 🖥️ atomic claim + transfer | [Request money §3](../05-features/06-request-money-and-notifications.md) |
| `gobank/src/features/requests/components/request-form.tsx` | 🌐 request screen | [Request money §5](../05-features/06-request-money-and-notifications.md) |
| `gobank/src/features/rewards/rewards.rules.ts` | conversion options | [Rewards §4](../05-features/09-rewards.md) |
| `gobank/src/features/rewards/rewards.rules.test.ts` | 🧪 4 rewards tests | [Rewards §4](../05-features/09-rewards.md) |
| `gobank/src/features/rewards/rewards.router.ts` | 🖥️ summary, history, redeem | [Rewards §3](../05-features/09-rewards.md) |
| `gobank/src/features/rewards/rewards.service.ts` | 🖥️ redeem via `post()`, totals, history | [Rewards §3](../05-features/09-rewards.md) |
| `gobank/src/features/rewards/components/rewards-screen.tsx` | 🌐 points, convert | [Rewards §5](../05-features/09-rewards.md) |
| `gobank/src/features/rewards/components/reward-history.tsx` | 🌐 points history | [Rewards §5](../05-features/09-rewards.md) |
| `gobank/src/features/transfers/transfers.router.ts` | 🖥️ recent, recipient, send | [Send money §1](../05-features/05-send-money.md) |
| `gobank/src/features/transfers/transfers.service.ts` | 🖥️ recipient search, recent, send | [Send money §2](../05-features/05-send-money.md) |
| `gobank/src/features/transfers/components/transfer-form.tsx` | 🌐 3-step send screen | [Send money §6](../05-features/05-send-money.md) |

### `goals` (14)

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/features/goals/goals.rules.ts` | name and amount rules | [GoalSave §3](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/goals.rules.test.ts` | 🧪 7 goal tests | [GoalSave §3](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/goals.router.ts` | 🖥️ list, get, create, update, move, remove | [GoalSave §5](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/goals.service.ts` | 🖥️ Serializable goal operations | [GoalSave §4](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/hooks/use-goal-icon.ts` | 🌐 icon saved per browser | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/goalsave-screen.tsx` | 🌐 goals overview | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/create-goal-form.tsx` | 🌐 new goal (2 steps) | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/goal-detail.tsx` | 🌐 one goal | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/goal-transfer-form.tsx` | 🌐 transfer in/out | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/goal-settings-form.tsx` | 🌐 rename, target, close | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/goal-tabs.tsx` | 🌐 Overview / Transactions tabs | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/goal-bubble.tsx` | progress ring | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/goal-art.tsx` | six goal icons; guess from name | [GoalSave §6](../05-features/08-goalsave.md) |
| `gobank/src/features/goals/components/goal-icon-picker.tsx` | 🌐 icon dialog | [GoalSave §6](../05-features/08-goalsave.md) |

## 9. Shared code and styles

| File | What it is | Explained in |
| --- | --- | --- |
| `gobank/src/shared/lib/money.ts` | money constants and conversions | [Shared helpers](../06-frontend/03-shared-lib-hooks-and-trpc-client.md) |
| `gobank/src/shared/lib/format.ts` | peso, dates, masks | [Shared helpers](../06-frontend/03-shared-lib-hooks-and-trpc-client.md) |
| `gobank/src/shared/lib/contact.ts` | mobile, name, Gmail rules | [Account and profile §3](../05-features/03-account-and-profile.md) |
| `gobank/src/shared/lib/schemas.ts` | shared Zod schemas | [tRPC, Zod and React Query §3](../01-foundations/03-trpc-zod-and-react-query.md) |
| `gobank/src/shared/lib/amount-input.ts` | peso input rule | [Send money §3](../05-features/05-send-money.md) |
| `gobank/src/shared/lib/amount-input.test.ts` | 🧪 3 amount tests | [Shared helpers](../06-frontend/03-shared-lib-hooks-and-trpc-client.md) |
| `gobank/src/shared/lib/savings-interest.ts` | compound interest | [GoalSave §2](../05-features/08-goalsave.md) |
| `gobank/src/shared/lib/savings-interest.test.ts` | 🧪 4 interest tests | [GoalSave §2](../05-features/08-goalsave.md) |
| `gobank/src/shared/lib/cn.ts` | join class names | [Shared helpers](../06-frontend/03-shared-lib-hooks-and-trpc-client.md) |
| `gobank/src/shared/hooks/use-debounced-value.ts` | 🌐 debounce a value | [Shared helpers](../06-frontend/03-shared-lib-hooks-and-trpc-client.md) |
| `gobank/src/shared/hooks/use-recipient-search.ts` | 🌐 recipient lookup | [Send money §4](../05-features/05-send-money.md) |
| `gobank/src/shared/hooks/use-spend-limit.ts` | 🌐 balance, limit, card checks | [Send money §5](../05-features/05-send-money.md) |
| `gobank/src/shared/ui/button.tsx` | buttons and `buttonClass` | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/back-button.tsx` | back link or button | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/page-header.tsx` | page title + back | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/section-header.tsx` | section title + "See all" | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/step-bar.tsx` | step progress bar | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/text-field.tsx` | 🌐 labeled input | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/pin-pad.tsx` | 🌐 PIN keypad | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/transaction-summary.tsx` | amount + details card | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/transaction-receipt.tsx` | 🌐 success screen | [Shared UI kit](../06-frontend/02-shared-ui-kit.md) |
| `gobank/src/shared/ui/money-form-ui.tsx` | send/request form parts | [Shared UI kit](../06-frontend/02-shared-ui-kit.md), [Send money §6](../05-features/05-send-money.md) |
| `gobank/src/shared/ui/screen.tsx` | page frame | [Pages and routing §1](../06-frontend/01-pages-and-routing.md) |
| `gobank/src/shared/ui/go-menu.tsx` | 🌐 GO shortcuts dialog | [Dashboard §5](../05-features/11-dashboard-and-navigation.md) |
| `gobank/src/shared/ui/go-menu.module.css` | GO menu animations | [Dashboard §5](../05-features/11-dashboard-and-navigation.md) |
| `gobank/src/shared/ui/pocket-art.tsx` | line icons | [Dashboard §6](../05-features/11-dashboard-and-navigation.md) |
| `gobank/src/shared/ui/gobank-logo.tsx` | logo (SVG) | [Dashboard §6](../05-features/11-dashboard-and-navigation.md) |
| `gobank/src/styles/globals.css` | Tailwind, theme tokens, animations | [Styling and accessibility §2](../06-frontend/04-styling-and-accessibility.md) |
