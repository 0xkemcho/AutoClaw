# UI Revamp Brainstorm

**Date:** 2026-02-08
**Status:** Draft

---

## Current UI Audit

### Screenshots Captured
- **Landing Page** (`/`): Minimal hero with logo, tagline, CTA button, and stats row
- **Home/Market** (`/home`): Simple list of tokens (USDm, EURm) with prices and % change
- **Swap** (`/swap`): Basic card with FROM/TO inputs and token selector
- **Settings** (`/settings`): Bare-bones page with user name, risk profile, and retake button

### Current Stack
- Next.js 15 + React 19 + Tailwind CSS 4
- Framer Motion (already installed)
- Recharts (for sparklines)
- Lucide React (icons)
- Sonner (toasts)
- Open Sans + JetBrains Mono fonts

### Key Issues Identified

| Page | Problem | Severity |
|------|---------|----------|
| Landing `/` | Too plain — white bg, no visual punch, no gradient/animated background, stats row feels disconnected | High |
| Landing `/` | CTA button is just a solid black rectangle — no hover animation, no glow, no personality | Medium |
| Home `/home` | Token list is sparse — no sparkline charts visible, no portfolio summary, no balance card | High |
| Home `/home` | No visual hierarchy — "Market" heading with flat list, no cards or grouping | High |
| Swap `/swap` | Swap card looks like a wireframe — thin borders, no depth, no gradient or glass effect | High |
| Swap `/swap` | Token selector buttons are tiny and plain, swap arrow feels disconnected | Medium |
| Settings `/settings` | Almost empty page — just text and an emoji, no card containers, no structure | High |
| Global | Header is functional but boring — plain text logo + truncated address | Medium |
| Global | Bottom nav (mobile) is basic — no animations, no active state highlighting | Medium |
| Global | Color palette is essentially black-on-white with no accent gradients or visual interest | High |

---

## 21st.dev Component Inspiration & Resources

### 1. Landing Page Hero
**Your need:** Replace the plain white hero with something that screams "premium fintech"

| Component | Author | Why It's Relevant | Link |
|-----------|--------|-------------------|------|
| Hero Section Dark | KinfeMichael Tariku | Dark bg with gradient CTA, dashboard preview below fold — perfect fintech vibe | https://21st.dev/community/components/s/hero |
| Hero 2 (Default Demo) | HextaUI | Dashboard-embedded hero with stats, charts, revenue cards — exactly what a fintech landing needs | https://21st.dev/community/components/s/hero |
| Liquid Metal Hero | Caio Bonato | Fluid metallic animation background — premium feel for "FX Investing" | https://21st.dev/community/components/s/hero |
| Aurora Background | Aceternity UI | Ethereal glow background — great for a landing page hero section | https://21st.dev/community/components/s/hero |

### 2. Animated Backgrounds
**Your need:** Add depth and motion to the landing page and inner pages

| Component | Author | Why It's Relevant | Link |
|-----------|--------|-------------------|------|
| Shape Landing Hero | Kokonut UI | Animated geometric shapes — modern landing bg | https://21st.dev/community/components/s/background |
| Background Circles | Kokonut UI | Radial glow circles — great for fintech dark theme | https://21st.dev/community/components/s/background |
| Background Paths | Kokonut UI | Animated path lines — subtle elegance | https://21st.dev/community/components/s/background |
| Shooting Stars | Aceternity UI | Customizable particle effects | https://21st.dev/community/components/s/background |
| Stars Background | Aceternity UI | Canvas-based starry background with twinkle | https://21st.dev/community/components/s/background |

### 3. Number/Stats Display (Market Data + Portfolio)
**Your need:** Replace flat text prices with animated, beautiful number displays

