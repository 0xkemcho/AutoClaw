---
title: "feat: FX Trading Agent Frontend Dashboard"
type: feat
date: 2026-02-11
part: 3 of 3
series: fx-trading-agent
depends_on: 2026-02-11-feat-fx-agent-backend-foundation-plan.md
---

# Part 3: FX Trading Agent — Frontend Dashboard

Dashboard with timeline feed, settings page, history page, sidebar navigation, and responsive mobile layout. Consumes the API routes from Part 1.

## Overview

Replace the placeholder `/home` page with the agent dashboard. Build three pages (Dashboard, Settings, History) with a desktop sidebar and mobile bottom tabs. The dashboard centers on a real-time timeline feed showing all agent activity.

## Proposed Solution

### Navigation Layout

**New file:** `apps/web/src/components/app-shell.tsx`

Wraps all authenticated pages with sidebar (desktop) and bottom tabs (mobile):

```
Desktop (>= 768px):
┌─────────────┬──────────────────────────────┐
│   Sidebar   │         Page Content         │
│   (240px)   │                              │
└─────────────┴──────────────────────────────┘

Mobile (< 768px):
┌──────────────────────────────┐
│         Page Content         │
│                              │
├──────────────────────────────┤
│  Home  |  Settings  |  History  │
└──────────────────────────────┘
```

**Sidebar contents (desktop):**
- Portfolio summary card (total value, 7d P&L percentage)
- Nav links: Dashboard, Settings, History (icon + label, active state)
- Agent toggle (pause/resume) at bottom
- Uses existing dark theme colors from `apps/web/src/lib/thirdweb.ts`

**Bottom tabs (mobile):**
- 3 tabs with icons: Home (LayoutDashboard), Settings (Sliders), History (Clock)
- Active tab highlighted with indigo accent

### Dashboard Page (`/home`)

**Update:** `apps/web/src/app/home/page.tsx`

**Layout:**

```
┌─────────────────────────────────────────┐
│ Agent Status Bar                         │
│ ● Running · Next run in 2h · 14 trades  │
│ [Pause]                                  │
├─────────────────────────────────────────┤
│ Portfolio Summary Card (mobile only,     │
│ collapsible) — $12,450.32 (+3.2% 7d)    │
├─────────────────────────────────────────┤
│ Timeline Feed                            │
│                                         │
│ ┌─────────────────────────────────────┐  │
│ │ 10:32 AM · TRADE        ↗ EURm     │  │
│ │ Bought EURm ($240)                  │  │
│ │ ECB hawkish pivot signals EUR...    │  │
│ │ Confidence: 82%                     │  │
│ │ 📎 reuters.com · 📎 ecb.europa.eu  │  │
│ └─────────────────────────────────────┘  │
│                                         │
│ ┌─────────────────────────────────────┐  │
│ │ 9:15 AM · ANALYSIS      🔍         │  │
│ │ Scanned 12 sources, no action.     │  │
│ └─────────────────────────────────────┘  │
│                                         │
│ (infinite scroll or "Load more")         │
└─────────────────────────────────────────┘
```

**Components to create:**

| Component | File | Purpose |
|-----------|------|---------|
| `AgentStatusBar` | `components/dashboard/agent-status-bar.tsx` | Active state, next run countdown, trade count |
| `PortfolioCard` | `components/dashboard/portfolio-card.tsx` | Total value, P&L, collapsible on mobile |
| `TimelineFeed` | `components/dashboard/timeline-feed.tsx` | List of timeline entries with infinite scroll |
| `TimelineEntry` | `components/dashboard/timeline-entry.tsx` | Single entry — icon, type badge, summary, expandable detail |
| `CitationChip` | `components/dashboard/citation-chip.tsx` | Clickable link chip showing source domain |

**Timeline entry styling by type:**

| Type | Left accent | Icon | Badge color |
|------|-------------|------|-------------|
| TRADE (buy) | Green | ArrowUpRight | green/900 bg |
| TRADE (sell) | Red | ArrowDownRight | red/900 bg |
| ANALYSIS | Blue | Search | blue/900 bg |
| FUNDING | Yellow | Wallet | yellow/900 bg |
| GUARDRAIL | Orange | Shield | orange/900 bg |
| SYSTEM | Gray | Settings | gray/800 bg |

