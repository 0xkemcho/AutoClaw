# Live Agent Run UI + Backend Logging

**Date:** 2026-02-14
**Status:** Ready for planning

---

## What We're Building

A Perplexity-style **live agent run viewer** that appears inline on the dashboard when an agent run is in progress. Each step streams rich, real-time data (news sources with links, AI signals, guardrail verdicts, trade results) over the existing WebSocket. When the run completes, the live card animates away and the results merge into the Activity Preview timeline as a collapsed run group.

On the backend: structured logging with Fastify's pino logger at every step, plus richer error details in both server logs and timeline events so failures are debuggable.

---

## Why This Approach

- **Inline dashboard card** keeps the user on the page they're already looking at after hitting "Run Now" — no modal/panel to dismiss.
- **Rich step data** (like Perplexity showing search queries + source titles) gives users confidence the agent is working and makes it understandable what the AI decided and why.
- **Merge into timeline** on completion avoids a second UI to maintain — the existing `RunGroupCard` in Activity Preview already handles collapsed run groups perfectly.
- **Both structured server logs AND timeline errors** because the server logs help developers debug, while the timeline errors help users understand what went wrong.

---

## Key Decisions

### 1. UI Location: Dashboard inline card
- Appears at the top of the dashboard (above the 2-column grid) when `isRunning === true`
- Uses the existing `useAgentProgress()` WebSocket hook — just needs richer payloads
- Animates in on run start, collapses out on completion
- After collapse: invalidate timeline query so the new run group appears in Activity Preview

### 2. Step Detail Level: Rich (Perplexity-style)
Each progress step carries **data payloads** streamed over WebSocket:

| Step | Data Shown |
|------|-----------|
| `fetching_news` | Search queries used (e.g. "EURm latest news"), then article titles + domains as clickable links as they arrive |
| `analyzing` | "Analyzing 12 articles with AI..." → then signal cards appear (currency, direction, confidence) |
| `checking_signals` | Each signal → guardrail result (passed/blocked with reason) |
| `executing_trades` | Trade details: "Buying 50 EURm for $50.00" → tx hash link on success |
| `complete` | Summary: "3 signals, 1 trade executed, 2 held" |
| `error` | Error message + which step failed |

### 3. Backend Changes: Granular progress events + structured logging
- Expand `ProgressStep` type to include optional `data` payload
- Add `fastify.log.info/warn/error` at every step in `agent-cron.ts`
- Include step context in error timeline events (which currencies, which step failed, stack trace excerpt)

### 4. Collapsed State: Merge into Activity Preview
- On `complete`/`error` → wait ~2s for animation → hide live card
- Invalidate timeline React Query → new run group appears at top of Activity Preview
- No sticky card — the timeline IS the history

---

## Existing Infrastructure to Leverage

| Component | Status | What it does |
|-----------|--------|-------------|
| `agent-events.ts` | EXISTS | EventEmitter singleton, emits `progress:{wallet}` events |
| `ws.ts` | EXISTS | WebSocket route at `/api/ws`, authenticates via JWT, forwards progress events |
| `useAgentProgress()` | EXISTS | React hook, connects to WS, tracks `isRunning` + `currentStep` + `stepMessage` |
| `agent-cron.ts` `emitProgress()` calls | EXISTS | 6 emit points already in the run cycle |
| `RunGroupCard` in timeline | EXISTS | Collapsible run group in Activity Preview + Timeline page |
| `run_id` on timeline entries | EXISTS | Groups events by run for display |

**What needs to change:**
- `emitProgress()` signature: add optional `data: Record<string, unknown>` payload
- `ws.ts`: forward the `data` field to clients
- `useAgentProgress()`: accumulate step history (not just current step) + store data payloads
- New `LiveRunCard` component on dashboard
- `agent-cron.ts`: emit richer data at each step + add pino logging

---

## Open Questions

1. **News fetch streaming** — Currently `fetchFxNews()` returns all articles at once. Should we emit individual articles as they're found (requires refactoring news-fetcher), or just emit the full batch once fetched? (Batch is simpler and probably fine — the fetch is fast.)

2. **Multiple concurrent runs** — Can a user trigger "Run Now" while a cron run is in progress? Current code doesn't prevent this. Should the live UI handle showing two runs? (Probably: just queue/ignore the second trigger.)

3. **Reconnection** — If the user refreshes mid-run, the WS reconnects but loses accumulated step history. Should we persist run progress server-side (e.g. in-memory map keyed by wallet) so reconnecting clients can catch up? Or accept that a refresh loses the live view (they'll see results in timeline once done)?

---

## Scope Boundary

**In scope:**
- Backend: richer `emitProgress` payloads, structured pino logging, error detail in timeline
- Frontend: `LiveRunCard` component, enhanced `useAgentProgress` hook
- Integration: wire into dashboard, collapse into timeline on completion

**Out of scope (for now):**
- Streaming individual news articles one-by-one (batch is fine)
- Persistent run progress across server restarts
- Push notifications for completed runs
- Historical run replay (viewing past runs step-by-step)
