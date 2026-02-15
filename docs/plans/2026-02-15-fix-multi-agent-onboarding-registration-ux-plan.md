---
title: "fix: Multi-Agent Onboarding & Registration UX"
type: fix
date: 2026-02-15
---

# fix: Multi-Agent Onboarding & Registration UX

## Overview

Fix 7 interconnected bugs in the multi-agent onboarding and registration flow. Currently: FX agent routes don't filter by `agent_type` (breaking `.single()`), registration page shows a static spinner with no feedback, `onboarding_completed` is a single global boolean blocking second-agent onboarding, FX agent page has no "create agent" hero, multiple hardcoded routes point to non-existent `/dashboard`, and registration calls the wrong endpoint for yield agents.

**Root cause:** The codebase was originally single-agent (FX only). When multi-agent support was added (yield), the existing FX routes and onboarding logic were not updated to be agent-type-aware.

## Problems Identified

| # | Problem | File(s) | Impact |
|---|---------|---------|--------|
| 1 | Registration page shows static spinner, no WS feedback | `register-agent.tsx` | User sees "Registering..." with no indication of what's happening |
| 2 | `POST /api/agent/register-8004` doesn't filter by `agent_type` | `apps/api/src/routes/agent.ts:447-502` | `.single()` fails when user has both agent types |
| 3 | `onboarding_completed` is global — blocks second-agent flow | `auth-provider.tsx:50`, `auth-guard.tsx:24`, `onboarding/page.tsx:42` | User can't re-enter onboarding for yield after completing FX |
| 4 | FX agent page has no "create agent" hero CTA | `fx-agent-content.tsx` | 404 error when no FX agent exists; no way to create one from the page |
| 5 | Onboarding redirects to `/fx-agent` when `isOnboarded` | `onboarding/page.tsx:43` | Yield deep-link `/onboarding?agent=yield` broken for onboarded users |
| 6 | `register-agent.tsx` calls FX endpoint for yield agents | `register-agent.tsx:55` | Wrong agent_config updated; yield agent never gets 8004 ID |
| 7 | Funding page "Skip" goes to `/dashboard` (doesn't exist) | `fund-wallet.tsx:63,112` | Dead route after skip |

## User Decisions

| Question | Decision |
|----------|----------|
| Registration progress | Both WebSocket live logs AND visual step indicator |
| Multi-agent per user | Both agents allowed (FX + Yield) |
| Second agent flow | Full onboarding flow via `/onboarding?agent=yield` |
| Gasless badge | On the register button AND in the description text |
| Late registration | Persistent banner on agent page until registered |
| Second agent onboarding | Full flow: config + fund + register (each agent has own wallet) |
| Skip during first onboarding | Yes, user gets marked as onboarded, sees empty states with "Create" CTAs |

## Implementation Phases

### Phase 1: Backend — Fix Agent-Type Filtering

Fix all FX agent API queries to filter by `agent_type = 'fx'`, matching how yield routes already work.

#### 1.1 Fix FX Agent Routes

**File:** `apps/api/src/routes/agent.ts`

Every query that uses `.eq('wallet_address', walletAddress).single()` needs `.eq('agent_type', 'fx')`:

- [ ] `GET /api/agent/status` — add `.eq('agent_type', 'fx')`
- [ ] `POST /api/agent/toggle` — add `.eq('agent_type', 'fx')`
- [ ] `POST /api/agent/run-now` — add `.eq('agent_type', 'fx')`
- [ ] `GET /api/agent/timeline` — add `.eq('agent_type', 'fx')` on agent_configs lookup
- [ ] `GET /api/agent/positions` — add `.eq('agent_type', 'fx')`
- [ ] `GET /api/agent/portfolio` — add `.eq('agent_type', 'fx')`
- [ ] `PUT /api/agent/settings` — add `.eq('agent_type', 'fx')`
- [ ] `POST /api/agent/register-8004` — accept `agent_type` body param, add filter (see 1.2)
- [ ] `GET /api/agent/:walletAddress/8004-metadata` — add `.eq('agent_type', 'fx')` (or accept query param)

#### 1.2 Fix Register-8004 Endpoint

**File:** `apps/api/src/routes/agent.ts` (lines 439-503)

```typescript
// Accept agent_type in request body
const { agent_type = 'fx' } = request.body as { agent_type?: 'fx' | 'yield' };

const { data: configData } = await supabaseAdmin
  .from('agent_configs')
  .select('server_wallet_id, server_wallet_address, agent_8004_id')
  .eq('wallet_address', walletAddress)
  .eq('agent_type', agent_type)  // <-- ADD THIS
  .single();

// Also fix the update query:
await supabaseAdmin
  .from('agent_configs')
  .update({ agent_8004_id: ..., agent_8004_tx_hash: ... })
  .eq('wallet_address', walletAddress)
  .eq('agent_type', agent_type);  // <-- ADD THIS
```

#### 1.3 Add Registration Progress Events

**File:** `apps/api/src/services/agent-registry.ts`

Add `emitProgress` calls during the two-step on-chain registration:

- [ ] Before `register()` call: `emitProgress(walletAddress, 'registering_8004', 'Submitting registration transaction...')`
- [ ] After `register()` succeeds: `emitProgress(walletAddress, 'linking_wallet', 'Linking server wallet...')`
- [ ] After `setAgentWallet()` succeeds: `emitProgress(walletAddress, 'complete', 'Agent registered successfully!')`
- [ ] On error: `emitProgress(walletAddress, 'error', errorMessage)`

**File:** `packages/shared/src/types/agent.ts`

Add new ProgressStep values:

```typescript
export type ProgressStep =
  // FX steps
  | 'fetching_news' | 'analyzing' | 'checking_signals' | 'executing_trades'
  // Yield steps
  | 'scanning_vaults' | 'analyzing_yields' | 'checking_yield_guardrails'
  | 'executing_yields' | 'claiming_rewards'
  // Registration steps (NEW)
  | 'registering_8004' | 'linking_wallet'
  // Terminal
  | 'complete' | 'error';
```

#### 1.4 Fix Register-8004 Atomicity

**File:** `apps/api/src/services/agent-registry.ts`

Currently if `register()` succeeds but `setAgentWallet()` fails, the agent ID is lost. Fix:

- [ ] After `register()` succeeds, immediately save `agent_8004_id` and `agent_8004_tx_hash` to DB
- [ ] Then attempt `setAgentWallet()` — if it fails, the agent ID is still saved and user can retry linking
- [ ] Pass `walletAddress` and `agentType` to `registerAgentOnChain()` so it can emit progress events

---

### Phase 2: Backend — Support Re-Onboarding

#### 2.1 Allow Onboarding Re-Entry

**File:** `apps/api/src/routes/user.ts`

The `/api/user/complete-onboarding` endpoint stays as-is (sets `onboarding_completed = true`). The frontend will handle allowing re-entry — see Phase 4.

No backend changes needed for this; `onboarding_completed` just means "user has been through onboarding at least once" (not "user has all agents configured").

#### 2.2 Add Per-Agent Status Check (optional helper)

**File:** `apps/api/src/routes/user.ts`

Add a lightweight endpoint to check which agents exist:

```typescript
// GET /api/user/agents — returns which agent types user has configured
app.get('/api/user/agents', { preHandler: authMiddleware }, async (request) => {
  const walletAddress = request.user!.walletAddress;
  const { data } = await supabaseAdmin
    .from('agent_configs')
    .select('agent_type, active, agent_8004_id')
    .eq('wallet_address', walletAddress);
  return { agents: data ?? [] };
});
```

---

### Phase 3: Frontend — Registration Page with Live Progress

Replace the static spinner in `register-agent.tsx` with a WebSocket-powered step indicator.

#### 3.1 Update RegisterAgent Component

**File:** `apps/web/src/app/(auth)/onboarding/_components/register-agent.tsx`

- [ ] Accept `agentType` prop: `agentType: 'fx' | 'yield'`
- [ ] Pass `agent_type` in the API call body:
  ```typescript
  await api.post('/api/agent/register-8004', { agent_type: agentType });
  ```
- [ ] Integrate `useAgentProgress()` hook for live WS updates during registration
- [ ] Show a visual step indicator with 3 steps:
  1. "Registering on ERC-8004" (step: `registering_8004`)
  2. "Linking server wallet" (step: `linking_wallet`)
  3. "Complete" (step: `complete`)
- [ ] Show live log messages below the step indicator (from WS `message` field)
- [ ] Add "Gasless" badge on the register button: `<Badge variant="outline">Gasless</Badge>`
- [ ] Update the description to mention gas-free registration
- [ ] On success: show agent ID, link to 8004scan, auto-advance after 3s or click "Continue"

#### 3.2 Update Progress Hook Labels

**File:** `apps/web/src/hooks/use-agent-progress.ts`

Add labels for new registration steps:

```typescript
const STEP_LABELS: Record<ProgressStep, string> = {
  // ... existing labels
  registering_8004: 'Registering on ERC-8004...',
  linking_wallet: 'Linking server wallet...',
};
```

---

### Phase 4: Frontend — Fix Onboarding Flow

#### 4.1 Remove isOnboarded Redirect Block

**File:** `apps/web/src/app/(auth)/onboarding/page.tsx`

The `useEffect` at line 41-45 redirects `isOnboarded` users away. This blocks the second-agent flow.

- [ ] Remove the `isOnboarded` redirect effect entirely
- [ ] Instead, only redirect if user navigates to `/onboarding` without a `?agent=` param AND is already onboarded:

```typescript
useEffect(() => {
  // If already onboarded and no specific agent requested, redirect to dashboard
  if (isOnboarded && !preselectedAgent) {
    router.replace('/fx-agent');
  }
}, [isOnboarded, preselectedAgent, router]);
```

#### 4.2 Pass agentType Through to Registration

**File:** `apps/web/src/app/(auth)/onboarding/page.tsx`

- [ ] Pass `agentType` state to `RegisterAgent` component:
  ```tsx
  <RegisterAgent
    agentType={agentType}
    serverWalletAddress={submissionResult?.serverWalletAddress ?? null}
    walletAddress={walletAddress ?? ''}
    onDone={handleOnboardingDone}
  />
  ```

#### 4.3 Fix handleOnboardingDone Redirect

**File:** `apps/web/src/app/(auth)/onboarding/page.tsx` (line 78)

Already correct — redirects to `/yield-agent` or `/fx-agent` based on `agentType`. No change needed.

#### 4.4 Add "Skip Onboarding Entirely" Option

**File:** `apps/web/src/app/(auth)/onboarding/_components/agent-select.tsx`

- [ ] Add a "Skip for now" ghost button below the agent cards
- [ ] On click: call `POST /api/user/complete-onboarding` then redirect to `/fx-agent`
- [ ] This marks the user as onboarded with no agents — they'll see hero CTAs on agent pages

---

### Phase 5: Frontend — Fix Dead Routes

#### 5.1 Fix fund-wallet.tsx Skip Routes

**File:** `apps/web/src/app/(auth)/onboarding/_components/fund-wallet.tsx`

- [ ] Line 63: Change `router.push('/dashboard')` → call `onContinue?.()` or use agent-aware redirect
- [ ] Line 109: Change `router.push('/dashboard')` → call `onContinue?.()` (continue to registration)
- [ ] Line 112: Change `router.push('/dashboard')` → call `onContinue?.()` (skip funding, go to registration)

All three should advance to the next phase (registration), not navigate away.

#### 5.2 Fix register-agent.tsx Skip Route

**File:** `apps/web/src/app/(auth)/onboarding/_components/register-agent.tsx`

- [ ] Line 68: Change `router.push('/fx-agent')` → should route based on agent type
- [ ] The `handleSkip` already calls `onDone()` when available; the fallback `router.push('/fx-agent')` should be `router.push(agentType === 'yield' ? '/yield-agent' : '/fx-agent')`

---

### Phase 6: Frontend — FX Agent Hero CTA

Mirror the `YieldHero` pattern already implemented for the yield agent page.

#### 6.1 Add FxHero Component

**File:** `apps/web/src/app/(app)/fx-agent/_components/fx-agent-content.tsx`

- [ ] Add `useAgentStatus()` hook to check if FX agent exists
- [ ] When `!data || isError`: render `FxHero` component (same pattern as `YieldHero`)
- [ ] FxHero content:
  - TrendingUp icon
  - "FX Trading Agent" title
  - Description about autonomous FX stablecoin trading
  - 3 feature cards: AI-Driven Signals, Risk Guardrails, Mento Protocol
  - "Create FX Agent" CTA button → `/onboarding?agent=fx` (or just `/onboarding`)
- [ ] Show skeleton while loading

#### 6.2 Add Late-Registration Banner

**File:** `apps/web/src/app/(app)/fx-agent/_components/fx-agent-content.tsx`
**File:** `apps/web/src/app/(app)/yield-agent/_components/yield-agent-content.tsx`

For users who skipped ERC-8004 registration:

- [ ] Check `agent_8004_id` from agent status response
- [ ] If `null`, show a persistent banner at top of agent page:
  ```
  "Your agent isn't registered on ERC-8004 yet. Register now for free (gasless)."
  [Register Now] [Dismiss]
  ```
- [ ] "Register Now" opens a modal or navigates to `/onboarding?agent=fx&step=register`
- [ ] "Dismiss" stores preference in localStorage to hide for session
- [ ] Alternative simpler approach: inline banner with "Register" button that calls `/api/agent/register-8004` directly with a loading state

---

### Phase 7: Agent Events — Scope by Agent Type

#### 7.1 Update Event Keys

**File:** `apps/api/src/services/agent-events.ts`

Currently events are keyed by `progress:{walletAddress}`. Both FX and yield events go to the same channel.

- [ ] Update event key format: `progress:{walletAddress}:{agentType}` for agent-run events
- [ ] Keep `progress:{walletAddress}` as a fallback for registration events (they're not agent-specific in the same way)
- [ ] Or simpler: include `agentType` in the event payload data

**Recommendation**: Simplest approach — add `agentType` field to the ProgressEvent interface:

```typescript
export interface ProgressEvent {
  step: ProgressStep;
  message: string;
  data?: ProgressData;
  agentType?: 'fx' | 'yield';  // NEW
}
```

This lets the frontend filter events by agent type without changing the event key structure.

#### 7.2 Update WS Route

**File:** `apps/api/src/routes/ws.ts`

- [ ] Forward the `agentType` field in progress events to the client (it's already included in the payload, just needs to be serialized)

#### 7.3 Update Frontend Hook

**File:** `apps/web/src/hooks/use-agent-progress.ts`

- [ ] No changes needed for now — the hook receives all events for the user. Since registration only happens one agent at a time, there won't be conflicting events during onboarding.
- [ ] (Future) If needed, accept an `agentType` filter param to scope events per agent dashboard

---

## Acceptance Criteria

### Core Flow: First-Time User

- [ ] User connects wallet → lands on `/onboarding`
- [ ] Agent select shows FX and Yield cards + "Skip for now" button
- [ ] Selecting FX → questionnaire → fund wallet → register 8004 → `/fx-agent`
- [ ] Selecting Yield → yield setup → fund wallet → register 8004 → `/yield-agent`
- [ ] Skipping → marked as onboarded → redirected to `/fx-agent` with hero CTA visible
- [ ] Registration page shows live step indicator + WS log messages
- [ ] "Gasless" badge visible on register button and in description
- [ ] All "Skip" buttons navigate correctly (no `/dashboard` dead route)

### Core Flow: Adding Second Agent

- [ ] User on `/fx-agent` clicks "Create Yield Agent" (or vice versa from yield page)
- [ ] Goes to `/onboarding?agent=yield` — NOT blocked by `isOnboarded`
- [ ] Yield setup → fund wallet → register 8004 → `/yield-agent`
- [ ] FX agent continues working during yield onboarding

### Core Flow: Late Registration

- [ ] User who skipped 8004 registration sees persistent banner on agent page
- [ ] Clicking "Register Now" triggers registration with live progress
- [ ] Banner disappears after successful registration

### API Robustness

- [ ] All FX agent API routes filter by `agent_type = 'fx'`
- [ ] `register-8004` accepts `agent_type` param, updates correct config
- [ ] If `register()` succeeds but `setAgentWallet()` fails, agent ID is saved (retry-safe)
- [ ] User with both agents: each API endpoint returns correct agent data

### Edge Cases

- [ ] User refreshes during registration — reconnects WS, sees current state
- [ ] User opens multiple tabs during onboarding — BroadcastChannel syncs state
- [ ] User has FX agent, visits `/yield-agent` — sees hero, not error
- [ ] User has both agents — each dashboard shows correct agent data
- [ ] Network error during registration — error state with retry button
- [ ] `setAgentWallet()` fails after `register()` — can retry without duplicate registration

## Files Changed Summary

| File | Changes |
|------|---------|
| `apps/api/src/routes/agent.ts` | Add `.eq('agent_type', 'fx')` to all queries; accept `agent_type` in register-8004 |
| `apps/api/src/routes/user.ts` | Add `GET /api/user/agents` endpoint |
| `apps/api/src/services/agent-registry.ts` | Add progress event emissions; save agent ID after step 1; accept agentType param |
| `apps/api/src/services/agent-events.ts` | Add `agentType` to ProgressEvent interface |
| `packages/shared/src/types/agent.ts` | Add `registering_8004` and `linking_wallet` ProgressStep values |
| `apps/web/src/app/(auth)/onboarding/page.tsx` | Fix isOnboarded redirect; pass agentType to RegisterAgent |
| `apps/web/src/app/(auth)/onboarding/_components/register-agent.tsx` | Accept agentType; integrate WS progress; add step indicator + gasless badge |
| `apps/web/src/app/(auth)/onboarding/_components/fund-wallet.tsx` | Fix 3 dead `/dashboard` routes → use `onContinue` |
| `apps/web/src/app/(auth)/onboarding/_components/agent-select.tsx` | Add "Skip for now" button |
| `apps/web/src/app/(app)/fx-agent/_components/fx-agent-content.tsx` | Add FxHero + status check + late-registration banner |
| `apps/web/src/app/(app)/yield-agent/_components/yield-agent-content.tsx` | Add late-registration banner |
| `apps/web/src/hooks/use-agent-progress.ts` | Add labels for new registration steps |

## Testing Strategy

- [ ] Manual: Complete full FX onboarding flow end-to-end
- [ ] Manual: Complete full Yield onboarding flow end-to-end
- [ ] Manual: Add second agent after first is configured
- [ ] Manual: Skip onboarding, verify hero CTAs on both agent pages
- [ ] Manual: Skip 8004 registration, verify banner appears on agent page
- [ ] Manual: Register 8004 from banner, verify banner disappears
- [ ] Manual: Verify WS progress events during registration
- [ ] API test: Verify FX routes return 404 when only yield agent exists (and vice versa)
- [ ] API test: Verify register-8004 with `agent_type` param targets correct config

## Implementation Order

1. **Phase 1** (Backend fixes) — Unblocks everything else
2. **Phase 3** (Registration UI) — Depends on Phase 1.3 (progress events)
3. **Phase 5** (Dead routes) — Quick wins, no dependencies
4. **Phase 4** (Onboarding flow) — Depends on Phase 1
5. **Phase 6** (FX hero + banners) — Independent
6. **Phase 7** (Event scoping) — Nice-to-have, can be deferred
7. **Phase 2** (Re-onboarding backend) — Lightweight, can go anytime
