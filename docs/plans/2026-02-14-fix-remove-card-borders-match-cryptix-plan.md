---
title: "fix: Remove all card borders and match Cryptix template exactly"
type: fix
date: 2026-02-14
---

# fix: Remove All Card Borders and Match Cryptix Template Exactly

## Overview

AutoClaw's landing page adds `rounded-2xl border border-white/[0.06]` borders to virtually every card, container, and interactive element. The Cryptix template uses **zero visible borders** on these elements — cards float directly on the dark background with no outlines. This plan documents every border/styling difference found through detailed visual comparison and DOM inspection of both sites, and assigns them to 5 parallel agents for implementation.

## Problem Statement

After the first round of Cryptix matching fixes, a detailed side-by-side comparison revealed that AutoClaw still has visible rounded borders on all cards across every section. Cryptix achieves its clean, borderless aesthetic by relying on subtle background differences and spacing rather than explicit borders. Additionally, the FAQ section is missing a vertical divider line between its two columns, and the dashboard mockup uses a fake logo instead of the real `<Logo />` component.

## Proposed Solution

Remove all card/container borders, top glow lines, and other border decorations across 7 component files. Add the missing FAQ vertical divider. Replace the dashboard mock logo. Changes are purely CSS/className modifications with no logic changes.

## Implementation Plan — 5 Parallel Agents

### Agent 1: Features Section + CTA Section

**Files:** `features-section.tsx`, `cta-section.tsx`

#### `features-section.tsx`

1. **Remove card borders** (line 48)
   - Change: `className="group relative overflow-hidden rounded-2xl border border-white/[0.06] p-6"`
   - To: `className="group relative overflow-hidden p-6"`

2. **Remove icon circle borders** (line 53)
   - Change: `className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.1]"`
   - To: `className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"`

3. **Remove top glow line** (line 51)
   - Delete: `<div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />`

#### `cta-section.tsx`

4. Verify no remaining card borders (section already uses `border-y` on `<section>` — should be correct)

---

### Agent 2: How It Works Section

**File:** `how-it-works.tsx`

1. **Remove step card borders** (line 131)
   - Change: `className="group relative overflow-hidden rounded-2xl border border-white/[0.06]"`
   - To: `className="group relative overflow-hidden"`

2. **Change step numbers from circle to plain text** (line 137)
   - Change: `className="absolute left-5 top-5 flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 text-xs font-semibold text-primary"`
   - To: `className="absolute left-5 top-5 text-lg font-normal text-muted-foreground"`
   - Rationale: Cryptix step numbers are just bare text — 18px, normal weight, light gray color, no circle/border/background

3. **Remove top glow line from step cards** (line 134)
   - Delete: `<div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />`

4. **Remove horizontal divider between mock UI and label** (line 145)
   - Change: `className="border-t border-white/[0.06] px-5 py-4"`
   - To: `className="px-5 py-4"`

---

### Agent 3: Pricing Section + Testimonials Section

**File:** `pricing-section.tsx`

1. **Remove pricing card borders** (lines 120-124)
   - Change the conditional border class:
   ```
   plan.popular ? 'border-primary/30' : 'border-white/[0.06]'
   ```
   - To: Remove the `border` class entirely from the card. Keep `relative overflow-hidden rounded-2xl p-6` (keep rounded-2xl for internal layout if needed, but remove `border` and the conditional border color)
   - Actually simplify to: `className="relative overflow-hidden rounded-2xl p-6"`

2. **Remove popular card top glow** (line 128)
   - Delete: `<div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />`

**File:** `testimonials.tsx`

3. **Remove testimonial card border** (line 58)
   - Change: `className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-8 md:p-10"`
   - To: `className="relative overflow-hidden p-8 md:p-10"`

4. **Remove Previous/Next button borders** (lines 99-100, 106-107)
   - Change: `className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.06] py-4 text-sm text-muted-foreground transition-colors hover:text-foreground md:py-0"`
   - To: `className="flex flex-1 items-center justify-center gap-2 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground md:py-0"`

---

### Agent 4: Cryptos Section (Token Pills) + FAQ Vertical Divider

**File:** `cryptos-section.tsx`

1. **Remove token pill borders** (line 18)
   - Change: `className="flex shrink-0 items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2"`
   - To: `className="flex shrink-0 items-center gap-3 rounded-full px-4 py-2"`
   - Note: Also remove `bg-white/[0.03]` since Cryptix token pills have no visible background

**File:** `faq-section.tsx`

2. **Add vertical divider between FAQ columns** (line 108)
   - Change the grid from:
   ```tsx
   <div className="mt-12 grid gap-x-8 md:grid-cols-2">
     <div>...</div>
     <div>...</div>
   </div>
   ```
   - To a 3-column grid with a 1px divider in the middle:
   ```tsx
   <div className="mt-12 grid gap-x-8 md:grid-cols-[1fr_1px_1fr]">
     <div>...</div>
     <div className="hidden bg-white/[0.06] md:block" />
     <div>...</div>
   </div>
   ```

---

### Agent 5: Dashboard Mockup Logo

**File:** `dashboard-mockup.tsx`

1. **Replace fake logo with real Logo component** (lines 22-25)
   - Add import: `import { Logo } from '@/components/logo';`
   - Change:
   ```tsx
   <div className="flex items-center gap-3">
     <div className="h-5 w-5 rounded bg-primary/80" />
     <span className="text-sm font-semibold">AutoClaw</span>
   </div>
   ```
   - To:
   ```tsx
   <Logo size="sm" />
   ```

---

## Acceptance Criteria

- [ ] No visible `border` on any card in: Features, How It Works, Pricing, Testimonials, Cryptos sections
- [ ] Feature icon circles have no visible border ring
- [ ] No top glow gradient lines on any cards
- [ ] How It Works step numbers are plain text (no circle, no border, no amber color)
- [ ] How It Works cards have no horizontal divider between mock UI and label
- [ ] FAQ section has a 1px vertical line between left and right columns (desktop only)
- [ ] Token pills in Cryptos section have no border and no background
- [ ] Dashboard mockup uses real `<Logo />` component
- [ ] Testimonial Previous/Next buttons have no border
- [ ] Build passes (`pnpm build`)
- [ ] Visual match with Cryptix template confirmed via side-by-side screenshots

## References

- Cryptix template: https://cryptix.framer.website/
- Previous fix plan: `docs/plans/2026-02-14-fix-landing-page-cryptix-matching-plan.md`
- Component files:
  - `apps/web/src/app/(marketing)/_components/features-section.tsx`
  - `apps/web/src/app/(marketing)/_components/how-it-works.tsx`
  - `apps/web/src/app/(marketing)/_components/pricing-section.tsx`
  - `apps/web/src/app/(marketing)/_components/testimonials.tsx`
  - `apps/web/src/app/(marketing)/_components/cryptos-section.tsx`
  - `apps/web/src/app/(marketing)/_components/faq-section.tsx`
  - `apps/web/src/app/(marketing)/_components/dashboard-mockup.tsx`
