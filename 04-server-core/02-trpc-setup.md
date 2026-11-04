# tRPC setup: `trpc.ts`, `root.ts` and the two callers

**What you will learn:** how the API is assembled: how tRPC is initialized with SuperJSON and a safe error formatter, how our errors and database errors become clean API errors, how `protectedProcedure` checks the session and the browser tab, how the 13 feature routers are combined, and the difference between the HTTP caller (browser) and the direct caller (server components).

Background: [tRPC, Zod and React Query](../01-foundations/03-trpc-zod-and-react-query.md).

---

## 1. `src/server/trpc.ts`, line by line

<!-- code: gobank/src/server/trpc.ts -->
**`gobank/src/server/trpc.ts`** · all 82 lines

```ts
 1 │ import { initTRPC, TRPCError } from "@trpc/server";
 2 │ import superjson from "superjson";
 3 │ import { ZodError } from "zod";
 4 │ import { env } from "~/env";
 5 │ import { AppError, asDatabaseError, MESSAGES } from "~/server/errors";
 6 │ import { currentSession } from "~/server/session";
 7 │
 8 │ type Context = { browserSession?: { id: string | null } };
 9 │
10 │ const t = initTRPC.context<Context>().create({
11 │   transformer: superjson,
12 │
13 │   errorFormatter({ shape, error }) {
14 │     const hideDetails =
15 │       error.code === "INTERNAL_SERVER_ERROR" && env.NODE_ENV === "production";
16 │     const zodError =
17 │       error.cause instanceof ZodError ? error.cause.flatten() : null;
18 │
19 │     return {
20 │       ...shape,
21 │       message: hideDetails ? MESSAGES.unexpected : shape.message,
22 │       data: { ...shape.data, zodError },
23 │     };
24 │   },
25 │ });
26 │
27 │ function toTRPCError(cause: unknown) {
28 │   if (cause instanceof AppError) {
29 │     return new TRPCError({ code: cause.code, message: cause.message });
30 │   }
31 │
32 │   const database = asDatabaseError(cause);
33 │
34 │   if (database?.code === "P2002") {
35 │     const target = database.meta?.target;
36 │     const field = Array.isArray(target) ? String(target.at(-1)) : "value";
37 │
38 │     return new TRPCError({
39 │       code: "CONFLICT",
40 │       message: `That ${field} is already taken`,
41 │     });
42 │   }
43 │
44 │   if (database?.code === "P2025") {
45 │     return new TRPCError({ code: "NOT_FOUND", message: MESSAGES.notFound });
46 │   }
47 │
48 │   return null;
49 │ }
50 │
51 │ const friendlyErrors = t.middleware(async ({ next }) => {
52 │   const result = await next();
53 │   if (result.ok) return result;
54 │
55 │   const error = toTRPCError(result.error.cause);
56 │   if (error) throw error;
57 │
58 │   return result;
59 │ });
60 │
61 │ const requireSession = t.middleware(async ({ ctx, next }) => {
62 │   const session = await currentSession();
63 │   const otherTab =
64 │     ctx.browserSession !== undefined && ctx.browserSession.id !== session?.id;
65 │
66 │   if (!session || otherTab) {
67 │     throw new TRPCError({
68 │       code: "UNAUTHORIZED",
69 │       message: MESSAGES.signInRequired,
70 │     });
71 │   }
72 │
73 │   return next({ ctx: { userId: session.userId } });
74 │ });
75 │
76 │ export const createCallerFactory = t.createCallerFactory;
77 │
78 │ export const createTRPCRouter = t.router;
79 │
80 │ export const publicProcedure = t.procedure.use(friendlyErrors);
81 │
82 │ export const protectedProcedure = publicProcedure.use(requireSession);
```
<!-- /code -->

### Line 8: the context type

```ts
type Context = { browserSession?: { id: string | null } };
```

- From the browser (HTTP), the route handler always sets `browserSession` to the value of the `x-gb-session` header (`null` if missing).
- From server components (direct calls), the context is `{}`, so `browserSession` is `undefined`. The difference matters in `requireSession`.

### Lines 10–25: initialize tRPC

