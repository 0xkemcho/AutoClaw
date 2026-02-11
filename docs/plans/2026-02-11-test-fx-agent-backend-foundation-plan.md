---
title: "test: FX Trading Agent Backend Foundation Tests"
type: test
date: 2026-02-11
part: 1-tests
series: fx-trading-agent
depends_on: 2026-02-11-feat-fx-agent-backend-foundation-plan
---

# Test Plan: FX Trading Agent Backend Foundation

Unit tests and integration tests for all Part 1 features. Designed for **parallel implementation using 4-5 agents**.

## Overview

Add Vitest as the test framework across the monorepo, then write comprehensive tests for every module created in Part 1: rules engine, agent cron, funding monitor, Turnkey wallet helpers, agent API routes, shared types, and the database migration.

## Setup: Test Infrastructure

### Install Vitest (root + packages)

```bash
pnpm add -Dw vitest @vitest/coverage-v8
pnpm add -D vitest --filter @autoclaw/api
pnpm add -D vitest --filter @autoclaw/shared
```

### Create Vitest configs

**`vitest.config.ts` (root workspace config):**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**`apps/api/vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**`packages/shared/vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
```

### Test setup file

**`apps/api/src/test/setup.ts`:**

```typescript
// Mock environment variables for all tests
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.TURNKEY_API_PUBLIC_KEY = 'test-public-key';
process.env.TURNKEY_API_PRIVATE_KEY = 'test-private-key';
process.env.TURNKEY_ORGANIZATION_ID = 'test-org-id';
process.env.CELO_RPC_URL = 'https://forno.celo.org';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '4001';
```

### Add test scripts to package.json files

```json
// Root package.json
"test": "turbo test",
"test:coverage": "turbo test -- --coverage"

// apps/api/package.json
"test": "vitest run",
"test:watch": "vitest"

// packages/shared/package.json
"test": "vitest run",
"test:watch": "vitest"
```

### Add turbo pipeline

```json
// turbo.json - add to pipeline
"test": {
  "dependsOn": ["^type-check"]
}
```

### Supabase mock helper

**`apps/api/src/test/mock-supabase.ts`:**

```typescript
import { vi } from 'vitest';

/** Create a chainable mock that mimics supabase query builder */
export function createMockQueryBuilder(returnData: unknown = [], returnError: unknown = null) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'not', 'order', 'range', 'limit', 'single'];

  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal methods return data
  builder.then = undefined; // Make it awaitable
  Object.defineProperty(builder, 'then', {
    value: (resolve: (value: unknown) => void) => {
      resolve({ data: returnData, error: returnError, count: Array.isArray(returnData) ? returnData.length : 1 });
    },
  });

  return builder;
}

