---
title: "feat: Modular Yield Agent with Strategy Interface"
type: feat
date: 2026-02-15
---

# feat: Modular Yield Agent with Strategy Interface

## Overview

Build an autonomous yield farming agent for AutoClaw that allocates user funds (USDC) across multiple Ichi vaults on Celo to earn 20-32%+ Merkl-incentivized APR. This is the second agent type — the architecture introduces a **Strategy Interface** pattern so the agent cron loop becomes generic and dispatches to FX or Yield strategies. Each agent type gets its own Privy server wallet, onboarding flow, guardrails, and ERC-8004 identity.

**Brainstorm:** `docs/brainstorms/2026-02-14-yield-agent-brainstorm.md`
**PoC Scripts:** `scripts/yield-poc/` (all 7 scripts proven working)

## Key Decisions

| Decision | Choice |
|----------|--------|
| Multi-agent | Yes, separate Privy wallets per agent type |
| Architecture | Strategy interface (`AgentStrategy` + `VaultAdapter`) |
| Rebalance | Scheduled + piggybacked emergency check (no separate cron) |
| Vault scope | Multi-vault allocator (Ichi first, then Steer/Uniswap) |
| LLM role | APR-weighted allocation + Gemini risk filter |
| Base currency | USDC |
| Rewards | User choice: auto-compound or hold |
| Stop behavior | Toggle = pause (positions stay). Separate "Withdraw All" button for full exit. |
| Guardrails | Min APR, max vault %, min hold period, IL tolerance, TVL floor, max vault count |

## Implementation Phases

### Phase 1: Shared Infrastructure (Strategy Interface + DB)

Refactor the agent system to support multiple agent types without breaking the existing FX agent.

#### 1.1 Database Migration

**File:** `supabase/migrations/20260215000000_yield_agent_tables.sql`

```sql
-- 1. Allow multiple agent_configs per user (one per agent_type)
ALTER TABLE agent_configs ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'fx';
ALTER TABLE agent_configs ADD COLUMN strategy_params JSONB DEFAULT '{}';
ALTER TABLE agent_configs DROP CONSTRAINT IF EXISTS agent_configs_wallet_address_key;
ALTER TABLE agent_configs ADD CONSTRAINT agent_configs_wallet_address_type_key
  UNIQUE (wallet_address, agent_type);

-- 2. Yield positions table
CREATE TABLE yield_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  vault_address TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'ichi',
  lp_shares NUMERIC NOT NULL DEFAULT 0,
  deposit_token TEXT NOT NULL,
  deposit_amount_usd NUMERIC NOT NULL DEFAULT 0,
  deposited_at TIMESTAMPTZ,
  current_apr NUMERIC,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wallet_address, vault_address)
);

ALTER TABLE yield_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own yield positions"
  ON yield_positions FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

-- 3. Extend timeline event types (existing TEXT column, no enum change needed)
-- New event_type values: 'yield_deposit', 'yield_withdraw', 'yield_rebalance',
--   'reward_claim', 'reward_compound', 'yield_analysis'

-- 4. Index for yield positions
CREATE INDEX idx_yield_positions_wallet ON yield_positions(wallet_address);
CREATE INDEX idx_yield_positions_vault ON yield_positions(vault_address);
```

- [x] Create migration file
- [ ] Update `packages/db` generated types (run `supabase gen types`)
- [ ] Verify RLS policies work

#### 1.2 Shared Types

**File:** `packages/shared/src/types/agent.ts`

- [x] Add `AgentType = 'fx' | 'yield'` type
- [x] Add `agent_type` field to `AgentConfig` interface
- [x] Add `strategy_params` field to `AgentConfig` (typed as `Record<string, unknown>`)
- [x] Add `YieldGuardrails` interface:

