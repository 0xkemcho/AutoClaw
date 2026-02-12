---
title: "fix: Eliminate loading flicker, skeleton states, and wallet hydration delays"
type: fix
date: 2026-02-12
---

# Fix: Eliminate Loading Flicker, Skeleton States, and Wallet Hydration Delays

## Overview

The app has pervasive UX issues around loading states. Every protected page shows a blank screen for 1-2 seconds while the thirdweb wallet hydrates, followed by another delay while the onboarding check completes. Dashboard components show bare spinners instead of skeleton placeholders, causing layout shift. The landing page CTA button text flickers from "Get Started" to "Go to Dashboard" after hydration. This plan addresses all loading/transition UX issues across the app.

## Problem Statement

**Current user experience on page load:**

1. User navigates to `/home` (or any protected page)
2. **Blank dark screen** for ~1-2s (wallet hydrating, `useActiveAccount()` returns `undefined`)
3. Flash of "Connect your wallet" screen (wallet still hydrating, ProtectedRoute thinks no wallet)
4. Onboarding check fires → another blank screen while `/api/auth/me` resolves
5. Finally: dashboard renders, but each card shows its own spinner independently

**Other issues:**
- Landing page CTA shows "Get Started" then switches to "Go to Dashboard" after hydration
- Header `ConnectButton` shows a loading icon during hydration
- Settings page: full-page spinner while agent status loads
- History page: full-page spinner while timeline loads
- No skeleton UI anywhere — all loading states are bare spinners with layout shift
- 3-second hardcoded delay after "Run Now" before timeline refreshes
- 200ms artificial delay on chip selection during onboarding

## Proposed Solution

### Phase 1: Fix Wallet Hydration Flash (Critical)

The root cause is that `useActiveAccount()` returns `undefined` for 1-2s while thirdweb hydrates. During this window, `ProtectedRoute` shows a "Connect Wallet" screen even for already-connected users.

**Fix: Add a `useWalletReady` hook that distinguishes "hydrating" from "no wallet".**

#### `apps/web/src/hooks/use-wallet-ready.ts` (new file)

```typescript
import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';

/**
 * Returns { account, isHydrating } where isHydrating is true
 * while thirdweb is still initializing. This prevents flashing
 * "Connect Wallet" for already-authenticated users.
 */
export function useWalletReady() {
  const account = useActiveAccount();
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    // Once account appears, hydration is done
    if (account) {
      setIsHydrating(false);
      return;
    }

    // If no account after a brief window, hydration is done
    // (user genuinely has no wallet connected)
    const timeout = setTimeout(() => setIsHydrating(false), 800);
    return () => clearTimeout(timeout);
  }, [account]);

  return { account, isHydrating };
}
```

#### Update `apps/web/src/components/protected-route.tsx`

- [ ] Replace `useActiveAccount()` with `useWalletReady()`
- [ ] While `isHydrating`: show a minimal shell (AppShell skeleton with no content) instead of blank div or "Connect Wallet"
- [ ] While `!account && !isHydrating`: show "Connect Wallet" (genuine no-wallet state)
- [ ] While checking onboarding: show the same AppShell skeleton (already has the sidebar/nav structure)
- [ ] Cache onboarding status in `sessionStorage` so repeat navigations within the same session don't re-fetch

```typescript
// Pseudocode for the new ProtectedRoute render logic
if (isHydrating) return <AppShellSkeleton />;
if (!account) return <ConnectWalletScreen />;
if (!onboardingChecked) return <AppShellSkeleton />;
return <>{children}</>;
```

### Phase 2: Skeleton UI Components

Replace all bare spinners with skeleton placeholders that match the final layout dimensions, preventing layout shift (CLS).

#### `apps/web/src/components/ui/skeleton.tsx` (new file)

- [ ] Create a `Skeleton` component — a pulsing `bg-background-secondary` div with rounded corners
- [ ] Create `SkeletonText` — a skeleton with text-like proportions
- [ ] Create `SkeletonCard` — a skeleton matching the card component dimensions

```typescript
// apps/web/src/components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-card bg-background-secondary', className)} />
  );
}
```

#### Replace spinners in dashboard components

- [ ] **`agent-status-bar.tsx`** — Replace `<Spinner>` with a skeleton bar matching the status bar height (~64px)
- [ ] **`portfolio-card.tsx`** — Replace `<Spinner>` with skeleton showing card shape + text lines
- [ ] **`timeline-feed.tsx`** — Replace `<Spinner>` with 3-4 skeleton timeline entries (icon circle + text lines)
- [ ] **`settings/page.tsx`** — Replace full-page `<Spinner>` with skeleton form fields
- [ ] **`history/page.tsx`** — Replace `<Loader2>` with skeleton timeline entries + filter bar skeleton

#### Create `AppShellSkeleton` for hydration/auth states

- [ ] **`apps/web/src/components/app-shell-skeleton.tsx`** (new file) — Renders the AppShell layout (sidebar on desktop, header on mobile) with skeleton content area. This replaces the blank div in ProtectedRoute.

