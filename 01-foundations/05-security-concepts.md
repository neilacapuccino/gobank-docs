# Security concepts

**What you will learn:** the security ideas GoBank relies on, explained from zero: hashing vs encryption, salts, slow hashes, timing attacks, AES-GCM, HMAC signatures, cookies and OAuth with PKCE. The [Security model](../08-security/01-security-model.md) page then maps each threat to the exact code that stops it.

---

## 1. Four different things people confuse

| | Encoding | Hashing | Encryption | Signing (HMAC) |
| --- | --- | --- | --- | --- |
| Reversible? | Yes, by anyone | **No** (one-way) | Yes, **only with the key** | The data is readable; the signature proves it was not changed |
| Needs a secret? | No | No (a salt is not secret) | Yes, the key | Yes, the key |
| Purpose | Represent bytes as text | Check a value without storing it | Hide a value you must read back later | Detect tampering |
| GoBank uses it for | base64url tokens, hex strings | **PINs** (scrypt), **session tokens** (SHA-256), registration-card tokens | **CVVs** (AES-256-GCM) | **Pending Google identity cookie** (HMAC-SHA256) |

> **Defense one-liner:** "We *hash* PINs because we only need to check them; we *encrypt* CVVs because the user needs to see them again; we *sign* the Google cookie because it must not be changed but does not need to be hidden."

---

## 2. Hashing PINs properly

### Why not store the PIN?

If the database leaks, every PIN leaks. Storing a **hash** means the database only holds a fingerprint. To check a PIN, hash what the user typed and compare fingerprints.

### Why not a plain SHA-256 hash?

1. **Speed is the enemy.** SHA-256 is designed to be fast: a GPU can try billions per second. A 6-digit PIN has only 1,000,000 possibilities, so a fast hash would be cracked instantly.
2. **Identical PINs give identical hashes.** Two users with PIN `246802` would have the same hash, and attackers can precompute tables of hashes for every PIN.

### The fix: salt + a slow, memory-hard hash (scrypt)

<!-- code: gobank/src/features/auth/pin.ts -->
**`gobank/src/features/auth/pin.ts`** · all 27 lines

```ts
 1 │ import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
 2 │ import { promisify } from "node:util";
 3 │
 4 │ const KEY_LENGTH = 64;
 5 │ const STORED_HASH = /^[a-f0-9]{32}:[a-f0-9]{128}$/i;
 6 │
 7 │ const deriveKey = promisify(scrypt) as (
 8 │   pin: string,
 9 │   salt: string,
10 │   length: number,
11 │ ) => Promise<Buffer>;
12 │
13 │ export async function hashPin(pin: string) {
14 │   const salt = randomBytes(16).toString("hex");
15 │   const key = await deriveKey(pin, salt, KEY_LENGTH);
16 │
17 │   return `${salt}:${key.toString("hex")}`;
18 │ }
19 │
20 │ export async function verifyPin(pin: string, stored: string) {
21 │   if (!STORED_HASH.test(stored)) return false;
22 │
23 │   const [salt = "", hash = ""] = stored.split(":");
24 │   const key = await deriveKey(pin, salt, KEY_LENGTH);
25 │
26 │   return timingSafeEqual(key, Buffer.from(hash, "hex"));
27 │ }
```
<!-- /code -->

| Line | What happens | Why |
| --- | --- | --- |
| 14 | `randomBytes(16)` creates a new random **salt** for every PIN | Same PIN, different hash for every user; precomputed tables are useless |
| 15 | `scrypt(pin, salt, 64)` derives a 64-byte key | scrypt is deliberately slow and uses lots of memory, so guessing is expensive even on GPUs |
| 17 | stored as `salt:key` in hex (32 + 1 + 128 = 161 characters) | The salt is needed to check later; it is not secret |
| 21 | reject anything not shaped like a stored hash | A corrupted hash can never accidentally match |
| 26 | `timingSafeEqual` compares the two keys | See timing attacks below |

