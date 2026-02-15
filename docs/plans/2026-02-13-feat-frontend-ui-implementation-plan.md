---
title: "feat: AutoClaw Frontend UI"
type: feat
date: 2026-02-13
---

# AutoClaw Frontend UI Implementation

## Overview

Build the entire frontend for AutoClaw as `apps/web` — a Next.js 15 App Router application with shadcn/ui, Tailwind CSS v4, Framer Motion, and thirdweb v5 wallet integration. The design follows a "Quiet Intelligence" aesthetic: dark-only, amber/gold accent, Instrument Sans + JetBrains Mono typography, minimal navigation, and purposeful motion.

The frontend consumes the existing Fastify API (`apps/api` on port 4000) and shared types from `@autoclaw/shared`. Authentication uses SIWE via thirdweb with JWT tokens.

## Problem Statement / Motivation

AutoClaw has a fully functional API backend and database, but no user-facing interface. Users need a way to:
- Connect their wallet and authenticate
- Complete the risk onboarding questionnaire
- Monitor their autonomous trading agent
- View portfolio, positions, and activity timeline
- Configure agent guardrails and settings
- Fund their agent's server wallet

The goal is a distinctive, polished UI that stands apart from generic AI dashboards — targeting crypto-native traders who appreciate information density, clean typography, and purposeful design.

## Design System

### Color Palette (Dark-Only)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0A0A0B` / `oklch(0.07 0.005 60)` | Page background |
| `--card` | `#141416` / `oklch(0.11 0.005 60)` | Card surfaces |
| `--card-elevated` | `#1C1C1F` / `oklch(0.14 0.005 60)` | Hover states, modals, popovers |
| `--border` | `#2A2A2E` / `oklch(0.22 0.005 60)` | Subtle dividers, card borders |
| `--foreground` | `#EDEDEF` / `oklch(0.94 0.005 90)` | Primary text |
| `--muted-foreground` | `#6E6E76` / `oklch(0.50 0.01 60)` | Secondary text, labels |
| `--primary` | `#E8A04A` / `oklch(0.78 0.16 75)` | Amber accent — buttons, links, focus rings |
| `--primary-foreground` | `#141416` | Text on amber backgrounds |
| `--success` | `#34D399` / `oklch(0.77 0.17 162)` | Positive PnL, gains, active states |
| `--destructive` | `#F87171` / `oklch(0.70 0.17 22)` | Negative PnL, losses, errors |

### Typography

| Role | Font | Tailwind Class | Usage |
|------|------|----------------|-------|
| Body & Headings | Instrument Sans | `font-sans` | All text by default |
| Numbers & Data | JetBrains Mono | `font-mono tabular-nums` | Portfolio values, percentages, amounts, addresses, hashes |

- Base font size: 14px
- Headings: font-bold, tracking-tight
- Financial figures always use `font-mono tabular-nums` for columnar alignment

### Spacing & Layout

- Max content width: `1280px` centered
- Card padding: `24px` (`p-6`)
- Card border radius: `12px` (`rounded-xl`)
- Card border: `1px solid var(--border)`
- Section gap: `24px` (`gap-6`)
- Top bar height: `56px`

### Motion Constants

```ts
// lib/motion.ts
export const MOTION = {
  fadeIn: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } },
  fadeUp: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
  spring: { type: 'spring' as const, stiffness: 300, damping: 24 },
  springSnappy: { type: 'spring' as const, stiffness: 400, damping: 20 },
  duration: { fast: 0.15, normal: 0.3, slow: 0.5 },
} as const;
```

## Technical Approach

### Architecture

```
+--------------+     HTTPS/JWT      +--------------+
|  apps/web    | <----------------> |  apps/api    |
|  Next.js 15  |    Port 3000       |  Fastify v5  |
|  App Router  |                    |  Port 4000   |
+--------------+                    +--------------+
       |                                    |
       |  imports types                     |  queries
       v                                    v
+--------------+                    +--------------+
| @autoclaw/   |                    |  Supabase    |
| shared       |                    |  PostgreSQL  |
+--------------+                    +--------------+
```

- **apps/web** consumes `@autoclaw/shared` for TypeScript types (imported as raw `.ts` via `transpilePackages`)
- All data flows through the Fastify API — the frontend never talks to Supabase directly
- JWT stored in memory (module-level variable) with localStorage fallback for session persistence
- React Query (`@tanstack/react-query`) manages server state, caching, and polling

### Provider Stack

```
<html className="dark">
  <ThemeProvider forcedTheme="dark">
    <QueryClientProvider>
      <ThirdwebProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  </ThemeProvider>
</html>
```

### Route Structure