| Component | Author | Why It's Relevant | Link |
|-----------|--------|-------------------|------|
| Stats Section | Tommy Jepsen | Revenue, users, cost stats with sparklines — perfect for portfolio overview | https://21st.dev/community/components/s/number |
| Activity with Number Flow | Maxwell Barvian | Animated social-style counters — great for price tickers | https://21st.dev/community/components/s/number |
| Number Flow | Maxwell Barvian | Animated number transitions with comma formatting — ideal for live prices | https://21st.dev/community/components/s/number |
| Animated Counter | Build UI | Large animated counter digits — flashy for hero stats | https://21st.dev/community/components/s/number |

### 4. Cards (Token Cards, Swap Card, Portfolio Cards)
**Your need:** Upgrade from flat borders to cards with depth, glow, and interactivity

| Component | Author | Why It's Relevant | Link |
|-----------|--------|-------------------|------|
| Glare Card | Aceternity UI | Mouse-follow glow effect — premium feel for swap card | https://21st.dev/community/components/s/card |
| Expandable Card | Prism UI | Cards with expand animation — great for token detail previews | https://21st.dev/community/components/s/card |
| Card Status List | Isaiah | Checklist-style card — could inspire settings/portfolio cards | https://21st.dev/community/components/s/card |
| Glowing Effect | Aceternity UI | Border glow on hover — perfect for swap card and token rows | (on 21st.dev main page, Popular section) |

### 5. Buttons & CTAs
**Your need:** Replace plain black CTA with animated, eye-catching buttons

| Component | Author | Why It's Relevant | Link |
|-----------|--------|-------------------|------|
| Spotlight Button | wisedev | Floating spotlight follows cursor — premium CTA | https://21st.dev/community/components/s/button |
| Glass Button | EaseMize UI | Frosted glass effect — pairs well with dark/gradient themes | https://21st.dev/community/components/s/button |
| Get Started Button | SHSF UI | Arrow-animated CTA — clean and directional | https://21st.dev/community/components/s/button |
| Cinematic Glow Toggle | Daiwiik Harihar | Glowing toggle switch — great for settings page | https://21st.dev/community/components/s/button |

### 6. Dock / Bottom Navigation
**Your need:** Replace basic bottom nav with an animated, macOS-style dock

| Component | Author | Why It's Relevant | Link |
|-----------|--------|-------------------|------|
| Dock | Anurag Mishra | macOS-style dock with hover magnification — the gold standard | https://21st.dev/community/components/s/dock |
| Dock | Motion Primitives | Icon dock with labels on hover — clean and informative | https://21st.dev/community/components/s/dock |
| Dock | Magic UI | Glassmorphism dock with brand icons — premium look | https://21st.dev/community/components/s/dock |
| Animated Dock | HextaUI | Smooth animated dock bar | https://21st.dev/community/components/s/dock |
| Modern Mobile Menu | EaseMize UI | Mobile-specific bottom menu | https://21st.dev/community/components/s/dock |

### 7. Selects & Token Selectors
**Your need:** Better token picker with search, icons, and smooth animations

| Component | Author | Why It's Relevant | Link |
|-----------|--------|-------------------|------|
| Select | Origin UI | Clean dropdown with checkmark — base for token selector | https://21st.dev/community/components/s/select |
| Select | Geekles | Model chooser with icons and descriptions — adaptable for tokens | https://21st.dev/community/components/s/select |

### 8. Dialogs / Modals (Token Selector Modal)
**Your need:** Upgrade the bottom-sheet token picker with better animations

| Category | Count | Link |
|----------|-------|------|
| Dialogs / Modals | 37 components | https://21st.dev/community/components/s/dialog |

### 9. Feature Sections (Landing Page "Why AutoClaw")
**Your need:** Bento grid or feature cards for the landing page value props

| Category | Count | Link |
|----------|-------|------|
| Features | 36 components | https://21st.dev/community/components/s/feature |
| Calls to Action | 34 components | https://21st.dev/community/components/s/calls-to-action |

### 10. Additional Relevant Categories