export function createMockSupabase() {
  return {
    from: vi.fn().mockReturnValue(createMockQueryBuilder()),
  };
}
```

---

## Test Modules (5 Parallel Workstreams)

Each workstream is independent and can be implemented by a separate agent.

---

### Workstream 1: Rules Engine Unit Tests

**File:** `apps/api/src/services/rules-engine.test.ts`
**Source:** `apps/api/src/services/rules-engine.ts`
**Type:** Pure unit tests (no mocks needed — pure functions)

#### Tests for `checkGuardrails()`:

- [ ] **Allowed currencies** — signal currency in allowed list → passes
- [ ] **Allowed currencies** — signal currency NOT in allowed list → blocks with `allowed_currencies` rule
- [ ] **Allowed currencies** — empty allowed list → passes (no restriction)
- [ ] **Blocked currencies** — signal currency in blocked list → blocks with `blocked_currencies` rule
- [ ] **Blocked currencies** — signal currency NOT in blocked list → passes
- [ ] **Daily trade limit** — tradesToday < limit → passes
- [ ] **Daily trade limit** — tradesToday >= limit → blocks with `daily_trade_limit` rule
- [ ] **Max trade size** — tradeAmountUsd <= max → passes
- [ ] **Max trade size** — tradeAmountUsd > max → blocks with `max_trade_size` rule
- [ ] **Max allocation** — post-trade allocation within limit → passes (buy signal)
- [ ] **Max allocation** — post-trade allocation exceeds limit → blocks with `max_allocation` rule
- [ ] **Max allocation** — sell signal → skips allocation check
- [ ] **Max allocation** — zero portfolio value → skips check
- [ ] **Rule priority** — first failing rule is returned (test order matters)
- [ ] **All pass** — all guardrails pass → `{ passed: true }`

#### Tests for `calculateTradeAmount()`:

- [ ] Confidence >= 90 → returns 100% of maxTradeSizeUsd
- [ ] Confidence 80-89 → returns 75%
- [ ] Confidence 70-79 → returns 50%
- [ ] Confidence 60-69 → returns 25%
- [ ] Confidence < 60 → returns 0

---

### Workstream 2: Agent Cron Unit Tests

**File:** `apps/api/src/services/agent-cron.test.ts`
**Source:** `apps/api/src/services/agent-cron.ts`
**Type:** Unit tests with Supabase mocks

Must mock:
- `@autoclaw/db` → `createSupabaseAdmin` returns mock Supabase client
- `vi.useFakeTimers()` for interval testing

#### Tests for `startAgentCron()`:

- [ ] Calls `setInterval` with 60_000ms interval
- [ ] Runs `agentTick` immediately on start

#### Tests for `logTimeline()`:

- [ ] Inserts correct row into `agent_timeline` with all fields mapped
- [ ] Maps `confidencePct` → `confidence_pct`, `amountUsd` → `amount_usd`, etc.
- [ ] Default values: `detail` → `{}`, `citations` → `[]`, nullable fields → `null`
- [ ] Logs error on insert failure (does not throw)

#### Tests for `getTradeCountToday()`:

- [ ] Returns count from Supabase query filtered by today's date
- [ ] Filters by `event_type = 'trade'` and correct wallet
- [ ] Returns 0 on error

#### Tests for `runAgentCycle()`:

- [ ] Calls `logTimeline` with 'system' event type
- [ ] Accepts an `AgentConfigRow` shaped object

---

### Workstream 3: Funding Monitor Unit Tests

**File:** `apps/api/src/services/funding-monitor.test.ts`
**Source:** `apps/api/src/services/funding-monitor.ts`
**Type:** Unit tests with mocks for viem + Supabase

Must mock:
- `@autoclaw/db` → `createSupabaseAdmin`
- `../lib/celo-client` → `celoClient.readContract`
- `./agent-cron` → `logTimeline`

#### Tests for `checkForDeposits()`:

- [ ] Queries all agent_configs with non-null turnkey_wallet_address
- [ ] Calls `balanceOf` for each of USDm, USDC, USDT on each wallet
- [ ] First check (no previous balance) → does NOT log a funding event
- [ ] Subsequent check with increased balance → logs funding event with correct amount
- [ ] Subsequent check with same balance → does NOT log
- [ ] Subsequent check with decreased balance → does NOT log (withdrawal, not deposit)
- [ ] Formats USDm correctly (18 decimals)
- [ ] Formats USDC/USDT correctly (6 decimals)
- [ ] Handles error on individual token check gracefully (continues to next)
- [ ] Handles empty configs list (no-op)

---

### Workstream 4: Shared Types & Default Guardrails Tests

**File:** `packages/shared/src/types/agent.test.ts`
**Source:** `packages/shared/src/types/agent.ts`
**Type:** Unit tests (pure type/value assertions)

#### Tests for `DEFAULT_GUARDRAILS`:

- [ ] `conservative` profile has strictest limits (lowest maxTradeSizeUsd, maxAllocationPct)
- [ ] `moderate` profile has middle-ground limits
- [ ] `aggressive` profile has most permissive limits
- [ ] All profiles have required fields: `frequency`, `maxTradeSizeUsd`, `maxAllocationPct`, `stopLossPct`, `dailyTradeLimit`
- [ ] `conservative` frequency is 'daily'
- [ ] `moderate` frequency is 'daily'
- [ ] `aggressive` frequency is '4h'
- [ ] All numeric values are positive numbers

#### Type export tests:

- [ ] `AgentFrequency` type allows 'daily', '4h', 'hourly'
- [ ] `TimelineEventType` type allows 'trade', 'analysis', 'funding', 'guardrail', 'system'
- [ ] `Signal` interface has `currency`, `direction`, `confidence`, `reasoning`
- [ ] `GuardrailCheck` interface has `passed` (required), `blockedReason` and `ruleName` (optional)

---

### Workstream 5: Agent API Routes Integration Tests

**File:** `apps/api/src/routes/agent.test.ts`
**Source:** `apps/api/src/routes/agent.ts`
**Type:** Integration tests using Fastify's `inject()` method

Must mock:
- `@autoclaw/db` → `createSupabaseAdmin`
- `../middleware/auth` → `authMiddleware` (auto-set `request.user`)

Setup: Create a Fastify instance, register the `agentRoutes` plugin, mock auth to always set a test wallet address.

#### `GET /api/agent/status` tests:

- [ ] Returns 404 when no agent config exists
- [ ] Returns config with camelCase field names
- [ ] Includes `tradesToday` count (from agent_timeline query)
- [ ] Includes `positionCount` (from agent_positions query)

#### `POST /api/agent/toggle` tests:

- [ ] Returns 404 when no agent config exists
- [ ] Toggles active from false → true and sets `next_run_at`
- [ ] Toggles active from true → false
- [ ] Returns `{ active: boolean }`

#### `GET /api/agent/timeline` tests:

- [ ] Returns paginated entries with default limit=20, offset=0
- [ ] Accepts custom `limit` and `offset` query params
- [ ] Filters by `type` query param
- [ ] Returns `entries`, `total`, `hasMore` fields
- [ ] Entries are mapped to camelCase (eventType, confidencePct, amountUsd, etc.)

#### `GET /api/agent/timeline/:id` tests:

- [ ] Returns 404 when entry not found
- [ ] Returns single entry mapped to camelCase
- [ ] Only returns entries belonging to the authenticated user's wallet

#### `PUT /api/agent/settings` tests:

- [ ] Updates frequency
- [ ] Updates maxTradeSizeUsd, maxAllocationPct, stopLossPct, dailyTradeLimit
- [ ] Updates allowedCurrencies, blockedCurrencies arrays
- [ ] Updates customPrompt
- [ ] Returns `{ success: true }`
- [ ] Returns 500 on DB error

#### `GET /api/agent/positions` tests:

- [ ] Returns positions with balance > 0
- [ ] Maps to camelCase (tokenSymbol, tokenAddress, avgEntryRate)
- [ ] Returns empty array when no positions

#### `GET /api/agent/portfolio` tests:

- [ ] Returns `totalValueUsd` and `holdings` array
- [ ] Each holding has `tokenSymbol`, `balance`, `priceUsd`, `valueUsd`
- [ ] Uses latest price from `token_price_snapshots`
- [ ] Defaults to $1 when no price snapshot exists

---

## Acceptance Criteria

- [ ] Vitest installed and configured in `apps/api` and `packages/shared`
- [ ] `pnpm test` runs all tests from root via turbo
- [ ] All 5 test files created with passing tests
- [ ] Rules engine: 20 test cases covering all 5 guardrail rules + trade sizing
- [ ] Agent cron: 8+ test cases covering tick, logging, counting
- [ ] Funding monitor: 10+ test cases covering deposit detection logic
- [ ] Shared types: 12+ test cases covering defaults and type exports
- [ ] Agent routes: 20+ test cases covering all 7 endpoints
- [ ] No test touches real Supabase, Turnkey, or blockchain — all mocked
- [ ] Tests run in < 10 seconds total

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `vitest.config.ts` (root) |
| Create | `apps/api/vitest.config.ts` |
| Create | `packages/shared/vitest.config.ts` |
| Create | `apps/api/src/test/setup.ts` |
| Create | `apps/api/src/test/mock-supabase.ts` |
| Create | `apps/api/src/services/rules-engine.test.ts` |
| Create | `apps/api/src/services/agent-cron.test.ts` |
| Create | `apps/api/src/services/funding-monitor.test.ts` |
| Create | `packages/shared/src/types/agent.test.ts` |
| Create | `apps/api/src/routes/agent.test.ts` |
| Modify | `package.json` (root — add test script) |
| Modify | `apps/api/package.json` (add vitest dep + test scripts) |
| Modify | `packages/shared/package.json` (add vitest dep + test scripts) |
| Modify | `turbo.json` (add test pipeline) |

## Parallel Execution Strategy

5 agents run simultaneously after infrastructure setup:

```
Agent 0 (Setup):     Install vitest, create configs, setup files, mock helpers
                     ↓ (all agents start after setup)
Agent 1 (Rules):     rules-engine.test.ts (pure unit tests, no mocks)
Agent 2 (Cron):      agent-cron.test.ts (Supabase mocks, fake timers)
Agent 3 (Funding):   funding-monitor.test.ts (viem + Supabase mocks)
Agent 4 (Shared):    agent.test.ts in packages/shared (pure value tests)
Agent 5 (Routes):    agent.test.ts in apps/api/routes (Fastify inject + mocks)
```

Agent 0 completes first (infrastructure), then Agents 1-5 work in parallel. Each agent is fully independent — no shared test state.

## References

- Source files: `apps/api/src/services/rules-engine.ts`, `agent-cron.ts`, `funding-monitor.ts`
- Source files: `apps/api/src/routes/agent.ts`, `apps/api/src/lib/turnkey-wallet.ts`
- Shared types: `packages/shared/src/types/agent.ts`
- Part 1 plan: `docs/plans/2026-02-11-feat-fx-agent-backend-foundation-plan.md`
- Vitest docs: https://vitest.dev/