```
app/
├── layout.tsx                    # Root layout: fonts, providers, dark class
├── globals.css                   # CSS variables, @theme inline, Tailwind base
├── providers.tsx                 # "use client" — all providers nested
├── page.tsx                      # Landing/connect page
│
├── (auth)/                       # Route group — no nav bar
│   ├── layout.tsx                # Minimal layout (logo only, centered content)
│   └── onboarding/
│       └── page.tsx              # Typeform-style risk questionnaire
│
├── (app)/                        # Route group — has top nav bar
│   ├── layout.tsx                # App shell: top bar + max-width container
│   ├── dashboard/
│   │   ├── page.tsx              # Split hero + timeline
│   │   └── loading.tsx           # Skeleton state
│   ├── timeline/
│   │   ├── page.tsx              # Full timeline with filters
│   │   └── loading.tsx
│   └── settings/
│       ├── page.tsx              # Guardrail configuration
│       └── loading.tsx
│
└── not-found.tsx                 # 404 page
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | React Query + Context | Server state via RQ (caching, polling), auth state via Context. No Redux needed. |
| JWT storage | In-memory + localStorage | In-memory for active session, localStorage for persistence across tabs. Clear on logout. |
| API client | Typed fetch wrapper | Thin, no heavy library. Attaches JWT, handles errors, types responses with `@autoclaw/shared`. |
| Onboarding UX | Typeform-style single page | One question visible at a time, animates up on answer. Keyboard-driven. Much more polished than multi-page. |
| Page transitions | Entry animations only | Exit animations fight App Router. Entry `fadeIn` via motion wrapper is reliable and clean. |
| Charts | Recharts | Lightweight, composable, good dark mode support. Used for allocation pie chart and sparklines. |
| Date formatting | `date-fns` | Lightweight, tree-shakeable. For relative timestamps ("2h ago") and formatting. |

---

## Implementation Phases

### Phase 1: Project Scaffold & Design System

Set up the Next.js app, configure the monorepo integration, install dependencies, establish the design system (colors, fonts, shadcn theme), and create the base layout components.

#### 1.1 Create `apps/web` with Next.js 15

**`apps/web/package.json`**

```json
{
  "name": "@autoclaw/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "@autoclaw/shared": "workspace:*",
    "@tanstack/react-query": "^5.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "date-fns": "^4.x",
    "lucide-react": "^0.x",
    "motion": "^12.x",
    "next": "^15.x",
    "next-themes": "^0.4.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "recharts": "^2.x",
    "tailwind-merge": "^3.x",
    "thirdweb": "^5.x"
  },
  "devDependencies": {
    "@autoclaw/typescript-config": "workspace:*",
    "@types/react": "^19.x",
    "@types/react-dom": "^19.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/postcss": "^4.x",
    "tw-animate-css": "^1.x",
    "typescript": "^5.x"
  }
}
```

**`apps/web/tsconfig.json`** — extends the existing `nextjs.json` base:

```json
{
  "extends": "@autoclaw/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`apps/web/next.config.ts`**:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@autoclaw/shared'],
  reactStrictMode: true,
};

export default nextConfig;
```

**`apps/web/postcss.config.mjs`**:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

**`apps/web/.env.local`** (template):

```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CELO_EXPLORER_URL=https://celoscan.io
```

#### 1.2 Design System: globals.css

**`apps/web/src/app/globals.css`**

Dark-only theme with amber accent. Define all CSS variables on `:root` (since we force dark). Map to Tailwind via `@theme inline`. Include custom tokens: `--success`, `--warning`, plus `--font-sans` and `--font-mono` for the custom fonts.

Custom additions beyond shadcn defaults:
- `--success` / `--success-foreground` for green gain indicators
- `--warning` / `--warning-foreground` for amber status
- Surface elevation tokens mapped to shadcn's `--card`, `--popover`

#### 1.3 Fonts: `src/lib/fonts.ts`

```ts
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '700'],
});
```

Map in globals.css:
```css
@theme inline {
  --font-sans: var(--font-instrument-sans);
  --font-mono: var(--font-jetbrains-mono);
}
```

#### 1.4 Root Layout: `src/app/layout.tsx`

Server Component. Applies font CSS variables on `<html>`, sets `className="dark antialiased"`, wraps children in `<Providers>`.

#### 1.5 Providers: `src/app/providers.tsx`

`"use client"` component nesting: ThemeProvider (forcedTheme="dark") -> QueryClientProvider -> ThirdwebProvider -> AuthProvider.

QueryClient config: `staleTime: 60_000`, `refetchOnWindowFocus: true`.

#### 1.6 shadcn/ui Init

Run `npx shadcn@latest init` inside `apps/web` with:
- Style: `new-york`
- Base color: `neutral`
- CSS variables: yes
- RSC: true

Then customize the generated `globals.css` with our amber palette. Install initial components:
- `button`, `card`, `badge`, `input`, `label`, `select`, `slider`, `switch`, `tabs`, `tooltip`, `dialog`, `dropdown-menu`, `skeleton`, `separator`, `textarea`, `progress`

#### 1.7 Utility Files

- **`src/lib/utils.ts`** — `cn()` function (installed by shadcn)
- **`src/lib/motion.ts`** — Motion constants (spring presets, fade variants)
- **`src/lib/format.ts`** — Formatting utilities:
  - `formatUsd(value: number)` -> `"$1,234.56"` with `Intl.NumberFormat`
  - `formatPct(value: number)` -> `"+4.2%"` or `"-1.3%"` with sign and color class
  - `formatRelativeTime(date: string)` -> `"2h ago"` using `date-fns/formatDistanceToNow`
  - `formatCountdown(targetDate: string)` -> `"2h 14m"` countdown string
  - `shortenAddress(address: string)` -> `"0x1234...abcd"`

#### Phase 1 Deliverables

- [x] `apps/web` created with package.json, tsconfig, next.config.ts, postcss.config
- [x] `pnpm install` succeeds from monorepo root
- [x] `pnpm --filter @autoclaw/web dev` starts on port 3000
- [x] Dark-only theme with amber accent renders correctly
- [x] Instrument Sans and JetBrains Mono load properly
- [x] shadcn components render with custom theme
- [x] Provider stack (theme, query, thirdweb, auth) mounts without errors
- [x] Utility functions (cn, format, motion constants) exported

---

### Phase 2: Auth, API Client & Core Infrastructure

Build the authentication flow (SIWE via thirdweb), typed API client, auth state management, and route protection.

#### 2.1 Thirdweb Client: `src/lib/thirdweb.ts`

```ts
import { createThirdwebClient } from 'thirdweb';
import { inAppWallet, createWallet } from 'thirdweb/wallets';

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

export const wallets = [
  inAppWallet({
    auth: { options: ['email', 'google', 'apple', 'passkey'] },
  }),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('walletConnect'),
];
```

#### 2.2 Token Store: `src/lib/token-store.ts`

In-memory JWT storage with localStorage persistence:

```ts
const STORAGE_KEY = 'autoclaw_jwt';