- **Line 11:** `transformer: superjson`, so `Date`, `BigInt` and friends survive the trip.
- **Lines 13–24: the error formatter** shapes every error before it is sent:
  - **Lines 14–15:** in **production**, an `INTERNAL_SERVER_ERROR` (an unexpected bug) has its message replaced by "Something went wrong. Please try again." Internal details such as SQL errors or stack hints never reach users or attackers.
  - **Lines 16–17:** if Zod rejected the input, attach `zodError` (flattened field errors), so the browser can show "Use the format 09XXXXXXXXX" next to the right field.

### Lines 27–49: `toTRPCError()`: translate known errors

| Cause | Becomes |
| --- | --- |
| our `AppError` (from `fail()`) | a `TRPCError` with the **same code and message** |
| Prisma `P2002` (unique constraint) | `CONFLICT` "That `<field>` is already taken". The field is the last name in `meta.target`; for a duplicate goal name the target is `["userId", "name"]`, so the message is "That name is already taken" (verified on a real database) |
| Prisma `P2025` (record not found) | `NOT_FOUND` "Not found" |
| anything else | `null`: left as an internal error (and hidden in production by the formatter) |

### Lines 51–59: the `friendlyErrors` middleware

The body of the middleware (lines 52–58 of the excerpt above), with explanatory comments added; the project's code itself has no comments:

```ts
const result = await next();         // run everything after this middleware
if (result.ok) return result;        // success: pass it through
const error = toTRPCError(result.error.cause);
if (error) throw error;              // known problem: send a clean error
return result;                       // unknown: keep the internal error
```

When a procedure throws, tRPC wraps the original error as the `cause` of a generic internal error. This middleware looks at that cause and, if it is one of ours, throws a clean replacement. Because it is attached to `publicProcedure` (line 80), **every** procedure gets it.

### Lines 61–74: the `requireSession` middleware

1. `currentSession()` (line 62) reads the `gb_session` cookie, hashes it, and loads the unexpired `Session` row ([Sessions](03-sessions.md)). It is wrapped in React's `cache`, so during one server render (for example the `(app)` layout plus the dashboard page plus its direct API call) the database lookup runs only once.
2. **Lines 63–64, the tab check.** If this call came over HTTP (`browserSession` is defined), the header's session ID must equal the cookie's session ID. Two attacks are stopped here:
   - a second tab that does not own the session cannot use it;
   - another website cannot call the API with your cookie, because a cross-site page cannot set the custom `x-gb-session` header without the server's permission (CORS), and it cannot read your session ID. This is a **CSRF defense**.
3. **Lines 66–71:** no session, or the wrong tab → `UNAUTHORIZED` "Sign in to continue".
4. **Line 73:** continue with `ctx.userId` set to the session's user. Every protected procedure receives it.

### Lines 76–82: the exports

| Export | Meaning |
| --- | --- |
| `createCallerFactory` | Makes a direct (no HTTP) caller; used in `root.ts` |
| `createTRPCRouter` | Defines a router (`t.router`) |
| `publicProcedure` | Anyone can call it; errors are made friendly |
| `protectedProcedure` | `publicProcedure` + `requireSession`; needs a signed-in session from the right tab |

> **Order of checks in a protected procedure:** `friendlyErrors` → `requireSession` → Zod input validation → your handler. A signed-out request is refused before its input is even parsed.

---

## 2. `src/server/root.ts`: the whole API in one object

<!-- code: gobank/src/server/root.ts -->
**`gobank/src/server/root.ts`** · all 34 lines

```ts
 1 │ import { accountRouter } from "~/features/account/account.router";
 2 │ import { activityRouter } from "~/features/activity/activity.router";
 3 │ import { authRouter } from "~/features/auth/auth.router";
 4 │ import { billsRouter } from "~/features/bills/bills.router";
 5 │ import { bitcoinRouter } from "~/features/bitcoin/bitcoin.router";
 6 │ import { cardRouter } from "~/features/card/card.router";
 7 │ import { depositRouter } from "~/features/deposit/deposit.router";
 8 │ import { loadRouter } from "~/features/load/load.router";
 9 │ import { notificationsRouter } from "~/features/notifications/notifications.router";
10 │ import { requestsRouter } from "~/features/requests/requests.router";
11 │ import { rewardsRouter } from "~/features/rewards/rewards.router";
12 │ import { goalsRouter } from "~/features/goals/goals.router";
13 │ import { transfersRouter } from "~/features/transfers/transfers.router";
14 │ import { createCallerFactory, createTRPCRouter } from "~/server/trpc";
15 │
16 │ export const appRouter = createTRPCRouter({
17 │   account: accountRouter,
18 │   activity: activityRouter,
19 │   auth: authRouter,
20 │   bills: billsRouter,
21 │   bitcoin: bitcoinRouter,
22 │   card: cardRouter,
23 │   deposit: depositRouter,
24 │   load: loadRouter,
25 │   notifications: notificationsRouter,
26 │   requests: requestsRouter,
27 │   rewards: rewardsRouter,
28 │   goals: goalsRouter,
29 │   transfers: transfersRouter,
30 │ });
31 │
32 │ export type AppRouter = typeof appRouter;
33 │
34 │ export const createCaller = createCallerFactory(appRouter);
```
<!-- /code -->

