# Dashboard and navigation

**What you will learn:** how the home screen is built and loaded (on the server, with one Prisma call), the balance card's hide and copy features, the quick actions and feature cards, and the floating **GO** menu: a native modal dialog with an animated "unfold" opening, keyboard support and reduced-motion support.

| Layer | Files |
| --- | --- |
| Page | `src/app/(app)/dashboard/page.tsx` (`/dashboard`) |
| Screen | `src/features/dashboard/components/dashboard-screen.tsx`, `balance-card.tsx`, `quick-actions.tsx`, `feature-grid.tsx` |
| Navigation and art | `src/shared/ui/go-menu.tsx` (+ `go-menu.module.css`), `src/shared/ui/pocket-art.tsx`, `src/shared/ui/gobank-logo.tsx` |
| Data | `account.overview` ([Account and profile](03-account-and-profile.md#getoverview-lines-927-everything-the-dashboard-needs-in-one-call)), recent activity ([Transactions](10-transactions-and-receipts.md)) |

---

## 1. Loading: no spinner on the home screen

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

The page is a **server component**. It calls `account.overview` directly on the server (no HTTP) and passes the result to `DashboardScreen`, so the HTML arrives with the balance, points, goal count and last 5 transactions already filled in. After a payment, screens call `router.refresh()`, which re-runs this on the server with fresh numbers.

---

## 2. The layout: `dashboard-screen.tsx`

<!-- code: gobank/src/features/dashboard/components/dashboard-screen.tsx -->
**`gobank/src/features/dashboard/components/dashboard-screen.tsx`** · all 96 lines

```tsx
 1 │ import { Bell } from "lucide-react";
 2 │ import Image from "next/image";
 3 │ import Link from "next/link";
 4 │ import { MAX_GOALS } from "~/shared/lib/money";
 5 │ import { GoBankLogo } from "~/shared/ui/gobank-logo";
 6 │ import { GoMenu } from "~/shared/ui/go-menu";
 7 │ import { PocketIcon } from "~/shared/ui/pocket-art";
 8 │ import type { RouterOutputs } from "~/trpc/react";
 9 │ import { RecentActivity } from "~/features/activity/components/recent-activity";
10 │ import { BalanceCard } from "./balance-card";
11 │ import { FeatureGrid } from "./feature-grid";
12 │ import { QuickActions } from "./quick-actions";
13 │
14 │ type Overview = RouterOutputs["account"]["overview"];
15 │
16 │ const HEADER_LINK =
17 │   "text-ink grid h-11 w-11 place-items-center transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4";
18 │
19 │ function ProfilePicture({ photo }: { photo: string | null }) {
20 │   if (!photo) {
21 │     return (
22 │       <PocketIcon
23 │         name="profile"
24 │         width={24}
25 │         height={24}
26 │         fill="currentColor"
27 │         stroke="none"
28 │       />
29 │     );
30 │   }
31 │
32 │   return (
33 │     <Image
34 │       src={photo}
35 │       alt="Your profile photo"
36 │       width={36}
37 │       height={36}
38 │       unoptimized
39 │       className="h-9 w-9 rounded-full object-cover"
40 │     />
41 │   );
42 │ }
43 │
44 │ function DashboardHeader({ photo }: { photo: string | null }) {
45 │   return (
46 │     <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
47 │       <Link
48 │         href="/settings"
49 │         aria-label="Profile and settings"
50 │         className={HEADER_LINK}
51 │       >
52 │         <ProfilePicture photo={photo} />
53 │       </Link>
54 │
55 │       <h1 className="text-ink min-w-0">
56 │         <GoBankLogo className="mx-auto h-[46px] w-[126px] max-w-full" />
57 │       </h1>
58 │
59 │       <Link
60 │         href="/notifications"
61 │         aria-label="Notifications"
62 │         className={HEADER_LINK}
63 │       >
64 │         <Bell size={24} fill="currentColor" strokeWidth={1.8} aria-hidden />
65 │       </Link>
66 │     </header>
67 │   );
68 │ }
69 │
70 │ export function DashboardScreen({ account }: { account: Overview }) {
71 │   return (
72 │     <div className="bg-surface-sunken -mx-6 -mt-8 -mb-10 flex flex-1 flex-col gap-6 px-5 pt-7 pb-28">
73 │       <DashboardHeader photo={account.profilePhoto} />
74 │
75 │       <BalanceCard
76 │         balance={account.balance}
77 │         accountNumber={account.accountNumber}
78 │         points={account.points}
79 │       />
80 │
81 │       <QuickActions />
82 │
83 │       <FeatureGrid
84 │         points={account.points}
85 │         goalCount={account._count.savingsGoals}
86 │         goalLimit={MAX_GOALS}
87 │       />
88 │
89 │       <div className="border-line bg-surface rounded-[24px] border p-4 shadow-[0_6px_20px_-10px_#00000080]">
90 │         <RecentActivity entries={account.transactions} />
91 │       </div>
92 │
93 │       <GoMenu />
94 │     </div>
95 │   );
96 │ }
```
<!-- /code -->

```text
┌──────────────────────────────┐
│ (photo)    GoBank      (bell)│  DashboardHeader
│ ┌──────────────────────────┐ │
│ │ Available balance        │ │  BalanceCard
│ │ ₱5,000.00          (eye) │ │
│ │ 2004 2640 684 ⧉  0 points│ │
│ └──────────────────────────┘ │
│  [Send money] [Deposit] [Request]  QuickActions
│ ┌──────────────────────────┐ │
│ │ GoRewards · 0 points   → │ │  FeatureGrid
│ │ GoalSave · 4% p.a.     → │ │
│ │ Bitcoin · Live price   → │ │
│ │ [Buy load]  [Pay bills]  │ │
│ │ My card                → │ │
│ └──────────────────────────┘ │
│ Recent transactions  See all │  RecentActivity
│            ( GO )            │  GoMenu (floating)
└──────────────────────────────┘
```

| Lines | Part |
| --- | --- |
| 19–42 | the profile picture (the stored photo, or a generic profile icon) |
| 44–68 | the header: profile link (`/settings`, labelled "Profile and settings"), the GoBank logo as the page's `<h1>`, and the bell (`/notifications`, labelled "Notifications") |
| 70–96 | the page: balance card, quick actions, feature grid, recent transactions and the GO menu |

Line 72 uses **negative margins** (`-mx-6 -mt-8 -mb-10`) so the darker dashboard background reaches the edges of the shared `Screen` frame, and `pb-28` leaves room at the bottom for the floating GO button.

---

## 3. The balance card: `balance-card.tsx`

<!-- code: gobank/src/features/dashboard/components/balance-card.tsx -->
**`gobank/src/features/dashboard/components/balance-card.tsx`** · all 126 lines

```tsx
  1 │ "use client";
  2 │
  3 │ import { Check, Copy, Eye, EyeOff } from "lucide-react";
  4 │ import { useEffect, useState } from "react";
  5 │ import { formatAccount, peso } from "~/shared/lib/format";
  6 │
  7 │ type CopyStatus = "idle" | "copied" | "error";
  8 │
  9 │ const COPIED_RESET_MS = 2000;
 10 │
 11 │ const COPY_MESSAGE: Record<CopyStatus, string> = {
 12 │   idle: "",
 13 │   copied: "Account number copied.",
 14 │   error: "Couldn't copy. Select the account number to copy it.",
 15 │ };
 16 │
 17 │ function HiddenBalance() {
 18 │   return (
 19 │     <span
 20 │       role="img"
 21 │       aria-label="Balance hidden"
 22 │       className="inline-flex items-center gap-2 leading-none"
 23 │     >
 24 │       <span className="block" aria-hidden>
 25 │         ₱
 26 │       </span>
 27 │       <span className="flex items-center gap-2" aria-hidden>
 28 │         {Array.from({ length: 6 }, (_, index) => (
 29 │           <span
 30 │             key={index}
 31 │             className="h-[7px] w-[7px] shrink-0 rounded-full bg-current"
 32 │           />
 33 │         ))}
 34 │       </span>
 35 │     </span>
 36 │   );
 37 │ }
 38 │
 39 │ export function BalanceCard({
 40 │   balance,
 41 │   accountNumber,
 42 │   points,
 43 │ }: {
 44 │   balance: number;
 45 │   accountNumber: string;
 46 │   points: number;
 47 │ }) {
 48 │   const [visible, setVisible] = useState(true);
 49 │   const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
 50 │
 51 │   useEffect(() => {
 52 │     if (copyStatus !== "copied") return;
 53 │
 54 │     const timer = setTimeout(() => setCopyStatus("idle"), COPIED_RESET_MS);
 55 │     return () => clearTimeout(timer);
 56 │   }, [copyStatus]);
 57 │
 58 │   const copyAccountNumber = async () => {
 59 │     try {
 60 │       await navigator.clipboard.writeText(accountNumber);
 61 │       setCopyStatus("copied");
 62 │     } catch {
 63 │       setCopyStatus("error");
 64 │     }
 65 │   };
 66 │
 67 │   return (
 68 │     <section className="bg-surface-raised text-ink relative isolate overflow-hidden rounded-[28px] px-6 py-6 shadow-[0_10px_26px_-12px_#00000080]">
 69 │       <p className="text-ink-muted text-[13px]">Available balance</p>
 70 │
 71 │       <div className="mt-2 flex min-h-12 items-center gap-2">
 72 │         <p className="flex min-w-0 items-center text-[clamp(1.6rem,8vw,2.35rem)] leading-tight font-semibold tracking-tight break-all tabular-nums">
 73 │           {visible ? peso(balance) : <HiddenBalance />}
 74 │         </p>
 75 │
 76 │         <button
 77 │           type="button"
 78 │           onClick={() => setVisible((shown) => !shown)}
 79 │           aria-label={visible ? "Hide balance" : "Show balance"}
 80 │           aria-pressed={!visible}
 81 │           className="text-ink-muted hover:text-ink grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2"
 82 │         >
 83 │           {visible ? (
 84 │             <Eye size={17} strokeWidth={2} aria-hidden />
 85 │           ) : (
 86 │             <EyeOff size={17} strokeWidth={2} aria-hidden />
 87 │           )}
 88 │         </button>
 89 │       </div>
 90 │
 91 │       <div className="border-line text-ink-muted mt-6 flex items-center justify-between border-t pt-4 text-[11px]">
 92 │         <div className="flex min-w-0 items-center gap-1">
 93 │           <span className="tabular-nums select-text">
 94 │             {formatAccount(accountNumber)}
 95 │           </span>
 96 │           <button
 97 │             type="button"
 98 │             onClick={() => void copyAccountNumber()}
 99 │             aria-label="Copy account number"
100 │             title={copyStatus === "copied" ? "Copied" : "Copy account number"}
101 │             className="text-ink-muted hover:bg-line hover:text-ink grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
102 │           >
103 │             {copyStatus === "copied" ? (
104 │               <Check size={15} aria-hidden />
105 │             ) : (
106 │               <Copy size={15} aria-hidden />
107 │             )}
108 │           </button>
109 │         </div>
110 │
111 │         <span className="shrink-0 tabular-nums">
112 │           {points.toLocaleString("en-PH")} points
113 │         </span>
114 │       </div>
115 │
116 │       <p
117 │         role="status"
118 │         className={
119 │           copyStatus === "error" ? "text-danger mt-2 text-[11px]" : "sr-only"
120 │         }
121 │       >
122 │         {COPY_MESSAGE[copyStatus]}
123 │       </p>
124 │     </section>
125 │   );
126 │ }
```
<!-- /code -->

| Lines | Feature |
| --- | --- |
| 17–37 | `HiddenBalance`: "₱" and six dots, announced to screen readers as "Balance hidden" |
| 48 | the balance starts **visible**; the eye button hides it (useful in public). The choice is not saved, so it is visible again after a reload |
| 51–56 | after copying, the check mark turns back into the copy icon after 2 seconds |
| 58–65 | copy the account number with the Clipboard API; if the browser refuses, show "Couldn't copy. Select the account number to copy it." The number is selectable (`select-text`) for manual copying |
| 72–74 | the amount, with a font size that scales with the screen (`clamp`) |
| 76–88 | the eye button: `aria-label` says what it will do ("Hide balance"/"Show balance"); `aria-pressed` says whether hiding is on |
| 91–113 | the account number in groups of four, the copy button, and the points |
| 116–123 | a status line: invisible for success (still announced to screen readers), red for errors |

---

## 4. Quick actions and feature cards

<!-- code: gobank/src/features/dashboard/components/quick-actions.tsx -->
**`gobank/src/features/dashboard/components/quick-actions.tsx`** · all 55 lines

```tsx
 1 │ import { Download, HandCoins, Send, type LucideIcon } from "lucide-react";
 2 │ import Link from "next/link";
 3 │ import { cn } from "~/shared/lib/cn";
 4 │
 5 │ type QuickAction = {
 6 │   href: string;
 7 │   label: string;
 8 │   icon: LucideIcon;
 9 │   tone: string;
10 │ };
11 │
12 │ const ACTIONS: QuickAction[] = [
13 │   {
14 │     href: "/transfer",
15 │     label: "Send money",
16 │     icon: Send,
17 │     tone: "border-mint/20 from-[#222e29] to-[#151b18] text-mint group-hover:border-mint/40 group-hover:shadow-[0_8px_24px_-8px_#56e3b135]",
18 │   },
19 │   {
20 │     href: "/deposit",
21 │     label: "Deposit",
22 │     icon: Download,
23 │     tone: "border-sky/20 from-[#222c31] to-[#151a1e] text-sky group-hover:border-sky/40 group-hover:shadow-[0_8px_24px_-8px_#71d5f335]",
24 │   },
25 │   {
26 │     href: "/request",
27 │     label: "Request",
28 │     icon: HandCoins,
29 │     tone: "border-violet/20 from-[#2a2533] to-[#1a171f] text-violet group-hover:border-violet/40 group-hover:shadow-[0_8px_24px_-8px_#bda0fa35]",
30 │   },
31 │ ];
32 │
33 │ export function QuickActions() {
34 │   return (
35 │     <div className="grid grid-cols-3 gap-3">
36 │       {ACTIONS.map(({ href, label, icon: Icon, tone }) => (
37 │         <Link
38 │           key={href}
39 │           href={href}
40 │           className="text-ink focus-visible:outline-mint group flex flex-col items-center gap-2.5 rounded-2xl py-2 focus-visible:outline-2 focus-visible:outline-offset-2"
41 │         >
42 │           <span
43 │             className={cn(
44 │               "grid h-[60px] w-[60px] place-items-center rounded-[20px] border bg-linear-to-br shadow-[0_6px_16px_-8px_#000000,inset_0_1px_0_#ffffff08] transition-all duration-200 group-hover:-translate-y-0.5 group-active:scale-95",
45 │               tone,
46 │             )}
47 │           >
48 │             <Icon size={25} strokeWidth={1.8} aria-hidden />
49 │           </span>
50 │           <span className="text-[11px] font-semibold">{label}</span>
51 │         </Link>
52 │       ))}
53 │     </div>
54 │   );
55 │ }
```
<!-- /code -->

Three large tiles, each a link with a colored, slightly lifting hover effect: **Send money** → `/transfer`, **Deposit** → `/deposit`, **Request** → `/request`.

<!-- code: gobank/src/features/dashboard/components/feature-grid.tsx -->
**`gobank/src/features/dashboard/components/feature-grid.tsx`** · all 142 lines

```tsx
  1 │ import { ArrowRight, Gem } from "lucide-react";
  2 │ import Link from "next/link";
  3 │ import type { ReactNode } from "react";
  4 │ import { PocketIcon } from "~/shared/ui/pocket-art";
  5 │
  6 │ type Feature = {
  7 │   href: string;
  8 │   title: string;
  9 │   description: string;
 10 │   meta?: string;
 11 │   icon: ReactNode;
 12 │ };
 13 │
 14 │ const SHORTCUTS = [
 15 │   { href: "/load", label: "Buy load", icon: "phone" },
 16 │   { href: "/bills", label: "Pay bills", icon: "bill" },
 17 │ ] as const;
 18 │
 19 │ const FOCUS_RING =
 20 │   "focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2";
 21 │
 22 │ function FeatureRow({ feature }: { feature: Feature }) {
 23 │   return (
 24 │     <Link
 25 │       href={feature.href}
 26 │       className={`border-line bg-surface hover:bg-surface-raised flex min-h-[116px] items-center gap-3 rounded-[28px] border p-5 shadow-[0_5px_18px_-10px_#00000080] transition-colors ${FOCUS_RING}`}
 27 │     >
 28 │       <span className="grid h-12 w-12 shrink-0 place-items-center">
 29 │         {feature.icon}
 30 │       </span>
 31 │
 32 │       <span className="min-w-0 flex-1">
 33 │         <span className="text-ink block text-[19px] leading-6 font-bold tracking-tight">
 34 │           {feature.title}
 35 │         </span>
 36 │         <span className="text-ink-muted mt-1 block text-[12px] leading-5">
 37 │           {feature.description}
 38 │         </span>
 39 │         {feature.meta ? (
 40 │           <span className="text-ink-soft mt-2 block text-[10px] leading-4 font-semibold">
 41 │             {feature.meta}
 42 │           </span>
 43 │         ) : null}
 44 │       </span>
 45 │
 46 │       <ArrowRight size={18} className="text-ink-muted shrink-0" aria-hidden />
 47 │     </Link>
 48 │   );
 49 │ }
 50 │
 51 │ export function FeatureGrid({
 52 │   points,
 53 │   goalCount,
 54 │   goalLimit,
 55 │ }: {
 56 │   points: number;
 57 │   goalCount: number;
 58 │   goalLimit: number;
 59 │ }) {
 60 │   const features: Feature[] = [
 61 │     {
 62 │       href: "/rewards",
 63 │       title: "GoRewards",
 64 │       description: `${points.toLocaleString("en-PH")} points`,
 65 │       icon: (
 66 │         <Gem
 67 │           size={26}
 68 │           strokeWidth={1.7}
 69 │           className="text-ink-soft"
 70 │           aria-hidden
 71 │         />
 72 │       ),
 73 │     },
 74 │     {
 75 │       href: "/goals",
 76 │       title: "GoalSave",
 77 │       description: "Savings goals · 4% p.a.",
 78 │       meta: `${goalCount} of ${goalLimit} goals`,
 79 │       icon: (
 80 │         <PocketIcon
 81 │           name="goal"
 82 │           width={32}
 83 │           height={32}
 84 │           className="text-ink-soft"
 85 │         />
 86 │       ),
 87 │     },
 88 │     {
 89 │       href: "/bitcoin",
 90 │       title: "Bitcoin",
 91 │       description: "Live price and trades",
 92 │       icon: (
 93 │         <PocketIcon
 94 │           name="chart"
 95 │           width={32}
 96 │           height={32}
 97 │           className="text-ink-soft"
 98 │         />
 99 │       ),
100 │     },
101 │   ];
102 │
103 │   return (
104 │     <section className="flex flex-col gap-3">
105 │       {features.map((feature) => (
106 │         <FeatureRow key={feature.href} feature={feature} />
107 │       ))}
108 │
109 │       <div className="grid grid-cols-2 gap-3">
110 │         {SHORTCUTS.map(({ href, label, icon }) => (
111 │           <Link
112 │             key={href}
113 │             href={href}
114 │             className={`border-line bg-surface text-ink hover:bg-surface-raised flex min-h-20 items-center justify-center gap-3 rounded-[24px] border px-3 py-4 text-[14px] font-medium transition-colors ${FOCUS_RING}`}
115 │           >
116 │             <PocketIcon
117 │               name={icon}
118 │               width={25}
119 │               height={25}
120 │               className="shrink-0"
121 │             />
122 │             {label}
123 │           </Link>
124 │         ))}
125 │       </div>
126 │
127 │       <Link
128 │         href="/card"
129 │         className={`text-ink grid min-h-16 grid-cols-[48px_minmax(0,1fr)_18px] items-center gap-3 px-5 py-3 text-[16px] font-medium transition-opacity hover:opacity-80 ${FOCUS_RING}`}
130 │       >
131 │         <PocketIcon
132 │           name="card"
133 │           width={26}
134 │           height={26}
135 │           className="justify-self-center"
136 │         />
137 │         <span>My card</span>
138 │         <ArrowRight size={18} className="text-ink-muted shrink-0" aria-hidden />
139 │       </Link>
140 │     </section>
141 │   );
142 │ }
```
<!-- /code -->

| Card | Shows | Goes to |
| --- | --- | --- |
| GoRewards | your points | `/rewards` |
| GoalSave | "Savings goals · 4% p.a." and "N of 5 goals" | `/goals` |
| Bitcoin | "Live price and trades" | `/bitcoin` |
| Buy load, Pay bills | two small tiles | `/load`, `/bills` |
| My card | a plain row | `/card` |

The cards are built from data (`features` array, lines 60–101), so adding a feature means adding one object.

---

## 5. The GO menu: `go-menu.tsx`

A floating round **GO** button at the bottom of the dashboard and the GoalSave screen. It opens a full-screen "Quick actions" panel with eight shortcuts.

<!-- code: gobank/src/shared/ui/go-menu.tsx 209-302 -->
**`gobank/src/shared/ui/go-menu.tsx`** · lines 209–302

```tsx
209 │ export function GoMenu() {
210 │   const dialog = useRef<HTMLDialogElement>(null);
211 │   const trigger = useRef<HTMLButtonElement>(null);
212 │   const [mounted, setMounted] = useState(false);
213 │   const [open, setOpen] = useState(false);
214 │
215 │   useEffect(() => setMounted(true), []);
216 │   useBodyScrollLock(open);
217 │
218 │   const openMenu = () => {
219 │     dialog.current?.showModal();
220 │     setOpen(true);
221 │   };
222 │
223 │   const closeMenu = () => dialog.current?.close();
224 │
225 │   const afterClose = () => {
226 │     setOpen(false);
227 │     trigger.current?.focus();
228 │   };
229 │
230 │   if (!mounted) return null;
231 │
232 │   return createPortal(
233 │     <>
234 │       <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[440px] justify-center pb-[max(24px,env(safe-area-inset-bottom))]">
235 │         <button
236 │           ref={trigger}
237 │           type="button"
238 │           aria-label="Open GO shortcuts"
239 │           aria-haspopup="dialog"
240 │           aria-expanded={open}
241 │           onClick={openMenu}
242 │           className={cn(
243 │             styles.goControl,
244 │             ROUND_CONTROL,
245 │             "pointer-events-auto relative",
246 │           )}
247 │         >
248 │           <GoOrb />
249 │           <span
250 │             className="absolute text-[18px] font-bold tracking-tight text-[#70e7ef]"
251 │             aria-hidden
252 │           >
253 │             GO
254 │           </span>
255 │         </button>
256 │       </div>
257 │
258 │       <dialog
259 │         ref={dialog}
260 │         aria-label="GO shortcuts"
261 │         onClose={afterClose}
262 │         className={cn(
263 │           styles.panel,
264 │           "bg-surface-sunken text-ink fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-[440px] overflow-y-auto border-0 p-0 outline-none",
265 │         )}
266 │       >
267 │         <div className="relative isolate flex min-h-full flex-col justify-center px-6 pt-8 pb-28">
268 │           <header className={cn(styles.heading, "mb-6 text-center")}>
269 │             <h2 className="text-[24px] font-semibold tracking-tight">
270 │               Quick actions
271 │             </h2>
272 │           </header>
273 │
274 │           <div className="grid grid-cols-2 gap-3">
275 │             {SHORTCUTS.map((shortcut, position) => (
276 │               <ShortcutTile
277 │                 key={shortcut.href}
278 │                 shortcut={shortcut}
279 │                 position={position}
280 │                 onOpen={closeMenu}
281 │               />
282 │             ))}
283 │           </div>
284 │
285 │           <button
286 │             type="button"
287 │             aria-label="Close GO shortcuts"
288 │             onClick={closeMenu}
289 │             className={cn(
290 │               styles.closeControl,
291 │               ROUND_CONTROL,
292 │               "absolute bottom-6 left-1/2 -translate-x-1/2",
293 │             )}
294 │           >
295 │             <CloseFlower />
296 │           </button>
297 │         </div>
298 │       </dialog>
299 │     </>,
300 │     document.body,
301 │   );
302 │ }
```
<!-- /code -->

| Lines | Behavior | Why |
| --- | --- | --- |
| 215 | render only after the component is mounted in the browser | the menu is portaled into `document.body`, which does not exist during server rendering |
| 216 | lock page scrolling while open (`useBodyScrollLock`, lines 48–59, restores the previous value afterwards) | the page behind does not scroll under the panel |
| 218–221 | open with **`dialog.showModal()`** | a native modal: the browser keeps keyboard focus inside it, **Escape** closes it, and the page behind is inert |
| 225–228 | when it closes (any way), restore focus to the GO button | keyboard and screen-reader users return to where they were |
| 232 | `createPortal(…, document.body)` | the fixed-position button and panel are attached to `<body>`, so no parent styles (such as the page-transition transform) can shift them |
| 235–255 | the GO button: `aria-label="Open GO shortcuts"`, `aria-haspopup="dialog"`, `aria-expanded` | screen readers announce what it does and whether it is open |
| 274–283 | the shortcut grid; choosing one also closes the dialog | |
| 285–296 | the close button (a "flower" that morphs from the GO orb) | |

The shortcuts (lines 27–41): **Send money**, **Deposit**, **Request**, **GoalSave**, **Pay bills**, **Buy load**, **Bitcoin**, **Profile**.

### The animations: `go-menu.module.css`

- **`unfold`**: the panel opens as a circle expanding from the GO button (`clip-path: circle(40px …)` → `circle(150vmax …)`).
- **`arrive`**: each tile slides up and fades in with a staggered delay of `110 + 30 × position` ms (`ShortcutTile`, line 190).
- **`orbit`**: two thin arcs slowly circle the GO orb (20 seconds per turn).
- **`energize`, `coreReveal`, `launchOrbit`, `dissolve`…**: the petals and the "×" of the close button.
- **`@media (prefers-reduced-motion: reduce)`** turns all of these off for users who asked their device for less motion. The global stylesheet does the same for every other animation ([Styling and accessibility](../06-frontend/04-styling-and-accessibility.md)).

---

## 6. Small art components

<!-- code: gobank/src/shared/ui/pocket-art.tsx -->
**`gobank/src/shared/ui/pocket-art.tsx`** · all 50 lines

```tsx
 1 │ import type { SVGProps } from "react";
 2 │
 3 │ type PocketIconName =
 4 │   | "home"
 5 │   | "send"
 6 │   | "deposit"
 7 │   | "request"
 8 │   | "goal"
 9 │   | "card"
10 │   | "profile"
11 │   | "spark"
12 │   | "chart"
13 │   | "bill"
14 │   | "phone";
15 │
16 │ const paths: Record<PocketIconName, string> = {
17 │   home: "M4 11 12 4l8 7v9h-6v-6h-4v6H4z",
18 │   send: "m3 10 18-7-7 18-3-8-8-3Zm8 3 5-5",
19 │   deposit: "M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5",
20 │   request: "M4 17h4l4 3 8-6M8 17v-5h5a2 2 0 0 1 0 4h-2M16 3v6m-3-3h6",
21 │   goal: "M4 3h16v16H4zM6 19v2m12-2v2M15 11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4-4v8m-4-4h8m3-3v6",
22 │   card: "M3 6h18v13H3zM3 10h18M6 15h4",
23 │   profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
24 │   spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
25 │   chart: "M4 4v16h17M7 14l5-5 4 3 5-8m-5 0h5v5",
26 │   bill: "M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6m-6 4h6",
27 │   phone: "M7 2h10v20H7zM10 5h4m-3 14h2",
28 │ };
29 │
30 │ export function PocketIcon({
31 │   name,
32 │   ...props
33 │ }: SVGProps<SVGSVGElement> & { name: PocketIconName }) {
34 │   return (
35 │     <svg
36 │       width="24"
37 │       height="24"
38 │       viewBox="0 0 24 24"
39 │       fill="none"
40 │       stroke="currentColor"
41 │       strokeWidth="2.2"
42 │       strokeLinecap="round"
43 │       strokeLinejoin="round"
44 │       aria-hidden="true"
45 │       {...props}
46 │     >
47 │       <path d={paths[name]} />
48 │     </svg>
49 │   );
50 │ }
```
<!-- /code -->

`PocketIcon` draws 11 simple line icons (home, send, deposit, request, goal, card, profile, spark, chart, bill, phone) from one SVG path each. They are decorative (`aria-hidden`).

<!-- code: gobank/src/shared/ui/gobank-logo.tsx -->
**`gobank/src/shared/ui/gobank-logo.tsx`** · all 42 lines

```tsx
 1 │ import type { SVGProps } from "react";
 2 │
 3 │ export function GoBankLogo(props: SVGProps<SVGSVGElement>) {
 4 │   return (
 5 │     <svg
 6 │       viewBox="0 0 126 50"
 7 │       role="img"
 8 │       aria-label="GoBank Express"
 9 │       fill="currentColor"
10 │       {...props}
11 │     >
12 │       <g fontFamily="var(--font-geist-sans), sans-serif">
13 │         <text x="0" y="31" fontSize="34" fontWeight="750" letterSpacing="-2">
14 │           G
15 │         </text>
16 │         <circle
17 │           cx="40"
18 │           cy="19"
19 │           r="10.5"
20 │           fill="none"
21 │           stroke="currentColor"
22 │           strokeWidth="5.5"
23 │           strokeDasharray="1.15 0.5"
24 │           transform="rotate(-90 40 19)"
25 │         />
26 │         <text x="55" y="31" fontSize="29" fontWeight="500" letterSpacing="-1.4">
27 │           Bank
28 │         </text>
29 │         <text
30 │           x="122"
31 │           y="46"
32 │           textAnchor="end"
33 │           fontSize="10.5"
34 │           fontWeight="400"
35 │           letterSpacing="0.8"
36 │         >
37 │           express
38 │         </text>
39 │       </g>
40 │     </svg>
41 │   );
42 │ }
```
<!-- /code -->

The **G·Bank express** wordmark as SVG text (the "o" is a dashed ring). It uses `currentColor`, so it takes the color of the surrounding text, and it is announced as "GoBank Express" (`role="img"` with `aria-label`).

---

## Defense questions

**Q: Why is the dashboard rendered on the server?**
A: The server already knows the user from the session cookie, so it can load the balance, points, goal count and recent transactions with one Prisma call (two small SQL statements) and send ready HTML. The user sees their balance immediately, with no loading spinner and no extra API request.

**Q: How did you make the menu accessible?**
A: It uses the native `<dialog>` element with `showModal()`, which traps focus and closes with Escape. The trigger has `aria-haspopup` and `aria-expanded`, focus returns to the trigger on close, page scrolling is locked while it is open, and all its animations are disabled when the user prefers reduced motion.

**Q: Can I hide my balance?**
A: Yes, the eye button on the balance card replaces the amount with dots ("Balance hidden" for screen readers). It is a per-visit choice and resets on reload.

---

## Check yourself

<details>
<summary>Why does <code>GoMenu</code> return <code>null</code> until <code>mounted</code> is true?</summary>

It renders into `document.body` with a portal, which exists only in the browser. Waiting for the first browser render avoids errors during server rendering.
</details>

<details>
<summary>Where does the number of goals on the dashboard come from?</summary>

From `account.overview`'s `_count: { savingsGoals: true }`, loaded on the server together with the balance.
</details>
