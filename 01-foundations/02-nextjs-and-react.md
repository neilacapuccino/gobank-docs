# Next.js and React

**What you will learn:** how React builds screens out of components, how Next.js turns folders into URLs, and, most importantly, **which code runs on the server and which runs in the browser**. Panels often ask this.

---

## 1. React in five ideas

### 1. A component is a function that returns UI

<!-- code: gobank/src/shared/ui/page-header.tsx -->
**`gobank/src/shared/ui/page-header.tsx`** · all 10 lines

```tsx
 1 │ import { BackButton } from "./back-button";
 2 │
 3 │ export function PageHeader({ title, back }: { title: string; back: string }) {
 4 │   return (
 5 │     <header className="relative flex h-10 items-center justify-center">
 6 │       <BackButton href={back} className="absolute left-0" />
 7 │       <h1 className="text-ink text-[15px] font-semibold">{title}</h1>
 8 │     </header>
 9 │   );
10 │ }
```
<!-- /code -->

`PageHeader` receives **props** (`title`, `back`) and returns **JSX**, HTML-like syntax that React turns into real page elements. `<BackButton href={back} />` uses another component, which is how screens are assembled from small parts.

### 2. State makes a component remember things

```tsx
const [amount, setAmount] = useState("");
```

`useState` returns the current value and a function to change it. Calling `setAmount("50")` re-renders the component with the new value. Every form in GoBank keeps what the user typed in state.

### 3. Effects run code after rendering

`useEffect(() => { … return cleanup }, [dependencies])` runs after the screen updates, for example to start a timer, open a WebSocket or listen to the keyboard. The returned function cleans up (stops the timer) when the component disappears or the dependencies change. Example: the PIN pad listens for physical keyboard digits:

<!-- code: gobank/src/shared/ui/pin-pad.tsx 24-44 -->
**`gobank/src/shared/ui/pin-pad.tsx`** · lines 24–44

```tsx
24 │ function usePinKeyboard(
25 │   onDigit: (digit: string) => void,
26 │   onDelete: () => void,
27 │ ) {
28 │   useEffect(() => {
29 │     function handleKey(event: KeyboardEvent) {
30 │       if (/^\d$/.test(event.key)) {
31 │         event.preventDefault();
32 │         onDigit(event.key);
33 │       }
34 │
35 │       if (event.key === "Backspace") {
36 │         event.preventDefault();
37 │         onDelete();
38 │       }
39 │     }
40 │
41 │     window.addEventListener("keydown", handleKey);
42 │     return () => window.removeEventListener("keydown", handleKey);
43 │   }, [onDigit, onDelete]);
44 │ }
```
<!-- /code -->

### 4. Refs remember a value without re-rendering

`useRef` holds a mutable value (`ref.current`) that survives re-renders but does not cause one. GoBank uses it for DOM elements (`<dialog ref={dialog}>`) and for "is this the latest request?" counters (`latestRequest` in `use-card-secrets.ts`).

### 5. Custom hooks package behavior

A function named `useSomething` that calls other hooks is a **custom hook**. GoBank has several: `useSpendLimit` (balance and card checks), `useRecipientSearch` (debounced lookup), `useBitcoinFeed` (live prices), `useGoalIcon` (saved icon per goal). Screens stay small because the logic lives in hooks.

> **Concept: controlled inputs.** Inputs in GoBank are *controlled*: `value={amount}` comes from state and `onChange` decides whether to accept the new text. That is how the amount boxes refuse letters and a third decimal place:
> ```tsx
> onChange={(event) => {
>   if (isPesoInput(event.target.value)) setAmount(event.target.value);
> }}
> ```

---

## 2. Next.js App Router: folders become URLs

Inside `gobank/src/app`, every folder with a `page.tsx` is a page:

| File | URL |
| --- | --- |
| `src/app/page.tsx` | `/` (welcome screen) |
| `src/app/(auth)/signin/page.tsx` | `/signin` |
| `src/app/(app)/transfer/page.tsx` | `/transfer` |
| `src/app/(app)/goals/[id]/page.tsx` | `/goals/abc123` (`[id]` is a **dynamic segment**) |
| `src/app/(app)/transactions/[reference]/page.tsx` | `/transactions/GB7KQ2M9XA` |
| `src/app/api/session/route.ts` | `POST /api/session` (an API endpoint, not a page) |

