import type { GuardrailCheck } from '@autoclaw/shared';
import type { YieldOpportunity, YieldSignal, YieldGuardrails, DEFAULT_YIELD_GUARDRAILS } from '@autoclaw/shared';
import { fetchYieldOpportunities, fetchClaimableRewards } from '../merkl-client';
import { analyzeYieldOpportunities } from '../yield-analyzer';
import { executeYieldDeposit, executeYieldWithdraw } from '../yield-executor';
import { checkYieldGuardrails } from '../yield-guardrails';
import type { Address } from 'viem';
import type {
  AgentStrategy,
  AgentConfigRow,
  StrategyContext,
  StrategyAnalysisResult,
  ExecutionResult,
  WalletContext,
  GuardrailContext,
} from './types';

interface YieldData {
  opportunities: YieldOpportunity[];
  claimableRewards: Array<{ token: { symbol: string; address: string }; claimableAmount: string }>;
}

function getGuardrails(config: AgentConfigRow): YieldGuardrails {
  const params = ((config as any).strategy_params ?? {}) as Record<string, unknown>;
  return {
    minAprThreshold: (params.minAprThreshold as number) ?? 5,
    maxSingleVaultPct: (params.maxSingleVaultPct as number) ?? 40,
    minHoldPeriodDays: (params.minHoldPeriodDays as number) ?? 3,
    maxIlTolerancePct: (params.maxIlTolerancePct as number) ?? 10,
    minTvlUsd: (params.minTvlUsd as number) ?? 50_000,
    maxVaultCount: (params.maxVaultCount as number) ?? 5,
    rewardClaimFrequencyHrs: (params.rewardClaimFrequencyHrs as number) ?? 168,
    autoCompound: (params.autoCompound as boolean) ?? false,
  };
}

export class YieldStrategy implements AgentStrategy {
  type = 'yield' as const;

  async fetchData(config: AgentConfigRow, _context: StrategyContext): Promise<YieldData> {
    // Fetch Ichi vault opportunities from Merkl
    const opportunities = await fetchYieldOpportunities('ichi');

    // Fetch claimable rewards for this wallet
    const claimableRewards = config.server_wallet_address
      ? await fetchClaimableRewards(config.server_wallet_address)
      : [];

    return { opportunities, claimableRewards };
  }

  async analyze(
    data: unknown,
    config: AgentConfigRow,
    context: StrategyContext,
  ): Promise<StrategyAnalysisResult> {
    const { opportunities } = data as YieldData;
    const guardrails = getGuardrails(config);

    // Filter by TVL floor before analysis
    const filtered = opportunities.filter(o => o.tvl >= guardrails.minTvlUsd);

    const result = await analyzeYieldOpportunities({
      opportunities: filtered,
      currentPositions: context.positions.map((p: any) => ({
        vaultAddress: p.vault_address ?? p.vaultAddress ?? '',
        depositAmountUsd: Number(p.deposit_amount_usd ?? p.depositAmountUsd ?? 0),
        currentApr: p.current_apr ?? p.currentApr ?? null,
      })),
      portfolioValueUsd: context.portfolioValueUsd,
      guardrails,
      customPrompt: config.custom_prompt,
    });

    return {
      signals: result.signals,
      summary: result.strategySummary,
      sourcesUsed: result.sourcesUsed,
    };
  }

  async executeSignal(
    signal: unknown,
    wallet: WalletContext,
    _config: AgentConfigRow,
  ): Promise<ExecutionResult> {
    const s = signal as YieldSignal;

    if (s.action === 'deposit') {
      const result = await executeYieldDeposit({
        serverWalletId: wallet.serverWalletId,
        serverWalletAddress: wallet.serverWalletAddress,
        vaultAddress: s.vaultAddress as Address,
        amountUsd: s.amountUsd,
      });
      return {
        success: result.success,
        txHash: result.txHash,
        amountUsd: s.amountUsd,
        error: result.error,
      };
    }

    if (s.action === 'withdraw') {
      const result = await executeYieldWithdraw({
        serverWalletId: wallet.serverWalletId,
        serverWalletAddress: wallet.serverWalletAddress,
        vaultAddress: s.vaultAddress as Address,
      });
      return {
        success: result.success,
        txHash: result.txHash,
        error: result.error,
      };
    }

    // hold — no action needed
    return { success: true };
  }

  checkGuardrails(
    signal: unknown,
    config: AgentConfigRow,
    context: GuardrailContext,
  ): GuardrailCheck {
    const s = signal as YieldSignal;
    const guardrails = getGuardrails(config);

    return checkYieldGuardrails({
      signal: s,
      guardrails,
      currentPositions: context.positions.map((p: any) => ({
        vaultAddress: p.vault_address ?? p.vaultAddress ?? '',
        depositAmountUsd: Number(p.deposit_amount_usd ?? p.depositAmountUsd ?? 0),
        depositedAt: p.deposited_at ?? p.depositedAt ?? new Date().toISOString(),
      })),
      portfolioValueUsd: context.portfolioValueUsd,
    });
  }

  getProgressSteps(): string[] {
    return ['scanning_vaults', 'analyzing_yields', 'checking_yield_guardrails', 'executing_yields', 'claiming_rewards'];
  }
}
