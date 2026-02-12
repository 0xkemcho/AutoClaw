---
title: "feat: Dashboard UI revamp with 3-column layout, agent chat, and manual swap"
type: feat
date: 2026-02-12
---

# Dashboard UI Revamp: 3-Column Layout with Agent Chat & Manual Swap

## Overview

Redesign the dashboard from its current 2-column layout (sidebar + content) into a 3-column Odin-inspired layout: **left drawer** (portfolio, swap, nav), **center panel** (agent assistant log with custom action components), and **right panel** (activities feed). Keep the dark theme but adopt the Odin screenshot's card styling, rounded corners, spacing, and typography. UI-only — no new backend endpoints.

## Problem Statement

The current dashboard is sparse — a thin sidebar with portfolio value + 3 nav links, and a wide center area with just a status bar and empty timeline. The layout wastes horizontal space on desktop and doesn't surface enough information at a glance. The agent timeline shows plain text entries instead of rich, type-specific components. There's no manual swap option in the dashboard, forcing users to navigate away.

## Design Reference

Inspired by the Odin investment dashboard screenshot:
- 3-column layout: left nav/portfolio, center main content, right activities
- Cards with generous padding, soft rounded corners, subtle borders
- Clean typography hierarchy (small uppercase labels, large bold values)
- Dark theme adaptation of the light Odin palette

## Proposed Solution

### Layout: 3-Column Grid

```
Desktop (≥1024px):
┌────────────┬──────────────────────────┬───────────────┐
│  Left       │  Center                  │  Right        │
│  Drawer     │  Agent Assistant Log     │  Activities   │
│  (280px)    │  (flex-1)                │  (320px)      │
│             │                          │               │
│  Portfolio  │  [Agent reasoning cards] │  [Timeline]   │
│  Quick Swap │  [Trade cards]           │  [Alerts]     │
│  Nav        │  [Analysis cards]        │  [News?]      │
│  Wallet     │                          │               │
└────────────┴──────────────────────────┴───────────────┘

Tablet (768px–1023px):
┌────────────┬──────────────────────────┐
│  Left       │  Center                  │
│  Drawer     │  (right panel hidden,    │
│  (240px)    │   accessible via tab)    │
└────────────┴──────────────────────────┘

Mobile (<768px):
┌──────────────────────────────────┐
│  Full-width content              │
│  (tabs: Agent | Activities)      │
│  Bottom nav bar                  │
└──────────────────────────────────┘
```

### Phase 1: New AppShell Layout (Foundation)

Restructure `app-shell.tsx` from 2-column to 3-column grid.

#### `apps/web/src/components/app-shell.tsx`

- [ ] Change the flex layout to a CSS grid: `grid-cols-[280px_1fr_320px]` on `lg:`, `grid-cols-[240px_1fr]` on `md:`, single column on mobile
- [ ] Create a `<RightPanel>` component slot that receives children
- [ ] Keep the existing `SidebarNav` as the left drawer (will be enhanced in Phase 2)
- [ ] Keep `MobileBottomNav` for mobile
- [ ] Update the `AppShell` export to accept an optional `rightPanel` prop:

```typescript
// apps/web/src/components/app-shell.tsx
export function AppShell({
  children,
  rightPanel
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="md:hidden"><Header /></div>
      <div className="flex lg:grid lg:grid-cols-[280px_1fr_320px]">
        <SidebarNav />
        <main className="flex-1 min-h-screen md:overflow-y-auto">
          {children}
        </main>
        {rightPanel && (
          <aside className="hidden lg:flex flex-col w-80 h-screen sticky top-0 bg-background border-l border-border overflow-y-auto">
            {rightPanel}
          </aside>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}
```

### Phase 2: Enhanced Left Drawer

#### 2a. Widen sidebar and improve portfolio section

- [ ] Increase sidebar width from `w-60` (240px) to `w-70` (280px) on `lg:` breakpoint
- [ ] Keep existing: logo, Agent Portfolio card with holdings, quick stats, next run timer, nav, agent toggle, ConnectButton
- [ ] Improve card styling to match Odin: more padding, softer borders, cleaner typography

