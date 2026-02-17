---
title: "fix: Max Trade Size Percentage (1–100%) + Cap by Available Balance"
type: fix
date: 2026-02-17
---

# fix: Max Trade Size Percentage + Cap by Available Balance

## Overview

Two related fixes for FX agent trade sizing:

1. **Option C — Percentage-based max trade size:** Change max trade size from absolute dollars to a percentage of **available buying power** (1–100%). A setting of 100% means a single trade can use up to 100% of your USDC + USDT + USDm balance.
2. **Option D — Cap trades by available balance:** Never attempt a trade larger than the current available base-token balance (USDC + USDT + USDm). Skip or reduce trade size when insufficient.

**Root cause:** The backend uses `max_trade_size_usd` as an absolute dollar cap (e.g. $200), while the UI displays it as "% of portfolio" with values that can exceed 100%. This causes trades to fail with "Insufficient balance" when the agent tries $200 on a $100 wallet.

## Current State

| Component | Current behavior |
|-----------|------------------|
| DB column | `max_trade_size_usd` NUMERIC (50, 200, 500 = dollars) |
| Rules engine | `tradeAmountUsd > config.maxTradeSizeUsd` → block |
| Agent cron | `s.amountUsd = calculateTradeAmount(confidence, maxTradeSizeUsd)` |
| Settings UI | Slider 1–100, suffix "% of portfolio", but stores raw number |
| Dashboard | Shows `formatUsd(maxTradeSize)` → "$200" (correct for dollars) |
| Execution | No pre-check; `executeTrade` fails at runtime if balance insufficient |

## Problems Identified

| # | Problem | Impact |
|---|---------|--------|
| 1 | Max trade size stored as dollars but UI says "% of portfolio" | User sees "200% of portfolio" (nonsensical); confusion |
| 2 | Trade size can exceed available balance | Execution fails with "Insufficient balance"; wasted attempts |
| 3 | No cap at 100% for percentage semantics | Even if we fix UI, 200% has no valid meaning |
| 4 | Multiple signals can total > 100% of balance | Agent tries $200 + $150 + $150 + $50 sequentially; only last succeeds |

## User Decisions

| Question | Decision |
|----------|----------|
| Max trade size semantics | Percentage of portfolio (1–100%) |
| 100% meaning | Single trade can use up to 100% of **available buying power** (USDC + USDT + USDm), not total portfolio |
| When balance insufficient | Cap trade to available balance (Option D) |
| Minimum trade threshold | Skip trade if capped amount &lt; $1 (avoid dust trades) |

## Implementation Phases

### Phase 1: Database Migration — Add `max_trade_size_pct`

**File:** `supabase/migrations/YYYYMMDDHHMMSS_max_trade_size_pct.sql`

1. Add new column `max_trade_size_pct NUMERIC DEFAULT 25` (1–100, percentage).
2. Migrate existing `max_trade_size_usd` values to approximate percentages:
   - 50 → 5% (conservative)
   - 200 → 25% (moderate)
   - 500 → 50% (aggressive)
   - Other values: map proportionally or default to 25.
3. Add CHECK constraint: `max_trade_size_pct >= 1 AND max_trade_size_pct <= 100`.
4. Drop column `max_trade_size_usd` (or keep for backward compat during rollout — see Phase 2).

**Backward compatibility option:** Keep `max_trade_size_usd` temporarily. If `max_trade_size_pct` is NULL, derive: `pct = min(100, (max_trade_size_usd / portfolioValueUsd) * 100)` at runtime. Migration can backfill `max_trade_size_pct` and later drop `max_trade_size_usd`.

### Phase 2: Backend — Use Percentage and Compute Dollar Cap

#### 2.1 Update `agent_configs` Types and API

**File:** `packages/db/src/types.ts` (or generated types)

- Ensure `max_trade_size_pct` is in Row/Insert/Update (after migration).
- Remove or deprecate `max_trade_size_usd` references.

**File:** `apps/api/src/routes/agent.ts`

- `GET /api/agent/status`: Return `maxTradeSizePct` (1–100) instead of `maxTradeSizeUsd`.
- `PUT /api/agent/settings`: Accept `maxTradeSizePct` (1–100), validate range, store in `max_trade_size_pct`.
- Remove `maxTradeSizeUsd` from request/response bodies.

#### 2.2 Update Rules Engine

**File:** `apps/api/src/services/rules-engine.ts`

- Change `checkGuardrails` config from `maxTradeSizeUsd` to `maxTradeSizePct`.
- Rule logic: Compute `maxTradeUsd = availableBuyingPowerUsd * (maxTradeSizePct / 100)` (for buys). `availableBuyingPowerUsd` = sum of USDC, USDT, USDm balances.
- Block when `tradeAmountUsd > maxTradeUsd`.

**File:** `packages/shared/src/types/agent.ts`

- Update `AgentConfigForRules` / `DEFAULT_GUARDRAILS`: Replace `maxTradeSizeUsd` with `maxTradeSizePct` (values: 5, 25, 50).

#### 2.3 Update Agent Cron (Option C + D)

**File:** `apps/api/src/services/agent-cron.ts`

1. **Compute available buying power (Option D):**
   - `availableBuyingPowerUsd = walletBalances.filter(b => ['USDC','USDT','USDm'].includes(b.symbol)).reduce((s,b) => s + b.valueUsd, 0)`.
   - Initialize before the signal loop.

2. **Compute max trade in dollars (Option C):**
   - `maxTradeSizePct = config.max_trade_size_pct ?? 25`.
   - `maxTradeUsd = availableBuyingPowerUsd * (maxTradeSizePct / 100)`.
   - Pass `maxTradeUsd` to `calculateTradeAmount` instead of raw `max_trade_size_usd`.