let token: string | null = null;

export function getToken(): string | null {
  if (token) return token;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem(STORAGE_KEY);
  }
  return token;
}

export function setToken(jwt: string) {
  token = jwt;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, jwt);
  }
}

export function clearToken() {
  token = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
```

#### 2.3 API Client: `src/lib/api-client.ts`

Typed fetch wrapper. Key features:
- Attaches `Authorization: Bearer <jwt>` from token store
- Prefixes endpoints with `NEXT_PUBLIC_API_URL`
- Parses JSON responses
- Throws `ApiError` with status, statusText, and parsed body on non-2xx
- On 401 response: clears token, triggers auth state reset
- Supports query params via `params` option
- Convenience methods: `api.get<T>()`, `api.post<T>()`, `api.put<T>()`

#### 2.4 Auth Functions: `src/lib/auth.ts`

Functions that call the existing Fastify auth endpoints:
- `generatePayload({ address })` -> `POST /api/auth/payload`
- `login({ payload, signature })` -> `POST /api/auth/login` -> stores JWT via `setToken()`
- `checkSession()` -> `GET /api/auth/me` with stored JWT
- `logout()` -> clears token

#### 2.5 Auth Provider: `src/providers/auth-provider.tsx`

React Context providing:
- `isAuthenticated: boolean`
- `walletAddress: string | null`
- `isOnboarded: boolean | null` (null = loading)
- `handleLogin(jwt, address)` — sets token, fetches risk profile to check onboarding status
- `handleLogout()` — clears token, resets state

On mount: checks for existing JWT in localStorage, validates with `checkSession()`, fetches onboarding status.

#### 2.6 Wallet Connect Component: `src/components/wallet-connect.tsx`

`"use client"` component wrapping thirdweb's `ConnectButton` with:
- `auth` prop wired to our `generatePayload`, `login`, `checkSession`, `logout` functions
- `chain={celo}` for Celo network default
- Custom theme matching our amber accent via `darkTheme({ colors: { ... } })`
- `connectModal={{ size: 'compact' }}`
- On successful SIWE login: call `authProvider.handleLogin(jwt, address)`

#### 2.7 Route Protection

Since JWT is in memory/localStorage (not cookies), use a client-side guard component:

**`src/components/auth-guard.tsx`**:
```tsx
'use client'
// If not authenticated -> redirect to /
// If authenticated but not onboarded -> redirect to /onboarding
// If authenticated and onboarded -> render children
```

Apply in `(app)/layout.tsx` to protect dashboard, timeline, settings.

#### 2.8 React Query Hooks: `src/hooks/`

**`src/hooks/use-agent.ts`**:
- `useAgentStatus()` — `GET /api/agent/status`, refetch on window focus
- `useToggleAgent()` — mutation for `POST /api/agent/toggle`, invalidates `['agent', 'status']`
- `useRunNow()` — mutation for `POST /api/agent/run-now`, then polls timeline for 60s
- `useAgentSettings()` — `GET /api/agent/status` (settings are part of status response)
- `useUpdateSettings()` — mutation for `PUT /api/agent/settings`

**`src/hooks/use-portfolio.ts`**:
- `usePortfolio()` — `GET /api/agent/portfolio`, refetch every 30s
- `usePositions()` — `GET /api/agent/positions`

**`src/hooks/use-timeline.ts`**:
- `useTimeline(filters)` — `GET /api/agent/timeline` with type/limit/offset params
- `useTimelineEntry(id)` — `GET /api/agent/timeline/:id`

**`src/hooks/use-user.ts`**:
- `useRiskProfile()` — `GET /api/user/risk-profile`
- `useSubmitRiskProfile()` — mutation for `POST /api/user/risk-profile`

**`src/hooks/use-market.ts`**:
- `useMarketTokens()` — `GET /api/market/tokens`, public, staleTime 5min

#### Phase 2 Deliverables

- [x] Thirdweb client configured with Celo chain
- [x] JWT token store (in-memory + localStorage) working
- [x] Typed API client with auth headers and error handling
- [x] Auth provider tracks `isAuthenticated` and `isOnboarded`
- [x] ConnectButton with SIWE auth wired to Fastify backend
- [x] Client-side auth guard redirects unauthenticated users
- [x] All React Query hooks created and typed with `@autoclaw/shared` types
- [ ] Login -> check onboarding -> redirect flow works end-to-end

---

### Phase 3: Connect/Landing Page

The first page users see. Minimal, centered, wallet connection CTA.

#### 3.1 Landing Page: `src/app/page.tsx`

Layout:
```
+-----------------------------------------------+
|                                               |
|                                               |
|              AutoClaw                         |
|                                               |
|        Autonomous FX Trading                  |
|        on Celo                                |
|                                               |
|        [ Connect Wallet ]                     |
|                                               |
|                                               |
|         Powered by Mento Protocol             |
+-----------------------------------------------+
```

- Full viewport height, centered vertically and horizontally
- Logo + tagline + ConnectButton
- Subtle entry animation (fade up from below)
- Background: pure `--background` with no patterns or gradients
- If already authenticated: redirect to `/dashboard`

#### 3.2 Components

- **`src/components/logo.tsx`** — AutoClaw logo mark + wordmark. SVG, takes `size` prop.

#### Phase 3 Deliverables

- [x] Landing page renders with logo, tagline, connect button
- [x] Wallet connection modal opens via thirdweb
- [x] Successful SIWE -> redirect to `/onboarding` (first time) or `/dashboard` (returning)
- [x] Already-authenticated users auto-redirect to dashboard

---

### Phase 4: Onboarding — Typeform-Style Questionnaire

Single-page, conversational risk questionnaire. Questions appear one at a time, animating upward as each is answered. Keyboard-driven with click fallback.

#### 4.1 Onboarding Page: `src/app/(auth)/onboarding/page.tsx`

Wrapper that checks auth (must be logged in) and renders the questionnaire component.

#### 4.2 Questionnaire Component: `src/app/(auth)/onboarding/_components/questionnaire.tsx`

`"use client"` — the core Typeform-style experience.

**State machine approach:**
```ts
const steps = ['name', 'experience', 'horizon', 'volatility', 'currencies', 'investmentAmount'] as const;
type Step = typeof steps[number];

// Track: currentStep index, answers object, isSubmitting
```

**Flow:**
1. **Name** — Text input, cursor auto-focused. User types, presses Enter -> animates up, next question slides in.
2. **Experience** — Multiple choice: "Beginner" / "Some experience" / "Advanced". Click or press 1/2/3 keyboard shortcut. Selected option highlights in amber.
3. **Horizon** — Multiple choice: "Short term" / "Medium term" / "Long term". Same interaction.
4. **Volatility** — Multiple choice: "Sell immediately" / "Hold steady" / "Buy more". Same interaction.
5. **Currencies** — Multi-select grid of currency badges with flag emojis. Toggle by click or keyboard (a-z mapped to first N currencies). Must select at least 1. Press Enter to confirm.
6. **Investment Amount** — Multiple choice: "Under $100" / "$100 - $1,000" / "$1,000 - $10,000" / "Over $10,000".
7. **Submit** — Review summary + "Start Trading" button.

**Animation:**
- Each answered question slides up (opacity 0, y: -40) using `motion.div` with `AnimatePresence mode="wait"`
- New question enters from below (opacity 0, y: 40 -> opacity 1, y: 0) with spring transition
- Previously answered questions are visible above current question at reduced opacity (0.4), showing the conversational history
- Progress indicator: thin amber bar at top, width proportional to `currentStep / totalSteps`

**Keyboard shortcuts:**
- `Enter` to confirm text input or multi-select
- `1`, `2`, `3`, `4` for single-choice options
- `Backspace` / `ArrowUp` to go back to previous question
- `Tab` is a no-op (prevent focus loss)

**On submit:**
- Call `POST /api/user/risk-profile` with collected `RiskAnswers`
- Show loading state on submit button
- On success: animate to "Fund Your Agent" step (Phase 4.3)
- On error: show inline error, allow retry

#### 4.3 Funding Step: `src/app/(auth)/onboarding/_components/fund-wallet.tsx`

After risk profile submission succeeds, show a funding screen within the same page:

```
+--------------------------------------+
|                                      |
|  Your agent is ready.                |
|  Fund it to start trading.           |
|                                      |
|  +--------------------------------+  |
|  |  0x1234...abcd        [Copy]  |  |
|  +--------------------------------+  |
|                                      |
|  Send USDC, USDT, or any Mento      |
|  stablecoin on Celo to this          |
|  address.                            |
|                                      |
|  [ Skip for now -> Dashboard ]       |
|  [ I've funded it -> Dashboard ]     |
|                                      |
+--------------------------------------+
```

- Display `serverWalletAddress` from the risk profile submission response
- Copy button with "Copied!" toast feedback
- "Skip for now" and "I've funded it" both route to `/dashboard`
- If `serverWalletAddress` is null (wallet creation failed): show error state with "Retry Setup" button that re-submits the risk profile

#### 4.4 Auth Layout: `src/app/(auth)/layout.tsx`

Minimal layout — logo in top-left, no nav bar. Content centered on page. Background: `--background`.

#### Phase 4 Deliverables

- [x] Typeform-style questionnaire renders with all 6 questions
- [x] Keyboard navigation (Enter, 1-4 shortcuts, Backspace) works
- [x] Each question animates in/out smoothly
- [x] Progress bar fills as questions are answered
- [ ] Previously answered questions visible above at reduced opacity
- [x] Multi-select currencies step with flag emojis and at least 1 required
- [x] Submit calls API, shows loading state, handles errors
- [x] Funding step shows server wallet address with copy button
- [x] Handles wallet creation failure gracefully (retry option)
- [x] "Skip" and "I've funded" both navigate to dashboard

---

### Phase 5: Dashboard — The Main Event

Split hero layout: Agent Brain (left, ~45%) + Portfolio (right, ~55%), Activity Timeline below.

#### 5.1 App Layout: `src/app/(app)/layout.tsx`

```
+----------------------------------------------------------+
|  AutoClaw          Dashboard  Timeline  Settings      W  |
+----------------------------------------------------------+
|  <AuthGuard>                                             |
|    {children}                                            |
|  </AuthGuard>                                            |
+----------------------------------------------------------+
```

- **Top bar** (`src/components/top-bar.tsx`): 56px height, `--card` background, 1px bottom border
  - Left: Logo (links to /dashboard)
  - Center: Nav links — Dashboard, Timeline, Settings. Active link has amber underline with `layoutId` animation
  - Right: WalletConnect button (compact, shows address when connected)
- Content area: max-width 1280px, centered, `px-6 py-6`
- AuthGuard wraps children — redirects to `/` if not authenticated, `/onboarding` if not onboarded

#### 5.2 Dashboard Page: `src/app/(app)/dashboard/page.tsx`

Server Component that renders the client dashboard content with a PageTransition wrapper.

#### 5.3 Dashboard Content: `src/app/(app)/dashboard/_components/dashboard-content.tsx`

`"use client"` — fetches data via hooks, renders the split layout:

```
+-----------------------------------------------------------+
|  +-------------------------+  +--------------------------+ |
|  |  AGENT STATUS           |  |  PORTFOLIO               | |
|  |                         |  |                          | |
|  |  * Active               |  |  $2,847.32               | |
|  |                         |  |  +$42.18 today (+1.5%)   | |
|  |  Next run               |  |                          | |
|  |  +------------------+   |  |  +------------------+    | |
|  |  |  (o) 2h 14m      |   |  |  | Allocation Pie  |    | |
|  |  +------------------+   |  |  +------------------+    | |
|  |                         |  |                          | |
|  |  Latest signal:         |  |  Holdings:               | |
|  |  "BRL weakening..."     |  |  US USDm  $1,200 42%    | |
|  |  -> BUY BRLm (82%)     |  |  EU EURm  $890  31%     | |
|  |                         |  |  BR BRLm  $757  27%     | |
|  |  Trades today: 2/5      |  |                          | |
|  |                         |  |                          | |
|  |  [Run Now]  [Pause]     |  |  [Fund Wallet]           | |
|  +-------------------------+  +--------------------------+ |
|                                                           |
|  RECENT ACTIVITY                                          |
|  -------------------------------------------------        |
|  * 10:42  Analyzed BRL - confidence 82%     [trade]       |
|  * 10:42  Bought 50 BRLm @ $0.178          [trade]       |
|  * 06:00  Scanned 12 sources, no signal    [analysis]    |
|  [ View full timeline -> ]                                |
+-----------------------------------------------------------+
```

#### 5.4 Agent Status Card: `src/app/(app)/dashboard/_components/agent-status-card.tsx`

`"use client"` — uses `useAgentStatus()` hook.

Elements:
- **Status indicator**: Green dot + "Active" or gray dot + "Paused"
- **Next run countdown**: Circular progress ring (SVG) with countdown text inside. Updates every second via `useEffect` interval. Ring fills as time progresses toward next run. If `nextRunAt` is in the past: show "Running soon..." with pulsing amber dot.
- **Latest signal**: From most recent timeline entry of type `analysis` or `trade`. Shows currency, direction, confidence percentage. Confidence maps to amber opacity: `style={{ opacity: 0.4 + (confidence / 100) * 0.6 }}`.
- **Trades today**: `tradesToday / dailyTradeLimit` as `"2/5"` text.
- **Action buttons**:
  - "Run Now" — amber primary button. Disabled during execution (optimistic). On click: `useRunNow()` mutation + show spinner.
  - "Pause"/"Resume" — secondary toggle button. On click: `useToggleAgent()` mutation.
  - If agent paused and user clicks "Run Now": show confirmation toast "Running one-time cycle while agent is paused."

#### 5.5 Portfolio Card: `src/app/(app)/dashboard/_components/portfolio-card.tsx`

`"use client"` — uses `usePortfolio()` and `usePositions()` hooks.

Elements:
- **Total value**: Large `font-mono tabular-nums text-3xl` display: `$2,847.32`
- **PnL indicator**: (future — requires historical data, skip in v1. Show "--" placeholder)
- **Allocation pie chart**: Recharts `PieChart` with custom colors from palette. Each slice labeled with token symbol.
- **Holdings list**: Below pie chart. Each row: flag emoji + symbol + balance (mono font) + percentage. Sorted by value descending.
- **Fund wallet CTA**: If total portfolio value is 0, show prominent "Fund Your Agent" button with copy-address dialog instead of the holdings list.
- **Empty state**: "No positions yet. Fund your agent wallet to start trading." with the server wallet address and copy button.

#### 5.6 Activity Preview: `src/app/(app)/dashboard/_components/activity-preview.tsx`

`"use client"` — uses `useTimeline({ limit: 5 })` hook.

Shows the 5 most recent timeline entries in a compact vertical list:
- Each entry: colored dot (by event type) + relative time + summary text + event type badge
- Event type colors: trade=amber, analysis=blue-gray, guardrail=red, funding=green, system=gray
- "View full timeline ->" link at bottom
- Empty state: "No activity yet. Your agent will start logging events once activated."

#### 5.7 Funding Banner: `src/app/(app)/dashboard/_components/funding-banner.tsx`

Conditional banner shown at top of dashboard when portfolio value is 0 and agent has a server wallet:

```
+-----------------------------------------------------------+
|  * Your agent is ready but has no funds.                  |
|  Send tokens to 0x1234...abcd on Celo to start trading.  |
|  [Copy Address]                                           |
+-----------------------------------------------------------+
```

Amber-tinted background (`bg-primary/5`), dismissible (stores dismissal in localStorage).

#### 5.8 Skeleton Loading: `src/app/(app)/dashboard/loading.tsx`

Renders skeleton cards matching the split layout:
- Left card: 3 skeleton lines, a circle (countdown), 2 button shapes
- Right card: 1 large number skeleton, a circle (pie chart), 3 row skeletons
- Bottom: 5 timeline row skeletons

Uses shadcn `<Skeleton>` component.

#### Phase 5 Deliverables

- [x] Top bar with nav links and active-link amber underline animation
- [x] Dashboard split layout: agent card (45%) + portfolio card (55%)
- [x] Agent status shows active/paused state, countdown ring, latest signal, trades count
- [x] Portfolio shows total value, allocation pie chart, holdings list with flags
- [x] "Run Now" and "Pause/Resume" buttons work with optimistic UI
- [x] Activity preview shows 5 most recent entries with event type badges
- [x] Funding banner appears when portfolio is empty
- [x] Skeleton loading state matches final layout shape
- [x] Empty states render appropriately for zero-data scenarios
- [x] All financial numbers use `font-mono tabular-nums`

---

### Phase 6: Timeline Page

Full-page activity timeline with filtering, pagination, and expandable detail view.

#### 6.1 Timeline Page: `src/app/(app)/timeline/page.tsx`

Server Component wrapper with PageTransition.

#### 6.2 Timeline Content: `src/app/(app)/timeline/_components/timeline-content.tsx`

`"use client"` — uses `useTimeline(filters)` hook.

Layout:
```
+-----------------------------------------------------------+
|  Activity Timeline                                        |
|                                                           |
|  [All] [Trades] [Analysis] [Guardrail] [Funding] [System] |
|                                                           |
|  +-----------------------------------------------------+ |
|  | * 10:42 AM - Today                                   | |
|  |   Bought 50 BRLm @ $0.178                           | |
|  |   Confidence: 82%  -  BRL  -  $8.90                 | |
|  |   [View Details v]                                   | |
|  +-----------------------------------------------------+ |
|  | * 10:42 AM - Today                                   | |
|  |   Analyzed BRL/USD - strong sell signal detected     | |
|  |   Confidence: 82%  -  BRL                            | |
|  |   [View Details v]                                   | |
|  +-----------------------------------------------------+ |
|  | ...more entries...                                   | |
|  +-----------------------------------------------------+ |
|                                                           |
|  [ Load More ]                                            |
+-----------------------------------------------------------+
```

#### 6.3 Timeline Filters: `src/app/(app)/timeline/_components/timeline-filters.tsx`

Horizontal pill/badge row. Each filter is a toggle button:
- All (default), Trade, Analysis, Guardrail, Funding, System
- Active filter has amber background. Multiple can't be selected (except "All" which clears filter).
- Updates URL search params for shareable links: `/timeline?type=trade`

#### 6.4 Timeline Entry: `src/app/(app)/timeline/_components/timeline-entry.tsx`

Each entry is a card that expands on click to show detail:

**Collapsed state:**
- Colored dot (event type) + timestamp (relative, exact on hover via tooltip) + summary text
- Right side: event type badge + currency badge (if present) + amount (if present)

**Expanded state** (animated expand via `motion.div layout`):
- **For trade events**: Direction (BUY/SELL badge), currency, amount USD, confidence %, LLM reasoning text (from `detail.reasoning`), citations list (title + URL), tx hash link to Celo explorer
- **For analysis events**: Market summary (from `detail.marketSummary`), signals generated, citations
- **For guardrail events**: Rule name, blocked reason, the signal that was blocked
- **For funding events**: Amount, token, from address
- **For system events**: System message text

#### 6.5 Pagination

"Load More" button at bottom. Uses `offset` parameter. Shows `total` count in header: "47 events".

#### Phase 6 Deliverables

- [x] Timeline page with filter pills
- [x] Entries collapse/expand with smooth animation
- [x] Event type determines detail rendering (trade vs. analysis vs. guardrail etc.)
- [x] Trade entries show tx hash as link to Celo explorer
- [x] Citations rendered as clickable links
- [x] Confidence % shown with amber opacity mapping
- [x] "Load More" pagination works
- [x] Relative timestamps with exact time on hover (tooltip)
- [x] Empty state for no-activity scenario
- [x] URL params for filter state (shareable)

---

### Phase 7: Settings Page

Guardrail configuration with clean form layout.

#### 7.1 Settings Page: `src/app/(app)/settings/page.tsx`

Server Component wrapper.

#### 7.2 Settings Content: `src/app/(app)/settings/_components/settings-content.tsx`

`"use client"` — uses `useAgentStatus()` for current config, `useUpdateSettings()` mutation.

Layout — vertical stack of settings cards:

```
+-----------------------------------------------------------+
|  Agent Settings                                           |
|                                                           |
|  +--- Trading Frequency --------------------------------+ |
|  |  How often should your agent analyze and trade?       | |
|  |  ( ) Hourly  ( ) Every 4 hours  (*) Daily            | |
|  +------------------------------------------------------+ |
|                                                           |
|  +--- Risk Guardrails ----------------------------------+ |
|  |  Max trade size      [$200        ] USD               | |
|  |  Max allocation      [25          ] %                 | |
|  |  Daily trade limit   [5           ]                   | |
|  |  Stop loss           [10          ] %  (Coming soon)  | |
|  +------------------------------------------------------+ |
|                                                           |
|  +--- Currencies ---------------------------------------+ |
|  |  Allowed: US USDm  EU EURm  BR BRLm [+Add]          | |
|  |  Blocked: NG NGNm [+Add]                             | |
|  +------------------------------------------------------+ |
|                                                           |
|  +--- Custom Prompt ------------------------------------+ |
|  |  Give your agent additional instructions:             | |
|  |  +--------------------------------------------------+ | |
|  |  | Focus on Latin American currencies...            | | |
|  |  |                                                  | | |
|  |  +--------------------------------------------------+ | |
|  |  142 / 500 characters                                | |
|  +------------------------------------------------------+ |
|                                                           |
|  [ Save Changes ]                                         |
+-----------------------------------------------------------+
```

#### 7.3 Form Behavior

- **Frequency**: Radio group (shadcn RadioGroup)
- **Guardrails**: Number inputs with validation:
  - Max trade size: 1 - 10,000 USD
  - Max allocation: 1 - 100 %
  - Daily trade limit: 1 - 50
  - Stop loss: disabled/grayed, shows "Coming soon" badge
- **Currencies**: Two sections (allowed/blocked). Each is a horizontal row of badges. Click badge to remove. "+Add" opens a dropdown with available currencies (filtered to exclude already-added). Prevent adding same currency to both lists.
- **Custom prompt**: Textarea with 500 character limit and live counter
- **Save**: Single "Save Changes" button. Disabled until form is dirty. Shows loading spinner during save. Success toast on completion.

#### 7.4 Validation

Client-side validation before submit:
- All number fields must be within defined ranges
- At least 1 allowed currency if allowedCurrencies is non-empty
- No currency in both allowed and blocked lists
- Custom prompt <= 500 characters

Show inline error messages below invalid fields.

#### Phase 7 Deliverables

- [x] Settings page loads current config from API
- [x] Frequency radio group works
- [x] Number inputs with range validation and error messages
- [x] Currency badge management (add/remove, prevent conflicts)
- [x] Stop loss field is disabled with "Coming soon" label
- [x] Custom prompt textarea with character counter
- [x] Save button disabled until form dirty, shows loading state
- [x] Success toast on save
- [x] Form resets dirty state after successful save

---

### Phase 8: Polish & Edge Cases

Final refinements, error boundaries, and edge case handling.

#### 8.1 Error Boundary: `src/app/(app)/error.tsx`

Global error boundary for the app route group. Shows a clean error card with retry button.

#### 8.2 404 Page: `src/app/not-found.tsx`

Styled 404 with link back to dashboard.

#### 8.3 Toast Notifications

Use shadcn's `sonner` toast integration for:
- "Address copied!" on wallet address copy
- "Settings saved" on successful settings update
- "Agent triggered" on Run Now
- "Agent paused/resumed" on toggle
- Error messages on API failures

Install: `npx shadcn@latest add sonner`

#### 8.4 JWT Expiry Handling

In the API client's 401 handler:
1. Clear token from store
2. Update auth context -> `isAuthenticated = false`
3. Show toast: "Session expired. Please reconnect."
4. Redirect to landing page

#### 8.5 Wallet Wrong Network

In the ConnectButton `onConnect` callback, check if the connected chain is Celo (chainId 42220). If not, prompt the user to switch networks using thirdweb's chain switching.

#### 8.6 Concurrent Tab Handling

Use `BroadcastChannel` API to sync auth state across tabs:
- On login: broadcast `{ type: 'auth', action: 'login', token }` to other tabs
- On logout: broadcast `{ type: 'auth', action: 'logout' }` to other tabs
- Each tab listens and updates its auth context accordingly

For data staleness: React Query's `refetchOnWindowFocus: true` handles this — when user switches back to a stale tab, data refreshes automatically.

#### 8.7 Page Entry Animations

Wrap each page's content in a `<PageTransition>` component:

```tsx
// components/page-transition.tsx
'use client'
import { motion } from 'motion/react'
import { MOTION } from '@/lib/motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...MOTION.fadeIn} transition={{ duration: MOTION.duration.normal }}>
      {children}
    </motion.div>
  )
}
```

#### 8.8 Responsive Considerations

Desktop-first but ensure nothing breaks on tablet:
- Split hero cards stack vertically below `lg` breakpoint (`< 1024px`)
- Top nav items collapse into a hamburger menu below `md` breakpoint
- Timeline entries remain full-width
- Settings form remains single-column (already is)

#### Phase 8 Deliverables

- [x] Error boundary renders clean error state with retry
- [x] 404 page styled consistently
- [x] Toast notifications for all user actions
- [x] JWT expiry gracefully redirects to connect page
- [x] Network mismatch detection and prompt (thirdweb handles via chain={celo})
- [x] Cross-tab auth synchronization
- [x] Page entry animations on all routes
- [x] Responsive breakpoints prevent layout breakage on tablet
- [x] All empty states have helpful copy and CTAs

---

## File Structure Summary

```
apps/web/
+-- package.json
+-- tsconfig.json
+-- next.config.ts
+-- postcss.config.mjs
+-- components.json                     # shadcn config
+-- .env.local
+-- src/
    +-- app/
    |   +-- globals.css                 # Theme CSS variables + Tailwind
    |   +-- layout.tsx                  # Root: fonts, providers
    |   +-- providers.tsx               # "use client": all providers
    |   +-- page.tsx                    # Landing / connect
    |   +-- not-found.tsx               # 404
    |   +-- (auth)/
    |   |   +-- layout.tsx              # Minimal layout (logo only)
    |   |   +-- onboarding/
    |   |       +-- page.tsx
    |   |       +-- _components/
    |   |           +-- questionnaire.tsx    # Typeform-style flow
    |   |           +-- fund-wallet.tsx      # Post-onboarding funding
    |   +-- (app)/
    |       +-- layout.tsx              # App shell: top bar + auth guard
    |       +-- error.tsx               # Error boundary
    |       +-- dashboard/
    |       |   +-- page.tsx
    |       |   +-- loading.tsx         # Skeleton
    |       |   +-- _components/
    |       |       +-- dashboard-content.tsx
    |       |       +-- agent-status-card.tsx
    |       |       +-- portfolio-card.tsx
    |       |       +-- activity-preview.tsx
    |       |       +-- funding-banner.tsx
    |       +-- timeline/
    |       |   +-- page.tsx
    |       |   +-- loading.tsx
    |       |   +-- _components/
    |       |       +-- timeline-content.tsx
    |       |       +-- timeline-filters.tsx
    |       |       +-- timeline-entry.tsx
    |       +-- settings/
    |           +-- page.tsx
    |           +-- loading.tsx
    |           +-- _components/
    |               +-- settings-content.tsx
    +-- components/
    |   +-- ui/                         # shadcn components (auto-generated)
    |   +-- logo.tsx
    |   +-- top-bar.tsx
    |   +-- wallet-connect.tsx
    |   +-- auth-guard.tsx
    |   +-- page-transition.tsx
    +-- hooks/
    |   +-- use-agent.ts
    |   +-- use-portfolio.ts
    |   +-- use-timeline.ts
    |   +-- use-user.ts
    |   +-- use-market.ts
    +-- lib/
    |   +-- api-client.ts
    |   +-- auth.ts
    |   +-- fonts.ts
    |   +-- format.ts
    |   +-- motion.ts
    |   +-- thirdweb.ts
    |   +-- token-store.ts
    |   +-- utils.ts                    # cn() from shadcn
    +-- providers/
        +-- auth-provider.tsx