Special files:

| File | Purpose |
| --- | --- |
| `layout.tsx` | Wraps every page below it and **stays mounted** while you move between those pages. |
| `template.tsx` | Like a layout but **re-created on every navigation**, so its entrance animation plays each time. |
| `route.ts` | An HTTP endpoint (`GET`, `POST` functions) instead of a page. |
| `(name)` folders | **Route groups**: they share a layout but do not appear in the URL. `(app)` holds signed-in pages, `(auth)` holds sign-in pages. |

The full map is in [Pages and routing](../06-frontend/01-pages-and-routing.md).

---

## 3. Server components vs client components (the key distinction)

| | Server component | Client component |
| --- | --- | --- |
| Marked by | nothing (the default) | `"use client"` on the first line |
| Runs | only on the server | on the server for the first HTML, then in the browser |
| Can | read cookies, call the database or services directly, `await` data | use `useState`, `useEffect`, click handlers, browser APIs |
| Cannot | use state, effects or event handlers | import server-only code (database, secrets) |
| Examples in GoBank | `app/(app)/layout.tsx`, `dashboard/page.tsx`, `receipt-screen.tsx`, `profile-screen.tsx` | `transfer-form.tsx`, `pin-pad.tsx`, `session-guard.tsx`, `balance-card.tsx` |

### A server component that protects every signed-in page

<!-- code: gobank/src/app/(app)/layout.tsx -->
**`gobank/src/app/(app)/layout.tsx`** · all 15 lines

```tsx
 1 │ import { redirect } from "next/navigation";
 2 │ import type { ReactNode } from "react";
 3 │ import { Screen } from "~/shared/ui/screen";
 4 │ import { currentSession } from "~/server/session";
 5 │ import { SessionGuard } from "~/features/auth/components/session-guard";
 6 │
 7 │ export default async function AppLayout({ children }: { children: ReactNode }) {
 8 │   const session = await currentSession();
 9 │   if (!session) redirect("/signin");
10 │   return (
11 │     <Screen>
12 │       <SessionGuard sessionId={session.id}>{children}</SessionGuard>
13 │     </Screen>
14 │   );
15 │ }
```
<!-- /code -->

- It is `async` and runs on the server, so it can call `currentSession()`, which reads the `gb_session` cookie and looks it up in the database.
- No session? `redirect("/signin")` sends the browser to the sign-in page **before any signed-in HTML is produced**. A signed-out user never sees a flash of the dashboard.
- With a session, it renders `SessionGuard`, a *client* component that keeps the session alive in the browser ([Sessions](../04-server-core/03-sessions.md)).

### A server component that loads data with no loading spinner

<!-- code: gobank/src/app/(app)/dashboard/page.tsx -->
**`gobank/src/app/(app)/dashboard/page.tsx`** · all 11 lines

```tsx
 1 │ import type { Metadata } from "next";
 2 │ import { DashboardScreen } from "~/features/dashboard/components/dashboard-screen";
 3 │ import { api } from "~/trpc/server";
 4 │
 5 │ export const metadata: Metadata = {
 6 │   title: "Home",
 7 │ };
 8 │
 9 │ export default async function DashboardPage() {
10 │   return <DashboardScreen account={await api.account.overview()} />;
11 │ }
```
<!-- /code -->

`api` here is the **server-side tRPC caller** (`src/trpc/server.ts`): it calls the `account.overview` procedure as a normal function, without HTTP. The dashboard arrives in the browser already filled with the balance and recent transactions.

### Next.js 15 details you will see

