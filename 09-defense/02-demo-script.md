# Live demo script

**What this gives you:** a tested demo order of about 12–15 minutes, what to click, what to say at each step (with the code to mention if asked), a setup checklist, and a plan for everything that can go wrong. Rehearse it at least twice with the same database you will use on the day.

---

## 1. The day before

| Check | How |
| --- | --- |
| Everything passes | in `gobank/`: `npm run check:ci` (format, lint, typecheck, unit tests, build) and `npm run test:integration` against your **test** database. Screenshot both results as evidence |
| A clean, seeded database | `npm run db:migrate` then `npm run db:seed`. `@maricel` and `@dante` start with ₱5,000.00 each, PIN `135790` |
| The card key matches the data | `CARD_ENCRYPTION_KEY` in `.env` must be the key used when the demo cards were created, or "Show CVV" fails ("temporarily unavailable") |
| Google sign-in | either configured (client ID, secret, `AUTH_SECRET`, redirect `http://localhost:3001/api/auth/google/callback`) or left empty so the button is hidden. Never demo a half-configured Google |
| Internet | Bitcoin needs Binance and Frankfurter. Test on the venue's network if possible |
| Two browsers | e.g. Chrome for Maricel and Edge (or a Chrome **Incognito** window) for Dante. A second *tab* in the same browser signs the first one out |
| A throwaway account for risky demos | register e.g. `@demo_lock` for the PIN-lockout demo, so a demo account never gets locked |
| Backup | a screen recording of the full demo, and screenshots of key screens |

## 2. Thirty minutes before

1. Start the app (`npm run dev`) and **open it once**: Neon's free database sleeps when idle, and the first request can fail with `P1001` while it wakes.
2. Sign in as `@maricel` in browser A and `@dante` in browser B.
3. Use a phone-sized view: the browser's device toolbar (F12 → toggle device, e.g. Pixel 7), or a narrow window. Zoom in for the projector (zoom is allowed).
4. Close other apps' notifications.
5. Open `gobank/src/server/ledger.ts` in your editor, ready to show `post()` and `spend()`.

---

## 3. The demo, step by step

### Step 1. Welcome (30 s)
- **Show:** Gobi the mascot, "Send, save and earn in one app", Create account / Log in / Continue with Google.
- **Say:** "GoBank Express is a mobile-first digital bank for students. Everything you will see is stored in PostgreSQL, and every peso moves through one locked ledger."

### Step 2. Registration (2 min; skip if short on time)
- **Click:** Create account. Type `admin` → "This name is reserved". Type a new username → green check after a short pause.
- **Say:** "Usernames are checked live, but only after typing pauses (debounced), and the server checks again when the account is created."
- **PIN:** try `123456` → "Avoid sequences like 123456". Enter a valid PIN twice.
- **Card:** choose a network (Visa / Mastercard / JCB / Discover) → Continue ("Preparing card…").
- **Say:** "The server generates a real-format card number with a Luhn check digit and an AES-encrypted CVV, before the account exists, so the review shows the exact card you will get."
- **Details:** full name; mobile optional.
- **Review:** show the card number; tap the eye next to CVV and PIN; tick the terms → **Create my account** → dashboard.
- *If asked:* `card-preview.service.ts`, `auth.service.ts → createRegisteredAccount`, [Registration](../05-features/01-registration-and-sign-in.md).

### Step 3. Dashboard tour (45 s) — as `@maricel`
- **Show:** the balance (tap the eye to hide), copy the account number, the points, quick actions, GoalSave/Bitcoin cards, recent transactions, the **GO** menu.
- **Say:** "The dashboard is rendered on the server with one database call, so there is no loading spinner."

### Step 4. Send money (2 min)
- **Click:** Send money → type `@dante` → Continue.
- **Amount:** type `9999` → "Insufficient balance. You have ₱5,000.00" and Review is disabled. Change it to `150`, add a note.
- **Review:** show **Pay with** (physical / virtual) → **Send ₱150.00**.
- **Receipt:** reference, date, new balance, "Paid with Physical · … •••• 1234".
- **Say:** "On the server this is one database transaction: both accounts are locked, the card and the daily limit are checked, my balance drops only if it is enough, Dante is credited, and two history rows share this reference. We tested 20 simultaneous transfers: no overdraft, no money created or lost."
- *Show the code if asked:* `ledger.ts` → `transfer()` (lines 171–210) and `post()` (lines 80–115).

### Step 5. History and receipt (30 s)
- **Click:** **See all** next to "Recent transactions" → filter **Outgoing** → open the transfer receipt. (The bell icon is the money-request inbox, used in step 6.)
- **Say:** "Receipts are looked up by reference *and* my user ID, so nobody can open someone else's receipt."

