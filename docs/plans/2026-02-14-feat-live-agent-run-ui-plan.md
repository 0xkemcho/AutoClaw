---
title: "feat: Live Agent Run UI + Backend Logging"
type: feat
date: 2026-02-14
---

# Live Agent Run UI + Backend Logging

## Overview

Add a Perplexity-style live agent run viewer inline on the dashboard. When an agent runs (manual or cron), a card streams real-time steps with rich data — news sources as clickable links, AI signals, guardrail verdicts, trade results. On completion, the card collapses and the run merges into the Activity Preview timeline. Additionally, add structured pino logging on the backend so failures are debuggable from server logs.

## Problem Statement

1. **No live visibility** — After hitting "Run Now", the user sees only a spinning label ("Fetching news...") with no detail about what's happening inside the run.
2. **Silent failures** — The agent run failed and there were no descriptive logs to debug with. The backend uses raw `console.log`/`console.error` with minimal context.
3. **UX gap** — Modern AI products (Perplexity, ChatGPT) show each reasoning step as it happens. AutoClaw should do the same for its agent runs.

## Proposed Solution

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  agent-cron.ts                                       │
│  emitProgress(wallet, step, msg, data)  ◄── NEW data │
│          │                                           │
│          ▼                                           │
│  agent-events.ts  (EventEmitter)                     │
│          │                                           │
│          ▼                                           │
│  ws.ts   (WebSocket → client)                        │
│  { type:'progress', step, message, data }            │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  useAgentProgress()  — accumulate step history[]     │
│          │                                           │
│          ▼                                           │
│  LiveRunCard  (dashboard inline)                     │
│  - Renders each step with data                       │
│  - Collapses on complete → timeline takes over       │
└─────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Backend — Enrich progress events + structured logging

**`packages/shared/src/types/agent.ts`**
- Expand `ProgressStep` type (already shared) — no new steps needed, keep existing 6
- Add `ProgressEventData` type for the optional payload per step:

```typescript
export interface ProgressNewsData {
  articles: Array<{ title: string; url: string; source: string }>;
  queryCount: number;
}

export interface ProgressSignalsData {
  signals: Array<{
    currency: string;
    direction: string;
    confidence: number;
    reasoning: string;
  }>;
  marketSummary: string;
}

export interface ProgressGuardrailData {
  currency: string;
  direction: string;
  passed: boolean;
  reason?: string;
  ruleName?: string;
}

export interface ProgressTradeData {
  currency: string;
  direction: string;
  amountUsd: number;
  txHash?: string;
  error?: string;
}

export interface ProgressCompleteData {
  signalCount: number;
  tradeCount: number;
  blockedCount: number;
}

export interface ProgressErrorData {
  step: string;
  error: string;
}

export type ProgressData =
  | ProgressNewsData
  | ProgressSignalsData
  | ProgressGuardrailData
  | ProgressTradeData
  | ProgressCompleteData
  | ProgressErrorData;
```

**`apps/api/src/services/agent-events.ts`**
- Update `ProgressEvent` interface to include optional `data`:

```typescript
export interface ProgressEvent {
  step: ProgressStep;
  message: string;
  data?: ProgressData;
}
```

- Update `emitProgress()` signature:

```typescript
export function emitProgress(
  walletAddress: string,
  step: ProgressStep,
  message: string,
  data?: ProgressData,
): void {
  agentEvents.emit(`progress:${walletAddress}`, { step, message, data });
}
```

**`apps/api/src/routes/ws.ts`**
- Forward the `data` field in the WebSocket message (currently only sends `step` + `message`):

```typescript
// Line 37: update to include data
socket.send(JSON.stringify({ type: 'progress', step: event.step, message: event.message, data: event.data }));
```

**`apps/api/src/services/agent-cron.ts`** — enrich each `emitProgress()` call:

