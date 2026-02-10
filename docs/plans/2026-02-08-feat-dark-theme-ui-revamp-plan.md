---
title: "feat: Dark Theme UI Revamp with Aceternity UI"
type: feat
date: 2026-02-08
brainstorm: docs/brainstorms/2026-02-08-ui-revamp-brainstorm.md
deepened: 2026-02-08
---

# Dark Theme UI Revamp with Aceternity UI

## Enhancement Summary

**Deepened on:** 2026-02-08
**Agents used:** TypeScript Reviewer, Performance Oracle, Architecture Strategist, Pattern Recognition, Code Simplicity, Frontend Races, UI/UX Pro Max, Framework Docs Researcher, Frontend Design Skill

### Critical Discoveries

1. **CRITICAL: Tailwind v4 incompatibility** — Plan was written for v3 syntax. Project runs Tailwind CSS 4.1.18. All `tailwind.config.ts` theming, `darkMode: 'class'`, and RGB triplet CSS variables must be rewritten for v4's `@theme` CSS-first approach.
2. **CRITICAL: Performance on target devices** — Aurora blur filters, GlareCard mouse tracking, 165 concurrent Number Flow animations, and `backdrop-blur-xl` will cause severe frame drops and OOM on Samsung A03 / Tecno Spark (2-3GB RAM, Adreno 308 GPU). Need device tier system.
3. **CRITICAL: Existing swap race conditions** — Quote refresh interval races with swap execution, `handleSwap` has no re-entrancy guard, unguarded setTimeout after confirmed state. Must fix BEFORE layering animations.
4. **HIGH: Plan over-scoped** — 7 phases should be 3. Features bento grid, social proof, category tabs, and dock magnification are new features disguised as theme work. 19 CSS variables should be ~11. 6 Aceternity components should be 3.

### Key Simplifications Applied

- Consolidated 7 phases → 3 (Foundation, Pages, Polish)
- Reduced CSS variables from 19 → 11
- Removed `darkMode: 'class'` (YAGNI — no light mode exists)
- Install 3 Aceternity components, not 6 (drop unused `background-gradient-animation`, redundant `moving-border`, defer `skeleton`)
- Use Framer Motion's built-in `useReducedMotion` instead of custom hook
- Removed Phase 2.3 (features bento grid), Phase 2.4 (social proof), Phase 3.3 (category tabs) — new features, not theme work
- Skip dock magnification rewrite — just re-color existing bottom nav + add active indicator
- Replace GlareCard with CSS-only `box-shadow` glow (GlareCard = dead weight on mobile-first app)
- Limit Number Flow to 2-3 instances (portfolio balance, swap output) — plain text for token list
- Replace `AnimatePresence` page transitions with View Transitions API or skip entirely
- Use `@theme inline` in `globals.css` (Tailwind v4 native) instead of JS config

---

## Overview

Transform AutoClaw from a basic light-themed wireframe into a polished, dark-first fintech app using Aceternity UI components (aurora background, text-generate-effect), supplemented by `@number-flow/react` for key price animations. The revamp covers all 6 pages and global components with performance-conscious animations gated by device capability.

## Problem Statement

The current UI is functional but visually indistinguishable from a prototype. Every page suffers from:
- Plain white backgrounds with no depth or visual interest
- Flat, borderless layouts with no hierarchy
- No animated transitions beyond basic fade-ins
- Token/price data displayed as plain text with no visual impact
- The swap card looks like a wireframe, not a production fintech product

Competitive DeFi apps (Uniswap, Jupiter, Phantom) all use dark themes with subtle glow effects, animated numbers, and premium card designs. AutoClaw needs to match this standard.

## Proposed Solution

### Architecture

Switch to a dark-first theme system using CSS variables + Tailwind, install Aceternity UI components as the design foundation, and layer in Number Flow for price animations and Motion Primitives for the bottom dock.

### New Dependencies