**Expandable detail:** Click/tap entry to show full LLM reasoning and all citations with excerpts.

**Data fetching:** Use `@tanstack/react-query` with `GET /api/agent/timeline?limit=20&offset=0`. Infinite scroll via `useInfiniteQuery`.

### Settings Page (`/settings`)

**New file:** `apps/web/src/app/settings/page.tsx`

Form-based layout with sections. Uses existing UI components (Button, Chip) and adds sliders.

**Sections:**

1. **Trading Frequency**
   - Dropdown: Conservative (daily), Moderate (every 4h), Aggressive (hourly)
   - Maps to `frequency` field in `agent_configs`

2. **Risk Limits**
   - Max trade size — range slider ($10 → $10,000) with number input
   - Max allocation per currency — range slider (5% → 100%)
   - Stop-loss threshold — range slider (1% → 50%)
   - Daily trade limit — number input (1-100)

3. **Currency Preferences**
   - Grid of Chip components for all 15 Mento stables + XAUT
   - Each chip shows flag + symbol, toggleable
   - Blocked currencies shown with strikethrough styling

4. **Agent Instructions**
   - Textarea with placeholder: "e.g. Be conservative with emerging market currencies. Prioritize EUR and GBP."
   - Character limit indicator

5. **Wallet**
   - Agent wallet address with copy button
   - Accepted tokens list: USDm, USDC, USDT
   - Withdraw button — sends all USDm back to connected wallet (requires confirmation)

**Save behavior:** Debounced auto-save with toast notification, or explicit Save button. Uses `PUT /api/agent/settings`.

**Components to create:**

| Component | File |
|-----------|------|
| `SettingsForm` | `components/settings/settings-form.tsx` |
| `FrequencySelector` | `components/settings/frequency-selector.tsx` |
| `RiskSlider` | `components/settings/risk-slider.tsx` |
| `CurrencyGrid` | `components/settings/currency-grid.tsx` |
| `WalletSection` | `components/settings/wallet-section.tsx` |

### History Page (`/history`)

**New file:** `apps/web/src/app/history/page.tsx`

Full trade log — reuses `TimelineEntry` component but shows all entries expanded by default.

**Features:**
- Filter bar: Type dropdown (All, Trade, Analysis, Funding, Guardrail, System) + Currency dropdown + Date range picker
- Each entry shows full detail (not collapsed)
- Pagination with "Load more" button (or infinite scroll)
- CSV export button — calls a client-side function that fetches all entries and generates CSV

**Components to create:**

| Component | File |
|-----------|------|
| `HistoryFilters` | `components/history/history-filters.tsx` |
| `ExportCsvButton` | `components/history/export-csv-button.tsx` |

### Onboarding Update

**Modify:** `apps/web/src/app/onboarding/page.tsx`

After successful risk profile submission:
- Show "Creating your agent wallet..." loading state
- Display the new Turnkey wallet address
- "Fund your agent" CTA with address copy button
- "Go to Dashboard" button → redirect to `/home`

### Shared Hooks

**New file:** `apps/web/src/hooks/use-agent.ts`

```typescript
// Centralized agent data hooks using react-query

export function useAgentStatus() {
  return useQuery({ queryKey: ['agent', 'status'], queryFn: () => fetchApi('/api/agent/status') });
}

export function useAgentTimeline(filters?: TimelineFilters) {
  return useInfiniteQuery({
    queryKey: ['agent', 'timeline', filters],
    queryFn: ({ pageParam = 0 }) => fetchApi(`/api/agent/timeline?offset=${pageParam}&limit=20`),
    getNextPageParam: (lastPage, pages) => lastPage.length === 20 ? pages.length * 20 : undefined,
  });
}

export function useAgentSettings() {
  return useQuery({ queryKey: ['agent', 'settings'], queryFn: () => fetchApi('/api/agent/settings') });
}

export function useUpdateSettings() {
  return useMutation({ mutationFn: (data) => fetchApi('/api/agent/settings', { method: 'PUT', body: data }) });
}

export function useToggleAgent() {
  return useMutation({ mutationFn: () => fetchApi('/api/agent/toggle', { method: 'POST' }) });
}
```

### API Client

**New file:** `apps/web/src/lib/api.ts`

