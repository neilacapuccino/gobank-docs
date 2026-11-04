# Shared UI kit (`src/shared/ui`)

**What you will learn:** the reusable building blocks every screen is made of: buttons, back buttons, headers, text fields, the PIN pad, step bars, transaction summaries and receipts. You will see how each one handles **accessibility** (labels, focus, screen-reader announcements), because a panel may ask how the UI supports all users.

| Component | File | Used by |
| --- | --- | --- |
| `Button`, `buttonClass` | `button.tsx` | almost every screen |
| `BackButton` | `back-button.tsx` | headers, multi-step forms |
| `PageHeader` | `page-header.tsx` | most screens |
| `SectionHeader` | `section-header.tsx` | dashboard "Recent transactions" |
| `StepBar` | `step-bar.tsx` | registration |
| `TextField` | `text-field.tsx` | every form |
| `PinPad` | `pin-pad.tsx` | sign-in, registration, change PIN |
| `TransactionSummary` | `transaction-summary.tsx` | reviews and receipts |
| `TransactionReceipt` | `transaction-receipt.tsx` | success screens |
| `MoneyFormHeader`, `RecipientPicker`, `AmountFields`, `MoneySummary`, `RecipientIdentity`, `FormError` | `money-form-ui.tsx` | send, request, notifications, bills, load, deposit, GoalSave, rewards, history |
| `Screen` | `screen.tsx` | the page frame ([Pages and routing](01-pages-and-routing.md#the-two-route-groups)) |
| `GoMenu` (+ CSS module) | `go-menu.tsx`, `go-menu.module.css` | dashboard, GoalSave ([Dashboard §5](../05-features/11-dashboard-and-navigation.md#5-the-go-menu-go-menutsx)) |
| `PocketIcon`, `GoBankLogo` | `pocket-art.tsx`, `gobank-logo.tsx` | dashboard, welcome ([Dashboard §6](../05-features/11-dashboard-and-navigation.md#6-small-art-components)) |

All of them use the shared `cn()` helper to combine class names ([Shared helpers](03-shared-lib-hooks-and-trpc-client.md#cnts)).

---

## `button.tsx`

<!-- code: gobank/src/shared/ui/button.tsx -->
**`gobank/src/shared/ui/button.tsx`** · all 37 lines

```tsx
 1 │ import type { ButtonHTMLAttributes, ReactNode } from "react";
 2 │ import { cn } from "~/shared/lib/cn";
 3 │
 4 │ type Variant = "primary" | "outline" | "ghost";
 5 │
 6 │ const BASE =
 7 │   "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed";
 8 │
 9 │ const VARIANTS: Record<Variant, string> = {
10 │   primary:
11 │     "h-13 text-[15px] bg-brand text-white enabled:hover:bg-brand-hover disabled:bg-brand/35 disabled:text-white/65",
12 │   outline:
13 │     "h-13 text-[15px] border border-line-strong bg-surface text-ink enabled:hover:bg-surface-raised disabled:opacity-45",
14 │   ghost:
15 │     "h-11 text-[14px] text-ink-muted enabled:hover:text-ink disabled:opacity-45",
16 │ };
17 │
18 │ export const buttonClass = (variant: Variant = "primary") =>
19 │   cn(BASE, VARIANTS[variant]);
20 │
21 │ type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
22 │   variant?: Variant;
23 │   children: ReactNode;
24 │ };
25 │
26 │ export function Button({
27 │   variant = "primary",
28 │   children,
29 │   className,
30 │   ...props
31 │ }: ButtonProps) {
32 │   return (
33 │     <button className={cn(buttonClass(variant), className)} {...props}>
34 │       {children}
35 │     </button>
36 │   );
37 │ }
```
<!-- /code -->

- Three **variants** (lines 9–16): `primary` (green, the main action), `outline` (secondary), `ghost` (text-only, such as "Back" or "Cancel").
- `buttonClass(variant)` (lines 18–19) returns just the classes, so a **link** can look like a button: `<Link href="/register" className={buttonClass("primary")}>` on the welcome screen. A link that navigates should be an `<a>`, not a `<button>`; this keeps the right element for each job.
- Every button is full-width with a 52 px tall target (`h-13`), large enough to tap on a phone, and has a visible focus ring for keyboard users (`focus-visible:ring-2`).
- Disabled buttons are visibly faded and show the "not allowed" cursor.
- `...props` (lines 30, 33) passes through anything else, such as `type="submit"`, `disabled` or `onClick`.

## `back-button.tsx`

<!-- code: gobank/src/shared/ui/back-button.tsx -->
**`gobank/src/shared/ui/back-button.tsx`** · all 43 lines

```tsx
 1 │ import { ArrowLeft } from "lucide-react";
 2 │ import Link from "next/link";
 3 │ import { cn } from "~/shared/lib/cn";
 4 │
 5 │ type BackButtonProps = {
 6 │   label?: string;
 7 │   className?: string;
 8 │ } & (
 9 │   | { href: string; onClick?: never; disabled?: never }
10 │   | { href?: never; onClick: () => void; disabled?: boolean }
11 │ );
12 │
13 │ export function BackButton({
14 │   label = "Back",
15 │   className,
16 │   ...props
17 │ }: BackButtonProps) {
18 │   const classes = cn(
19 │     "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tile-sunken text-ink transition-[background-color,transform] duration-150 hover:bg-tile-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-soft active:scale-95 disabled:pointer-events-none disabled:opacity-45",
20 │     className,
21 │   );
22 │   const icon = <ArrowLeft size={18} strokeWidth={1.8} aria-hidden />;
23 │
24 │   if (props.href !== undefined) {
25 │     return (
26 │       <Link href={props.href} aria-label={label} className={classes}>
27 │         {icon}
28 │       </Link>
29 │     );
30 │   }
31 │
32 │   return (
33 │     <button
34 │       type="button"
35 │       onClick={props.onClick}
36 │       disabled={props.disabled}
37 │       aria-label={label}
38 │       className={classes}
39 │     >
40 │       {icon}
41 │     </button>
42 │   );
43 │ }
```
<!-- /code -->

- **Lines 5–11:** a TypeScript trick. The props are *either* `{ href }` (a link) *or* `{ onClick, disabled? }` (a button), never both. `never` forbids mixing them, so a wrong combination does not compile.
- Lines 24–30 render a `Link`; lines 32–42 render a `<button>`.
- The icon has no text, so the control gets `aria-label` (default "Back"; GoalSave uses more specific labels such as "Back to goal name").
- 40×40 px, with a press animation (`active:scale-95`).

## `page-header.tsx` and `section-header.tsx`

`PageHeader` (shown in [Next.js and React §1](../01-foundations/02-nextjs-and-react.md#1-a-component-is-a-function-that-returns-ui)) is a centered `<h1>` title with a back link. `SectionHeader` is a section `<h2>` with a "See all" link:

<!-- code: gobank/src/shared/ui/section-header.tsx -->
**`gobank/src/shared/ui/section-header.tsx`** · all 23 lines

```tsx
 1 │ import Link from "next/link";
 2 │
 3 │ export function SectionHeader({
 4 │   title,
 5 │   href,
 6 │ }: {
 7 │   title: string;
 8 │   href: string;
 9 │ }) {
10 │   return (
11 │     <header className="mb-4 flex items-baseline justify-between">
12 │       <h2 className="text-ink text-[15px] font-semibold tracking-tight">
13 │         {title}
14 │       </h2>
15 │       <Link
16 │         href={href}
17 │         className="text-ink-muted hover:text-brand text-[12.5px] font-medium transition-colors"
18 │       >
19 │         See all
20 │       </Link>
21 │     </header>
22 │   );
23 │ }
```
<!-- /code -->

## `step-bar.tsx`

<!-- code: gobank/src/shared/ui/step-bar.tsx -->
**`gobank/src/shared/ui/step-bar.tsx`** · all 23 lines

```tsx
 1 │ import { cn } from "~/shared/lib/cn";
 2 │
 3 │ export function StepBar({
 4 │   current,
 5 │   total,
 6 │ }: {
 7 │   current: number;
 8 │   total: number;
 9 │ }) {
10 │   return (
11 │     <div className="flex items-center gap-1.5" aria-hidden>
12 │       {Array.from({ length: total }, (_, index) => (
13 │         <span
14 │           key={index}
15 │           className={cn(
16 │             "h-1 flex-1 rounded-full transition-colors duration-300",
17 │             index + 1 <= current ? "bg-brand" : "bg-line",
18 │           )}
19 │         />
20 │       ))}
21 │     </div>
22 │   );
23 │ }
```
<!-- /code -->

A row of segments, green up to the current step. It is `aria-hidden` because the same information is written as text ("Step 2 of 4") right next to it, which screen readers do read.

## `text-field.tsx`

<!-- code: gobank/src/shared/ui/text-field.tsx -->
**`gobank/src/shared/ui/text-field.tsx`** · all 92 lines

```tsx
 1 │ "use client";
 2 │
 3 │ import type { InputHTMLAttributes, ReactNode } from "react";
 4 │ import { useId } from "react";
 5 │ import { cn } from "~/shared/lib/cn";
 6 │
 7 │ type TextFieldProps = Omit<
 8 │   InputHTMLAttributes<HTMLInputElement>,
 9 │   "id" | "placeholder" | "autoComplete"
10 │ > & {
11 │   label: string;
12 │   hint?: string;
13 │   error?: string | null;
14 │   optional?: boolean;
15 │   prefix?: string;
16 │   trailing?: ReactNode;
17 │ };
18 │
19 │ export function TextField({
20 │   label,
21 │   hint,
22 │   error,
23 │   optional,
24 │   prefix,
25 │   trailing,
26 │   className,
27 │   inputMode,
28 │   ...props
29 │ }: TextFieldProps) {
30 │   const id = useId();
31 │   const descriptionId = `${id}-description`;
32 │   const description = error ?? hint;
33 │
34 │   return (
35 │     <div className="flex flex-col gap-1.5">
36 │       <label
37 │         htmlFor={id}
38 │         className="text-ink-soft flex items-baseline justify-between text-[13px] font-medium"
39 │       >
40 │         <span>{label}</span>
41 │         {optional ? (
42 │           <span className="text-ink-faint text-[12px] font-normal">
43 │             Optional
44 │           </span>
45 │         ) : null}
46 │       </label>
47 │
48 │       <div
49 │         className={cn(
50 │           "bg-surface flex items-center rounded-xl border transition-colors duration-150",
51 │           error
52 │             ? "border-danger"
53 │             : "border-line-strong focus-within:border-brand focus-within:ring-brand/15 focus-within:ring-2",
54 │         )}
55 │       >
56 │         {prefix ? (
57 │           <span className="text-ink-faint pl-3.5 text-[15px] select-none">
58 │             {prefix}
59 │           </span>
60 │         ) : null}
61 │         <input
62 │           id={id}
63 │           inputMode={inputMode}
64 │           autoComplete="off"
65 │           placeholder={inputMode === "decimal" ? "0.00" : undefined}
66 │           aria-invalid={Boolean(error)}
67 │           aria-describedby={description ? descriptionId : undefined}
68 │           className={cn(
69 │             "text-ink placeholder:text-ink-faint h-13 min-w-0 flex-1 bg-transparent px-3.5 text-[16px] outline-none disabled:opacity-60",
70 │             prefix ? "pl-1.5" : null,
71 │             className,
72 │           )}
73 │           {...props}
74 │         />
75 │         {trailing ? <span className="pr-3.5">{trailing}</span> : null}
76 │       </div>
77 │
78 │       {description ? (
79 │         <p
80 │           id={descriptionId}
81 │           role={error ? "alert" : undefined}
82 │           className={cn(
83 │             "text-[12.5px]",
84 │             error ? "text-danger" : "text-ink-muted",
85 │           )}
86 │         >
87 │           {description}
88 │         </p>
89 │       ) : null}
90 │     </div>
91 │   );
92 │ }
```
<!-- /code -->

| Lines | Feature | Why |
| --- | --- | --- |
| 7–17 | props: everything an `<input>` takes, **except** `id`, `placeholder` and `autoComplete`, plus `label`, `hint`, `error`, `optional`, `prefix` (`₱`, `@`) and `trailing` (a status icon or a button) | the component controls those three itself, so every field behaves the same |
| 30 | `useId()` creates a unique ID | links the `<label>` and its input (tapping the label focuses the input; screen readers read the label) |
| 31–32, 67, 80 | the hint **or** the error is the input's description (`aria-describedby` points to the paragraph's ID) | screen readers read "Amount, edit text, Up to ₱50,000.00" |
| 66 | `aria-invalid` when there is an error | announced as "invalid" |
| 81 | errors get `role="alert"` | announced as soon as they appear |
| 50–54 | red border on error; green border and glow on focus | visible state |
| 64 | `autoComplete="off"` | browsers do not suggest old amounts or PINs |
| 65 | decimal inputs get the placeholder `0.00` | |
| 69 | 16 px text | prevents iPhones from zooming in when the field is focused |

## `pin-pad.tsx`

<!-- code: gobank/src/shared/ui/pin-pad.tsx 95-145 -->
**`gobank/src/shared/ui/pin-pad.tsx`** · lines 95–145

```tsx
 95 │ export function PinPad({ value, onChange, length, invalid }: PinPadProps) {
 96 │   const full = value.length >= length;
 97 │
 98 │   const addDigit = useCallback(
 99 │     (digit: string) => {
100 │       if (value.length < length) onChange(value + digit);
101 │     },
102 │     [value, length, onChange],
103 │   );
104 │
105 │   const deleteDigit = useCallback(() => {
106 │     onChange(value.slice(0, -1));
107 │   }, [value, onChange]);
108 │
109 │   usePinKeyboard(addDigit, deleteDigit);
110 │
111 │   return (
112 │     <div className="flex w-full flex-col items-center gap-11">
113 │       <div
114 │         className={cn("flex gap-4", invalid && "animate-shake")}
115 │         role="status"
116 │         aria-label={`${value.length} of ${length} digits entered`}
117 │       >
118 │         {Array.from({ length }, (_, index) => (
119 │           <span
120 │             key={index}
121 │             className={cn(
122 │               "h-3.5 w-3.5 rounded-full border-2 transition-all duration-150",
123 │               dotClass(index < value.length, invalid),
124 │             )}
125 │           />
126 │         ))}
127 │       </div>
128 │
129 │       <div className="grid grid-cols-3 justify-items-center gap-x-7 gap-y-4">
130 │         {DIGIT_ROWS.map((digit) => (
131 │           <DigitKey
132 │             key={digit}
133 │             digit={digit}
134 │             disabled={full}
135 │             onPress={addDigit}
136 │           />
137 │         ))}
138 │
139 │         <span className="h-17 w-17" />
140 │         <DigitKey digit="0" disabled={full} onPress={addDigit} />
141 │         <DeleteKey disabled={value.length === 0} onPress={deleteDigit} />
142 │       </div>
143 │     </div>
144 │   );
145 │ }
```
<!-- /code -->

| Lines | Feature |
| --- | --- |
| 96 | `full` = all 6 digits entered; digit keys are then disabled |
| 98–107 | `addDigit` / `deleteDigit`, wrapped in `useCallback` so the keyboard listener below is not re-attached on every render |
| 109 | `usePinKeyboard` (lines 24–44): physical keyboard digits and **Backspace** also work (desktop users, or phones with keyboards) |
| 113–127 | the six dots: green when filled, **red** when `invalid` and filled; the row **shakes** (`animate-shake`) when `invalid`. Screen readers hear "3 of 6 digits entered" (`role="status"`) |
| 129–142 | the 3×4 keypad: 1–9, an empty cell, 0 and **Delete** (`aria-label="Delete last digit"`, disabled when empty) |

The PIN pad never shows the digits themselves, only dots. The parent decides what happens at 6 digits (sign-in submits automatically; registration validates and asks for confirmation).

## `transaction-summary.tsx` and `transaction-receipt.tsx`

<!-- code: gobank/src/shared/ui/transaction-summary.tsx -->
**`gobank/src/shared/ui/transaction-summary.tsx`** · all 48 lines

```tsx
 1 │ import type { ReactNode } from "react";
 2 │ import { cn } from "~/shared/lib/cn";
 3 │ import { peso } from "~/shared/lib/format";
 4 │
 5 │ type Detail = { label: string; value: string };
 6 │
 7 │ export function TransactionSummary({
 8 │   amount,
 9 │   amountClassName,
10 │   children,
11 │   details = [],
12 │ }: {
13 │   amount: number;
14 │   amountClassName?: string;
15 │   children?: ReactNode;
16 │   details?: Detail[];
17 │ }) {
18 │   return (
19 │     <section className="border-line bg-surface-sunken rounded-2xl border p-5">
20 │       <p
21 │         className={cn(
22 │           "text-[30px] font-semibold tracking-tight tabular-nums",
23 │           amountClassName ?? "text-ink",
24 │         )}
25 │       >
26 │         {peso(amount)}
27 │       </p>
28 │
29 │       {children ? <div className="mt-5">{children}</div> : null}
30 │
31 │       {details.length > 0 ? (
32 │         <dl className="border-line mt-5 space-y-3 border-t pt-4">
33 │           {details.map(({ label, value }) => (
34 │             <div
35 │               key={label}
36 │               className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] gap-3 text-[12px]"
37 │             >
38 │               <dt className="text-ink-muted">{label}</dt>
39 │               <dd className="text-ink min-w-0 text-right break-words">
40 │                 {value}
41 │               </dd>
42 │             </div>
43 │           ))}
44 │         </dl>
45 │       ) : null}
46 │     </section>
47 │   );
48 │ }
```
<!-- /code -->

A card with the amount in large type (colored when the caller asks), optional extra content (a person, a biller name), and a definition list (`<dl>`/`<dt>`/`<dd>`) of details such as Reference, Date, Balance and "Paid with". Using a real definition list means screen readers announce each label with its value.

<!-- code: gobank/src/shared/ui/transaction-receipt.tsx -->
**`gobank/src/shared/ui/transaction-receipt.tsx`** · all 30 lines

```tsx
 1 │ "use client";
 2 │
 3 │ import { CheckCircle2 } from "lucide-react";
 4 │ import type { ReactNode } from "react";
 5 │ import { Button } from "./button";
 6 │
 7 │ export function TransactionReceipt({
 8 │   title,
 9 │   children,
10 │   onDone,
11 │ }: {
12 │   title: string;
13 │   children: ReactNode;
14 │   onDone: () => void;
15 │ }) {
16 │   return (
17 │     <div className="flex flex-1 flex-col gap-6 pt-5">
18 │       <header className="flex items-center gap-3">
19 │         <CheckCircle2 className="text-brand shrink-0" size={28} aria-hidden />
20 │         <h1 className="text-ink text-[20px] font-semibold">{title}</h1>
21 │       </header>
22 │
23 │       {children}
24 │
25 │       <div className="mt-auto pt-4">
26 │         <Button onClick={onDone}>Done</Button>
27 │       </div>
28 │     </div>
29 │   );
30 │ }
```
<!-- /code -->

The success screen: a green check, a title such as "Transfer successful", the summary, and **Done**.

## `money-form-ui.tsx`

The building blocks of the send, request and pay flows. `RecipientPicker` and `AmountFields` are explained line by line in [Send money §6](../05-features/05-send-money.md#the-shared-form-parts-money-form-uitsx). The smaller parts:

<!-- code: gobank/src/shared/ui/money-form-ui.tsx 11-91 -->
**`gobank/src/shared/ui/money-form-ui.tsx`** · lines 11–91

```tsx
11 │ export type MoneyStep = "recipient" | "amount" | "review";
12 │
13 │ const STEP_NUMBER: Record<MoneyStep, number> = {
14 │   recipient: 1,
15 │   amount: 2,
16 │   review: 3,
17 │ };
18 │
19 │ const NO_MATCH_FROM_SERVER = "No GoBank account matches that";
20 │
21 │ const INPUT_CLASS =
22 │   "border-line-strong bg-surface-sunken text-ink focus:border-brand w-full rounded-xl border px-4 text-[16px] outline-none";
23 │
24 │ const submitWith = (action: () => void) => (event: FormEvent) => {
25 │   event.preventDefault();
26 │   action();
27 │ };
28 │
29 │ export function MoneyFormHeader({
30 │   title,
31 │   step,
32 │   disabled,
33 │   onBack,
34 │ }: {
35 │   title: string;
36 │   step: MoneyStep;
37 │   disabled?: boolean;
38 │   onBack: () => void;
39 │ }) {
40 │   return (
41 │     <header className="relative flex h-14 shrink-0 items-center justify-center">
42 │       {step === "recipient" ? (
43 │         <BackButton href="/dashboard" className="absolute left-0" />
44 │       ) : (
45 │         <BackButton
46 │           onClick={onBack}
47 │           disabled={disabled}
48 │           className="absolute left-0"
49 │         />
50 │       )}
51 │
52 │       <div className="text-center">
53 │         <h1 className="text-ink text-[16px] font-semibold">{title}</h1>
54 │         <p className="text-ink-muted mt-1 text-[12px]">
55 │           Step {STEP_NUMBER[step]} of 3
56 │         </p>
57 │       </div>
58 │     </header>
59 │   );
60 │ }
61 │
62 │ export function FormError({ error }: { error?: string | null }) {
63 │   if (!error) return null;
64 │
65 │   return (
66 │     <p role="alert" className="text-danger mt-3 text-[13px] leading-relaxed">
67 │       {error}
68 │     </p>
69 │   );
70 │ }
71 │
72 │ export function RecipientIdentity({ recipient }: { recipient: Recipient }) {
73 │   return (
74 │     <div className="flex min-w-0 items-center gap-3">
75 │       <ProfileAvatar
76 │         photo={recipient.profilePhoto}
77 │         size={44}
78 │         className="shrink-0"
79 │       />
80 │
81 │       <div className="min-w-0">
82 │         <p className="text-ink truncate text-[14px] font-medium">
83 │           {recipient.fullName || recipient.username}
84 │         </p>
85 │         <p className="text-ink-muted truncate text-[12px]">
86 │           @{recipient.username}
87 │         </p>
88 │       </div>
89 │     </div>
90 │   );
91 │ }
```
<!-- /code -->

| Lines | Part |
| --- | --- |
| 11–17 | the three steps and their numbers |
| 19 | the server's "No GoBank account matches that", shown more briefly as "No matching account." |
| 21–22 | the shared input style |
| 24–27 | `submitWith`: stop the browser's default form submission (a page reload) and run the action instead, so **Enter** works in every step |
| 29–60 | `MoneyFormHeader`: on step 1, Back links to the dashboard; on steps 2–3, Back goes to the previous step; "Step N of 3" under the title |
| 62–70 | `FormError`: a red message with `role="alert"` |
| 72–91 | `RecipientIdentity`: the person's photo, full name (or username) and `@username`, truncating long names |

---

## Check yourself

<details>
<summary>Why does <code>TextField</code> forbid passing your own <code>id</code>?</summary>

It generates a unique ID with `useId()` to link the label, the input and the hint or error text. Letting callers pass their own could break those links or create duplicate IDs.
</details>

<details>
<summary>How does the PIN pad tell a screen-reader user how many digits were typed?</summary>

The dots' container has `role="status"` and `aria-label="N of 6 digits entered"`, which is announced as it changes.
</details>