| Location | Current | New data payload |
|----------|---------|-----------------|
| Line 108 (fetching_news) | `message` only | After fetch: `{ articles: news.map(a => ({ title: a.title, url: a.url, source: a.source })), queryCount }` |
| Line 121 (analyzing) | `message` only | After LLM: `{ signals: signals.signals, marketSummary: signals.marketSummary }` |
| Line 136 (checking_signals) | `message` only | Per signal: `{ currency, direction, passed, reason, ruleName }` |
| Line 207 (executing_trades) | `message` only | Per trade: `{ currency, direction, amountUsd, txHash }` or `{ currency, direction, amountUsd, error }` |
| Line 245 (complete) | `message` only | `{ signalCount, tradeCount, blockedCount }` |
| Line 249 (error) | `message` only | `{ step: currentStepName, error: err.message }` |

**Note on `fetching_news`**: Currently emitted BEFORE the fetch. Move to emit AFTER with article data. Add a second emit before for the "Searching..." state (step stays `fetching_news`, first emit has no data, second has articles).

**Structured logging** — Replace `console.log`/`console.error` in `agent-cron.ts` with Fastify-compatible pino calls:

- Import the Fastify logger instance (pass it as a parameter to `runAgentCycle` or use a module-level logger)
- Add `log.info({ walletAddress, runId, step }, message)` at each step
- Add `log.error({ walletAddress, runId, err }, 'Agent cycle failed')` in catch blocks
- Add `log.warn(...)` for guardrail blocks
- Add `log.info({ txHash, currency, amountUsd }, 'Trade executed')` for successful trades

#### Phase 2: Frontend — Enhanced progress hook

**`apps/web/src/hooks/use-agent-progress.ts`**

Current state: tracks only `currentStep` + `stepMessage` (single values, overwritten each event).

New state: accumulate a **step history** so the LiveRunCard can render all steps:

```typescript
export interface StepEntry {
  step: ProgressStep;
  message: string;
  data?: ProgressData;
  timestamp: number;
}

export interface ProgressState {
  isRunning: boolean;
  currentStep: ProgressStep | null;
  stepLabel: string;
  stepMessage: string;
  steps: StepEntry[];  // NEW — accumulated history for current run
}
```

