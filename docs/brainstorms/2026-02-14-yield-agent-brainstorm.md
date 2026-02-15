---
date: 2026-02-14
topic: yield-agent
---

# Yield Agent Brainstorm

## What We're Building

An autonomous yield farming agent on Celo that allocates user funds (USDC base) across multiple Ichi vaults to earn 20-32%+ incentivized APR via Merkl rewards. The agent uses an APR-weighted allocation with LLM risk filtering, runs on a hybrid schedule (periodic + emergency rebalance on large APR drops), and supports auto-compounding of claimed rewards as a user option.

**Key constraint:** This is the second agent type in AutoClaw (after FX). The architecture must be modular — shared services (swap, approve, position tracking, progress streaming, ERC-8004) stay generic, while agent-specific logic (signal generation, analysis, execution strategy) lives behind a strategy interface.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rebalance trigger | Hybrid: scheduled + emergency | Periodic checks every 4-24hrs. Emergency rebalance on >50% APR drop or vault risk events. |
| Vault scope | Multi-vault allocator | Agent splits funds across multiple Ichi vaults based on APR + risk. |
| Architecture refactor | Strategy interface pattern | Create `AgentStrategy` interface. FX → `FxStrategy`, Yield → `YieldStrategy`. Cron dispatches to strategy. |
| Protocol support | Ichi first, then Steer, then Uniswap | Design `VaultAdapter` interface. Ship with `IchiAdapter`, add `SteerAdapter` and `UniswapAdapter` later. |
| LLM role | APR-weighted + LLM risk filter | Default allocation proportional to APR. LLM reviews vault health/risk and can override or reduce allocation. |
| Base currency | USDC | User deposits USDC. Agent swaps to whatever vault needs (USDT, WETH, etc.) via Mento. |
| Rewards handling | User choice | Config option: auto-compound (claim → swap → re-deposit) or hold as earned. |
| Guardrails | Comprehensive | Min APR threshold, max single vault %, min hold period, max IL tolerance, TVL floor. |
| Agent identity | Fully separate | Own onboarding, wallet, 8004 registration, config, guardrails. Shares infra only. |

## Modular Architecture

### Strategy Interface (Core Abstraction)

```
┌─────────────────────────────────────────────┐
│              agent-cron.ts (generic)         │
│  tick → loadStrategy(agent_type) → execute  │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
  FxStrategy      YieldStrategy
  (existing)       (new)
```

```typescript
interface AgentStrategy {
  type: 'fx' | 'yield';
  fetchData(config): Promise<DataPayload>;        // news OR yield opportunities
  analyze(data, context): Promise<Signal[]>;       // LLM analysis → signals
  execute(signal, wallet): Promise<ExecutionResult>; // trade OR deposit/withdraw
  getGuardrails(config): GuardrailCheck[];         // strategy-specific rules
  getProgressSteps(): string[];                    // for WebSocket streaming
}
```

### Vault Adapter Interface (Protocol Abstraction)

```typescript
interface VaultAdapter {
  protocol: 'ichi' | 'steer' | 'uniswap';
  getVaultInfo(address): Promise<VaultInfo>;
  deposit(amount, token, wallet): Promise<TxResult>;
  withdraw(shares, wallet): Promise<TxResult>;
  getPosition(wallet): Promise<VaultPosition>;
  getDepositToken(vault): Promise<{ token: Address; decimals: number }>;
}
```

Ship with `IchiVaultAdapter`. Add `SteerVaultAdapter`, `UniswapV3Adapter` later — each just implements the interface.

### Shared Services (Reusable Across All Agents)