```

## Acceptance Criteria

### Functional Requirements

- [ ] User can connect wallet via thirdweb (MetaMask, WalletConnect, Coinbase, social login)
- [ ] SIWE authentication flow completes and JWT is stored
- [ ] First-time users are routed through onboarding questionnaire
- [ ] Returning users auto-redirect to dashboard
- [ ] Typeform-style questionnaire is keyboard-navigable and animates smoothly
- [ ] Onboarding creates risk profile, server wallet, and agent config via API
- [ ] Post-onboarding funding step shows server wallet address
- [ ] Dashboard shows agent status with live countdown timer
- [ ] Dashboard shows portfolio value, allocation chart, and holdings list
- [ ] Agent can be toggled on/off and "Run Now" triggers immediately
- [ ] Activity timeline shows all event types with expandable detail
- [ ] Timeline supports filtering by event type
- [ ] Settings page allows configuring all guardrails
- [ ] All changes persist via API calls
- [ ] JWT expiry is handled gracefully (redirect to connect)
- [ ] Empty states display helpful messaging and CTAs

### Non-Functional Requirements

- [ ] Dark-only theme with amber accent renders correctly
- [ ] Instrument Sans for body, JetBrains Mono for financial data
- [ ] All financial numbers use `font-mono tabular-nums`
- [ ] Page entry animations are subtle and consistent
- [ ] Skeleton loading states match final layout shapes
- [ ] No layout shift on load (fonts, data)
- [ ] TypeScript strict mode passes with no errors
- [ ] All API responses typed with `@autoclaw/shared` types
- [ ] `pnpm build` succeeds from monorepo root
- [ ] Desktop-first layout doesn't break on tablet

### Quality Gates

- [ ] `pnpm type-check` passes for all packages
- [ ] All pages render without console errors
- [ ] Lighthouse performance score > 90 on dashboard
- [ ] No exposed secrets in client bundle (only `NEXT_PUBLIC_` env vars)

## Dependencies & Prerequisites

- Existing Fastify API running on port 4000
- Supabase database with all tables and RLS policies
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` (obtain from thirdweb dashboard — different from `SECRET_KEY`)
- `NEXT_PUBLIC_API_URL` pointing to the API
- Node 20 + pnpm 9.15.0 (already in repo)

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| thirdweb SIWE flow breaks between versions | Auth completely broken | Pin thirdweb version, test auth flow early in Phase 2 |
| shadcn/ui oklch colors render differently across browsers | Visual inconsistency | Test in Chrome, Firefox, Safari during Phase 1 |
| Framer Motion page transitions fight App Router | Janky animations | Use entry-only animations (no exit), avoid making layouts "use client" |
| API response shapes don't match shared types | Type errors at runtime | Verify actual API responses against types during Phase 2 hook development |
| JWT in localStorage is accessible to client-side scripts | Token exposure risk | Sanitize all rendered content, avoid rendering raw user HTML, consider httpOnly cookie in future |
| `transpilePackages` for @autoclaw/shared causes build issues | Build failure | Test `pnpm build` early in Phase 1 |