Changes:
- On each non-terminal progress event: append to `steps[]` (don't replace)
- On terminal event (`complete`/`error`): append final step, then after 3s delay clear `steps[]`
- On run start (first non-terminal event after idle): reset `steps[]` to empty before appending
- `IDLE_STATE` gets `steps: []`

#### Phase 3: Frontend — LiveRunCard component

**New file: `apps/web/src/app/(app)/dashboard/_components/live-run-card.tsx`**

A card that renders inline at the top of the dashboard when `isRunning === true` OR when `steps.length > 0` (covers the 3s post-completion window).

**Visual structure** (inspired by Perplexity):

```
┌──────────────────────────────────────────────────────┐
│  ● Agent Running                          2 of 4 ▼  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ● Fetching news for EURm, GBPm, JPYm...           │
│    Searching                                         │
│    ┌──────────────────────────────────────────────┐  │
│    │ ↗ Dollar makes soft start to 2026    cnbc    │  │
│    │ ↗ US Dollar Rate Today               wise    │  │
│    │ ↗ Fed independence worries          reuters   │  │
│    └──────────────────────────────────────────────┘  │
│                                                      │
│  ● Analyzing 12 articles with AI...                  │
│    ┌──────────────────────────────────────────────┐  │
│    │ EURm  BUY  78%  "Euro strengthening..."      │  │
│    │ GBPm  HOLD 45%  "Pound stable..."            │  │
│    └──────────────────────────────────────────────┘  │
│                                                      │
│  ◌ Checking signals...                  (in progress)│
│  ○ Executing trades...                     (pending) │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Component props:**
```typescript
interface LiveRunCardProps {
  steps: StepEntry[];
  isRunning: boolean;
  currentStep: ProgressStep | null;
}
```

**Rendering logic:**
- Each completed step: solid dot (●) + step content + data (if any)
- Current in-progress step: pulsing dot (◌) with `animate-pulse`
- Future steps: dim dot (○)
- Step data renders based on step type:
  - `fetching_news` + `ProgressNewsData` → list of clickable article links with domain badges
  - `analyzing` + `ProgressSignalsData` → signal cards (currency, direction badge, confidence bar, reasoning)
  - `checking_signals` + `ProgressGuardrailData` → pass/block badge per signal
  - `executing_trades` + `ProgressTradeData` → trade details + tx hash link
  - `complete` + `ProgressCompleteData` → summary line
  - `error` + `ProgressErrorData` → red error message

**Animation:**
- Card fades in on run start (useMotionSafe)
- Steps animate in as they arrive (staggered fade-up)
- On completion: card fades out after 3s, timeline query is already invalidated so Activity Preview shows the new run group

**Collapse behavior:**
- Entire card uses AnimatePresence + motion.div
- Visible when `steps.length > 0`
- When steps reset to `[]` (3s after terminal), card exits

#### Phase 4: Dashboard integration

**`apps/web/src/app/(app)/dashboard/_components/dashboard-content.tsx`**

- Import `LiveRunCard`
- Place it above the 2-column grid (between `<h1>` and `<FundingBanner>`)
- Pass `steps`, `isRunning`, `currentStep` from `useAgentProgress()`
- Conditionally render: only when `steps.length > 0`

```tsx
{progress.steps.length > 0 && (
  <LiveRunCard
    steps={progress.steps}
    isRunning={progress.isRunning}
    currentStep={progress.currentStep}
  />
)}
```

---

## Acceptance Criteria

### Functional
- [ ] When "Run Now" is clicked, a live card appears at the top of the dashboard
- [ ] Each agent step streams in real-time with data (news links, signals, guardrail results, trades)
- [ ] News articles are clickable links that open in new tabs
- [ ] Signals show currency, direction, confidence, and reasoning
- [ ] Guardrail results show pass/block with reason
- [ ] Trade results show amount, direction, and tx hash link
- [ ] On completion, card collapses and run appears in Activity Preview
- [ ] On error, card shows the error message with which step failed
- [ ] Backend logs are structured (JSON, pino) with wallet, runId, and step context

### Non-Functional
- [ ] WebSocket protocol backward-compatible (old clients ignore `data` field)
- [ ] No performance regression from accumulating step history (cleared on run end)
- [ ] Graceful degradation: if WS disconnects mid-run, card shows "Connection lost" state
- [ ] Works with both manual "Run Now" and cron-triggered runs

## Dependencies & Risks

- **Risk**: The `emitProgress` data payloads increase WebSocket message size. Mitigation: news articles are capped at 15 max, signals at ~5, total payload per message under 10KB.
- **Risk**: Accumulating step history in React state could grow. Mitigation: cleared on each run end, max ~10 steps per run.
- **Dependency**: The existing WebSocket infrastructure (`ws.ts`, `agent-events.ts`) is already working and tested.
- **Dependency**: Fastify logger (`{ logger: true }`) is already enabled — pino is available via `app.log`.

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `packages/shared/src/types/agent.ts` | Add `ProgressData` types |
| 2 | `apps/api/src/services/agent-events.ts` | Add `data` to `ProgressEvent` + `emitProgress()` |
| 3 | `apps/api/src/routes/ws.ts` | Forward `data` field |
| 4 | `apps/api/src/services/agent-cron.ts` | Enrich emitProgress calls + add pino logging |
| 5 | `apps/web/src/hooks/use-agent-progress.ts` | Add `steps[]` accumulation |
| 6 | `apps/web/src/app/(app)/dashboard/_components/live-run-card.tsx` | **NEW** — LiveRunCard component |
| 7 | `apps/web/src/app/(app)/dashboard/_components/dashboard-content.tsx` | Wire LiveRunCard |

## References

- Brainstorm: `docs/brainstorms/2026-02-14-live-agent-run-ui-brainstorm.md`
- Existing WebSocket: `apps/api/src/routes/ws.ts`
- Existing events: `apps/api/src/services/agent-events.ts`
- Existing hook: `apps/web/src/hooks/use-agent-progress.ts`
- Agent execution: `apps/api/src/services/agent-cron.ts`