- **Lines 16–30:** each key becomes the first part of a procedure's path: `transfers.send`, `goals.move`, `card.revealCvv`…
- **Line 32:** `AppRouter` is the **type** of the whole API. The browser imports only this type (`import { type AppRouter }`), which is how it knows every procedure's input and output without receiving any server code.
- **Line 34:** `createCaller` makes a server-side caller.

The 40 procedures:

| Router | Procedures (P = public, all others protected) |
| --- | --- |
| `account` | `overview`, `spending`, `profile`, `updateProfile` |
| `activity` | `list`, `transaction` |
| `auth` | `prepareCard` (P), `usernameAvailable` (P), `register` (P), `signIn` (P), `signInWithGooglePin` (P), `signOut` (P), `changePin` |
| `bills` | `billers` (P), `pay` |
| `bitcoin` | `quote`, `chart`, `portfolio`, `trade` |
| `card` | `get`, `revealCvv`, `update` |
| `deposit` | `create` |
| `goals` | `list`, `get`, `create`, `update`, `move`, `remove` |
| `load` | `buy` |
| `notifications` | `list` |
| `requests` | `create`, `respond`, `cancel` |
| `rewards` | `summary`, `history`, `redeem` |
| `transfers` | `recent`, `recipient`, `send` |

The 7 public ones are exactly what a signed-out person needs: preview a card, check a username, register, sign in (normally or after Google), sign out, and see the biller list.

---

## 3. Two ways to call the API

### From the browser: over HTTP

`src/app/api/trpc/[trpc]/route.ts` connects tRPC to Next.js and builds the context from the `x-gb-session` header. It was walked through in [Life of a request](../02-architecture/02-request-lifecycle.md#step-3-nextjs-hands-the-request-to-trpc).

### From server components: a direct call

<!-- code: gobank/src/trpc/server.ts -->
**`gobank/src/trpc/server.ts`** · all 5 lines

```ts
1 │ import "server-only";
2 │
3 │ import { createCaller } from "~/server/root";
4 │
5 │ export const api = createCaller({});
```
<!-- /code -->

`api.account.overview()` here runs the procedure **as a function inside the server**: no HTTP, no serialization. It is used by the dashboard, settings, edit-profile and receipt pages so they render with data already filled in.

- The context is `{}`, so `requireSession` skips the tab check (there is no browser tab on the server). The **cookie check still runs**: the server reads the cookie of the page request, and the `(app)` layout has already verified it.
- `server-only` makes sure this caller can never be bundled into browser code.

---

## Defense questions

**Q: How does the server know who is calling?**
A: From the session, never from the request body. `requireSession` reads the httpOnly `gb_session` cookie, hashes it and finds the matching unexpired session in the database, then puts that session's `userId` into the context.

**Q: What does the user see if there is a bug on the server?**
A: In production, a generic "Something went wrong. Please try again." The real error is not exposed. Expected problems (insufficient balance, wrong PIN…) are thrown as `AppError`s and shown with their friendly message.

**Q: What is the `x-gb-session` header for?**
A: It ties each API call to the browser tab that owns the session. A different tab, or another website trying to use your cookie (CSRF), cannot send the matching header, so the call is refused.

---

## Check yourself

<details>
<summary>Why is <code>browserSession</code> optional in the context type?</summary>

Server components call procedures directly with an empty context; only HTTP calls have a browser tab and its header.
</details>

<details>
<summary>A procedure throws <code>fail("CONFLICT", MESSAGES.savingsChanged)</code>. What HTTP status and message does the browser get?</summary>

409 Conflict with "Your savings changed. Please try again.", produced by `friendlyErrors` → `toTRPCError`.
</details>
