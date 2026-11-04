# Feature catalog

**Every feature of GoBank Express, one page each**, all following the same template. Use this folder when you want to answer "Show me how feature X works", from the screen down to the database.

The [section 5 pages](../05-features/01-registration-and-sign-in.md) teach the features in depth as a story. This catalog is the **reference**: one feature per page, the same headings on every page, and every file location listed.

---

## The template every page follows

| Section | What you find there |
| --- | --- |
| **At a glance** | route, frontend files, API procedures, backend functions, database tables, tests |
| **What the user can do** | the feature from the user's point of view |
| **How it works** | numbered steps from the tap to the database and back |
| **Structure** | a diagram: Frontend → API → Backend → Database |
| **Files and locations** | every file involved, with its layer and role |
| **Frontend** | the screen code, with explanations |
| **Backend** | the router (API) and service code, with explanations |
| **Database** | the tables and columns read and written, example rows, rules |
| **The complicated parts, explained step by step** | the hardest code of the feature, traced line by line with example values |
| **Rules and limits** / **Messages** | every limit and every message the user can see, with where it comes from |
| **Tests** | which tests prove the feature works |

Every code block is copied from the source by `scripts/sync-code.mjs`, with real line numbers.

---

## All features

### A. Getting in

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 01 | [Welcome screen](01-welcome-screen.md) | `/` | none |
| 02 | [Registration (sign-up)](02-registration.md) | `/register` | `RegistrationCard`, `User`, `Card`, `Session` |
| 03 | [Sign-in and PIN lockout](03-sign-in-and-lockout.md) | `/signin` | `User`, `Session` |
| 04 | [Google sign-in and Google registration](04-google-sign-in.md) | `/api/auth/google…`, `/signin?google=pin`, `/register?google=new` | `User`, `Session` |
| 05 | [Link Google from Edit profile](05-link-google.md) | `/settings/profile` → popup → `/google-linked` | `User` |
| 06 | [Sessions and sign-out](06-sessions-and-sign-out.md) | every signed-in page, `/api/session` | `Session` |
| 07 | [Change PIN](07-change-pin.md) | `/settings/pin` | `User`, `Session` |

### B. Profile

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 08 | [Profile and settings screen](08-profile-screen.md) | `/settings` | `User` |
| 09 | [Edit profile (name and mobile)](09-edit-profile.md) | `/settings/profile` | `User` |
| 10 | [Profile photo](10-profile-photo.md) | `/settings/profile` | `User` |

### C. Home

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 11 | [Dashboard](11-dashboard.md) | `/dashboard` | `User`, `SavingsGoal`, `Transaction` |
| 12 | [GO menu (quick actions)](12-go-menu.md) | dashboard, GoalSave | none |

### D. Moving money

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 13 | [Deposit](13-deposit.md) | `/deposit` | `User`, `Transaction` |
| 14 | [Send money](14-send-money.md) | `/transfer` | `User`, `Card`, `Transaction` |
| 15 | [Request money](15-request-money.md) | `/request` | `MoneyRequest` |
| 16 | [Money-request inbox: pay, decline, cancel](16-request-inbox.md) | `/notifications` | `MoneyRequest`, `User`, `Card`, `Transaction` |
| 17 | [Pay bills](17-pay-bills.md) | `/bills` | `Biller`, `User`, `Card`, `Transaction` |
| 18 | [Buy load](18-buy-load.md) | `/load` | `User`, `Card`, `Transaction` |

### E. Cards

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 19 | [My card: view both cards](19-my-card.md) | `/card` | `Card`, `User` |
| 20 | [Show CVV](20-show-cvv.md) | `/card` | `Card` |
| 21 | [Lock and unlock a card](21-card-lock.md) | `/card` | `Card` |
| 22 | [Daily spending limit](22-daily-limit.md) | `/card` | `User`, `Transaction` |
| 23 | [Paying with a card ("Pay with" and receipts)](23-pay-with-card.md) | every payment | `Card`, `Transaction` |

### F. GoalSave

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 24 | [GoalSave overview](24-goalsave-overview.md) | `/goals` | `SavingsGoal` |
| 25 | [Create a goal](25-create-goal.md) | `/goals` | `SavingsGoal` |
| 26 | [Goal detail and tabs](26-goal-detail.md) | `/goals/<id>` | `SavingsGoal`, `Transaction` |
| 27 | [Move money in and out of a goal](27-goal-transfers.md) | `/goals/<id>` | `SavingsGoal`, `User`, `Transaction` |
| 28 | [Goal settings and closing a goal](28-goal-settings-and-close.md) | `/goals/<id>` | `SavingsGoal`, `User`, `Transaction` |
| 29 | [Savings interest (automatic)](29-savings-interest.md) | every GoalSave read | `SavingsGoal`, `Transaction` |

