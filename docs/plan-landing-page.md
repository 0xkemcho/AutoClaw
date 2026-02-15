# Landing Page Clone Plan — Cryptix → AutoClaw

## Goal
Replace the current minimal landing page (`apps/web/src/app/page.tsx`) with a full marketing landing page modeled after the Cryptix Framer template. Adapt all content for AutoClaw (autonomous FX trading on Celo). Keep amber/gold as primary color. Keep existing fonts (Barlow + JetBrains Mono). Keep the dark theme.

---

## Sections to Build (Top → Bottom)

### 1. Navbar (sticky)
- **Left**: AutoClaw logo + wordmark
- **Center/Right**: Nav links — Features, How it works, Testimonials, Pricing, FAQ
- **Far Right**: "Get Started" CTA button (amber filled, rounded-full)
- Mobile: hamburger menu with slide-out sheet
- Sticky with subtle border-bottom, transparent bg with backdrop-blur

### 2. Hero Section
- **Heading**: "Take Control of Your Digital Assets" (large, white, centered)
- **Subheading**: Description about AutoClaw's autonomous FX trading
- **CTA Button**: "Get started now →" (amber/primary filled, rounded-full)
- **Trust badge**: "They trust us" + star rating (4.9) + badge icon
- **Background**: Subtle radial gradient glow (amber tint) from center-bottom, like the green glow on Cryptix
- Fade-up animation on load

### 3. Dashboard Mockup (below hero)
- Static image/illustration of the AutoClaw dashboard
- Dark card with rounded corners, subtle border
- Shows a mock of: sidebar (Dashboard, Assets, Market, Trade), balance chart, quick swap widget, assets table, repartition donut
- This will be a pure CSS/HTML mockup or a screenshot-style component
- Slight border glow effect (amber tint)

### 4. Tagline Banner
- Large italic/light text: "Simplicity, performance, and security, empowering you to navigate the digital world with confidence and agility."
- Centered, fade-in on scroll animation
- Text appears with a gradient mask/reveal effect

### 5. "Why Choose AutoClaw?" — 4-Feature Cards
- Section heading: "Why Choose AutoClaw?"
- Subheading: "Benefits designed to provide a seamless, secure, and accessible experience for all users."
- **4 cards in a row** (responsive: 2x2 on tablet, 1 col on mobile):
  1. **Maximum Security** — Shield icon — "Your assets are protected with cutting-edge security protocols."
  2. **Instant Transactions** — Zap icon — "Execute your transactions in real-time, without delays."
  3. **Optimized Fees** — ArrowDownUp icon — "Benefit from some of the lowest fees on the market."
  4. **Premium Interface** — Monitor icon — "An intuitive design that's easy to use, even for beginners."
- Each card: dark bg, subtle border, icon in a circle (bordered), title, description
- Cards have subtle top-border glow line (amber gradient)

### 6. "All Cryptos, One Platform" — Bento Feature + Marquee
- **Left column**: Heading "All Cryptos, One Platform" + description + "Buy crypto now →" link (amber)
- **Right column**: Horizontal scrolling marquee ticker of crypto tokens with prices and % changes
  - Two rows scrolling in opposite directions
  - Each item: token icon + name + price + % change (green/red)
  - Tokens: Use Mento stablecoins (USDm, EURm, BRLm, etc.) instead of BTC/ETH
- Full-width section with border top/bottom

### 7. "How It Works" — 3 Steps
- Section heading: "How It Works"
- Subheading: "A simple, fast, and secure platform to manage your cryptocurrencies in just a few steps."
- "Create account now →" link (amber, right-aligned)
- **3 cards in a row**:
  1. **Step 1 — Connect your wallet**: Mock showing email/password form → Adapt to wallet connect
  2. **Step 2 — Fund your wallet**: Mock showing deposit amount + fee breakdown
  3. **Step 3 — Buy, sell, or convert**: Mock showing token list with prices
- Each card: numbered badge (1, 2, 3) with amber accent, dark card bg, mock UI inside, title + description below
- Cards have green/amber top-border accent line

### 8. Testimonials — Carousel
- Section heading: "Trusted by Crypto Enthusiasts Worldwide"
- Subheading about community
- **Carousel with 3 testimonials**:
  - Avatar + verified badge
  - Quote text (large, light)
  - Name + role/company
  - Counter: "1/3"
- Navigation: "Previous" / "Next" buttons (right side)
- 2-column layout: testimonial card (left ~60%), navigation panel (right ~40%)

### 9. Pricing — 3 Tiers
- Section heading: "Choose Your Plan. Start Trading Today."
- Subheading about transparent pricing
- **Monthly/Yearly toggle** with "20% OFF" badge on Yearly
- **3 pricing cards** in a row:
  1. **Free** — $0/month — "Perfect for beginners" — "Get started" (outline button) — Feature list with checkmarks
  2. **Pro** (Popular badge) — $12/month — "Advanced tools for serious traders" — "Get started" (amber filled button) — "Everything in Free, plus:" + feature list
  3. **Business** — $39/month — "Built for institutions and high-volume traders" — "Get started" (outline button) — "Everything in Pro, plus:" + feature list
- Checkmarks in amber/primary color