```
aceternity-ui components (copy-paste, not npm — 3 standalone .tsx files)
@number-flow/react — animated number transitions (limited to 2-3 instances)
clsx + tailwind-merge — utility for conditional classes (create cn() in lib/utils.ts)
```

### Color System Overhaul (Tailwind v4 Native)

**IMPORTANT:** Project runs Tailwind CSS 4.1.18. Use `@theme inline` in `globals.css`, NOT `tailwind.config.ts` `darkMode: 'class'` or RGB triplet variables (those are v3 patterns).

```css
/* globals.css — Tailwind v4 dark-first theme */
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
@import 'tailwindcss';

@theme inline {
  --color-background: #0A0A0A;
  --color-background-secondary: #121212;
  --color-background-card: #1A1A1A;

  --color-foreground: #FAFAFA;
  --color-foreground-secondary: #A3A3A3;
  --color-foreground-muted: #8A8A8A;  /* bumped for WCAG AA 5.2:1 */

  --color-accent: #6366F1;
  --color-accent-text: #818CF8;  /* indigo-400, 6.0:1 for text on dark */

  --color-success: #22C55E;
  --color-error: #EF4444;
  --color-warning: #F59E0B;

  --color-border: #262626;
}
```

This generates Tailwind utilities automatically: `bg-background`, `text-foreground`, `border-border`, etc. No JS config changes needed for colors. Opacity modifiers (`bg-accent/20`) work natively with hex values in Tailwind v4.

**11 tokens total** (down from 19). Removed: `background-elevated` (use `background-card`), `accent-glow` (use `bg-accent/20`), `border-hover` (use `hover:border-neutral-600`), `gold` (unused), `cta`/`cta-hover`/`cta-text` (accent IS the CTA color).

**White flash prevention** — Add to `<html>` inline in layout.tsx:
```html
<html style="background-color:#0A0A0A; color-scheme:dark">
```

---

## Pre-Requisite: Fix Existing Swap Race Conditions

**MUST complete before any UI work** (discovered by Frontend Races Reviewer):

1. **Quote refresh races with swap execution** — `handleSwap` must explicitly clear the 30s interval via ref before starting, not rely on React effect cleanup
2. **No re-entrancy guard on `handleSwap`** — Add `useRef` boolean guard to prevent double-tap double-transaction
3. **Unguarded `setTimeout` after confirmed state** — Store timeout in ref, cancel on any state transition

```typescript
// Fix pattern for swap-card.tsx
const swapInProgressRef = useRef(false);
const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

const handleSwap = async () => {
  if (swapInProgressRef.current) return;
  swapInProgressRef.current = true;
  if (refreshRef.current) clearInterval(refreshRef.current);
  clearTimeout(resetTimeoutRef.current);
  try { /* ... approve + swap ... */ }
  finally { swapInProgressRef.current = false; }
};
```

---

## Implementation Phases (Consolidated: 3 Phases)

### Phase A: Dark Foundation (Mechanical Sweep + Theme + Components)

**Goal:** Atomically switch from light to dark. The sweep and the CSS variables must ship together — the app is broken between them.

#### A.1 Update globals.css with `@theme inline` (Tailwind v4)
- **File:** `apps/web/src/app/globals.css`
  - Add `@theme inline` block with all 11 color tokens (see Color System above)
  - Add aurora keyframe: `--animate-aurora: aurora 60s linear infinite`
  - Add global focus style: `*:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`
  - Add base body styles

#### A.2 Update Tailwind Config (Minimal — v4 compat layer)
- **File:** `apps/web/tailwind.config.ts`
  - Remove hardcoded color hex values (now in `@theme inline`)
  - Keep `fontFamily`, `borderRadius` extensions (these still work in v4 compat)
  - Remove the `dark-card` color namespace (orphaned — every card is dark now)
  - Do NOT add `darkMode: 'class'` — not needed and not v4 syntax

#### A.3 Mechanical Search-and-Replace Sweep
Global search-and-replace across `apps/web/src/`:

| Find | Replace With | Occurrences |
|------|-------------|-------------|
| `bg-white` | `bg-background` | ~19 instances |
| `bg-black` | `bg-accent` (CTA) or `bg-foreground` (chip) | ~3 instances |
| `text-black` | `text-foreground` | ~11 instances |
| `text-white` (hardcoded) | `text-foreground` | ~7 instances |
| `text-gray-400` | `text-foreground-muted` | ~8 instances |
| `text-gray-500` | `text-foreground-secondary` | ~6 instances |
| `text-gray-600` | `text-foreground-secondary` | ~3 instances |
| `text-red-500` | `text-error` | ~3 instances |
| `border-gray-100` / `border-gray-200` / `border-gray-300` | `border-border` | ~11 instances |
| `border-black` (spinners) | `border-foreground-secondary` | ~7 instances |
| `bg-white/80` | `bg-background-card/80` | ~2 instances |
| `hover:bg-gray-50` / `hover:bg-gray-800` | `hover:bg-background-secondary` | ~3 instances |
| `text-white/60` / `text-white/70` / `text-white/40` | `text-foreground-secondary` / `text-foreground-muted` | ~3 instances |

Also sweep for inline hex strings in JS/TSX (`#[0-9a-fA-F]{3,8}`) — catches hardcoded colors in `thirdweb.ts`, `sparkline.tsx`, `token/[symbol]/page.tsx`.

#### A.4 Extract `<Spinner />` Component
- Extract the spinner pattern (7 files, identical markup) into `apps/web/src/components/ui/spinner.tsx`
- Single reusable component: `<Spinner size="sm" | "md" | "lg" />`
- Replace all 7 instances

#### A.5 Fix Loading Spinners (in Spinner component)
- Use `border-foreground-secondary border-t-transparent` (visible on dark bg)

#### A.6 Update Thirdweb Theme
- **File:** `apps/web/src/lib/thirdweb.ts`
  - Change `lightTheme()` to `darkTheme()` with matching dark colors
  - Update `connectButtonStyle` background/border for dark
  - Verify `detailsButtonStyle` is actually used (may be dead code — if unused, delete)

#### A.7 Fix Protected Route + Layout
- **File:** `apps/web/src/components/protected-route.tsx` — dark full-page states
- **File:** `apps/web/src/app/layout.tsx` — inline bg style + `color-scheme:dark` + body classes

#### A.8 Create Utility Functions
- Create `apps/web/src/lib/utils.ts` with `cn()` function (clsx + tailwind-merge)
  - Install `clsx` and `tailwind-merge` as dependencies
  - Normalize className merging pattern before Aceternity components arrive

#### A.9 Install Aceternity UI Components (3 only)
Create `apps/web/src/components/ui/aceternity/` directory:
- `aurora-background.tsx` — for landing page hero only
- `text-generate-effect.tsx` — for landing headline only

Add source-tracking comment to each file:
```typescript
// Source: https://ui.aceternity.com/components/aurora-background
// Copied: 2026-02-08
// Modified: [describe changes]
```

**Type audit gate** — before committing each pasted component:
- Zero `any` usage — replace with proper generics or `unknown`
- All components extend `HTMLAttributes<T>` for their root element
- All `useRef` calls have explicit generic type parameters
- All imports use `framer-motion` (not `motion` package) — consistent with existing codebase
- All `useEffect` hooks have proper cleanup