> **Concept: timing attacks.** A normal comparison `a === b` stops at the first different byte, so comparing a *very wrong* guess is slightly faster than comparing an *almost right* one. By measuring response times, an attacker can learn a secret byte by byte. `timingSafeEqual` always takes the same time no matter where the bytes differ. GoBank uses it for PIN hashes and HMAC signatures.

> **Honest limit:** even with scrypt, 1,000,000 PINs can be brute-forced *offline* if an attacker steals the database. The main protection for a short PIN is **online**: 5 wrong attempts lock the account for 15 minutes ([Registration and sign-in](../05-features/01-registration-and-sign-in.md)), and the PIN rules refuse the most guessable PINs (`111111`, `123456`). Real banks add device binding and OTPs ([Limitations](../09-defense/03-limitations-and-future-work.md)).

---

## 3. Random tokens, stored hashed

When you sign in, the server creates a **session token**: 32 random bytes (256 bits) from a **CSPRNG** (`randomBytes`). Guessing it is impossible in practice. The browser keeps the token in a cookie; the database stores only `SHA-256(token)` as the session ID.

> **Why hash a random token?** If someone reads the `Session` table (a backup leak, an SQL console), they see only hashes, which cannot be turned back into valid cookies. A fast hash (SHA-256) is fine here because the token is 256 random bits; there is nothing to brute-force, unlike a 6-digit PIN.

The same trick protects the **registration card preview**: its database ID is `SHA-256(token)` and the token lives only in an `httpOnly` cookie (`card-preview.service.ts`).

---

## 4. Encrypting CVVs with AES-256-GCM

A CVV must be shown to its owner, so it cannot be hashed; it must be **encrypted** with a secret key that only the server knows (`CARD_ENCRYPTION_KEY`, 32 bytes written as 64 hex characters).

| Ingredient | GoBank's choice | Why |
| --- | --- | --- |
| Algorithm | **AES-256-GCM** | Industry standard; "GCM" also *authenticates*, so any tampering is detected |
| Key | 256-bit, from the environment, never in the code or database | Stealing the database alone does not reveal CVVs |
| Nonce | 12 random bytes, new for every encryption | Encrypting the same CVV twice gives different results; a nonce must never repeat with the same key |
| Auth tag | 16 bytes produced by GCM | Proves the ciphertext was not changed |
| AAD | `"GoBank card CVV:<card number>"` | Binds each encrypted CVV to its card; copying it to another card makes decryption fail |
| Format | `v1.<nonce>.<tag>.<ciphertext>` (hex) | The `v1` version prefix leaves room to change the format or rotate keys later |

A real stored value from the test database: `v1.c7dea387078507a591f5862a.d617377b3ac65ffff0bb3d1279eb4512.5f5501`, which is a 24-hex nonce, a 32-hex tag and a 6-hex ciphertext (3 bytes = 3 digits). Full walkthrough in [Cards](../05-features/04-cards.md).

---

## 5. Signing data with HMAC

After Google sign-in, GoBank must remember "this browser just proved it owns Google account X" for a few minutes, until the user enters their PIN. Storing that in a plain cookie would let anyone edit it to claim *another* Google account. So the cookie is **signed**:

```text
token = base64url(JSON { payload, expiresAt })  +  "."  +  base64url(HMAC-SHA256(body, AUTH_SECRET))
```

To read it, the server recomputes the HMAC with its secret and compares in constant time. Change one character of the payload and the signature no longer matches. This is the same idea as a JWT, implemented in 48 lines (`signed-token.ts`, tested in `signed-token.test.ts`).

---

## 6. Cookies and their safety flags