#### 2b. Add Manual Swap Widget

Add a compact swap UI in the left drawer, below the portfolio card and above quick stats.

##### `apps/web/src/components/sidebar-swap.tsx` (new file)

- [ ] Compact swap widget with:
  - "From" token selector pill + amount input (single row)
  - Swap direction arrow button (↕)
  - "To" token selector pill + estimated amount (single row)
  - "Swap" button (full width, accent color)
- [ ] Reuse existing `TokenSelectorModal` from `components/swap/token-selector-modal.tsx`
- [ ] UI-only for now — Swap button shows a toast "Coming soon" or is disabled
- [ ] Compact design to fit in the 280px sidebar width

```typescript
// apps/web/src/components/sidebar-swap.tsx
'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { TOKEN_METADATA } from '@autoclaw/shared';
import { TokenSelectorModal } from '@/components/swap/token-selector-modal';

export function SidebarSwap() {
  const [fromToken, setFromToken] = useState('cUSD');
  const [toToken, setToToken] = useState('cEUR');
  const [fromAmount, setFromAmount] = useState('');
  const [selectorOpen, setSelectorOpen] = useState<'from' | 'to' | null>(null);

  const swapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
  };

  return (
    <div className="rounded-card bg-background-secondary border border-border p-4">
      <p className="text-xs text-foreground-muted uppercase tracking-wider mb-3">Quick Swap</p>

      {/* From */}
      <div className="flex items-center gap-2 bg-background rounded-xl p-3">
        <button onClick={() => setSelectorOpen('from')} className="...">
          {TOKEN_METADATA[fromToken]?.flag} {fromToken} ▾
        </button>
        <input value={fromAmount} onChange={...} placeholder="0.00" className="..." />
      </div>

      {/* Swap direction */}
      <div className="flex justify-center -my-1.5 relative z-10">
        <button onClick={swapTokens} className="rounded-full bg-background-secondary border border-border p-1.5">
          <ArrowUpDown size={14} />
        </button>
      </div>

      {/* To */}
      <div className="flex items-center gap-2 bg-background rounded-xl p-3">
        <button onClick={() => setSelectorOpen('to')} className="...">
          {TOKEN_METADATA[toToken]?.flag} {toToken} ▾
        </button>
        <span className="text-foreground-muted">0.00</span>
      </div>

      {/* Swap button */}
      <button disabled className="w-full mt-3 py-2.5 rounded-pill bg-accent text-white text-sm font-medium opacity-50">
        Swap (Coming Soon)
      </button>

      <TokenSelectorModal
        isOpen={selectorOpen !== null}
        onClose={() => setSelectorOpen(null)}
        onSelect={(symbol) => { /* set from or to */ }}
        tokenFilter={selectorOpen === 'from' ? 'base' : 'target'}
      />
    </div>
  );
}
```

- [ ] Add `<SidebarSwap />` to `SidebarNav` between portfolio card and quick stats

### Phase 3: Agent Assistant Log (Center Panel)

Replace the current plain timeline with a chat-style agent assistant log. Each agent action gets a custom component based on its `eventType`.

#### 3a. Create action-specific card components

##### `apps/web/src/components/agent-log/` (new directory)

- [ ] **`agent-log-feed.tsx`** — Main feed component, replaces `timeline-feed.tsx` in dashboard context. Renders entries in reverse chronological order with date separators.

- [ ] **`trade-card.tsx`** — For `eventType: 'trade'`
  - Shows: direction (BUY/SELL) badge, currency pair, amount, confidence %, tx hash link
  - Color: green border for buy, red for sell
  - Expandable: shows full LLM reasoning + citations
  - Icon: ArrowUpRight (buy) / ArrowDownLeft (sell)

- [ ] **`analysis-card.tsx`** — For `eventType: 'analysis'`
  - Shows: summary text, key insights as bullet points, confidence
  - Expandable: full reasoning + citation chips (clickable links)
  - Color: blue accent border
  - Icon: Search