## Known API Issues to Address (Backend)

These were identified during research. They affect the frontend but require backend changes:

1. **`POST /api/auth/login` returns 200 on invalid signature** — Should return 401. Frontend must check `response.error` field as workaround.
2. **`GET /api/auth/me` returns snake_case** while all other endpoints return camelCase. Frontend must handle both.
3. **`GET /api/agent/status` response doesn't match `AgentStatus` type** — Missing `portfolioValueUsd`. Frontend fetches portfolio separately.
4. **`PUT /api/agent/settings` returns `{ success: true }` not the updated config** — Frontend must refetch after save.
5. **No server-side validation on settings numeric values** — Frontend must enforce ranges client-side.
6. **Timeline `detail` field is untyped `Record<string, unknown>`** — Frontend must handle dynamically per event type.
7. **No timeline filter for `currency` or date range** — Backend only supports `type` filter. Currency/date filtering deferred to v2 or requires backend changes.
8. **Stop loss rule is a placeholder** — Backend TODO. Frontend shows "Coming soon" on the setting.

## Future Considerations

- **Real-time updates**: Add WebSocket/SSE for live timeline and portfolio updates
- **Light mode toggle**: Add if user demand warrants it
- **Mobile-first redesign**: Native app or PWA for mobile trading
- **Trade history page**: Dedicated page for executed trades with PnL tracking
- **Historical charts**: Portfolio value over time, position performance
- **Multi-agent support**: Dashboard for managing multiple agents

## References

### Internal

- API routes: `apps/api/src/routes/agent.ts`, `auth.ts`, `user.ts`, `market.ts`
- Shared types: `packages/shared/src/types/agent.ts`, `user.ts`, `tokens.ts`
- Auth middleware: `apps/api/src/middleware/auth.ts`
- Thirdweb server config: `apps/api/src/lib/thirdweb.ts`
- Existing nextjs tsconfig base: `packages/typescript-config/nextjs.json`
- Token metadata with flags: `packages/shared/src/types/tokens.ts:77`
- Default guardrails by risk profile: `packages/shared/src/types/agent.ts:84`

### External

- shadcn/ui theming docs: https://ui.shadcn.com/docs/theming
- shadcn/ui dark mode: https://ui.shadcn.com/docs/dark-mode/next
- thirdweb ConnectButton: https://portal.thirdweb.com/react/v5/components/ConnectButton
- thirdweb SIWE: https://portal.thirdweb.com/connect/auth/frameworks/next
- Motion (Framer Motion) React: https://motion.dev/docs/react-installation
- Next.js 15 App Router: https://nextjs.org/docs/app
- Instrument Sans: https://fonts.google.com/specimen/Instrument+Sans
- JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