#### A.10 Install Number Flow
- `pnpm add @number-flow/react` in `apps/web/`
- Create wrapper: `apps/web/src/components/ui/animated-number.tsx`
  - Mark `'use client'`
  - Use discriminated union for type safety:
    ```typescript
    type AnimatedNumberProps =
      | { format: 'currency'; value: number; currency?: string }
      | { format: 'percent'; value: number; colorBySign?: boolean }
      | { format: 'token'; value: number; decimals?: number; symbol?: string }
      | { format: 'integer'; value: number };
    ```
  - Handle SSR: use `tabular-nums` className for CLS prevention
  - Respect reduced motion: `animated={!prefersReducedMotion}` (use Framer Motion's built-in `useReducedMotion`)
  - **Before replacing `count-up.tsx`:** Test mid-animation retargeting (feed value A, then value B before animation completes). If Number Flow snaps instead of smoothly redirecting, keep CountUp.

#### A.11 Update Core UI Primitives
- **File:** `apps/web/src/components/ui/button.tsx`
  - Update `cta` variant to indigo + glow on hover (fold glow INTO cta, not a separate variant)
  - Add loading spinner state
- **File:** `apps/web/src/components/ui/card.tsx`
  - Default becomes dark (`bg-background-card border-border`)
  - Remove `dark` variant (renamed semantically: it's now `default`)
  - Use `className` overrides for one-off glass/glow treatments (no new variants)
- **File:** `apps/web/src/components/ui/chip.tsx`
  - Update selected/unselected colors for dark theme (currently `bg-black text-white` / `bg-white text-black`)

#### A.12 Update Header
- **File:** `apps/web/src/components/header.tsx`
  - Dark bg with optional subtle blur: `bg-background-card/95` (solid fallback default)
  - Only add `backdrop-blur-md` inside `@supports` + desktop media query
  - Wallet address pill: `bg-background-secondary border border-border`

#### A.13 Update Bottom Nav (Re-color Only — No Dock Rewrite)
- **File:** `apps/web/src/components/bottom-nav.tsx`
  - Update colors: `bg-background-card/95 border-t border-border`
  - Add active indicator: simple CSS `transition: transform 0.2s ease` pill under active icon
  - Add `pb-[env(safe-area-inset-bottom)]` for iOS
  - Keep existing 40-line structure — no magnification, no spring physics
  - Ensure 44x44px touch targets

#### A.14 Update Toast Theme
- **File:** `apps/web/src/components/ui/toast-provider.tsx`
  - Switch Sonner to `theme="dark"`

**Phase A Deliverables:**
- [ ] Zero hardcoded light-theme values remain (including `bg-black`, `text-white`, `text-red-500`, inline hex)
- [ ] `@theme inline` with 11 color tokens in globals.css
- [ ] Spinner extracted to reusable component
- [ ] cn() utility available
- [ ] All primitives dark-themed (Button, Card, Chip, Header, BottomNav, Toast)
- [ ] Aceternity components installed (2 files) with type audit
- [ ] AnimatedNumber wrapper with discriminated union types
- [ ] White flash prevented (inline style on `<html>`)
- [ ] Thirdweb dark theme
- [ ] Swap race conditions fixed

---

### Phase B: Page-by-Page Updates (All Pages)

**Goal:** Apply dark theme + visual upgrades to each page. Pages are independent — can be done in any order or parallel.

#### B.1 Landing Page (`/`)
- **File:** `apps/web/src/app/page.tsx` (rewrite)
  - Wrap hero in `AuroraBackground` (landing page only — place outside any future AnimatePresence boundary)
  - **Performance gate:** On low-tier devices (see device tier hook below), replace aurora with static radial gradient
  - Headline: use `TextGenerateEffect` for word-by-word reveal
  - Subtitle: fade-in with 200ms delay
  - CTA button: indigo + glow hover (existing `cta` variant)
  - Stats row: `AnimatedNumber` for stat counters (one of the 2-3 allowed instances)
  - Aurora reduced-motion fallback: static gradient (NOT removal of all background)

#### B.2 Home/Market Page (`/home`)
- **File:** `apps/web/src/app/home/page.tsx` (rewrite)
  - Portfolio summary card: dark bg, `AnimatedNumber` for balance (second allowed instance)
  - 24h P&L: green/red text, no animation needed (plain text + color class)
- **File:** `apps/web/src/components/token-row-card.tsx` (update)
  - Dark card rows with hover border transition (CSS only — `hover:border-border-hover transition-colors`)
  - Prices: plain text with `tabular-nums` (NOT Number Flow — too many instances)
  - Price change indicator: CSS color flash on update (green/red className toggle, 1s transition) instead of digit animation
  - Cap stagger to first 8 rows: `const shouldAnimate = index < 8;` Items below fold render immediately
  - Use `whileInView={{ once: true }}` to prevent re-staggering on re-navigation
- **File:** `apps/web/src/components/ui/sparkline.tsx` (update)
  - Update colors for dark theme
  - Replace `motion.path` with CSS `stroke-dashoffset` animation (eliminates 15+ Framer Motion instances on mount)
- Deprecate and delete `apps/web/src/components/ui/count-up.tsx` (replaced by AnimatedNumber wrapper)

#### B.3 Swap Page (`/swap`)
- **File:** `apps/web/src/components/swap/swap-card.tsx` (update)
  - CSS-only glow effect (NOT GlareCard): `box-shadow: 0 0 40px rgb(var(--color-accent) / 0.08); border: 1px solid rgb(var(--color-accent) / 0.15);`
  - Dark background, larger padding
  - Preserve existing `SwapState` discriminated union — extend with new states if needed, never replace with booleans
- **File:** `apps/web/src/components/swap/swap-token-input.tsx` (update)
  - Dark input styling, larger font for amounts
- **File:** `apps/web/src/components/swap/swap-details.tsx` (update)
  - Dark muted background
- **File:** `apps/web/src/components/swap/token-selector-modal.tsx` (update)
  - Dark overlay + dark modal card
  - Set `mode="wait"` on AnimatePresence to prevent double-modal race
- **File:** `apps/web/src/components/swap/slippage-settings.tsx` (update)
  - Dark popover + chip colors

#### B.4 Token Detail Page (`/token/[symbol]`)
- **File:** `apps/web/src/app/token/[symbol]/page.tsx` (update)
  - Dark background, dark Recharts theme (grid, axis, tooltip)
  - Centralize hardcoded color constants (`#10B981`, `#EF4444`) in CSS variables

#### B.5 Settings Page (`/settings`)
- **File:** `apps/web/src/app/settings/page.tsx` (rewrite)
  - Card-based sections with `bg-background-card`
  - Risk profile: visual badge with color coding

#### B.6 Onboarding Page (`/onboarding`)
- **File:** `apps/web/src/app/onboarding/page.tsx` (update)
  - Dark background, dark question cards, dark chip colors
  - Fix duplicate "Connect Wallet" screen (same markup as protected-route.tsx) — extract shared component if both need updates

**Phase B Deliverables:**
- [ ] All 6 pages render correctly with dark theme
- [ ] Aurora background on landing (with device-tier gate)
- [ ] AnimatedNumber on portfolio balance + landing stats only
- [ ] Token list uses plain text prices with CSS color flash
- [ ] Sparkline uses CSS animation (not Framer Motion)
- [ ] Swap card uses CSS glow (not GlareCard)
- [ ] Token selector modal has `mode="wait"` on AnimatePresence
- [ ] All existing functionality preserved

---

### Phase C: Polish & Performance

**Goal:** Final hover states, focus rings, loading states, device capability gating.

#### C.1 Device Capability Tier System
- Create `apps/web/src/hooks/use-device-tier.ts`:
  ```typescript
  type DeviceTier = 'high' | 'mid' | 'low';
  // Detect via navigator.hardwareConcurrency, navigator.deviceMemory, userAgent (MiniPay/Opera)
  // low: ≤2 cores or ≤2GB RAM or MiniPay → no blur, no aurora animation, no Number Flow
  // mid: ≤4 cores or ≤4GB → simple transitions only, blur-sm max
  // high: full animation suite
  ```
- Gate all animation decisions on this tier
- Aurora: animated on high, static gradient on mid/low
- `backdrop-blur`: only on high+desktop, solid bg everywhere else

#### C.2 Loading States
- Add CSS `animate-pulse` skeleton loaders (Tailwind built-in, no Aceternity component needed)
- Token list: skeleton rows
- Swap quote: shimmer on rate display

#### C.3 Focus & Hover States
- Global `*:focus-visible` already added in Phase A.1
- Cards: `hover:border-neutral-600 transition-colors` (CSS only)
- Buttons: use `brightness(1.1)` on hover (NOT `scale(1.02)` — scale causes layout shift in flex containers)
- Add `cursor-pointer` to all clickable cards and token rows

#### C.4 Empty States
- "No tokens found": icon + message on dark background
- Loading: skeleton grid

**Phase C Deliverables:**
- [ ] Device tier system implemented and gating animations
- [ ] Skeleton loading states
- [ ] Consistent hover/focus states (no layout shift)
- [ ] Empty state designs
- [ ] `prefers-reduced-motion` respected via Framer Motion built-in

---

## Acceptance Criteria

### Functional Requirements
- [ ] All 6 pages render correctly with dark theme
- [ ] No white flash on page load (inline `background-color:#0A0A0A; color-scheme:dark` on `<html>`)
- [ ] Portfolio balance + landing stats use AnimatedNumber (2-3 instances max)
- [ ] Token list uses plain text prices with `tabular-nums` and CSS color flash
- [ ] Swap card has CSS-only glow effect (box-shadow, not GlareCard)
- [ ] Bottom nav re-colored with active indicator pill (no dock rewrite)
- [ ] Landing page has aurora background (with static gradient fallback for low-tier devices)
- [ ] Token selector modal has dark theme with `mode="wait"` on AnimatePresence
- [ ] Swap race conditions fixed (re-entrancy guard, interval clearing, timeout refs)
- [ ] All existing functionality preserved (swap, onboarding, auth)

### Non-Functional Requirements
- [ ] No Lighthouse performance regression > 5 points
- [ ] All animations run at 60fps on mid-tier devices (Samsung A03)
- [ ] First Contentful Paint < 1.5s
- [ ] No layout shift (CLS < 0.1)
- [ ] Responsive on 320px–1440px viewports
- [ ] Device tier system gates animations (low/mid/high)

### Quality Gates
- [ ] Zero hardcoded light-theme values remain (`bg-white`, `text-black`, `border-gray-*`, inline hex)
- [ ] Visual comparison against current screenshots shows clear improvement
- [ ] No broken links or missing pages
- [ ] Thirdweb wallet modal works with dark theme
- [ ] All Framer Motion animations respect `useReducedMotion` (built-in)
- [ ] Sparklines use CSS `stroke-dashoffset` (not `motion.path`)

---

## File Change Summary

| File | Action | Phase |
|------|--------|-------|
| **Pre-Requisite — Swap Race Fixes** | | |
| `apps/web/src/components/swap/swap-card.tsx` | Fix — re-entrancy guard, interval clearing, timeout refs | Pre |
| **Phase A — Dark Foundation** | | |
| `apps/web/src/app/globals.css` | Major update — `@theme inline` with 11 color tokens, aurora keyframe, focus-visible | A.1 |
| `apps/web/tailwind.config.ts` | Update — remove hardcoded colors, keep fontFamily/borderRadius | A.2 |
| _All files with hardcoded light values_ | Search-and-replace sweep (~13 files) | A.3 |
| `apps/web/src/components/ui/spinner.tsx` | New — extracted from 7 duplicate files | A.4 |
| `apps/web/src/lib/thirdweb.ts` | Update — `darkTheme()` + dark styles | A.6 |
| `apps/web/src/components/protected-route.tsx` | Update — dark full-page states | A.7 |
| `apps/web/src/app/layout.tsx` | Update — inline bg style, `color-scheme:dark`, body classes | A.7 |
| `apps/web/src/lib/utils.ts` | New — `cn()` utility (clsx + tailwind-merge) | A.8 |
| `apps/web/src/components/ui/aceternity/aurora-background.tsx` | New — copy-paste, type-audited | A.9 |
| `apps/web/src/components/ui/aceternity/text-generate-effect.tsx` | New — copy-paste, type-audited | A.9 |
| `apps/web/src/components/ui/animated-number.tsx` | New — Number Flow wrapper with discriminated unions | A.10 |
| `apps/web/src/components/ui/button.tsx` | Update — indigo CTA + glow hover, loading state | A.11 |
| `apps/web/src/components/ui/card.tsx` | Update — dark default, remove `dark` variant | A.11 |
| `apps/web/src/components/ui/chip.tsx` | Update — dark selected/unselected colors | A.11 |
| `apps/web/src/components/header.tsx` | Update — dark bg, conditional blur | A.12 |
| `apps/web/src/components/bottom-nav.tsx` | Update — dark colors, active indicator, safe-area | A.13 |
| `apps/web/src/components/ui/toast-provider.tsx` | Update — `theme="dark"` | A.14 |
| **Phase B — Page Updates** | | |
| `apps/web/src/app/page.tsx` | Rewrite — dark hero with aurora + TextGenerateEffect | B.1 |
| `apps/web/src/app/home/page.tsx` | Rewrite — dark dashboard + portfolio card | B.2 |
| `apps/web/src/components/token-row-card.tsx` | Update — dark rows, plain text prices, capped stagger | B.2 |
| `apps/web/src/components/ui/sparkline.tsx` | Update — CSS stroke-dashoffset (replace motion.path) | B.2 |
| `apps/web/src/components/ui/count-up.tsx` | Delete — replaced by AnimatedNumber | B.2 |
| `apps/web/src/components/swap/swap-card.tsx` | Update — CSS glow, dark bg (NOT GlareCard) | B.3 |
| `apps/web/src/components/swap/swap-token-input.tsx` | Update — dark input styling | B.3 |
| `apps/web/src/components/swap/swap-details.tsx` | Update — dark muted bg | B.3 |
| `apps/web/src/components/swap/token-selector-modal.tsx` | Update — dark modal, `mode="wait"` | B.3 |
| `apps/web/src/components/swap/slippage-settings.tsx` | Update — dark popover + chips | B.3 |
| `apps/web/src/app/token/[symbol]/page.tsx` | Update — dark chart, centralize color constants | B.4 |
| `apps/web/src/app/settings/page.tsx` | Rewrite — card-based dark layout | B.5 |
| `apps/web/src/app/onboarding/page.tsx` | Update — dark bg, cards, chips | B.6 |
| **Phase C — Polish** | | |
| `apps/web/src/hooks/use-device-tier.ts` | New — device capability detection | C.1 |
| _Various files_ | Add skeleton loaders, focus/hover states, empty states | C.2–C.4 |

**Total: ~25 files changed, ~6 new files created**

---

## Mobile & MiniPay Considerations

| Concern | Solution | Phase |
|---------|----------|-------|
| `backdrop-blur` may not work in MiniPay webview | Solid bg default (`bg-background-card/95`), blur only in `@supports` + desktop (Phase A.12) | A |
| Safe area insets on iOS | Add `pb-[env(safe-area-inset-bottom)]` to bottom nav container | A.13 |
| Aurora background on low-end Android / MiniPay | Device tier system: static gradient fallback for `low` tier (Phase C.1), `requestAnimationFrame` degradation | B.1 + C.1 |
| GlareCard on mobile | **Removed from plan.** Using CSS-only `box-shadow` glow instead — works on all devices | B.3 |
| Touch target sizes on bottom nav | Ensure minimum 44x44px tap areas (Phase A.13) | A.13 |
| 320px viewport | Test swap card layout at minimum width, stack elements vertically if needed | B.3 |
| White flash on initial load | Inline `style="background-color:#0A0A0A; color-scheme:dark"` on `<html>` (Phase A.7) | A.7 |
| Number Flow instance count | Limited to 2-3 instances only (portfolio balance, landing stats). Token list uses plain text. | B.2 |
| Samsung A03 / Tecno Spark (2-3GB RAM) | Device tier system gates all animations. Low tier: no blur, no aurora animation, no Number Flow | C.1 |
| Dock magnification on touch | **Removed from plan.** Bottom nav is re-colored only with simple CSS active indicator | A.13 |

---

## Dependencies & Prerequisites

### npm Dependencies (New)
- `@number-flow/react` — animated number transitions (~3KB gzipped)
- `clsx` + `tailwind-merge` — className utility for `cn()` helper

### Copy-Paste Components (No npm)
- Aceternity UI `aurora-background.tsx` — MIT licensed, type-audited before committing
- Aceternity UI `text-generate-effect.tsx` — MIT licensed, type-audited before committing

### Existing Dependencies (Config Changes Only)
- Thirdweb: `lightTheme()` → `darkTheme()` (Phase A.6)
- Recharts: dark theme config for chart grid/axis/tooltip (Phase B.4)
- Sonner: `theme="dark"` (Phase A.14)
- Framer Motion: already installed, use `LazyMotion` + `m` for bundle savings where possible

### No Changes Needed
- No external API changes — purely frontend
- No database changes
- No backend changes

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Tailwind v4 `@theme inline` syntax errors** | Medium | High | Test color token resolution immediately after Phase A.1. If `bg-background` doesn't resolve, check `@theme inline` block syntax against Tailwind v4 docs. |
| **Aceternity components assume Tailwind v3 classes** | High | Medium | Type audit gate (Phase A.9). Rewrite any v3 utility classes (`dark:`, `ring-*`) to v4 equivalents before committing. |
| **Aurora blur kills frame rate on target devices** | High | High | Device tier system (Phase C.1). But even before C.1 ships, test aurora on Samsung A03 / Tecno Spark. If unacceptable, ship with static gradient only. |
| **Number Flow retargeting regression** | Medium | Medium | Test mid-animation retargeting before deleting `count-up.tsx` (Phase A.10). If Number Flow snaps, keep CountUp. |
| **Swap race conditions surface during UI work** | High | High | Fix in Pre-Requisite phase before any visual work. Re-entrancy guard + interval clearing + timeout refs. |
| **Thirdweb modal styling mismatch** | Low | Low | Thirdweb supports `darkTheme()` natively. Verify `detailsButtonStyle` isn't dead code. |
| **Existing tests break** | Low | Medium | No tests currently — manual QA needed. Test all flows: onboarding, swap, token detail, settings. |
| **Mechanical sweep misses hardcoded values** | Medium | Low | Grep for `#[0-9a-fA-F]{3,8}` in JS/TSX after sweep to catch inline hex. Check `thirdweb.ts`, `sparkline.tsx`, `token/[symbol]/page.tsx`. |

## References

### Internal
- Brainstorm: `docs/brainstorms/2026-02-08-ui-revamp-brainstorm.md`
- Spec: `SPEC.md` (Section 7 — UI/UX Design System — update to reflect dark-first direction)
- Current Tailwind config: `apps/web/tailwind.config.ts`

### External — Documentation
- Tailwind CSS v4 `@theme`: https://tailwindcss.com/docs/theme
- Tailwind CSS v4 migration: https://tailwindcss.com/docs/upgrade-guide
- Aceternity UI: https://ui.aceternity.com
- Number Flow: https://number-flow.barvian.me
- Framer Motion `useReducedMotion`: https://www.framer.com/motion/use-reduced-motion/

### 21st.dev Component Inspiration (Reference Only)
- Heroes: https://21st.dev/community/components/s/hero
- Backgrounds: https://21st.dev/community/components/s/background
- Numbers: https://21st.dev/community/components/s/number
- Cards: https://21st.dev/community/components/s/card
- Buttons: https://21st.dev/community/components/s/button