| Service | Used By | Notes |
|---------|---------|-------|
| `trade-executor.ts` (swap) | FX + Yield | Mento multi-hop swaps. Yield uses for USDC→USDT conversion. |
| `position-tracker.ts` | FX + Yield | Track any token position + cost basis. |
| `agent-events.ts` | FX + Yield | WebSocket progress streaming. Generic step names. |
| `agent-registry.ts` (8004) | FX + Yield | On-chain agent identity + reputation. |
| `rules-engine.ts` (guardrails) | FX + Yield | Core checks generic. Extend with yield-specific rules. |
| `packages/contracts` (approve, swap builders) | FX + Yield | ERC-20 approval, calldata builders. |

### New Yield-Specific Services

| Service | Purpose |
|---------|---------|
| `yield-opportunity-fetcher.ts` | Query Merkl API for incentivized vaults, filter by protocol/status/APR |
| `yield-analyzer.ts` | APR-weighted allocation + LLM risk filter. Returns deposit/withdraw/rebalance signals. |
| `yield-executor.ts` | Orchestrates: swap base→deposit token → approve → vault deposit. Also handles withdrawals. |
| `merkl-rewards.ts` | Check rewards via Merkl API, claim via Distributor contract, optionally auto-compound. |
| `vault-adapters/ichi.ts` | IchiVaultAdapter implementation (deposit, withdraw, getPosition) |

## Yield Agent Execution Flow

```
Scheduled tick (every 4-24hrs, configurable)
  │
  ├─ 1. FETCH: Query Merkl API for Celo Ichi opportunities
  │     GET /v4/opportunities?chainId=42220&protocol=ichi&status=LIVE
  │
  ├─ 2. ANALYZE: APR-weighted allocation + LLM risk filter
  │     Input: vaults (APR, TVL, tokens), current positions, portfolio value
  │     Output: signals [{vault, action: deposit|withdraw|hold, amount, reason}]
  │
  ├─ 3. VALIDATE: Check yield guardrails
  │     - Min APR threshold (don't enter if APR < X%)
  │     - Max single vault allocation (no vault > Y% of portfolio)
  │     - Min hold period (don't exit within Z days of entry)
  │     - TVL floor (skip vaults with TVL < $N)
  │     - Max IL tolerance
  │
  ├─ 4. EXECUTE: For each signal
  │     Deposit: USDC → swap to USDT → approve → vault.deposit()
  │     Withdraw: vault.withdraw() → swap back to USDC (optional)
  │     Rebalance: withdraw from underperforming → deposit to better vault
  │
  ├─ 5. REWARDS: Check & claim Merkl rewards (if due)
  │     - Fetch proofs from Merkl API
  │     - Call Distributor.claim()
  │     - If auto-compound: swap rewards → re-deposit
  │
  └─ 6. LOG: Timeline events + progress streaming
        Events: yield_scan, yield_analysis, yield_deposit, yield_withdraw,
                yield_rebalance, reward_claim, reward_compound
```

### Emergency Rebalance (Event-Driven)

In addition to scheduled runs, monitor for:
- APR drop >50% on any vault we're in → trigger immediate rebalance check
- TVL drop >30% → potential liquidity risk → evaluate exit
- Could be implemented as a faster polling loop (every 15min) that only checks current positions

## Yield-Specific Guardrails

```typescript
interface YieldGuardrails {
  minAprThreshold: number;       // Don't enter vaults below X% APR (default: 5%)
  maxSingleVaultPct: number;     // Max allocation to any single vault (default: 40%)
  minHoldPeriodDays: number;     // Don't exit within N days of entry (default: 3)
  maxIlTolerancePct: number;     // Max impermanent loss before forced exit (default: 10%)
  minTvlUsd: number;             // Skip vaults with TVL below $N (default: 50000)
  maxVaultCount: number;         // Max number of concurrent vault positions (default: 5)
  rewardClaimFrequencyHrs: number; // How often to claim Merkl rewards (default: 168 = weekly)
  autoCompound: boolean;         // Whether to re-deposit claimed rewards (default: false)
}
```

## Database Changes