- [ ] **`funding-card.tsx`** — For `eventType: 'funding'`
  - Shows: amount, wallet address, tx hash
  - Color: yellow accent border
  - Icon: Wallet

- [ ] **`guardrail-card.tsx`** — For `eventType: 'guardrail'`
  - Shows: what was blocked and why, risk metric
  - Color: orange accent border
  - Icon: Shield

- [ ] **`system-card.tsx`** — For `eventType: 'system'`
  - Shows: system message, status change
  - Color: gray accent border
  - Icon: Settings

Each card follows a consistent structure:

```typescript
// Pattern for all cards:
<div className="rounded-card border-l-4 border-l-{color} bg-background-card p-4">
  <div className="flex items-start gap-3">
    <div className="rounded-full bg-{color}/10 p-2">
      <Icon size={16} className="text-{color}" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-foreground-muted">{relativeTime}</span>
      </div>
      <p className="text-sm text-foreground-secondary">{summary}</p>
      {/* Expandable detail section */}
    </div>
  </div>
</div>
```

#### 3b. Entry renderer with expand/collapse

- [ ] **`agent-log-entry.tsx`** — Maps `TimelineEntry.eventType` to the correct card component
- [ ] Each card is collapsed by default showing only summary
- [ ] Click to expand: shows full `detail` JSON rendered as readable content + citation chips
- [ ] Use framer-motion `AnimatePresence` for smooth expand/collapse

#### 3c. Date separators and empty state

- [ ] Group entries by date with "Today", "Yesterday", or formatted date headers
- [ ] Empty state: friendly illustration + "Your agent hasn't taken any actions yet. Resume it to get started."

### Phase 4: Right Activities Panel

Always visible on desktop (≥1024px), hidden on tablet/mobile.

#### `apps/web/src/components/activities-panel.tsx` (new file)

- [ ] **Header**: "Activities" title + "View All" link to `/history`
- [ ] **Recent entries**: Last 10 timeline entries as compact cards (icon + 1-line summary + time)
- [ ] **Alerts section** (future-ready, static for now):
  - Agent paused alert (orange card) if `!status?.config.active`
  - Low balance warning (if portfolio < $5)
- [ ] **Compact timeline entry**: Much smaller than center panel cards — just icon, one-line text, relative time

```typescript
// apps/web/src/components/activities-panel.tsx
export function ActivitiesPanel() {
  const { data: status } = useAgentStatus();
  const timeline = useAgentTimeline();
  const entries = timeline.data?.pages.flatMap(p => p.entries).slice(0, 10) ?? [];

  return (
    <div className="p-5 space-y-6">
      {/* Alerts */}
      {!status?.config.active && (
        <div className="rounded-card bg-warning/10 border border-warning/20 p-3">
          <p className="text-xs font-medium text-warning">Agent is paused</p>
          <p className="text-xs text-foreground-muted mt-1">Resume to continue trading</p>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Activities</h3>
          <Link href="/history" className="text-xs text-accent hover:underline">View All</Link>
        </div>
        <div className="space-y-3">
          {entries.map(entry => (
            <CompactTimelineEntry key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Phase 5: Dashboard Page Integration

#### `apps/web/src/app/home/page.tsx`

- [ ] Import `ActivitiesPanel` and pass to `AppShell` as `rightPanel`
- [ ] Replace current dashboard content with `AgentLogFeed` (the new center panel)
- [ ] Keep `AgentStatusBar` at top of center panel (shows agent status + Run Now)
- [ ] Remove `PortfolioCard` from center (moved to sidebar)
- [ ] Remove `TimelineFeed` from center (replaced by `AgentLogFeed`)

```typescript
// apps/web/src/app/home/page.tsx
export default function DashboardPage() {
  return (
    <AppShell rightPanel={<ActivitiesPanel />}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <AgentStatusBar />
        <AgentLogFeed />
      </div>
    </AppShell>
  );
}
```

### Phase 6: Mobile Responsiveness

- [ ] On mobile (<768px): single column, center panel only
- [ ] Add tab switcher at top: "Agent" | "Activities" to toggle between center and right panel content
- [ ] Left drawer becomes the existing mobile bottom nav + header
- [ ] Swap widget accessible via a FAB (floating action button) or bottom sheet on mobile
- [ ] On tablet (768px–1023px): 2 columns (sidebar + center), right panel hidden but accessible via "Activities" tab in center

### Phase 7: Card Styling Polish (Odin-inspired)

- [ ] Update card base styles in `globals.css`:
  - Increase `--radius-card` to `16px` (from current 12px)
  - Add subtle `box-shadow: 0 1px 3px rgb(0 0 0 / 0.1)` to cards
  - Softer border color: slightly lighter than current `#1A1A1A`