```typescript
// packages/shared/src/types/yield.ts (NEW FILE)
export interface YieldGuardrails {
  minAprThreshold: number;        // default: 5 (%)
  maxSingleVaultPct: number;      // default: 40 (%)
  minHoldPeriodDays: number;      // default: 3
  maxIlTolerancePct: number;      // default: 10 (%)
  minTvlUsd: number;              // default: 50000
  maxVaultCount: number;          // default: 5
  rewardClaimFrequencyHrs: number; // default: 168 (weekly)
  autoCompound: boolean;          // default: false
}

export const DEFAULT_YIELD_GUARDRAILS: Record<RiskProfile, YieldGuardrails> = {
  conservative: { minAprThreshold: 8, maxSingleVaultPct: 25, minHoldPeriodDays: 7,
    maxIlTolerancePct: 5, minTvlUsd: 100000, maxVaultCount: 3,
    rewardClaimFrequencyHrs: 168, autoCompound: false },
  moderate: { minAprThreshold: 5, maxSingleVaultPct: 40, minHoldPeriodDays: 3,
    maxIlTolerancePct: 10, minTvlUsd: 50000, maxVaultCount: 5,
    rewardClaimFrequencyHrs: 168, autoCompound: false },
  aggressive: { minAprThreshold: 3, maxSingleVaultPct: 60, minHoldPeriodDays: 1,
    maxIlTolerancePct: 20, minTvlUsd: 20000, maxVaultCount: 8,
    rewardClaimFrequencyHrs: 72, autoCompound: true },
};

export interface YieldOpportunity {
  id: string;
  name: string;
  vaultAddress: string;
  protocol: string;
  status: string;
  apr: number;
  tvl: number;
  dailyRewards: number;
  tokens: Array<{ symbol: string; address: string; decimals: number }>;
  depositUrl?: string;
}

export interface YieldPosition {
  vaultAddress: string;
  protocol: string;
  lpShares: string;
  depositToken: string;
  depositAmountUsd: number;
  depositedAt: string;
  currentApr: number;
  underlyingTokens: Array<{ symbol: string; amount: string; valueUsd: number }>;
}

export interface YieldSignal {
  vaultAddress: string;
  vaultName: string;
  action: 'deposit' | 'withdraw' | 'hold';
  amountUsd: number;
  allocationPct: number;
  confidence: number;
  reasoning: string;
  estimatedApr: number;
  riskLevel: 'low' | 'medium' | 'high';
}
```

- [x] Add yield progress steps to `ProgressStep` union:
  `'scanning_vaults' | 'analyzing_yields' | 'checking_yield_guardrails' | 'executing_yields' | 'claiming_rewards'`
- [x] Add yield progress data types: `ProgressYieldScanData`, `ProgressYieldSignalData`, `ProgressYieldDepositData`, `ProgressRewardClaimData`
- [x] Export all from `packages/shared/src/index.ts`

#### 1.3 Strategy Interface

**File:** `apps/api/src/services/strategies/types.ts` (NEW)

```typescript
import type { AgentConfigRow } from '../agent-cron';

export interface AgentStrategy {
  type: 'fx' | 'yield';

  /** Fetch external data (news for FX, vault opportunities for yield) */
  fetchData(config: AgentConfigRow): Promise<unknown>;

  /** Run LLM analysis, return signals */
  analyze(
    data: unknown,
    context: StrategyContext,
  ): Promise<StrategyAnalysisResult>;

  /** Execute a single signal (trade for FX, deposit/withdraw for yield) */
  executeSignal(
    signal: unknown,
    wallet: WalletContext,
  ): Promise<ExecutionResult>;

  /** Get strategy-specific guardrail checks */
  checkGuardrails(
    signal: unknown,
    config: AgentConfigRow,
    context: GuardrailContext,
  ): GuardrailCheck;

  /** Progress step names for WebSocket streaming */
  getProgressSteps(): string[];
}

export interface StrategyContext {
  positions: any[];
  portfolioValueUsd: number;
  walletBalances: Map<string, bigint>;
  runId: string;
}

export interface StrategyAnalysisResult {
  signals: unknown[];
  summary: string;
  sourcesUsed: number;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  amountIn?: number;
  amountOut?: number;
  error?: string;
}

export interface WalletContext {
  serverWalletId: string;
  serverWalletAddress: string;
}

export interface GuardrailContext {
  positions: any[];
  portfolioValueUsd: number;
  dailyTradeCount: number;
}
```

