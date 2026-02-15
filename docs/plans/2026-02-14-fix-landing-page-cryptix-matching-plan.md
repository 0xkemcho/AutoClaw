---
title: Fix Landing Page to Match Cryptix Design
type: fix
date: 2026-02-14
---

# Fix Landing Page to Match Cryptix Design

## Overview

The AutoClaw landing page was cloned from https://cryptix.framer.website/ but has significant visual differences that need fixing. This plan addresses all identified gaps from a thorough side-by-side comparison.

## Problem Statement

After the initial clone build, a deep visual comparison revealed these categories of differences:

1. **Missing background noise/grain texture** - Cryptix has a subtle granular texture overlay; AutoClaw is flat
2. **Sections not wrapped in bordered containers** - Cryptix wraps major sections in rounded bordered boxes
3. **Invisible/broken sections** due to Motion v12 animation bugs (pricing, how-it-works, FAQ appear ghostly/invisible)
4. **Background color mismatch** - AutoClaw uses `bg-card` (lighter) on some sections while Cryptix uses uniform dark bg
5. **Navbar CTA button wrong style** - Should be filled primary, not outline
6. **Marquee only 2 rows** instead of Cryptix's 4 rows
7. **Feature icon sizing** slightly smaller than Cryptix

## Fixes

### Fix 1: Add Noise/Grain Texture to Page Background

**File:** `apps/web/src/app/globals.css`

Add an SVG noise filter as a pseudo-element overlay on the body. This creates the subtle granular texture visible in Cryptix.

```css
@layer base {
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 256px 256px;
  }
}
```

**Why:** The grain texture is one of the most impactful visual differences. It adds a premium, tactile feel to the dark background that Cryptix has.

---

### Fix 2: Wrap All Major Sections in Bordered Containers

**Files affected:** `features-section.tsx`, `cryptos-section.tsx`, `how-it-works.tsx`, `testimonials.tsx`, `pricing-section.tsx`, `faq-section.tsx`, `cta-section.tsx`

In Cryptix, each major section's content area is wrapped in a large `rounded-2xl border border-white/[0.06]` container. The pattern is:

```tsx
<section className="py-16" id="section-id">
  <div className="mx-auto max-w-7xl px-6">
    <div className="rounded-2xl border border-white/[0.06] p-8 md:p-12">
      {/* Section header + content inside the bordered box */}
    </div>
  </div>
</section>
```

Each section needs its inner content wrapped in this bordered container. The section headings, cards, and all content go INSIDE the border.

**Key detail:** The tagline-banner section does NOT get this treatment (it uses `border-y` full-width lines instead).

---

### Fix 3: Remove All Motion `initial/animate` from Sections — Use Static Rendering

**Files affected:** ALL section components that use `motion.div` with `initial`/`animate`

**Root cause:** Motion v12's `initial={{ opacity: 0 }}` + `animate={inView ? { opacity: 1 } : {}}` pattern is unreliable in this React 19 + Next.js 15 context. When `inView` doesn't fire (or fires late), content stays at `opacity: 0` — making pricing, how-it-works, and FAQ sections invisible.

**Solution:** Remove ALL Motion animation wrappers. Replace `motion.div` with plain `div`. The hero section was already fixed this way and works perfectly.

Components to fix:
- `tagline-banner.tsx` — Remove `motion.p` with `initial/animate`, use plain `<p>`
- `features-section.tsx` — Remove `motion.div` wrappers, use plain `<div>`
- `cryptos-section.tsx` — Remove `motion.div` wrappers, use plain `<div>`
- `how-it-works.tsx` — Remove `motion.div` wrappers, use plain `<div>`
- `testimonials.tsx` — Remove outer `motion.div` wrappers (keep `AnimatePresence` for carousel which works fine)
- `pricing-section.tsx` — Remove `motion.div` wrappers, use plain `<div>`
- `faq-section.tsx` — Remove outer `motion.div` wrappers (keep `AnimatePresence` for accordion which works fine)
- `cta-section.tsx` — Remove `motion.div` wrapper, use plain `<div>`
- `dashboard-mockup.tsx` — Remove `motion.div` wrapper, use plain `<div>`