### 10. FAQ — Accordion Grid
- Section heading: "Your Questions, Answered"
- Subheading + "Create account now →" link
- **2-column grid of 8 FAQ items** (4 per column):
  - Left: What is AutoClaw? | Is AutoClaw secure? | Which currencies are supported? | What are the fees?
  - Right: How fast are transactions? | Do I need to verify my identity? | Can I access on mobile? | How can I contact support?
- Each item: question text + "+" expand icon (amber)
- Expandable accordion (click to reveal answer)
- Subtle row borders

### 11. Final CTA Section
- Large centered heading: "Ready to take control of your crypto?"
- Subheading about joining users
- "Get started now →" button (amber filled, rounded-full)
- Subtle amber gradient glow behind

### 12. Footer
- **Left column**: Logo + tagline ("Secure, fast, and seamless crypto trading. AutoClaw makes digital assets effortless.")
- **Navigation column**: Why AutoClaw? | Cryptos | How it works | FAQ
- **Socials column**: Twitter (X) | Instagram | LinkedIn
- Bottom: "Created by" credit line
- Top border, dark bg

---

## Technical Approach

### File Structure
```
apps/web/src/app/(marketing)/
├── layout.tsx              # Marketing layout (no auth guard, own navbar)
├── page.tsx                # Landing page (all sections)
└── _components/
    ├── navbar.tsx           # Sticky nav with mobile menu
    ├── hero-section.tsx     # Hero + trust badge
    ├── dashboard-mockup.tsx # Static dashboard illustration
    ├── tagline-banner.tsx   # Large text banner
    ├── features-section.tsx # 4 feature cards
    ├── cryptos-section.tsx  # Bento + marquee ticker
    ├── how-it-works.tsx     # 3 step cards
    ├── testimonials.tsx     # Carousel
    ├── pricing-section.tsx  # 3 tier cards + toggle
    ├── faq-section.tsx      # Accordion grid
    ├── cta-section.tsx      # Final CTA
    └── footer.tsx           # Site footer
```

### Routing Strategy
- Create a new `(marketing)` route group with its own layout (no AuthGuard, no TopBar)
- Move existing `page.tsx` logic: if authenticated, redirect to `/fx-agent`; if not, show the landing page
- The `(marketing)/layout.tsx` wraps children with the landing-specific navbar + footer
- All internal app routes remain in `(app)` and `(auth)` groups — untouched

### Styling
- Keep existing Tailwind v4 theme (amber primary `oklch(0.78 0.16 75)`)
- Background: `oklch(0.145 0 0)` (existing `--background`)
- Card backgrounds: `oklch(0.195 0 0)` (existing `--card`)
- Borders: existing `--border`
- Primary/CTA buttons: amber filled `bg-primary text-primary-foreground`
- Outline buttons: `border border-border text-foreground`
- Add subtle gradient glow effects via CSS (radial gradients with amber hue, low opacity)
- All text: white/gray from existing theme
- Font: Barlow (already configured) — matches the clean sans-serif aesthetic

### Animations
- Use existing Motion library (motion/react) with `useMotionSafe()` hook
- Fade-up on scroll for each section (IntersectionObserver + motion)
- Marquee ticker: CSS animation (`@keyframes scroll`) for infinite horizontal scroll
- Testimonial carousel: state-driven with motion transitions
- Pricing toggle: animated switch component
- FAQ accordion: motion AnimatePresence for expand/collapse

### Components to Reuse
- `Logo` component (already exists)
- `Button` from shadcn/ui
- `Sheet` for mobile menu
- `Switch` for pricing toggle
- Keep `WalletConnect` for the CTA buttons (dynamic import, ssr: false)

### Components to Create
- `MarqueeRow` — infinite horizontal scroll of token items
- `TestimonialCarousel` — simple state carousel with motion
- `FaqAccordion` — expandable grid items
- `DashboardMockup` — static HTML/CSS mock of the app dashboard
- `SectionWrapper` — reusable section container with scroll animation

### Dependencies
- No new dependencies needed
- Everything uses existing: Tailwind v4, motion/react, shadcn/ui, lucide-react

---

## Implementation Order

1. **Create `(marketing)` route group + layout** — navbar, footer, redirect logic
2. **Hero section** — heading, subheading, CTA, trust badge, gradient glow
3. **Dashboard mockup** — static card illustration
4. **Tagline banner** — large text with fade effect
5. **Features section** — 4 cards grid
6. **Cryptos section** — bento layout + marquee ticker
7. **How it works** — 3 step cards
8. **Testimonials** — carousel component
9. **Pricing section** — 3 tiers + monthly/yearly toggle
10. **FAQ section** — accordion grid
11. **CTA section** — final call to action
12. **Polish** — scroll animations, responsive testing, glow effects
13. **Compare & iterate** — open both sites side by side, fix discrepancies

---

## Content Adaptations (Cryptix → AutoClaw)
- "Cryptix" → "AutoClaw"
- "crypto trading" → "autonomous FX trading on Celo"
- Crypto tokens (BTC, ETH, SOL) → Mento stablecoins (USDm, EURm, BRLm, KESm, etc.)
- Euro prices → USD prices
- "50+ cryptocurrencies" → "15+ stablecoin pairs"
- Green accent (#00ffb2) → Amber/Gold (oklch(0.78 0.16 75))
- Keep the same layout, spacing, typography hierarchy, and dark aesthetic
- All navigation anchors use smooth scroll to section IDs