```sql
-- Extend agent_configs
ALTER TABLE agent_configs ADD COLUMN agent_type TEXT DEFAULT 'fx';
ALTER TABLE agent_configs ADD COLUMN strategy_params JSONB DEFAULT '{}';

-- New table: yield positions (supplement agent_positions)
CREATE TABLE yield_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  vault_address TEXT NOT NULL,
  protocol TEXT NOT NULL,          -- 'ichi', 'steer', 'uniswap'
  lp_shares NUMERIC NOT NULL,
  deposit_token TEXT NOT NULL,
  deposit_amount NUMERIC NOT NULL,
  deposited_at TIMESTAMPTZ NOT NULL,
  current_apr NUMERIC,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend agent_timeline event_type enum
-- Add: 'yield_deposit', 'yield_withdraw', 'yield_rebalance', 'reward_claim', 'reward_compound'
```

## Token Flow

```
User funds USDC into agent wallet
  │
  ├─ DEPOSIT FLOW:
  │   USDC → Mento Broker → USDT (6 dec) → Ichi Vault → LP shares (18 dec)
  │                                                          │
  │                                              Merkl monitors position
  │                                              Rewards accrue every ~2hrs
  │                                              Roots published every ~8hrs
  │
  ├─ CLAIM FLOW:
  │   Merkl API → fetch proofs → Distributor.claim() → reward tokens to wallet
  │                                                        │
  │   If auto-compound: reward tokens → swap to USDT → re-deposit to vault
  │
  └─ WITHDRAW FLOW:
      LP shares → Ichi vault.withdraw() → USDT + WETH (proportional)
                                              │
                                    Swap WETH → USDT → USDC (optional)
```

## Key Contracts (Celo)

| Contract | Address | Notes |
|----------|---------|-------|
| USDC | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | Base currency (6 dec) |
| USDT | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` | Deposit token for Ichi vaults (6 dec) |
| WETH | `0xD221812de1BD094f35587EE8E174B07B6167D9Af` | Received on withdrawal (18 dec) |
| Ichi USDT-WETH | `0x46689E56aF9b3c9f7D88F2A987264D07C0815e14` | Primary vault, ~32% APR |
| Merkl Distributor | `0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae` | Reward claiming |
| Mento Broker | `0x777A8255cA72412f0d706dc03C9D1987306B4CaD` | Stablecoin swaps |

## PoC Results (Proven)

| Step | Script | Status | Key Finding |
|------|--------|--------|-------------|
| Query Merkl | 01-query-merkl.ts | PASS | 6 live Ichi vaults found |
| Swap USDC→USDT | 02-swap-usdc-to-usdt.ts | PASS | 2-hop via USDm hub works. Must use native CELO for gas (not feeCurrency). |
| Deposit to vault | 03-deposit-ichi.ts | PASS | Single-sided USDT deposit. Can revert transiently due to hysteresis check — retry works. |
| Check position | 04-check-position.ts | PASS | LP shares → proportional underlying (USDT + WETH) |
| Check rewards | 05-check-rewards.ts | PASS | API works, rewards take ~8hrs to appear |
| Claim rewards | 06-claim-rewards.ts | READY | Structurally complete, needs rewards to accrue |
| Withdraw | 07-withdraw.ts | PASS | Returns USDT + WETH proportionally |

**Critical learnings:**
1. Use native CELO for gas — feeCurrency adapter causes SafeERC20 failures with Mento Broker
2. Ichi deposit can transiently revert (`IV.deposit: try later`) when spot/TWAP price diverges >0.5% — need retry logic
3. Withdrawal returns both tokens — need to swap WETH back to USDT/USDC if user wants single-token exit
4. Mento 2-hop swap intermediate amount must be explicitly calculated (not 0)

## Next Steps

1. **`/workflows:plan`** — Create implementation plan for modular yield agent
2. Refactor agent-cron.ts to use AgentStrategy interface
3. Build YieldStrategy + IchiVaultAdapter
4. Build yield-specific onboarding + dashboard UI
5. Test full cycle with real funds on Celo