**Keep:** `AnimatePresence` for testimonial carousel transitions and FAQ accordion expand/collapse — these work because they're triggered by user interaction, not scroll.

---

### Fix 4: Unify Section Backgrounds — Remove `bg-card` Differences

**Files affected:** `features-section.tsx`, `how-it-works.tsx`, `pricing-section.tsx`

Cryptix uses the same dark background everywhere. The bordered container is distinguished only by its border, not a different background color.

- Remove `bg-card` from section-level containers
- Feature cards inside sections can keep `bg-card` for their individual cards only if they're inside the section wrapper

The page background is `oklch(0.145 0 0)` and `bg-card` is `oklch(0.195 0 0)`. The bordered wrapper should NOT have `bg-card` — it should be transparent/inherit the page bg. Only individual inner cards (feature tiles, pricing cards, step cards) should use subtle backgrounds.

---

### Fix 5: Fix Navbar CTA Button — Filled Primary Instead of Outline

**File:** `apps/web/src/app/(marketing)/_components/navbar.tsx`

Current: `variant="outline"` with subtle border styling
Should be: Filled primary button matching Cryptix's green "Use template" button (but in amber)

```tsx
<Button
  size="sm"
  className="rounded-full px-5"
  onClick={() => scrollTo('#get-started')}
>
  Get Started
</Button>
```

Remove the `variant="outline"` and custom border classes. The default Button uses `bg-primary text-primary-foreground` which gives the amber filled look.

---

### Fix 6: Add 4 Marquee Rows Instead of 2

**File:** `apps/web/src/app/(marketing)/_components/cryptos-section.tsx`

Currently renders 2 `<MarqueeRow>` components. Cryptix shows 4 rows. Add 2 more:

```tsx
<div className="space-y-3 overflow-hidden">
  <MarqueeRow />
  <MarqueeRow reverse />
  <MarqueeRow />
  <MarqueeRow reverse />
</div>
```

---

### Fix 7: Increase Feature Icon Sizes

**File:** `apps/web/src/app/(marketing)/_components/features-section.tsx`

Current icon container: `h-12 w-12` with `h-5 w-5` icons
Cryptix icons are visibly larger: ~`h-14 w-14` container with `h-6 w-6` icons

```tsx
<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.1]">
  <feature.icon className="h-6 w-6 text-muted-foreground" />
</div>
```

---

## Implementation Strategy

These fixes are independent of each other and can be parallelized:

**Agent 1 — CSS & Global Styles:** Fix 1 (noise texture)
**Agent 2 — Section Wrappers + Backgrounds:** Fix 2 (bordered containers) + Fix 4 (remove bg-card)
**Agent 3 — Remove Broken Animations:** Fix 3 (strip motion from all sections)
**Agent 4 — Small Component Fixes:** Fix 5 (navbar CTA) + Fix 6 (4 marquee rows) + Fix 7 (icon sizes)

## Acceptance Criteria

- [ ] Page has subtle noise/grain texture visible on dark background
- [ ] All major sections (features, cryptos, how-it-works, testimonials, pricing, FAQ, CTA) are wrapped in rounded bordered containers
- [ ] ALL sections are fully visible — no invisible/ghostly content
- [ ] Section backgrounds match page background (no bg-card contrast)
- [ ] Navbar CTA is a filled amber button
- [ ] Cryptos marquee shows 4 rows
- [ ] Feature icons are slightly larger
- [ ] Side-by-side comparison with Cryptix shows matching layout structure

## References

- Cryptix template: https://cryptix.framer.website/
- Hero section fix (proven pattern): `apps/web/src/app/(marketing)/_components/hero-section.tsx` — static HTML, no motion
- Globals CSS: `apps/web/src/app/globals.css`
- All section files: `apps/web/src/app/(marketing)/_components/*.tsx`