3. **Cap by available balance (Option D):**
   - For each BUY signal: `effectiveAmountUsd = min(s.amountUsd, availableBuyingPowerUsd)`.
   - If `effectiveAmountUsd < 1`: skip trade (log "Insufficient balance: would be < $1").
   - Else: set `s.amountUsd = effectiveAmountUsd` before guardrails/execution.
   - After successful BUY: `availableBuyingPowerUsd -= result.amountUsd`.

4. **Pass `availableBuyingPowerUsd` to guardrail context** (optional) so rules-engine could enforce "don't exceed available" as a guardrail. Alternatively, keep Option D purely in agent-cron before execution.

#### 2.4 Update Guardrail Context and FX Strategy

**File:** `apps/api/src/services/strategies/types.ts` (or wherever GuardrailContext is defined)

- Add `availableBuyingPowerUsd?: number` to GuardrailContext. Agent-cron will set this from walletBalances.

**File:** `apps/api/src/services/agent-cron.ts`

- Add `availableBuyingPowerUsd` to guardrailContext (recomputed after each successful buy for accuracy).

**File:** `apps/api/src/services/strategies/fx-strategy.ts`

- `checkGuardrails`: Pass `maxTradeSizePct` and `availableBuyingPowerUsd` (or precomputed `maxTradeSizeUsd`) to rules-engine.

#### 2.5 Update User Onboarding

**File:** `apps/api/src/routes/user.ts`

- Use `max_trade_size_pct` from `DEFAULT_GUARDRAILS` (e.g. 25) when creating agent_configs.

### Phase 3: Frontend — Percentage UI and Display

#### 3.1 Settings Page

**File:** `apps/web/src/app/(app)/settings/_components/settings-content.tsx`

- Rename form field: `maxTradeSizePct` (or keep `maxTradeSizeUsd` name but store percentage).
- Slider: `min={1}`, `max={100}`, `step={1}`, `suffix="% of portfolio"`.
- Tooltip: "Maximum percentage of your available balance that can be used in a single trade (1–100%)."
- Send `maxTradeSizePct` to API.
- Default: 25.

#### 3.2 Dashboard Guardrails Card

**File:** `apps/web/src/app/(app)/fx-agent/_components/dashboard/portfolio-guardrails-card.tsx`

- Display "Max Trade Size" as `{maxTradeSizePct}%` instead of `formatUsd(maxTradeSize)`.
- Optionally show effective cap: "~$X at current portfolio" if portfolio value is available.

#### 3.3 API Client / Hooks

**File:** `apps/web/src/hooks/use-agent.ts`

- Update `AgentConfigResponse`: `maxTradeSizePct: number` (replace `maxTradeSizeUsd`).
- Update `useUpdateSettings` mutation payload.

### Phase 4: Tests

- [ ] Rules engine: Update tests for `maxTradeSizePct`, ensure `maxTradeUsd` derived correctly.
- [ ] Agent cron: Test cap-by-balance (mock walletBalances, verify `effectiveAmountUsd` and `availableBuyingPowerUsd` decrement).
- [ ] API routes: Settings PUT/GET with `maxTradeSizePct`.
- [ ] Migration: Verify existing rows get sensible `max_trade_size_pct` values.

### Phase 5: Yield Agent (if applicable)

- Yield agent may use different semantics (vault deposits). Check `yield-executor`, `yield-guardrails` for `max_trade_size` usage. If not used, Phase 2–3 can be FX-only by filtering on `agent_type`.

## File Checklist

| File | Change |
|------|--------|
| `supabase/migrations/...` | New migration: add `max_trade_size_pct`, migrate data, drop `max_trade_size_usd` |
| `packages/db/src/types.ts` | Update agent_configs types |
| `packages/shared/src/types/agent.ts` | DEFAULT_GUARDRAILS: maxTradeSizePct |
| `apps/api/src/services/rules-engine.ts` | Use maxTradeSizePct, compute maxTradeUsd |
| `apps/api/src/services/agent-cron.ts` | Option C: derive maxTradeUsd; Option D: cap by availableBuyingPowerUsd |
| `apps/api/src/services/strategies/fx-strategy.ts` | Pass maxTradeSizePct / maxTradeUsd to checkGuardrails |
| `apps/api/src/routes/agent.ts` | Status + settings: maxTradeSizePct |
| `apps/api/src/routes/user.ts` | Onboarding: max_trade_size_pct |
| `apps/web/.../settings-content.tsx` | Slider 1–100%, maxTradeSizePct |
| `apps/web/.../portfolio-guardrails-card.tsx` | Display "X%" |
| `apps/web/src/hooks/use-agent.ts` | maxTradeSizePct in types |

## Rollout Order

1. Migration (with backward compat: keep max_trade_size_usd if desired).
2. Backend: rules-engine, agent-cron, fx-strategy, routes.
3. Frontend: settings, dashboard, hooks.
4. Tests.
5. Deploy.

## Edge Cases

- **Empty wallet:** `availableBuyingPowerUsd === 0` → `maxTradeUsd = 0`; all buys blocked. OK.
- **Available balance &lt; portfolio value:** Use `availableBuyingPowerUsd` for both percentage base and cap. The percentage is % of available buying power.
- **Sells:** Option C/D apply to buys only. For sells, `tradeAmountUsd` is value being sold; cap by position size. Rules-engine can use `availableBuyingPowerUsd` = N/A for sells, or a separate rule (e.g. max sell = X% of position). Simplest: keep existing behavior for sells (no balance cap; allocation rules still apply).