```typescript
export async function fetchApi(path: string, options?: RequestInit) {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options?.headers },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

## Acceptance Criteria

- [x] App shell with sidebar (desktop) and bottom tabs (mobile) wraps all authenticated pages
- [x] Sidebar shows portfolio summary, nav links with active state, agent toggle
- [x] Dashboard shows agent status bar with active state, next run countdown, trade count
- [x] Timeline feed loads paginated entries from API with infinite scroll
- [x] All 5 entry types render with correct icons, colors, and badges
- [x] Timeline entries expandable to show full reasoning and citations
- [x] Citation chips are clickable links opening in new tab
- [x] Settings page has all 5 sections: frequency, risk limits, currencies, instructions, wallet
- [x] Settings save correctly via `PUT /api/agent/settings`
- [x] Currency grid shows all 15 Mento stables + XAUT with flags
- [x] Wallet section shows address with copy button
- [x] History page shows full-detail entries with type/currency filters
- [x] CSV export generates correct file
- [x] Mobile layout works: collapsible portfolio card, bottom tabs, responsive timeline
- [x] Onboarding completion shows wallet address and fund CTA
- [x] Dark theme consistent across all new pages
- [x] `lucide-react` icons used throughout (existing dependency)

## Technical Considerations

- **Responsive design:** Use Tailwind breakpoints (`md:` for desktop sidebar, default for mobile)
- **State management:** `@tanstack/react-query` for server state, local state for form inputs
- **Optimistic updates:** Toggle agent and save settings should update UI immediately
- **Countdown timer:** Agent status bar "Next run in Xh" uses client-side countdown from `next_run_at`
- **Timeline polling:** Consider `refetchInterval: 30000` on timeline query for near-real-time updates
- **Accessibility:** All interactive elements keyboard-navigable, proper ARIA labels

## Dependencies & Risks

- **Depends on Part 1** — needs API routes (`/api/agent/*`) to be working
- **Can develop in parallel** with Part 2 using mock API responses
- **No new npm packages** — uses existing: react-query, lucide-react, framer-motion, tailwindcss, clsx
- **Range slider** — may need a small slider component (can use native `<input type="range">` with custom styling)

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `apps/web/src/components/app-shell.tsx` |
| Create | `apps/web/src/components/dashboard/agent-status-bar.tsx` |
| Create | `apps/web/src/components/dashboard/portfolio-card.tsx` |
| Create | `apps/web/src/components/dashboard/timeline-feed.tsx` |
| Create | `apps/web/src/components/dashboard/timeline-entry.tsx` |
| Create | `apps/web/src/components/dashboard/citation-chip.tsx` |
| Create | `apps/web/src/components/settings/settings-form.tsx` |
| Create | `apps/web/src/components/settings/frequency-selector.tsx` |
| Create | `apps/web/src/components/settings/risk-slider.tsx` |
| Create | `apps/web/src/components/settings/currency-grid.tsx` |
| Create | `apps/web/src/components/settings/wallet-section.tsx` |
| Create | `apps/web/src/components/history/history-filters.tsx` |
| Create | `apps/web/src/components/history/export-csv-button.tsx` |
| Create | `apps/web/src/hooks/use-agent.ts` |
| Create | `apps/web/src/lib/api.ts` |
| Create | `apps/web/src/app/settings/page.tsx` |
| Create | `apps/web/src/app/history/page.tsx` |
| Modify | `apps/web/src/app/home/page.tsx` (replace placeholder with dashboard) |
| Modify | `apps/web/src/app/onboarding/page.tsx` (add wallet creation step) |
| Modify | `apps/web/src/app/layout.tsx` (add AppShell for authenticated routes) |

## References

- Brainstorm UI wireframes: `docs/brainstorms/2026-02-10-fx-trading-agent-pivot-brainstorm.md` (Dashboard section)
- Part 1 API routes: `docs/plans/2026-02-11-feat-fx-agent-backend-foundation-plan.md`
- Existing components: `apps/web/src/components/ui/`
- Existing theme: `apps/web/src/lib/thirdweb.ts` (dark theme colors)
- Existing onboarding: `apps/web/src/app/onboarding/page.tsx`
- Token metadata: `packages/shared/src/types/tokens.ts`
