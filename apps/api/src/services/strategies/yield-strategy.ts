import type { GuardrailCheck } from '@autoclaw/shared';
import type { YieldOpportunity, YieldSignal, YieldGuardrails, DEFAULT_YIELD_GUARDRAILS } from '@autoclaw/shared';
import { USDC_CELO_ADDRESS, ALL_TOKEN_ADDRESSES } from '@autoclaw/shared';
import { findRoute } from '@autoclaw/contracts';
import { fetchYieldOpportunities, fetchClaimableRewards } from '../merkl-client.js';
import { analyzeYieldOpportunities } from '../yield-analyzer.js';
import { executeYieldDeposit, executeYieldWithdraw } from '../yield-executor.js';
import { checkYieldGuardrails } from '../yield-guardrails.js';
import { IchiVaultAdapter } from '../vault-adapters/ichi.js';
import { celoClient } from '../../lib/celo-client.js';
import type { Address } from 'viem';
import type { PublicClient } from 'viem';
import type {
  AgentStrategy,
  AgentConfigRow,
  StrategyContext,
  StrategyAnalysisResult,
  ExecutionResult,
  WalletContext,
  GuardrailContext,
} from './types.js';

function getTokenSymbolByAddress(address: string): string {
  const addr = address.toLowerCase();
  for (const [symbol, a] of Object.entries(ALL_TOKEN_ADDRESSES)) {
    if (a?.toLowerCase() === addr) return symbol;
  }
  return 'Unknown';
}

/** Enriched opportunity with swap-executability metadata for the analyzer */
export interface YieldOpportunityWithSwapMeta extends YieldOpportunity {
  depositTokenSymbol: string;
  routeFromUSDC: boolean;
}

interface YieldData {
  opportunities: YieldOpportunityWithSwapMeta[];
  claimableRewards: Array<{ token: { symbol: string; address: string }; claimableAmount: string }>;
}

const ichiAdapter = new IchiVaultAdapter();

/**
 * Filter vault opportunities to those where a swap route exists from USDC
 * to the vault's deposit token (via Mento). Adds swap-executability metadata
 * for each vault (deposit token symbol, routeFromUSDC).
 */
async function filterVaultsByRouteAvailability(
  opportunities: YieldOpportunity[],
): Promise<YieldOpportunityWithSwapMeta[]> {
  const publicClient = celoClient as unknown as PublicClient;
  const results = await Promise.allSettled(
    opportunities.map(async (opp): Promise<YieldOpportunityWithSwapMeta | null> => {
      const vaultAddr = opp.vaultAddress as Address;
      if (!vaultAddr || !vaultAddr.startsWith('0x') || vaultAddr.length !== 42) {
        return null;
      }
      const vaultInfo = await ichiAdapter.getVaultInfo(vaultAddr, publicClient);
      const { token: depositToken } = ichiAdapter.getDepositToken(vaultInfo);
      const route = await findRoute(
        USDC_CELO_ADDRESS as Address,
        depositToken,
        publicClient,
      );
      if (!route || route.length === 0) return null;
      const depositTokenSymbol = getTokenSymbolByAddress(depositToken);
      return {
        ...opp,
        depositTokenSymbol,
        routeFromUSDC: true,
      };
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<YieldOpportunityWithSwapMeta | null> => r.status === 'fulfilled',
    )
    .map((r) => r.value)
    .filter((opp): opp is YieldOpportunityWithSwapMeta => opp !== null);
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
    // Fetch all opportunities from Merkl API (doesn't support protocol filter)
    const allOpportunities = await fetchYieldOpportunities();

    // Filter client-side for Ichi protocol (matches POC pattern)
    const ichiOpportunities = allOpportunities.filter(opp =>
      opp.protocol?.toLowerCase().includes('ichi')
    );

    // Filter to only vaults where USDC -> deposit token swap route exists (Mento)
    const opportunities = await filterVaultsByRouteAvailability(ichiOpportunities);

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
      walletAddress: config.wallet_address,
      walletBalances: context.walletBalances?.map((b) => ({
        symbol: b.symbol,
        formatted: b.formatted,
        valueUsd: b.valueUsd,
      })),
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
        vaultAddress: result.vaultAddress,
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