```typescript
// apps/web/src/components/app-shell-skeleton.tsx
export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="md:hidden"><Header /></div>
      <div className="flex">
        {/* Desktop sidebar skeleton */}
        <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 bg-background-card border-r border-border">
          <div className="h-14 flex items-center px-5 border-b border-border">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="w-20 h-4 ml-2" />
          </div>
          <div className="px-4 pt-5 pb-3">
            <Skeleton className="h-24 rounded-card" />
          </div>
          <nav className="flex-1 px-3 py-2 space-y-1">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </nav>
        </aside>
        <main className="flex-1 min-h-screen">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <Skeleton className="h-16 rounded-card" />
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-48 rounded-card" />
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Phase 3: Fix Landing Page & Header Hydration Flicker

#### Landing page CTA (`apps/web/src/app/page.tsx`)

- [ ] Use `useWalletReady()` instead of `useActiveAccount()`
- [ ] While `isHydrating`: show "Get Started" (default text, no flash)
- [ ] Once hydrated: show correct text based on account presence

#### Header ConnectButton (`apps/web/src/components/header.tsx`)

- [ ] While wallet is hydrating, hide the ConnectButton area or show a skeleton pill
- [ ] Prevent the thirdweb ConnectButton loading icon from flashing
- [ ] Use `useWalletReady()` to gate rendering:

```typescript
const { account, isHydrating } = useWalletReady();

// In render:
{isHydrating ? (
  <Skeleton className="w-32 h-10 rounded-pill" />
) : (
  <ConnectButton ... />
)}
```

### Phase 4: Cache Onboarding Status

- [ ] After `/api/auth/me` returns `onboarding_completed: true`, cache in `sessionStorage`
- [ ] On subsequent page navigations within the same session, skip the API call
- [ ] Clear on logout (already clearing `localStorage.auth_token`, add `sessionStorage` clear)

```typescript
// In ProtectedRoute:
const ONBOARDING_CACHE_KEY = 'onboarding_checked';

// Before fetch:
if (sessionStorage.getItem(ONBOARDING_CACHE_KEY) === 'true') {
  setOnboardingChecked(true);
  return;
}

// After successful check:
sessionStorage.setItem(ONBOARDING_CACHE_KEY, 'true');

// In logout handler (app-shell.tsx):
sessionStorage.removeItem(ONBOARDING_CACHE_KEY);
```

### Phase 5: Minor UX Polish

#### Remove artificial delays

- [ ] **`use-agent.ts:134-136`** — Replace 3-second `setTimeout` for timeline refetch with immediate invalidation + a short polling pattern (refetch every 2s for 10s after run-now)
- [ ] **`onboarding/page.tsx:263`** — Reduce chip selection delay from 200ms to 100ms or use framer-motion `onAnimationComplete` callback
- [ ] **`onboarding/page.tsx:132-139`** — Remove 500ms hydration timeout, use `useWalletReady()` instead

#### Button loading states

- [ ] Ensure all mutation buttons show inline `<Spinner size="sm" />` next to text instead of replacing text entirely (user should always see what button does)

## Acceptance Criteria

- [ ] Protected pages never show "Connect Wallet" flash for already-authenticated users
- [ ] Protected pages show an AppShell skeleton during wallet hydration + onboarding check
- [ ] Dashboard components show skeleton placeholders instead of bare spinners
- [ ] Landing page CTA never flickers between "Get Started" and "Go to Dashboard"
- [ ] Header ConnectButton area doesn't show loading icon during hydration
- [ ] Onboarding status is cached per session — navigating between pages doesn't re-check
- [ ] Logout clears all cached auth state (localStorage + sessionStorage)
- [ ] No visible layout shift (CLS) when data loads into skeleton placeholders
- [ ] "Run Now" timeline refresh is responsive (no 3-second blind delay)

## Implementation Order

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 1 | Create `useWalletReady` hook | `hooks/use-wallet-ready.ts` | — |
| 2 | Create `Skeleton` UI component | `components/ui/skeleton.tsx` | — |
| 3 | Create `AppShellSkeleton` | `components/app-shell-skeleton.tsx` | 2 |
| 4 | Update `ProtectedRoute` | `components/protected-route.tsx` | 1, 3 |
| 5 | Add onboarding session cache | `protected-route.tsx`, `app-shell.tsx` | 4 |
| 6 | Fix landing page CTA flicker | `app/page.tsx` | 1 |
| 7 | Fix header ConnectButton flicker | `components/header.tsx` | 1, 2 |
| 8 | Replace dashboard spinners with skeletons | `agent-status-bar.tsx`, `portfolio-card.tsx`, `timeline-feed.tsx` | 2 |
| 9 | Replace settings page spinner with skeleton | `app/settings/page.tsx` | 2 |
| 10 | Replace history page spinner with skeleton | `app/history/page.tsx` | 2 |
| 11 | Fix Run Now timeline refresh delay | `hooks/use-agent.ts` | — |
| 12 | Reduce onboarding chip delay | `app/onboarding/page.tsx` | — |

## References

- `apps/web/src/components/protected-route.tsx` — Main hydration/auth gate
- `apps/web/src/hooks/use-auto-login.ts` — SIWE auto-login flow
- `apps/web/src/providers/thirdweb-provider.tsx` — Provider hierarchy
- `apps/web/src/components/app-shell.tsx` — Layout shell (sidebar + mobile nav)
- `apps/web/src/hooks/use-agent.ts` — React Query hooks with refetch intervals
- `apps/web/src/components/ui/spinner.tsx` — Current spinner component
- `apps/web/src/app/globals.css` — Design tokens (bg-background-secondary for skeletons)