- `params` and `searchParams` are **Promises** in Next.js 15, so pages write `const { id } = await params;`.
- `cookies()` is async too: `const store = await cookies();`.
- `redirect()` and `notFound()` stop rendering and send the browser elsewhere (the receipt page calls `notFound()` for someone else's reference, which shows a 404).
- `export const metadata = { title: "Send money" }` sets the browser tab title; the root layout adds " · GoBank Express".

---

## 4. Navigation and refresh in client components

<!-- code: gobank/src/features/transfers/components/transfer-form.tsx 113-116 -->
**`gobank/src/features/transfers/components/transfer-form.tsx`** · lines 113–116

```tsx
113 │   const finish = () => {
114 │     router.push("/dashboard");
115 │     router.refresh();
116 │   };
```
<!-- /code -->

- `router.push("/dashboard")` navigates without a full page reload.
- `router.refresh()` asks the server to re-render server components, so the dashboard shows the new balance.
- `router.replace(...)` is like `push` but replaces the history entry (used after sign-in so "Back" does not return to the PIN screen).

---

## 5. The root layout

<!-- code: gobank/src/app/layout.tsx -->
**`gobank/src/app/layout.tsx`** · all 39 lines

```tsx
 1 │ import "~/styles/globals.css";
 2 │
 3 │ import { type Metadata, type Viewport } from "next";
 4 │ import { Geist } from "next/font/google";
 5 │
 6 │ import { TRPCReactProvider } from "~/trpc/react";
 7 │
 8 │ export const metadata: Metadata = {
 9 │   title: {
10 │     default: "GoBank Express",
11 │     template: "%s · GoBank Express",
12 │   },
13 │   description:
14 │     "A student-friendly digital banking application with goal-based savings, instant transfers and rewards.",
15 │   icons: [{ rel: "icon", url: "/favicon.ico" }],
16 │ };
17 │
18 │ export const viewport: Viewport = {
19 │   themeColor: "#101012",
20 │   width: "device-width",
21 │   initialScale: 1,
22 │ };
23 │
24 │ const geist = Geist({
25 │   subsets: ["latin"],
26 │   variable: "--font-geist-sans",
27 │ });
28 │
29 │ export default function RootLayout({
30 │   children,
31 │ }: Readonly<{ children: React.ReactNode }>) {
32 │   return (
33 │     <html lang="en" className={`${geist.variable}`}>
34 │       <body className="bg-surface text-ink overflow-x-clip font-sans antialiased">
35 │         <TRPCReactProvider>{children}</TRPCReactProvider>
36 │       </body>
37 │     </html>
38 │   );
39 │ }
```
<!-- /code -->

- Line 1 loads the global stylesheet (Tailwind and the theme colors).
- Lines 8–16: default and template page titles and the favicon.
- Lines 18–22: `themeColor` colors the phone's browser bar; `width: "device-width"` and `initialScale: 1` make the page fit phones. Zoom is **not** disabled (good for accessibility; see commit `63df5f1`).
- Lines 24–27: the Geist font, loaded by Next.js and exposed as a CSS variable.
- Line 35: `TRPCReactProvider` wraps the whole app so every client component can call the API ([tRPC, Zod and React Query](03-trpc-zod-and-react-query.md)).

---

## Defense questions

**Q: What is the difference between a server and a client component?**
A: Server components run only on the server. They can read cookies and call the database or services directly and they send ready HTML. Client components (marked `"use client"`) also run in the browser and handle interaction: typing, clicking, timers. GoBank checks the session and loads the dashboard in server components and uses client components for forms and live data.

**Q: How do you stop a signed-out user from opening `/dashboard`?**
A: Every signed-in page lives in the `(app)` route group, whose layout runs on the server and calls `currentSession()`. If there is no valid session it redirects to `/signin` before rendering anything. Separately, every API call that needs an account uses `protectedProcedure`, which checks the session again. So even a direct API call without the page is refused.

**Q: Why Next.js?**
A: One TypeScript project contains the screens, the API and the server logic. It supports server rendering (fast first load and secure data access) and file-based routing, and it deploys easily to Vercel.

---

## Check yourself

<details>
<summary>Which file decides that <code>/settings/pin</code> requires sign-in?</summary>

`src/app/(app)/layout.tsx`, because `settings/pin/page.tsx` sits inside the `(app)` route group.
</details>

<details>
<summary>Why does <code>template.tsx</code> exist when there is already a root <code>layout.tsx</code>?</summary>

A layout stays mounted between pages; a template is re-created on every navigation, so the `animate-page-in` slide-in animation runs on every page change.
</details>
