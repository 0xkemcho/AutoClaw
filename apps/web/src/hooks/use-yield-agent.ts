import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface YieldAgentConfig {
  id: string;
  active: boolean;
  frequency: number;
  serverWalletAddress: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  agent8004Id: number | null;
  strategyParams: {
    minAprThreshold: number;
    maxSingleVaultPct: number;
    minHoldPeriodDays: number;
    maxIlTolerancePct: number;
    minTvlUsd: number;
    maxVaultCount: number;
    rewardClaimFrequencyHrs: number;
    autoCompound: boolean;
  } | null;
}

interface YieldAgentStatusResponse {
  config: YieldAgentConfig;
  positionCount: number;
  tradesToday: number;
}

interface YieldPositionResponse {
  id: string;
  vaultAddress: string;
  protocol: string;
  lpShares: string;
  depositToken: string;
  depositAmountUsd: number;
  depositedAt: string | null;
  currentApr: number | null;
  lastCheckedAt: string | null;
}

interface YieldOpportunityResponse {
  id: string;
  name: string;
  vaultAddress: string;
  protocol: string;
  apr: number;
  tvl: number;
  dailyRewards: number;
  tokens: Array<{ symbol: string; address: string; decimals: number }>;
}

interface YieldRewardResponse {
  token: { address: string; symbol: string; decimals: number };
  amount: string;
  claimed: string;
  pending: string;
  claimableAmount: string;
  claimableValueUsd: number;
}

interface TimelineEntry {
  id: string;
  eventType: string;
  summary: string;
  detail: Record<string, unknown> | null;
  citations: Array<{ url: string; title: string; excerpt?: string }> | null;
  confidencePct: number | null;
  currency: string | null;
  amountUsd: number | null;
  direction: string | null;
  txHash: string | null;
  runId: string | null;
  createdAt: string;
}

interface YieldTimelineResponse {
  entries: TimelineEntry[];
  total: number;
  hasMore: boolean;
}

export interface YieldTimelineFilters {
  type?: string;
  limit?: number;
  offset?: number;
}

export const yieldAgentKeys = {
  all: ['yield-agent'] as const,
  status: () => [...yieldAgentKeys.all, 'status'] as const,
  positions: () => [...yieldAgentKeys.all, 'positions'] as const,
  opportunities: () => [...yieldAgentKeys.all, 'opportunities'] as const,
  rewards: () => [...yieldAgentKeys.all, 'rewards'] as const,
  timeline: (filters?: YieldTimelineFilters) =>
    [...yieldAgentKeys.all, 'timeline', filters] as const,
};

export function useYieldAgentStatus() {
  return useQuery({
    queryKey: yieldAgentKeys.status(),
    queryFn: () =>
      api.get<YieldAgentStatusResponse>('/api/yield-agent/status'),
  });
}

export function useYieldPositions() {
  return useQuery({
    queryKey: yieldAgentKeys.positions(),
    queryFn: () =>
      api.get<{ positions: YieldPositionResponse[] }>(
        '/api/yield-agent/positions',
      ),
  });
}

export function useYieldOpportunities() {
  return useQuery({
    queryKey: yieldAgentKeys.opportunities(),
    queryFn: () =>
      api.get<{ opportunities: YieldOpportunityResponse[] }>(
        '/api/yield-agent/opportunities',
      ),
    refetchInterval: 60_000,
  });
}

export function useYieldRewards() {
  return useQuery({
    queryKey: yieldAgentKeys.rewards(),
    queryFn: () =>
      api.get<{ rewards: YieldRewardResponse[] }>(
        '/api/yield-agent/rewards',
      ),
  });
}

export function useYieldTimeline(filters?: YieldTimelineFilters) {
  return useQuery({
    queryKey: yieldAgentKeys.timeline(filters),
    queryFn: () =>
      api.get<YieldTimelineResponse>('/api/yield-agent/timeline', {
        params: {
          type: filters?.type,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
  });
}

export function useToggleYieldAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ active: boolean }>('/api/yield-agent/toggle'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.status() });
    },
  });
}

export function useRunYieldNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ triggered: boolean }>('/api/yield-agent/run-now'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.status() });
      queryClient.invalidateQueries({
        queryKey: yieldAgentKeys.timeline(),
      });
    },
  });
}

export function useRegisterYieldAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      riskProfile: string;
      frequency: number;
      autoCompound: boolean;
    }) => api.post<{ success: boolean }>('/api/yield-agent/register', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.all });
    },
  });
}

export function useWithdrawAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ success: boolean }>('/api/yield-agent/withdraw-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: yieldAgentKeys.positions(),
      });
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.status() });
    },
  });
}

export function useUpdateYieldSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: {
      frequency?: number;
      strategyParams?: Partial<
        NonNullable<YieldAgentConfig['strategyParams']>
      >;
    }) => api.put<{ success: boolean }>('/api/yield-agent/settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.status() });
    },
  });
}