- [x] Create strategy types file
- [x] Create strategy registry: `apps/api/src/services/strategies/index.ts`

```typescript
import type { AgentStrategy } from './types';
import { FxStrategy } from './fx-strategy';
import { YieldStrategy } from './yield-strategy';

const strategies: Record<string, AgentStrategy> = {
  fx: new FxStrategy(),
  yield: new YieldStrategy(),
};

export function getStrategy(agentType: string): AgentStrategy {
  const strategy = strategies[agentType];
  if (!strategy) throw new Error(`Unknown agent type: ${agentType}`);
  return strategy;
}
```

#### 1.4 Refactor Agent Cron to Use Strategy

**File:** `apps/api/src/services/agent-cron.ts`

The cron loop calls `runAgentCycle(config)`. Refactor the 4 FX-specific call sites to dispatch through strategy:

- [x] **Line ~124**: Replace `fetchFxNews(currencies)` → `strategy.fetchData(config)`
- [x] **Line ~156**: Replace `analyzeFxNews({...})` → `strategy.analyze(data, context)`
- [x] **Line ~268**: Replace `checkGuardrails({...})` → `strategy.checkGuardrails(signal, config, ctx)`
- [x] **Line ~309**: Replace `executeTrade({...})` → `strategy.executeSignal(signal, wallet)`
- [x] Load strategy at top of `runAgentCycle`: `const strategy = getStrategy(config.agent_type ?? 'fx')`
- [x] Update progress step emissions to use `strategy.getProgressSteps()`

#### 1.5 Extract FxStrategy

**File:** `apps/api/src/services/strategies/fx-strategy.ts` (NEW)

Move existing FX-specific logic into `FxStrategy implements AgentStrategy`:

- [x] `fetchData()` → wraps `fetchFxNews()`
- [x] `analyze()` → wraps `analyzeFxNews()`
- [x] `executeSignal()` → wraps `executeTrade()`
- [x] `checkGuardrails()` → wraps existing `checkGuardrails()` from rules-engine
- [x] `getProgressSteps()` → returns `['fetching_news', 'analyzing', 'checking_signals', 'executing_trades']`

**Critical:** FX agent must work exactly as before after this refactor. No behavior changes.

### Phase 2: Yield Agent Backend Services

#### 2.1 Merkl API Client

**File:** `apps/api/src/services/merkl-client.ts` (NEW)

```typescript
const MERKL_API_BASE = 'https://api.merkl.xyz/v4';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min cache

export async function fetchYieldOpportunities(
  chainId: number,
  protocol?: string,
): Promise<YieldOpportunity[]>

export async function fetchUserRewards(
  walletAddress: string,
  chainId: number,
): Promise<MerklReward[]>

export async function fetchClaimData(
  walletAddress: string,
  chainId: number,
): Promise<ClaimableReward[]>
```

- [x] Implement with in-memory cache (5min TTL for opportunities, 2min for rewards)
- [x] Handle rate limiting (10 req/s) with exponential backoff
- [x] Filter for status=LIVE, sort by APR descending
- [x] Handle response format variability (`Array.isArray(data) ? data : []`)

#### 2.2 Ichi Vault Adapter

**File:** `apps/api/src/services/vault-adapters/ichi.ts` (NEW)

```typescript
export class IchiVaultAdapter implements VaultAdapter {
  protocol = 'ichi' as const;

  async getVaultInfo(vaultAddress: Address, client: PublicClient): Promise<VaultInfo>
  async deposit(params: DepositParams): Promise<TxResult>
  async withdraw(params: WithdrawParams): Promise<TxResult>
  async getPosition(vaultAddress: Address, walletAddress: Address, client: PublicClient): Promise<VaultPosition>
  getDepositToken(vaultInfo: VaultInfo): { token: Address; decimals: number }
}
```

- [x] Port logic from PoC scripts (`03-deposit-ichi.ts`, `07-withdraw.ts`, `04-check-position.ts`)
- [x] Add retry logic for hysteresis revert (`IV.deposit: try later` — retry up to 3 times with 10s delay)
- [x] Use native CELO for gas (NOT feeCurrency — PoC proved feeCurrency causes SafeERC20 failures)
- [x] Handle withdrawal returning mixed tokens (USDT + WETH)

