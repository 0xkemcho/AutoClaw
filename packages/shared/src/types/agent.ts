/** Agent type */
export type AgentType = 'fx' | 'yield';

/** Frequency in hours (1–24, integer) */
export type AgentFrequency = number;

/** Convert a frequency (hours) to milliseconds */
export function frequencyToMs(hours: AgentFrequency): number {
  const h = Math.max(1, Math.min(24, Math.round(hours)));
  return h * 60 * 60 * 1000;
}

/**
 * Parse frequency from DB (may be number or string like "4", "4h", "hourly")
 * and return milliseconds. Used by run-now, toggle, and agent cron.
 */
export function parseFrequencyToMs(raw: unknown): number {
  if (typeof raw === 'number' && !isNaN(raw)) {
    return frequencyToMs(raw);
  }
  const str = String(raw ?? '');
  const fromMap = FREQUENCY_MS[str];
  if (fromMap != null) return fromMap;
  const parsed = parseFloat(str);
  if (!isNaN(parsed)) return frequencyToMs(parsed);
  return frequencyToMs(24);
}

/** Format a frequency (hours) as a human-readable label */
export function formatFrequency(hours: AgentFrequency): string {
  if (hours === 1) return 'Every hour';
  if (hours === 24) return 'Every 24h (daily)';
  return `Every ${hours}h`;
}

/**
 * @deprecated Use frequencyToMs() instead. Kept for backwards compat with
 * any DB rows still storing string values during migration.
 */
export const FREQUENCY_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

export type TimelineEventType =
  | 'trade'
  | 'analysis'
  | 'funding'
  | 'guardrail'
  | 'system';

export type TradeDirection = 'buy' | 'sell';

export interface AgentConfig {
  id: string;
  walletAddress: string;
  serverWalletAddress: string | null;
  serverWalletId: string | null;
  active: boolean;
  frequency: AgentFrequency;
  maxTradeSizeUsd: number;
  maxAllocationPct: number;
  stopLossPct: number;
  dailyTradeLimit: number;
  allowedCurrencies: string[];
  blockedCurrencies: string[];
  customPrompt: string | null;
  agent8004Id: number | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  agentType?: AgentType;
  strategyParams?: Record<string, unknown>;
}

export interface AgentTimelineEntry {
  id: string;
  walletAddress: string;
  eventType: TimelineEventType;
  summary: string;
  detail: Record<string, unknown>;
  citations: Citation[];
  confidencePct: number | null;
  currency: string | null;
  amountUsd: number | null;
  direction: TradeDirection | null;
  txHash: string | null;
  createdAt: string;
}

export interface Citation {
  url: string;
  title: string;
  excerpt?: string;
}

export interface AgentPosition {
  id: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenAddress: string;
  balance: number;
  avgEntryRate: number | null;
  updatedAt: string;
}

export interface Signal {
  currency: string;
  direction: TradeDirection;
  confidence: number;
  reasoning: string;
}

/** Signal as returned by the LLM (includes hold and timeHorizon) */
export interface AnalysisSignal {
  currency: string;
  direction: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  timeHorizon: 'short' | 'medium' | 'long';
}

/** Shape of the `detail` JSONB stored with analysis timeline events */
export interface AnalysisDetail {
  marketSummary: string;
  signalCount: number;
  signals: AnalysisSignal[];
  sourcesUsed: number;
}

export interface GuardrailCheck {
  passed: boolean;
  blockedReason?: string;
  ruleName?: string;
}

/* ------------------------------------------------------------------ */
/*  Progress event types (streamed over WebSocket)                     */
/* ------------------------------------------------------------------ */

export type ProgressStep =
  | 'fetching_news'
  | 'analyzing'
  | 'checking_signals'
  | 'executing_trades'
  | 'scanning_vaults'
  | 'analyzing_yields'
  | 'checking_yield_guardrails'
  | 'executing_yields'
  | 'claiming_rewards'
  | 'registering_8004'
  | 'linking_wallet'
  | 'complete'
  | 'error';

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

export interface ProgressYieldScanData {
  vaultCount: number;
  protocols: string[];
  topApr: number;
}

export interface ProgressYieldSignalData {
  signals: Array<{ vaultName: string; action: string; allocationPct: number; apr: number }>;
  strategySummary: string;
}

export interface ProgressYieldDepositData {
  vaultAddress: string;
  vaultName: string;
  action: string;
  amountUsd: number;
  txHash?: string;
  error?: string;
}

export interface ProgressRewardClaimData {
  tokenSymbol: string;
  amount: string;
  valueUsd: number;
  txHash?: string;
  compounded: boolean;
}

export interface ProgressRegistrationData {
  agentId?: number;
  txHash?: string;
}

export interface ProgressReasoningData {
  reasoning_chunk: string;        // Latest chunk of reasoning from LLM
  cumulative_reasoning: string;   // Full reasoning accumulated so far
  stage: 'thinking' | 'analyzing' | 'deciding';
}

export type ProgressData =
  | ProgressNewsData
  | ProgressSignalsData
  | ProgressGuardrailData
  | ProgressTradeData
  | ProgressCompleteData
  | ProgressErrorData
  | ProgressYieldScanData
  | ProgressYieldSignalData
  | ProgressYieldDepositData
  | ProgressRewardClaimData
  | ProgressRegistrationData
  | ProgressReasoningData;

export interface AgentStatus {
  config: AgentConfig;
  portfolioValueUsd: number;
  positionCount: number;
  tradesToday: number;
  agent8004Id: number | null;
}

/* ------------------------------------------------------------------ */
/*  ERC-8004 types                                                     */
/* ------------------------------------------------------------------ */

export interface Agent8004Info {
  agentId: number;
  txHash: string;
  owner: string;
  agentWallet: string;
  metadataUri: string;
}

export interface Agent8004Reputation {
  feedbackCount: number;
  summaryValue: number;
  summaryDecimals: number;
}

/** SelfClaw human-backed verification status */
export interface SelfClawVerification {
  verified: boolean;
  agentName: string | null;
  humanId: string | null;
  verifiedAt: string | null;
  sessionId: string | null; // non-null if verification in progress
}

/** Default guardrails by risk profile */
export const DEFAULT_GUARDRAILS: Record<
  'conservative' | 'moderate' | 'aggressive',
  {
    frequency: AgentFrequency;
    maxTradeSizeUsd: number;
    maxAllocationPct: number;
    stopLossPct: number;
    dailyTradeLimit: number;
  }
> = {
  conservative: {
    frequency: 24,
    maxTradeSizeUsd: 50,
    maxAllocationPct: 15,
    stopLossPct: 5,
    dailyTradeLimit: 2,
  },
  moderate: {
    frequency: 4,
    maxTradeSizeUsd: 200,
    maxAllocationPct: 25,
    stopLossPct: 10,
    dailyTradeLimit: 5,
  },
  aggressive: {
    frequency: 1,
    maxTradeSizeUsd: 500,
    maxAllocationPct: 40,
    stopLossPct: 20,
    dailyTradeLimit: 10,
  },
};