### G. Rewards

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 30 | [Earning points (automatic)](30-earning-points.md) | every transfer and bill | `User`, `Transaction` |
| 31 | [Rewards screen and converting points](31-rewards-and-convert.md) | `/rewards` | `User`, `Transaction` |
| 32 | [Rewards history](32-rewards-history.md) | `/rewards` | `Transaction` |

### H. History

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 33 | [Transaction history](33-transaction-history.md) | `/transactions` | `Transaction` |
| 34 | [Receipts](34-receipts.md) | `/transactions/<reference>` | `Transaction`, `Biller`, `SavingsGoal`, `User` |

### I. Bitcoin

| # | Feature | Route | Main tables |
| --- | --- | --- | --- |
| 35 | [Live Bitcoin price and market stats](35-bitcoin-price.md) | `/bitcoin` | none (external market data) |
| 36 | [Bitcoin price chart](36-bitcoin-chart.md) | `/bitcoin` | none (external market data) |
| 37 | [Bitcoin holdings and profit](37-bitcoin-holdings.md) | `/bitcoin` | `User`, `BitcoinTrade` |
| 38 | [Buying and selling Bitcoin](38-bitcoin-trading.md) | `/bitcoin` | `User`, `Transaction`, `BitcoinTrade` |
| 39 | [Bitcoin trade history](39-bitcoin-trade-history.md) | `/bitcoin` | `BitcoinTrade` |

### Shared systems used by every feature

| # | Page | What it covers |
| --- | --- | --- |
| 00 | [Shared systems](00-shared-systems.md) | the ledger, tRPC and the sign-in guard, sessions, errors, validation, the browser cache, pagination: one summary each, with where to read more |

---

## Nothing missed: every screen maps to a feature

| Route | File | Feature page(s) |
| --- | --- | --- |
| `/` | `gobank/src/app/page.tsx` | [01](01-welcome-screen.md), [04](04-google-sign-in.md) |
| `/register` | `gobank/src/app/(auth)/register/page.tsx` | [02](02-registration.md), [04](04-google-sign-in.md) |
| `/signin` | `gobank/src/app/(auth)/signin/page.tsx` | [03](03-sign-in-and-lockout.md), [04](04-google-sign-in.md) |
| `/google-linked` | `gobank/src/app/google-linked/page.tsx` | [05](05-link-google.md) |
| `/dashboard` | `gobank/src/app/(app)/dashboard/page.tsx` | [11](11-dashboard.md) |
| `/deposit` | `gobank/src/app/(app)/deposit/page.tsx` | [13](13-deposit.md) |
| `/transfer` | `gobank/src/app/(app)/transfer/page.tsx` | [14](14-send-money.md) |
| `/request` | `gobank/src/app/(app)/request/page.tsx` | [15](15-request-money.md) |
| `/notifications` | `gobank/src/app/(app)/notifications/page.tsx` | [16](16-request-inbox.md) |
| `/bills` | `gobank/src/app/(app)/bills/page.tsx` | [17](17-pay-bills.md) |
| `/load` | `gobank/src/app/(app)/load/page.tsx` | [18](18-buy-load.md) |
| `/card` | `gobank/src/app/(app)/card/page.tsx` | [19](19-my-card.md), [20](20-show-cvv.md), [21](21-card-lock.md), [22](22-daily-limit.md) |
| `/goals` | `gobank/src/app/(app)/goals/page.tsx` | [24](24-goalsave-overview.md), [25](25-create-goal.md) |
| `/goals/<id>` | `gobank/src/app/(app)/goals/[id]/page.tsx` | [26](26-goal-detail.md), [27](27-goal-transfers.md), [28](28-goal-settings-and-close.md) |
| `/rewards` | `gobank/src/app/(app)/rewards/page.tsx` | [31](31-rewards-and-convert.md), [32](32-rewards-history.md) |
| `/transactions` | `gobank/src/app/(app)/transactions/page.tsx` | [33](33-transaction-history.md) |
| `/transactions/<reference>` | `gobank/src/app/(app)/transactions/[reference]/page.tsx` | [34](34-receipts.md) |
| `/bitcoin` | `gobank/src/app/(app)/bitcoin/page.tsx` | [35](35-bitcoin-price.md)–[39](39-bitcoin-trade-history.md) |
| `/settings` | `gobank/src/app/(app)/settings/page.tsx` | [08](08-profile-screen.md) |
| `/settings/profile` | `gobank/src/app/(app)/settings/profile/page.tsx` | [09](09-edit-profile.md), [10](10-profile-photo.md), [05](05-link-google.md) |
| `/settings/pin` | `gobank/src/app/(app)/settings/pin/page.tsx` | [07](07-change-pin.md) |
| `/api/session` | `gobank/src/app/api/session/route.ts` | [06](06-sessions-and-sign-out.md) |
| `/api/auth/google`, `/api/auth/google/callback` | `gobank/src/app/api/auth/google/route.ts`, `…/callback/route.ts` | [04](04-google-sign-in.md), [05](05-link-google.md) |
| `/api/trpc/*` | `gobank/src/app/api/trpc/[trpc]/route.ts` | [00](00-shared-systems.md) (used by every feature) |