**File:** `apps/api/src/services/vault-adapters/types.ts` (NEW)

```typescript
export interface VaultAdapter {
  protocol: string;
  getVaultInfo(address: Address, client: PublicClient): Promise<VaultInfo>;
  deposit(params: DepositParams): Promise<TxResult>;
  withdraw(params: WithdrawParams): Promise<TxResult>;
  getPosition(vaultAddress: Address, walletAddress: Address, client: PublicClient): Promise<VaultPosition>;
  getDepositToken(info: VaultInfo): { token: Address; decimals: number };
}

export interface VaultInfo {
  address: Address;
  token0: Address;
  token1: Address;
  allowToken0: boolean;
  allowToken1: boolean;
  totalSupply: bigint;
  totalAmounts: [bigint, bigint];
  deposit0Max: bigint;
  deposit1Max: bigint;
}

export interface DepositParams {
  vaultAddress: Address;
  amount: bigint;
  tokenIndex: 0 | 1;
  walletClient: WalletClient;
  publicClient: PublicClient;
}

export interface WithdrawParams {
  vaultAddress: Address;
  shares: bigint;
  walletClient: WalletClient;
  publicClient: PublicClient;
}
```

#### 2.3 Yield Analyzer (LLM)

**File:** `apps/api/src/services/yield-analyzer.ts` (NEW)

```typescript
export async function analyzeYieldOpportunities(params: {
  opportunities: YieldOpportunity[];
  currentPositions: YieldPosition[];
  portfolioValueUsd: number;
  walletBalances: Map<string, bigint>;
  guardrails: YieldGuardrails;
  customPrompt?: string;
}): Promise<YieldAnalysisResult>
```

- [x] Use Gemini 2.5 Flash (same model as FX analyzer)
- [ ] APR-weighted base allocation: `vault_apr / sum(all_vault_aprs) * available_capital`
- [ ] Cap each vault at `maxSingleVaultPct`
- [ ] LLM risk filter: pass vault data (APR, TVL, tokens, TVL trend) → LLM can override/reduce allocations
- [ ] Emergency check: if any current position's APR dropped >50% from entry APR, signal withdraw
- [ ] Zod schema for structured output:

```typescript
const YieldSignalSchema = z.object({
  signals: z.array(z.object({
    vaultAddress: z.string(),
    vaultName: z.string(),
    action: z.enum(['deposit', 'withdraw', 'hold']),
    allocationPct: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    reasoning: z.string(),
    estimatedApr: z.number(),
    riskLevel: z.enum(['low', 'medium', 'high']),
  })),
  strategySummary: z.string(),
});
```

- [x] Fallback: if LLM unavailable, skip cycle (log error, retry next scheduled run)

#### 2.4 Yield Executor

**File:** `apps/api/src/services/yield-executor.ts` (NEW)

Orchestrates the full deposit/withdraw flow:

```typescript
export async function executeYieldDeposit(params: {
  vaultAddress: Address;
  amountUsd: number;
  serverWalletId: string;
  serverWalletAddress: Address;
}): Promise<YieldExecutionResult>

export async function executeYieldWithdraw(params: {
  vaultAddress: Address;
  shares: bigint;
  serverWalletId: string;
  serverWalletAddress: Address;
}): Promise<YieldExecutionResult>

export async function executeFullWithdrawal(params: {
  walletAddress: string;
  serverWalletId: string;
  serverWalletAddress: Address;
}): Promise<YieldExecutionResult[]>
```