- [ ] Typography pass:
  - Section labels: `text-xs uppercase tracking-wider text-foreground-muted`
  - Values: `text-xl font-bold text-foreground`
  - Descriptions: `text-sm text-foreground-secondary`
- [ ] Button styling:
  - Primary: `bg-accent text-white rounded-pill px-6 py-2.5 font-medium`
  - Secondary: `bg-background-secondary text-foreground border border-border rounded-pill`
  - Accent cards (like Odin's alert cards): colored background + icon + text

## Acceptance Criteria

- [ ] 3-column layout on desktop (≥1024px) with left drawer, center agent log, right activities
- [ ] 2-column on tablet (sidebar + center)
- [ ] Single column on mobile with tab switcher
- [ ] Agent log shows custom components for each action type (trade, analysis, funding, guardrail, system)
- [ ] Cards are expandable with smooth animation
- [ ] Compact swap widget in left drawer (UI only, no backend)
- [ ] Activities panel shows recent entries + alerts
- [ ] No layout shift, skeletons used for loading states
- [ ] Existing pages (settings, history) continue to work unchanged
- [ ] Dark theme maintained, card styling matches Odin-inspired design

## Implementation Order

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 1 | Restructure AppShell to 3-column grid | `app-shell.tsx` | — |
| 2 | Create `SidebarSwap` widget | `components/sidebar-swap.tsx` | — |
| 3 | Add swap to sidebar | `app-shell.tsx` | 1, 2 |
| 4 | Create agent log card components | `components/agent-log/*.tsx` | — |
| 5 | Create `AgentLogFeed` | `components/agent-log/agent-log-feed.tsx` | 4 |
| 6 | Create `ActivitiesPanel` | `components/activities-panel.tsx` | — |
| 7 | Update dashboard page | `app/home/page.tsx` | 1, 5, 6 |
| 8 | Mobile tab switcher | `app/home/page.tsx` | 7 |
| 9 | Card styling polish | `globals.css`, cards | 4, 6 |
| 10 | Update `AppShellSkeleton` for 3-col | `app-shell-skeleton.tsx` | 1 |

## References

- `apps/web/src/components/app-shell.tsx` — Current 2-column layout
- `apps/web/src/components/dashboard/timeline-feed.tsx` — Current timeline
- `apps/web/src/components/dashboard/agent-status-bar.tsx` — Status bar (keep)
- `apps/web/src/components/dashboard/portfolio-card.tsx` — Portfolio card (move to sidebar)
- `apps/web/src/components/swap/token-selector-modal.tsx` — Existing token selector to reuse
- `apps/web/src/components/swap/swap-token-input.tsx` — Existing swap input to reference
- `apps/web/src/hooks/use-agent.ts` — All data hooks (useAgentStatus, usePortfolio, useAgentTimeline)
- `apps/web/src/app/globals.css` — Design tokens
- `docs/plans/2026-02-08-feat-dark-theme-ui-revamp-plan.md` — Tailwind v4 gotchas
- `docs/plans/2026-02-12-fix-ux-loading-states-and-hydration-plan.md` — Skeleton patterns