| Flag | Meaning | GoBank |
| --- | --- | --- |
| `httpOnly` | Page JavaScript cannot read the cookie | All cookies, so an XSS bug cannot steal the session token |
| `secure` | Only sent over HTTPS | On in production |
| `sameSite: "lax"` | Not sent on cross-site POSTs, sent on normal top-level link navigations | Session cookie, Google cookies (they must survive the redirect back from Google) |
| `sameSite: "strict"` | Never sent on cross-site requests | Registration-card cookie |
| `path` | Only sent under this path | The Google OAuth cookie only goes to `/api/auth/google…` |
| `maxAge` | Expires after N seconds | Card preview 30 min, Google OAuth 10 min, Google identity 15 min |
| no `maxAge` | A "session cookie", deleted when the browser closes | `gb_session` |

---

## 7. Web attacks and the general defenses

| Attack | What it is | General defense | In GoBank |
| --- | --- | --- | --- |
| **SQL injection** | Input that changes a SQL query | Parameterized queries | Prisma parameterizes everything, including `$queryRaw` tagged templates |
| **XSS** | Injected script runs in your page | Escape output; `httpOnly` cookies | React escapes all text; no raw HTML injection is used; cookies are `httpOnly` |
| **CSRF** | Another site makes your browser send a request | `SameSite` cookies, custom headers, `Origin` checks | All three ([Security model](../08-security/01-security-model.md)) |
| **IDOR** (insecure direct object reference) | Changing an ID in a request to see someone else's data | Always filter by the signed-in user | Every query includes `userId: ctx.userId`, for example receipts use the `(reference, userId)` key |
| **Brute force** | Trying every PIN | Rate limits, lockouts | 5 wrong PINs → 15-minute lock |
| **Race conditions** | Two requests at once break a rule | Atomic, locked updates | The ledger ([Prisma and PostgreSQL](04-prisma-and-postgresql.md)) |

---

## 8. OAuth 2.0, OpenID Connect and PKCE (Continue with Google)

**OAuth** lets a user prove their identity to GoBank *through Google* without giving GoBank their Google password.

```mermaid
sequenceDiagram
    participant B as Browser
    participant G as GoBank server
    participant Google
    B->>G: GET /api/auth/google
    G->>G: make random state and verifier; challenge = SHA256(verifier)
    G-->>B: set httpOnly cookie (state.verifier.mode) and redirect to Google with state + challenge
    B->>Google: user picks an account and consents
    Google-->>B: redirect to /api/auth/google/callback?code=…&state=…
    B->>G: callback (cookie comes along)
    G->>G: state in URL must equal state in cookie
    G->>Google: exchange code + verifier (+ client secret) for an access token
    Google->>Google: SHA256(verifier) must equal the challenge
    Google-->>G: access token
    G->>Google: GET userinfo
    Google-->>G: sub (Google user ID), email, email_verified, name
```

| Piece | Stops what |
| --- | --- |
| **`state`** | Login CSRF: an attacker cannot make your browser finish *their* sign-in, because the `state` in the URL must equal the one in your cookie. |
| **PKCE** (`code_verifier` / `code_challenge`) | A stolen `code` is useless without the verifier, which never left the server and the `httpOnly` cookie. |
| **`email_verified`** | Accounts with unverified emails are refused. |
| **`sub`** | Google's permanent user ID; GoBank stores it as `googleId`, because emails can change. |

GoBank never treats Google as enough by itself: after Google, the user must still enter the **PIN** ([Google sign-in](../05-features/02-google-sign-in.md)).

---

## Check yourself

<details>
<summary>Why can SHA-256 be used for session tokens but not for PINs?</summary>

A session token is 256 random bits; there is nothing to guess. A PIN has only a million possibilities, so its hash must be slow (scrypt) and salted to make guessing expensive.
</details>

<details>
<summary>What happens if someone copies the encrypted CVV of card A into card B's row?</summary>

Decryption fails, because the AAD (`GoBank card CVV:<number>`) is different, so GCM's authentication tag does not match. The user sees "Your card security details are temporarily unavailable."
</details>

<details>
<summary>What does PKCE protect against?</summary>

Someone who intercepts the authorization `code` cannot exchange it for a token without the secret `code_verifier`, which only the GoBank server (through its `httpOnly` cookie) knows.
</details>
