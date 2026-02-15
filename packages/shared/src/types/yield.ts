import type { RiskProfile } from './user';

export interface YieldGuardrails {
  minAprThreshold: number;        // Don't enter vaults below X% APR
  maxSingleVaultPct: number;      // Max allocation to any single vault (%)
  minHoldPeriodDays: number;      // Don't exit within N days of entry
  maxIlTolerancePct: number;      // Max impermanent loss before forced exit (%)
  minTvlUsd: number;              // Skip vaults with TVL below $N
  maxVaultCount: number;          // Max concurrent vault positions
  rewardClaimFrequencyHrs: number; // How often to claim Merkl rewards
  autoCompound: boolean;          // Whether to re-deposit claimed rewards
}

export const DEFAULT_YIELD_GUARDRAILS: Record<RiskProfile, YieldGuardrails> = {
  conservative: {
    minAprThreshold: 8,
    maxSingleVaultPct: 25,
    minHoldPeriodDays: 7,
    maxIlTolerancePct: 5,
    minTvlUsd: 100_000,
    maxVaultCount: 3,
    rewardClaimFrequencyHrs: 168,
    autoCompound: false,
  },
  moderate: {
    minAprThreshold: 5,
    maxSingleVaultPct: 40,
    minHoldPeriodDays: 3,
    maxIlTolerancePct: 10,
    minTvlUsd: 50_000,
    maxVaultCount: 5,
    rewardClaimFrequencyHrs: 168,
    autoCompound: false,
  },
  aggressive: {
    minAprThreshold: 3,
    maxSingleVaultPct: 60,
    minHoldPeriodDays: 1,
    maxIlTolerancePct: 20,
    minTvlUsd: 20_000,
    maxVaultCount: 8,
    rewardClaimFrequencyHrs: 72,
    autoCompound: true,
  },
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
  /** Merkl opportunity type (CLAMM, ERC20LOGPROCESSOR, UNISWAP_V4) */
  type?: string;
  /** Merkl app page URL for this opportunity */
  merklUrl?: string;
}

export interface YieldPosition {
  id: string;
  vaultAddress: string;
  protocol: string;
  lpShares: string;
  depositToken: string;
  depositAmountUsd: number;
  depositedAt: string;
  currentApr: number | null;
  lastCheckedAt: string | null;
  underlyingTokens?: Array<{ symbol: string; amount: string; valueUsd: number }>;
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

export interface YieldAnalysisResult {
  signals: YieldSignal[];
  strategySummary: string;
  sourcesUsed: number;
}

export interface MerklReward {
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  amount: string;
  claimed: string;
  pending: string;
  proofs: string[];
}

export interface ClaimableReward extends MerklReward {
  claimableAmount: string;
  claimableValueUsd: number;
}

export interface YieldExecutionResult {
  success: boolean;
  txHash?: string;
  action: 'deposit' | 'withdraw' | 'claim' | 'compound';
  vaultAddress?: string;
  amountUsd?: number;
  sharesReceived?: string;
  error?: string;
}