| Category | Count | Relevance | Link |
|----------|-------|-----------|------|
| Navigation Menus | 11 | Header upgrade | https://21st.dev/community/components/s/navigation-menu |
| Inputs | 102 | Swap amount input styling | https://21st.dev/community/components/s/input |
| Tabs | 38 | Token category tabs on home | https://21st.dev/community/components/s/tab |
| Badges | 25 | Token tags, risk level indicators | https://21st.dev/community/components/s/badge |
| Spinner Loaders | 21 | Loading states for quotes, swaps | https://21st.dev/community/components/s/spinner-loader |
| Toasts | 2 | Transaction notifications | https://21st.dev/community/components/s/toast |
| Tooltips | 28 | Help text on swap details | https://21st.dev/community/components/s/tooltip |

---

## Key Decisions

- **Theme:** Dark-first design. Dark backgrounds with accent glows and gradients, matching crypto/fintech conventions (Uniswap, Phantom, etc.)
- **Animation Level:** Moderate polish. Smooth transitions, hover effects, animated numbers, glowing cards. Professional, not flashy.
- **Page Priority:** All pages at once for consistency (Landing, Swap, Home/Market, Settings)
- **Component Strategy:** Aceternity UI as the base library (glare cards, aurora backgrounds, shooting stars) supplemented by best-in-class picks from other 21st.dev authors

## Recommended Component Mapping

### Landing Page (`/`)
| Element | Current | Proposed | Source |
|---------|---------|----------|--------|
| Background | Plain white | Aurora Background or Stars Background | Aceternity UI |
| Hero text | Static Open Sans | Animated text reveal with gradient | Aceternity UI Text Effects |
| Stats row | Plain text numbers | Animated counters with Number Flow | Maxwell Barvian |
| CTA button | Solid black rectangle | Spotlight Button or Glass Button with glow | wisedev / EaseMize UI |
| Features section | None | Bento grid with glowing cards | Aceternity UI Features |

### Swap Page (`/swap`)
| Element | Current | Proposed | Source |
|---------|---------|----------|--------|
| Swap card container | Thin border, white bg | Glare Card with dark bg and glow border | Aceternity UI |
| Token selector button | Tiny plain dropdown | Icon + name chip with smooth dropdown | Custom, inspired by Geekles Select |
| Amount input | Plain text input | Large monospace numbers with animated transitions | Number Flow + custom input |
| Swap arrow | Gray circle | Animated rotation on hover, glow ring | Custom with Framer Motion |
| Swap details | Plain text | Collapsible section with subtle animations | Aceternity UI Accordion |
| CTA "Swap" button | Basic button | Full-width glow button with loading state | Aceternity UI + Sonner |

### Home/Market Page (`/home`)
| Element | Current | Proposed | Source |
|---------|---------|----------|--------|
| Portfolio summary | None | Dark card with balance, P&L, animated numbers | Tommy Jepsen Stats + Number Flow |
| Token list | Flat rows | Cards with sparkline, glow border on hover | Aceternity UI Glare Card |
| Price display | Static text | Animated number transitions (green/red) | Maxwell Barvian Number Flow |
| Category tabs | None | Animated tab bar (Stablecoins / Commodities / All) | Aceternity UI Tabs |

### Settings Page (`/settings`)
| Element | Current | Proposed | Source |
|---------|---------|----------|--------|
| Layout | Bare text | Card-based sections with dark containers | Aceternity UI Cards |
| Risk profile display | Emoji + text | Visual badge with color coding | Custom Badge component |
| User info | Plain text | Avatar + name card with wallet address | Custom |

### Global Components
| Element | Current | Proposed | Source |
|---------|---------|----------|--------|
| Header | Plain text + address | Frosted glass navbar with blur effect | Aceternity UI Navigation |
| Bottom nav | Basic icons | Animated dock with magnification | Motion Primitives Dock or Magic UI Dock |
| Loading states | Spinner | Skeleton loaders with shimmer | Aceternity UI |
| Toasts | Sonner default | Dark themed toasts matching app style | Sonner dark theme |

## Next Steps

Run `/workflows:plan` to create the implementation plan for the full UI revamp.
