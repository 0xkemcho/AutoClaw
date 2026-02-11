export type AgentFrequency = 'daily' | '4h' | 'hourly';

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
  turnkeyWalletAddress: string | null;
  turnkeyWalletId: string | null;
  active: boolean;
  frequency: AgentFrequency;
  maxTradeSizeUsd: number;
  maxAllocationPct: number;
  stopLossPct: number;
  dailyTradeLimit: number;
  allowedCurrencies: string[];
  blockedCurrencies: string[];
  customPrompt: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface GuardrailCheck {
  passed: boolean;
  blockedReason?: string;
  ruleName?: string;
}

export interface AgentStatus {
  config: AgentConfig;
  portfolioValueUsd: number;
  positionCount: number;
  tradesToday: number;
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
    frequency: 'daily',
    maxTradeSizeUsd: 50,
    maxAllocationPct: 15,
    stopLossPct: 5,
    dailyTradeLimit: 2,
  },
  moderate: {
    frequency: '4h',
    maxTradeSizeUsd: 200,
    maxAllocationPct: 25,
    stopLossPct: 10,
    dailyTradeLimit: 5,
  },
  aggressive: {
    frequency: 'hourly',
    maxTradeSizeUsd: 500,
    maxAllocationPct: 40,
    stopLossPct: 20,
    dailyTradeLimit: 10,
  },
};