## Nothing missed: every API procedure maps to a feature

All 40 tRPC procedures. **P** = public (works signed out); the rest require a session.

| Procedure | Type | Used by feature(s) |
| --- | --- | --- |
| `account.overview` | query | [11 Dashboard](11-dashboard.md), [19 My card](19-my-card.md) |
| `account.spending` | query | [14](14-send-money.md), [16](16-request-inbox.md), [17](17-pay-bills.md), [18](18-buy-load.md), [22](22-daily-limit.md), [23](23-pay-with-card.md), [27](27-goal-transfers.md) |
| `account.profile` | query | [08](08-profile-screen.md), [09](09-edit-profile.md) |
| `account.updateProfile` | mutation | [09](09-edit-profile.md), [10](10-profile-photo.md) |
| `activity.list` | query | [33](33-transaction-history.md) |
| `activity.transaction` | query | [34](34-receipts.md) |
| `auth.prepareCard` (P) | mutation | [02](02-registration.md) |
| `auth.usernameAvailable` (P) | query | [02](02-registration.md) |
| `auth.register` (P) | mutation | [02](02-registration.md), [04](04-google-sign-in.md) |
| `auth.signIn` (P) | mutation | [03](03-sign-in-and-lockout.md) |
| `auth.signInWithGooglePin` (P) | mutation | [04](04-google-sign-in.md) |
| `auth.signOut` (P) | mutation | [06](06-sessions-and-sign-out.md) |
| `auth.changePin` | mutation | [07](07-change-pin.md) |
| `bills.billers` (P) | query | [17](17-pay-bills.md) |
| `bills.pay` | mutation | [17](17-pay-bills.md) |
| `bitcoin.quote` | query | [35](35-bitcoin-price.md) |
| `bitcoin.chart` | query | [36](36-bitcoin-chart.md) |
| `bitcoin.portfolio` | query | [37](37-bitcoin-holdings.md), [38](38-bitcoin-trading.md), [39](39-bitcoin-trade-history.md) |
| `bitcoin.trade` | mutation | [38](38-bitcoin-trading.md) |
| `card.get` | query | [19](19-my-card.md) |
| `card.revealCvv` | query | [20](20-show-cvv.md) |
| `card.update` | mutation | [21](21-card-lock.md), [22](22-daily-limit.md) |
| `deposit.create` | mutation | [13](13-deposit.md) |
| `goals.list` | query | [24](24-goalsave-overview.md), [29](29-savings-interest.md) |
| `goals.get` | query | [26](26-goal-detail.md), [29](29-savings-interest.md) |
| `goals.create` | mutation | [25](25-create-goal.md) |
| `goals.update` | mutation | [28](28-goal-settings-and-close.md) |
| `goals.move` | mutation | [27](27-goal-transfers.md) |
| `goals.remove` | mutation | [28](28-goal-settings-and-close.md) |
| `load.buy` | mutation | [18](18-buy-load.md) |
| `notifications.list` | query | [16](16-request-inbox.md) |
| `requests.create` | mutation | [15](15-request-money.md) |
| `requests.respond` | mutation | [16](16-request-inbox.md) |
| `requests.cancel` | mutation | [16](16-request-inbox.md) |
| `rewards.summary` | query | [31](31-rewards-and-convert.md) |
| `rewards.history` | query | [32](32-rewards-history.md) |
| `rewards.redeem` | mutation | [31](31-rewards-and-convert.md) |
| `transfers.recent` | query | [14](14-send-money.md) |
| `transfers.recipient` | query | [14](14-send-money.md), [15](15-request-money.md) |
| `transfers.send` | mutation | [14](14-send-money.md) |