- [x] Deposit flow: check USDC balance → swap USDC→deposit token via Mento → approve → vault.deposit()
- [x] Withdraw flow: vault.withdraw() → receive mixed tokens → swap non-USDC back to USDC (optional)
- [ ] Full withdrawal: iterate all `yield_positions` → withdraw each → claim all rewards
- [ ] Gas reserve: keep minimum 0.5 CELO + $5 USDC for future gas
- [x] Use existing `trade-executor.ts` swap logic for USDC→USDT conversion (reuse, don't duplicate)

#### 2.5 Merkl Rewards Service

**File:** `apps/api/src/services/merkl-rewards.ts` (NEW)

```typescript
export async function checkAndClaimRewards(params: {
  walletAddress: string;
  serverWalletId: string;
  serverWalletAddress: Address;
  autoCompound: boolean;
  minClaimValueUsd: number; // default $5
}): Promise<RewardClaimResult>
```

- [ ] Port from PoC `06-claim-rewards.ts`
- [ ] Check if claimable value > gas cost (min $5 threshold)
- [ ] Claim via Distributor contract: `claim(users, tokens, amounts, proofs)`
- [ ] **CRITICAL**: Pass cumulative `amount` (not incremental) — Merkl contract tracks what's been claimed
- [ ] If auto-compound: swap reward tokens → USDC → re-add to available capital for next cycle
- [ ] If hold: leave rewards in wallet, log as `reward_claim` timeline event

#### 2.6 Yield Guardrails

**File:** `apps/api/src/services/yield-rules-engine.ts` (NEW)

```typescript
export function checkYieldGuardrails(params: {
  signal: YieldSignal;
  guardrails: YieldGuardrails;
  currentPositions: YieldPosition[];
  portfolioValueUsd: number;
}): GuardrailCheck
```

Checks in order:
1. **Min APR**: `signal.estimatedApr >= guardrails.minAprThreshold`
2. **TVL floor**: vault TVL >= `guardrails.minTvlUsd`
3. **Max vault allocation**: `signal.allocationPct <= guardrails.maxSingleVaultPct`
4. **Max vault count**: `currentPositions.length < guardrails.maxVaultCount` (for deposits)
5. **Min hold period**: for withdrawals, check `daysSince(position.depositedAt) >= guardrails.minHoldPeriodDays`
6. **IL tolerance**: estimated IL <= `guardrails.maxIlTolerancePct` (for existing positions)

- [ ] Implement all 6 checks
- [ ] Return `{ passed, blockedReason, ruleName }` matching existing `GuardrailCheck` type
- [ ] Min hold period is advisory for user-initiated withdrawals (user can override)

#### 2.7 Yield Strategy (Ties It All Together)

**File:** `apps/api/src/services/strategies/yield-strategy.ts` (NEW)

```typescript
export class YieldStrategy implements AgentStrategy {
  type = 'yield' as const;

  async fetchData(config) {
    // 1. Fetch Merkl opportunities (Ichi vaults on Celo)
    // 2. Fetch current yield positions from DB
    // 3. Check if rewards are claimable
    return { opportunities, currentPositions, claimableRewards };
  }

  async analyze(data, context) {
    // 1. Run yield analyzer (APR-weighted + LLM risk filter)
    // 2. Add emergency rebalance signals (>50% APR drop check)
    // 3. Add reward claim signal if due
    return { signals, summary, sourcesUsed };
  }

  async executeSignal(signal, wallet) {
    // Dispatch to deposit/withdraw/claim based on signal.action
    if (signal.action === 'deposit') return executeYieldDeposit(...);
    if (signal.action === 'withdraw') return executeYieldWithdraw(...);
    if (signal.action === 'claim_rewards') return checkAndClaimRewards(...);
  }

  checkGuardrails(signal, config, ctx) {
    return checkYieldGuardrails({ signal, guardrails: parseGuardrails(config), ... });
  }

  getProgressSteps() {
    return ['scanning_vaults', 'analyzing_yields', 'checking_yield_guardrails',
            'executing_yields', 'claiming_rewards'];
  }
}
```

- [ ] Implement YieldStrategy class
- [ ] Register in strategy index
- [ ] Wire up position tracking (update `yield_positions` table after each deposit/withdraw)

### Phase 3: Contracts Package Extension

#### 3.1 Ichi Vault Contract ABIs

**File:** `packages/contracts/src/ichi-vault.ts` (NEW)

- [ ] Export `ichiVaultAbi` (from PoC `config.ts`)
- [ ] Export `merklDistributorAbi`
- [ ] Export vault addresses constant map:

```typescript
export const ICHI_VAULTS: Record<string, { address: Address; token0: string; token1: string }> = {
  'USDT-WETH': { address: '0x46689E56aF9b3c9f7D88F2A987264D07C0815e14', token0: 'USDT', token1: 'WETH' },
  // ... other vaults discovered via Merkl API
};
export const MERKL_DISTRIBUTOR: Address = '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae';
```

- [ ] Export from `packages/contracts/src/index.ts`

### Phase 4: API Routes

#### 4.1 Yield Agent Routes

**File:** `apps/api/src/routes/yield-agent.ts` (NEW)

```
GET  /api/yield-agent/status         → agent config + active state + next run
GET  /api/yield-agent/positions      → current vault positions with APR + underlying
GET  /api/yield-agent/opportunities  → available Ichi vaults from Merkl
GET  /api/yield-agent/rewards        → claimable Merkl rewards
POST /api/yield-agent/register       → create yield agent config + Privy wallet
POST /api/yield-agent/toggle         → pause/resume agent
POST /api/yield-agent/run-now        → trigger immediate run
POST /api/yield-agent/withdraw-all   → full exit: withdraw all positions + claim rewards
POST /api/yield-agent/settings       → update guardrails + frequency
POST /api/yield-agent/register-8004  → register yield agent on-chain identity
GET  /api/yield-agent/timeline       → yield-specific timeline events
```

- [ ] Create route file following existing `routes/agent.ts` patterns
- [ ] All routes protected by auth middleware
- [ ] `register` creates new Privy server wallet (separate from FX wallet)
- [ ] `withdraw-all` calls `executeFullWithdrawal()` → returns tx hashes
- [ ] Register routes in `apps/api/src/index.ts`

### Phase 5: Frontend — Onboarding

#### 5.1 Agent Selection Enhancement

**File:** `apps/web/src/app/(auth)/onboarding/_components/agent-select.tsx`

- [ ] Enable "DeFi Yield Agent" card (currently shows "Coming Soon")
- [ ] On select, set phase to `'yield-questionnaire'` (new phase)
- [ ] Pass `agentType` through onboarding flow

#### 5.2 Yield Questionnaire

**File:** `apps/web/src/app/(auth)/onboarding/_components/yield-questionnaire.tsx` (NEW)

Questions:
1. Investment amount (how much USDC to allocate)
2. Risk tolerance (conservative/moderate/aggressive) — maps to `DEFAULT_YIELD_GUARDRAILS`
3. Auto-compound preference (yes/no)
4. Rebalance frequency (every 4h / 12h / 24h)

- [ ] Follow existing `questionnaire.tsx` patterns (multi-step, motion animations)
- [ ] Return `YieldAnswers` object on completion
- [ ] Wire into onboarding `page.tsx` state machine

#### 5.3 Yield Agent Registration

**File:** `apps/web/src/app/(auth)/onboarding/_components/register-yield-agent.tsx` (NEW)

- [ ] Call `POST /api/yield-agent/register` with questionnaire answers
- [ ] Show wallet address for funding (separate from FX wallet)
- [ ] Optionally register ERC-8004 identity (non-blocking)
- [ ] Redirect to `/yield-agent` on success

### Phase 6: Frontend — Yield Dashboard

#### 6.1 Yield Agent Page

**File:** `apps/web/src/app/(app)/yield-agent/page.tsx` (EXISTS — replace placeholder)

3-tab layout matching FX agent pattern:

**Tab: Agent**
- `YieldStatusCard` — countdown ring, next run timer, active toggle, run now button
- `YieldPositionsCard` — vault positions grid (vault name, APR, deposited, current value, P&L)
- `YieldRewardsCard` — claimable rewards, total earned, claim button
- `LiveYieldRunCard` — progress stepper during agent runs (scanning → analyzing → depositing → claiming → complete)

**Tab: Timeline**
- Reuse `ActivityPreview` component, filter for yield event types
- Show deposit/withdraw/rebalance/claim events grouped by `run_id`

**Tab: Settings**
- Guardrails form: min APR, max vault %, min hold period, IL tolerance, TVL floor, max vaults
- Auto-compound toggle
- Frequency selector
- Withdraw All button (with confirmation modal)

- [ ] Replace placeholder page with tab structure
- [ ] Create `_components/yield-status-card.tsx`
- [ ] Create `_components/yield-positions-card.tsx`
- [ ] Create `_components/yield-rewards-card.tsx`
- [ ] Create `_components/live-yield-run-card.tsx`
- [ ] Create `_components/yield-settings.tsx`
- [ ] Create `_components/withdraw-all-modal.tsx`

#### 6.2 Yield Hooks

**File:** `apps/web/src/hooks/use-yield-agent.ts` (NEW)

```typescript
export function useYieldAgentStatus()     // GET /api/yield-agent/status
export function useYieldPositions()       // GET /api/yield-agent/positions
export function useYieldOpportunities()   // GET /api/yield-agent/opportunities
export function useYieldRewards()         // GET /api/yield-agent/rewards
export function useYieldTimeline()        // GET /api/yield-agent/timeline
export function useToggleYieldAgent()     // POST /api/yield-agent/toggle
export function useRunYieldNow()          // POST /api/yield-agent/run-now
export function useWithdrawAll()          // POST /api/yield-agent/withdraw-all
export function useUpdateYieldSettings()  // POST /api/yield-agent/settings
```

- [ ] Follow existing hook patterns from `use-agent.ts`
- [ ] TanStack Query with proper query keys
- [ ] Mutation hooks invalidate relevant queries on success

#### 6.3 Yield Agent Progress

- [ ] Extend `useAgentProgress` hook to handle yield progress steps
- [ ] Or create `useYieldAgentProgress` if the step types are too different
- [ ] Same WebSocket connection (`/api/ws`), different step names

### Phase 7: Testing

#### 7.1 Unit Tests

- [ ] `apps/api/src/services/yield-rules-engine.test.ts` — all 6 guardrail checks
- [ ] `apps/api/src/services/yield-analyzer.test.ts` — APR weighting, signal generation
- [ ] `apps/api/src/services/merkl-client.test.ts` — API response parsing, caching, error handling
- [ ] `apps/api/src/services/vault-adapters/ichi.test.ts` — deposit/withdraw/position logic

#### 7.2 Integration Test

- [ ] End-to-end yield cycle test: mock Merkl API → generate signals → check guardrails → verify deposit flow
- [ ] Strategy dispatch test: FX config → FxStrategy, yield config → YieldStrategy

## Acceptance Criteria

### Functional

- [ ] User can onboard and select "Yield Agent" as agent type
- [ ] Yield agent gets its own Privy server wallet (separate from FX)
- [ ] Agent fetches Ichi vault opportunities from Merkl API
- [ ] LLM (Gemini) analyzes opportunities and generates allocation signals
- [ ] Agent deposits USDC into Ichi vaults (via USDC→USDT swap + vault deposit)
- [ ] Agent claims Merkl rewards when claimable value > $5
- [ ] Auto-compound works when enabled (claim → swap → re-deposit)
- [ ] All yield guardrails enforced (min APR, max vault %, TVL floor, etc.)
- [ ] Emergency rebalance triggers on >50% APR drop (checked at each scheduled run)
- [ ] "Withdraw All" exits all positions and claims all rewards
- [ ] Toggle pauses/resumes without affecting positions
- [ ] Dashboard shows vault positions, APRs, rewards, P&L
- [ ] Live progress streaming works during yield agent runs
- [ ] Timeline shows yield-specific events
- [ ] ERC-8004 registration works for yield agent identity
- [ ] FX agent continues to work unchanged after refactor

### Non-Functional

- [ ] Merkl API responses cached (5min opportunities, 2min rewards)
- [ ] Ichi deposit retries on hysteresis revert (up to 3 times, 10s delay)
- [ ] Gas paid in native CELO (not feeCurrency)
- [ ] Gas reserve maintained (min 0.5 CELO + $5 USDC)
- [ ] All yield tables have RLS policies

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ichi vault hysteresis revert | Deposit fails transiently | Retry up to 3x with 10s delay (proven in PoC) |
| feeCurrency SafeERC20 failure | Tx reverts | Use native CELO for gas (proven fix) |
| Merkl API rate limit (10 req/s) | Data fetch fails | In-memory cache + exponential backoff |
| LLM unavailable | Agent can't analyze | Skip cycle, retry next scheduled run |
| Mento 2-hop intermediate amount | Swap fails | Calculate intermediate quote (proven fix from PoC) |
| Withdrawal returns mixed tokens | User gets USDT + WETH | Swap non-USDC back to USDC in withdrawal flow |
| DB migration breaks FX agent | FX agent down | Default `agent_type='fx'`, additive migration only |

## File Summary

### New Files (17)

| File | Purpose |
|------|---------|
| `supabase/migrations/20260215000000_yield_agent_tables.sql` | DB schema changes |
| `packages/shared/src/types/yield.ts` | Yield types, guardrails, signals |
| `apps/api/src/services/strategies/types.ts` | AgentStrategy interface |
| `apps/api/src/services/strategies/index.ts` | Strategy registry |
| `apps/api/src/services/strategies/fx-strategy.ts` | FX strategy (extracted) |
| `apps/api/src/services/strategies/yield-strategy.ts` | Yield strategy |
| `apps/api/src/services/merkl-client.ts` | Merkl API client + cache |
| `apps/api/src/services/vault-adapters/types.ts` | VaultAdapter interface |
| `apps/api/src/services/vault-adapters/ichi.ts` | Ichi vault adapter |
| `apps/api/src/services/yield-analyzer.ts` | LLM yield analysis |
| `apps/api/src/services/yield-executor.ts` | Deposit/withdraw orchestration |
| `apps/api/src/services/merkl-rewards.ts` | Reward claiming + compound |
| `apps/api/src/services/yield-rules-engine.ts` | Yield guardrails |
| `apps/api/src/routes/yield-agent.ts` | API routes |
| `packages/contracts/src/ichi-vault.ts` | Ichi ABIs + addresses |
| `apps/web/src/hooks/use-yield-agent.ts` | Frontend hooks |
| `apps/web/src/app/(auth)/onboarding/_components/yield-questionnaire.tsx` | Onboarding |

### Modified Files (8)

| File | Change |
|------|--------|
| `apps/api/src/services/agent-cron.ts` | Dispatch to strategy (4 call sites) |
| `apps/api/src/index.ts` | Register yield-agent routes |
| `packages/shared/src/types/agent.ts` | Add agent_type, yield progress steps |
| `packages/shared/src/index.ts` | Export yield types |
| `packages/contracts/src/index.ts` | Export ichi-vault |
| `apps/web/src/app/(auth)/onboarding/page.tsx` | Add yield onboarding phases |
| `apps/web/src/app/(auth)/onboarding/_components/agent-select.tsx` | Enable yield agent |
| `apps/web/src/app/(app)/yield-agent/page.tsx` | Replace placeholder |

### Test Files (4)

| File | Coverage |
|------|----------|
| `apps/api/src/services/yield-rules-engine.test.ts` | 6 guardrail checks |
| `apps/api/src/services/yield-analyzer.test.ts` | Signal generation |
| `apps/api/src/services/merkl-client.test.ts` | API + caching |
| `apps/api/src/services/vault-adapters/ichi.test.ts` | Deposit/withdraw |

## References

- Brainstorm: `docs/brainstorms/2026-02-14-yield-agent-brainstorm.md`
- PoC scripts: `scripts/yield-poc/` (all 7 scripts proven)
- Merkl docs: `https://docs.merkl.xyz/llms.txt`
- Merkl API: `https://api.merkl.xyz/v4`
- Ichi vault (Celo): `0x46689E56aF9b3c9f7D88F2A987264D07C0815e14`
- Merkl Distributor (Celo): `0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae`
- Existing agent cron: `apps/api/src/services/agent-cron.ts`
- Existing rules engine: `apps/api/src/services/rules-engine.ts`
- Existing LLM analyzer: `apps/api/src/services/llm-analyzer.ts`