### Step 6. Request money between two users (2 min)
- **Browser A (Maricel):** Request → `@dante` → ₱200 → Request.
- **Browser B (Dante):** bell → **Received** → the request → **Pay** → choose a card → **Confirm payment**.
- **Browser A:** bell → **Sent** → status **paid** → **View receipt**.
- **Say:** "Accepting atomically changes the request from pending to paid and runs a normal transfer in the same transaction. A request can never be paid twice."

### Step 7. Cards: lock and limit (1.5 min)
- **Click:** My card → show physical and virtual (different networks) → **Show CVV**.
- **Say:** "The CVV is encrypted with AES-256-GCM; it is decrypted only now, on request, and never cached."
- **Lock** the physical card (it blurs: "Card locked") → go to Pay bills → at review, **Pay with** shows the physical card as Locked → pay with the virtual card.
- *Optional:* set the daily limit to ₱0 → try buying load → the form shows "Over your daily limit. ₱0.00 left today" and Review stays disabled (if the browser check were bypassed, the server would refuse with "This goes over your daily limit") → set it back to ₱20,000.
- **Unlock** the physical card afterwards.

### Step 8. Bills and load (1 min)
- **Pay bills:** Electric → Meralco → account number `12345678` → ₱100 → review → pay → receipt with **Points earned +2**.
- **Buy load:** your number → preset ₱50 → buy.
- **Say:** "Bills earn 1 point per ₱50; load counts toward the daily limit but earns no points."

### Step 9. GoalSave (1.5 min)
- **Click:** GoalSave → New goal → name `Laptop` → target ₱30,000 → pick an icon → Create.
- **Transfer in** ₱1,000 → the progress ring moves.
- **Say:** "Goals earn 4% a year, compounded daily: ₱1,000 becomes ₱1,040.80 after a year. Interest is settled whenever the goal is opened, for the exact time elapsed; the fraction of a centavo is carried so nothing is lost and nothing is paid twice."
- **Show:** the Overview and Transactions tabs.

### Step 10. Rewards (30 s)
- **Show:** the points from the transfer and bill, the progress bar ("N pts more to convert to cash") and the history linking to receipts.
- **Say:** "100 points convert to ₱1.00, in one atomic ledger entry."

### Step 11. Bitcoin (1.5 min)
- **Show:** the status dot (**Live**), the price, the chart (switch 1 hr → 1 wk, line ↔ candles, hover a candle).
- **Buy** ₱100 → **Review buy** (value, ₱10 fee, total) → **Confirm buy** → the holdings and trade history update.
- **Say:** "Prices are real, from Binance and the Frankfurter PHP rate. Trades are simulated but use our ledger: exact BigInt satoshis, rounding in the bank's favor, a Serializable transaction, and an idempotency key so a double click never trades twice."

### Step 12. Security finale (1 min, do it last)
- **One session per tab:** copy the URL into a **new tab** → it signs out → the first tab is signed out too. "A session belongs to one tab, like many banking apps."
- **Lockout (throwaway account only):** five wrong PINs → "Too many wrong PINs. Try again in 15 minutes."
- *Optional:* show `ledger.ts` and the test results screenshot.

---

## 4. If something goes wrong

| Problem | What to do and say |
| --- | --- |
| `P1001: Can't reach database server` | Neon is waking up; reload in a few seconds. "Our database is serverless and sleeps when idle." |
| Bitcoin shows "Feed offline" | No internet or the market API is blocked. Show the graceful state: "Trading pauses automatically without a fresh price; the rest of the bank is unaffected." |
| "Your card security details are temporarily unavailable" | `CARD_ENCRYPTION_KEY` differs from the key used to seed. Use the right `.env`, or reseed a fresh database with the current key |
| Signed out unexpectedly | You opened a second tab, or the tab was hidden for 30 minutes. Sign in again; explain the rule |
| An account is locked | Wait 15 minutes or switch to the other demo account; this is the lockout working |
| Google button missing | Google is not configured, which is intended; continue with username + PIN |
| A mistake mid-demo | Say what you expected, then show the matching error message: the error handling is part of the demo |

---

## 5. Numbers to keep in mind during the demo

| After | Maricel's balance | Points |
| --- | --- | --- |
| fresh seed | ₱5,000.00 | 0 |
| send ₱150 to Dante | ₱4,850.00 | 3 |
| Dante pays her ₱200 request | ₱5,050.00 | 3 |
| pay a ₱100 bill | ₱4,950.00 | 5 |
| buy ₱50 load | ₱4,900.00 | 5 |
| move ₱1,000 into GoalSave | ₱3,900.00 | 5 |
| buy ₱100 of Bitcoin (+ ₱10 fee) | about ₱3,790.00: only whole satoshis are bought, so the cost can be a few centavos under ₱100 (at ₱6,500,000 per BTC it is ₱99.97, leaving ₱3,790.03) | 5 |

If your numbers differ, you probably skipped or repeated a step; the history screen shows exactly what happened.
