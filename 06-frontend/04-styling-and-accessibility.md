# Styling and accessibility

**What you will learn:** how GoBank is styled with Tailwind CSS 4 and a small set of named color tokens, how animations are defined and switched off for users who prefer less motion, how the layout works from a 320 px phone up to a desktop, and a checklist of the accessibility techniques used across the screens, each with a real example from the code.

| File | Role |
| --- | --- |
| `src/styles/globals.css` | Tailwind import, theme tokens (colors, font, animations), keyframes, dark color scheme, reduced motion |
| `postcss.config.json` | runs Tailwind 4 as a PostCSS plugin |
| `src/shared/ui/go-menu.module.css` | the GO menu's animations ([Dashboard §5](../05-features/11-dashboard-and-navigation.md#the-animations-go-menumodulecss)) |
| `src/features/card/components/my-card-screen.module.css` | card blur, lock overlay and card-switch animation ([Cards §7](../05-features/04-cards.md#7-the-my-card-screen-card)) |
| `.prettierrc.json` | sorts Tailwind classes automatically |

---

## 1. Tailwind CSS in one minute

Instead of writing CSS files, components use **utility classes** directly in the markup:

```tsx
<p className="text-ink-muted text-[13px]">Available balance</p>
```

`text-ink-muted` sets a color from the theme, and `text-[13px]` sets an exact size (an *arbitrary value* in brackets). Tailwind generates only the CSS for classes actually used, so the stylesheet stays small.

| Pattern | Meaning | Example in GoBank |
| --- | --- | --- |
| `hover:` `focus-visible:` `disabled:` `enabled:` | style for a state | `enabled:hover:bg-brand-hover` on buttons |
| `group-hover:` / `peer-focus-visible:` | react to a parent or sibling's state | the terms checkbox ring in `step-review.tsx` |
| `sm:` `lg:` | from a screen width upward | `sm:border-x` on the `Screen` frame |
| `!` suffix | important (override) | `bg-danger-strong!` on the Sign out button |
| `min-h-dvh` | at least the *visible* screen height on mobile (`dvh` follows the browser's toolbars) | `Screen`, template |
| `tabular-nums` | digits of equal width, so amounts do not jump as they change | every amount |

---

## 2. The theme: `globals.css`

<!-- code: gobank/src/styles/globals.css -->
**`gobank/src/styles/globals.css`** · all 122 lines

```css
  1 │ @import "tailwindcss";
  2 │
  3 │ @theme {
  4 │   --font-sans:
  5 │     var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif,
  6 │     "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  7 │
  8 │   --color-surface: #1b1b1d;
  9 │   --color-surface-sunken: #101012;
 10 │   --color-surface-raised: #29292c;
 11 │   --color-card: #171719;
 12 │   --color-tile: #242426;
 13 │   --color-tile-hover: #303034;
 14 │   --color-tile-sunken: #202022;
 15 │
 16 │   --color-line: #353539;
 17 │   --color-line-strong: #515158;
 18 │
 19 │   --color-ink: #f4f4f5;
 20 │   --color-ink-bright: #e4e4e7;
 21 │   --color-ink-soft: #c4c4cc;
 22 │   --color-ink-muted: #a1a1ad;
 23 │   --color-ink-faint: #878792;
 24 │
 25 │   --color-brand: #059669;
 26 │   --color-brand-hover: #047857;
 27 │   --color-brand-soft: #142b23;
 28 │   --color-brand-line: #285d49;
 29 │
 30 │   --color-mint: #56e3b1;
 31 │   --color-mint-muted: #8da99b;
 32 │   --color-sky: #71d5f3;
 33 │   --color-gold: #e6c17a;
 34 │   --color-violet: #bda0fa;
 35 │   --color-cyan: #48e4e9;
 36 │   --color-on-mint: #0a211a;
 37 │
 38 │   --color-danger: #f87171;
 39 │   --color-danger-soft: #351d21;
 40 │   --color-danger-strong: #e5252a;
 41 │   --color-danger-strong-hover: #c81e24;
 42 │
 43 │   --animate-page-in: page-in 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
 44 │   --animate-step-in: step-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
 45 │   --animate-shake: shake 0.38s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
 46 │   --animate-float: float 4s ease-in-out infinite;
 47 │   --animate-wave: wave 2.8s ease-in-out infinite;
 48 │ }
 49 │
 50 │ @keyframes float {
 51 │   0%,
 52 │   100% {
 53 │     transform: translateY(0);
 54 │   }
 55 │   50% {
 56 │     transform: translateY(-6px);
 57 │   }
 58 │ }
 59 │
 60 │ @keyframes wave {
 61 │   0%,
 62 │   55%,
 63 │   100% {
 64 │     transform: rotate(0deg);
 65 │   }
 66 │   65% {
 67 │     transform: rotate(-16deg);
 68 │   }
 69 │   75% {
 70 │     transform: rotate(8deg);
 71 │   }
 72 │   85% {
 73 │     transform: rotate(-12deg);
 74 │   }
 75 │ }
 76 │
 77 │ @keyframes shake {
 78 │   20%,
 79 │   60% {
 80 │     transform: translateX(-7px);
 81 │   }
 82 │   40%,
 83 │   80% {
 84 │     transform: translateX(7px);
 85 │   }
 86 │ }
 87 │
 88 │ @keyframes page-in {
 89 │   from {
 90 │     opacity: 0;
 91 │     transform: translateX(22px);
 92 │   }
 93 │   to {
 94 │     opacity: 1;
 95 │     transform: none;
 96 │   }
 97 │ }
 98 │
 99 │ @keyframes step-in {
100 │   from {
101 │     opacity: 0;
102 │     transform: translateX(16px);
103 │   }
104 │   to {
105 │     opacity: 1;
106 │     transform: none;
107 │   }
108 │ }
109 │
110 │ html {
111 │   color-scheme: dark;
112 │ }
113 │
114 │ @media (prefers-reduced-motion: reduce) {
115 │   *,
116 │   *::before,
117 │   *::after {
118 │     animation-duration: 0.01ms !important;
119 │     animation-iteration-count: 1 !important;
120 │     transition-duration: 0.01ms !important;
121 │   }
122 │ }
```
<!-- /code -->

### Color tokens (lines 8–41)

Each `--color-<name>` becomes classes like `bg-<name>`, `text-<name>` and `border-<name>`. Naming colors by **role** (surface, ink, brand, danger) instead of by shade makes the whole app consistent and easy to re-theme (commit `4dab6f7`, "name the shared surface colors as theme tokens").

| Group | Tokens | Used for |
| --- | --- | --- |
| Surfaces | `surface`, `surface-sunken`, `surface-raised`, `card`, `tile`, `tile-hover`, `tile-sunken` | page and card backgrounds, from darkest to lightest |
| Lines | `line`, `line-strong` | borders and dividers |
| Ink (text) | `ink`, `ink-bright`, `ink-soft`, `ink-muted`, `ink-faint` | text, from strongest to weakest |
| Brand | `brand` (emerald `#059669`), `brand-hover`, `brand-soft`, `brand-line` | main buttons, selections, money in |
| Accents | `mint`, `mint-muted`, `sky`, `gold`, `violet`, `cyan`, `on-mint` | feature colors (Send, Deposit, GoalSave, Bitcoin, GO menu) |
| Danger | `danger`, `danger-soft`, `danger-strong`, `danger-strong-hover` | errors, money out, Sign out |

### Font (lines 4–6)

`--font-sans` starts with the Geist font, which the root layout loads through `next/font` and exposes as `--font-geist-sans`, followed by system fallbacks and emoji fonts.

### Animations (lines 43–108)

| Token | Keyframes | Used by |
| --- | --- | --- |
| `animate-page-in` | slide 22 px from the right + fade, 0.34 s | `template.tsx`: every page change |
| `animate-step-in` | slide 16 px + fade, 0.28 s | each step of registration, sign-in and change PIN; the welcome text; the new-goal form card |
| `animate-shake` | left-right shake, 0.38 s | the PIN dots after a wrong or invalid PIN |
| `animate-float` | gentle up-down, 4 s, forever | Gobi the mascot and its three chips on the welcome screen |
| `animate-wave` | a short wave, 2.8 s, repeated | Gobi's waving arm |

The easing `cubic-bezier(0.22, 1, 0.36, 1)` starts fast and settles softly, which feels natural for things arriving on screen.

### Dark only (lines 110–112)

`color-scheme: dark` tells the browser the page is dark, so built-in controls (scrollbars, date pickers, autofill) are drawn in dark style too.

### Reduced motion (lines 114–122)

If the user has asked their device to reduce motion (an accessibility setting), every animation and transition becomes practically instant. The GO menu and card screen modules have their own `prefers-reduced-motion` rules for their animations.

---

## 3. CSS Modules for complex effects

A few effects are too complex for utility classes, so they live in CSS Modules (`*.module.css`). Their class names are made unique by the build, so they cannot clash with anything else.

<!-- code: gobank/src/features/card/components/my-card-screen.module.css -->
**`gobank/src/features/card/components/my-card-screen.module.css`** · all 67 lines

```css
 1 │ .cardStage {
 2 │   position: relative;
 3 │   perspective: 900px;
 4 │ }
 5 │
 6 │ .switchCard {
 7 │   animation: switch-card 280ms ease-out;
 8 │ }
 9 │
10 │ .cardFace {
11 │   transition:
12 │     filter 220ms ease,
13 │     opacity 220ms ease;
14 │ }
15 │
16 │ .cardFaceLocked {
17 │   filter: blur(5px);
18 │   opacity: 0.4;
19 │   pointer-events: none;
20 │   user-select: none;
21 │ }
22 │
23 │ .cardLockOverlay {
24 │   position: absolute;
25 │   inset: 0;
26 │   display: flex;
27 │   flex-direction: column;
28 │   align-items: center;
29 │   justify-content: center;
30 │   gap: 8px;
31 │   color: #fff;
32 │   pointer-events: none;
33 │   animation: card-lock 180ms ease-out;
34 │ }
35 │
36 │ @keyframes card-lock {
37 │   from {
38 │     opacity: 0;
39 │     transform: translateY(4px);
40 │   }
41 │   to {
42 │     opacity: 1;
43 │     transform: translateY(0);
44 │   }
45 │ }
46 │
47 │ @keyframes switch-card {
48 │   from {
49 │     opacity: 0.45;
50 │     transform: rotateY(-22deg) scale(0.98);
51 │   }
52 │   to {
53 │     opacity: 1;
54 │     transform: rotateY(0) scale(1);
55 │   }
56 │ }
57 │
58 │ @media (prefers-reduced-motion: reduce) {
59 │   .switchCard,
60 │   .cardLockOverlay {
61 │     animation: none;
62 │   }
63 │
64 │   .cardFace {
65 │     transition: none;
66 │   }
67 │ }
```
<!-- /code -->

- `cardStage` gives the card 3D perspective; `switchCard` turns it slightly (`rotateY(-22deg)`) when switching between the physical and virtual card.
- `cardFaceLocked` blurs and dims a locked card and disables pointer events and text selection.
- `cardLockOverlay` places the "Card locked" message on top with a small fade-in.
- Reduced motion (lines 58–67) removes the animations and transitions.

---

## 4. Responsive from 320 px to desktop

GoBank is **mobile-first**: the layout is designed for a phone and simply centered on larger screens (commit `63df5f1`, "allow zoom and keep layouts steady from 320px to desktop").

| Technique | Where |
| --- | --- |
| One centered column, at most 440 px wide | `Screen`, `WelcomeScreen`, GO menu |
| Fluid font sizes with `clamp(min, preferred, max)` | balance (`text-[clamp(1.6rem,8vw,2.35rem)]`), Bitcoin price, card number |
| `min-w-0` + `truncate` / `break-words` / `break-all` | long names, long amounts and goal names never push the layout wider than the screen |
| `overflow-x-clip` on `<body>` | no sideways scrolling |
| Grid layouts (`grid-cols-2`, `grid-cols-3`, `grid-cols-4`) | quick actions, presets, card picker |
| `env(safe-area-inset-bottom)` | the GO button stays above the iPhone home indicator |
| Zoom allowed (no `maximum-scale`) | users can pinch-zoom; required for low-vision users |

---

## 5. Accessibility checklist (with real examples)

| Technique | Why it matters | Example |
| --- | --- | --- |
| **Semantic elements** | screen readers understand page structure | `<header>`, `<nav aria-label="Get started">`, `<main>`, `<section aria-label="Card details">`, lists `<ul>`, definition lists `<dl>` for receipts, `<form>` for every input step, `<fieldset><legend>Pay with</legend>` in `card-picker.tsx` |
| **Labels for every input** | the field is announced by name | `TextField` links `<label htmlFor>` to the input with `useId()`; the recipient input has `<label htmlFor="recipient">` |
| **Names for icon-only buttons** | an icon has no text to read | `aria-label="Hide balance"`, `"Copy CVV"`, `"Delete last digit"`, `"Open GO shortcuts"` |
| **Toggle state** | announces on/off and selected | `aria-pressed` on filters, network choices, card picker, billers, chart range |
| **Popup state** | announces that a dialog opens | `aria-haspopup="dialog"` + `aria-expanded` on the GO button |
| **Live regions** | changes are announced without moving focus | `role="status"` ("Checking your session…", "3 of 6 digits entered", "Card number copied."); `role="alert"` for every error |
| **Screen-reader-only text** | announce what sighted users see as an icon change | `<span className="sr-only">CVV copied.</span>` |
| **Hidden decoration** | skip meaningless icons | `aria-hidden` on almost every Lucide icon and the mascot's chips |
| **Meaningful images** | describe graphics that carry information | `role="img"` + `aria-label` on the logo, the mascot, the goal progress ring ("Laptop: 45% of target") and the Bitcoin chart (summarized prices) |
| **Progress** | numeric progress is announced | `role="progressbar"` with `aria-valuemin/max/now` on the rewards bar |
| **Tabs** | standard keyboard behavior | `goal-tabs.tsx`: `role="tablist"/"tab"/"tabpanel"`, `aria-selected`, `aria-controls`, arrow keys |
| **Dialogs** | focus stays inside; Escape closes | native `<dialog>` with `showModal()` (GO menu, goal icon picker); custom focus trap + Escape in the Bitcoin review dialog |
| **Focus return** | keyboard users are not lost | the GO menu returns focus to its button after closing |
| **Visible focus** | keyboard users see where they are | `focus-visible:outline-2` / `focus-visible:ring-2` on all interactive elements |
| **Disabled content is unreachable** | locked card controls cannot be focused | `inert` + `aria-hidden` on a locked card face |
| **Keyboard input** | not everyone taps | physical keyboard digits on the PIN pad; Enter submits every form step |
| **Large touch targets** | easier for everyone | buttons 52 px tall; icon buttons 40–44 px |
| **No forced motion** | motion sensitivity | `prefers-reduced-motion` everywhere |
| **Readable inputs** | iPhones zoom into small inputs | 16 px input text |

---

## Defense questions

**Q: Why Tailwind CSS?**
A: Styles live next to the markup, so each component is self-contained. Theme tokens keep colors consistent, unused CSS is never shipped, and the Prettier plugin sorts classes. Complex animations use CSS Modules.

**Q: Is the app accessible?**
A: We used semantic HTML, labels on every input, ARIA names for icon buttons, `aria-pressed` for toggles, live regions for status and error messages, accessible tabs and dialogs with focus management, keyboard support, visible focus styles, zoom allowed, and reduced motion when the user asks for it. We have not run a formal audit with assistive-technology users; that is listed as future work.

**Q: Does it work on small phones?**
A: Yes. The layout is a single column designed from 320 px wide, with fluid font sizes and text truncation so long names and numbers never break the layout.
