import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { portfolioKeys } from './use-portfolio';

const YIELD_PAGE_SYNC_MS = 10_000;

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
  tokens: Array<{ symbol: string; address: string; decimals: number; icon?: string }>;
  depositUrl?: string; // Merkl deposit page URL
  type?: string; // CLAMM, ERC20LOGPROCESSOR, UNISWAP_V4
  merklUrl?: string; // https://app.merkl.xyz/opportunities/celo/{type}/{identifier}
  status?: string;
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
  attestationId: string | null;
  attestationStatus: 'missing' | 'verified' | 'invalid';
  createdAt: string;
}

interface YieldTimelineResponse {
  entries: TimelineEntry[];
  total: number;
  hasMore: boolean;
}

interface YieldAttestationEntry {
  id: string;
  walletAddress: string;
  agentType: 'fx' | 'yield';
  runId: string | null;
  payload: Record<string, unknown>;
  signature: string;
  algorithm: string;
  isMock: boolean;
  createdAt: string;
}

interface YieldAttestationResponse {
  entries: YieldAttestationEntry[];
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
  attestations: (limit?: number, offset?: number) =>
    [...yieldAgentKeys.all, 'attestations', limit, offset] as const,
  attestation: (id: string) => [...yieldAgentKeys.all, 'attestation', id] as const,
};

export function useYieldAgentStatus() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const onYieldPage = pathname?.startsWith('/yield-agent') ?? false;

  return useQuery({
    queryKey: yieldAgentKeys.status(),
    queryFn: () =>
      api.get<YieldAgentStatusResponse>('/api/yield-agent/status'),
    refetchInterval: onYieldPage ? YIELD_PAGE_SYNC_MS : false,
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useYieldPositions() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const onYieldPage = pathname?.startsWith('/yield-agent') ?? false;

  return useQuery({
    queryKey: yieldAgentKeys.positions(),
    queryFn: async () => {
      try {
        return await api.get<{ positions: YieldPositionResponse[] }>(
          '/api/yield-agent/positions',
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return { positions: [] };
        }
        throw err;
      }
    },
    refetchInterval: onYieldPage ? YIELD_PAGE_SYNC_MS : false,
    enabled: isAuthenticated,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
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
  const pathname = usePathname();
  const onYieldPage = pathname?.startsWith('/yield-agent') ?? false;

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
    refetchInterval: onYieldPage ? YIELD_PAGE_SYNC_MS : false,
  });
}

export function useYieldAttestations(limit = 20, offset = 0) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: yieldAgentKeys.attestations(limit, offset),
    queryFn: () =>
      api.get<YieldAttestationResponse>('/api/yield-agent/attestations', {
        params: { limit, offset },
      }),
    enabled: isAuthenticated,
  });
}

export function useYieldAttestation(id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: yieldAgentKeys.attestation(id),
    queryFn: () => api.get<YieldAttestationEntry>(`/api/yield-agent/attestations/${id}`),
    enabled: isAuthenticated && !!id,
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

const SYNC_AFTER_RUN_DELAY_MS = 5000;

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
      queryClient.invalidateQueries({
        queryKey: yieldAgentKeys.positions(),
      });
      queryClient.invalidateQueries({
        queryKey: portfolioKeys.summary('yield'),
      });

      // Sync positions from chain 5s after run completes (agent cycle may have updated on-chain state)
      setTimeout(() => {
        api
          .post<{ synced: number; cleared: number; message: string }>(
            '/api/yield-agent/sync-positions',
          )
          .then(() => {
            queryClient.invalidateQueries({
              queryKey: yieldAgentKeys.positions(),
            });
            queryClient.invalidateQueries({
              queryKey: portfolioKeys.summary('yield'),
            });
          })
          .catch(() => {
            // Ignore sync errors; positions will refresh on next manual sync or page load
          });
      }, SYNC_AFTER_RUN_DELAY_MS);
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

export function useSyncYieldPositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ synced: number; cleared: number; message: string }>(
        '/api/yield-agent/sync-positions',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.positions() });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.summary('yield') });
    },
  });
}

export interface WithdrawAllResult {
  vaultAddress: string;
  txHash: string | null;
  success: boolean;
  error?: string | null;
  skipped?: boolean;
  message?: string;
}

export interface WithdrawAllResponse {
  results: WithdrawAllResult[];
  message?: string;
  convertResult?: {
    swapped: Array<{ symbol: string; amount: string; txHash: string }>;
    skipped: Array<{ symbol: string; reason: string }>;
  };
}

export interface ConvertToUsdcResponse {
  swapped: Array<{ symbol: string; amount: string; txHash: string }>;
  skipped: Array<{ symbol: string; reason: string }>;
}

export function useConvertToUsdc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<ConvertToUsdcResponse>('/api/yield-agent/convert-to-usdc'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.positions() });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.summary('yield') });
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.status() });
    },
  });
}

export function useWithdrawAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<WithdrawAllResponse>('/api/yield-agent/withdraw-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: yieldAgentKeys.positions(),
      });
      queryClient.invalidateQueries({ queryKey: yieldAgentKeys.status() });
      queryClient.invalidateQueries({
        queryKey: portfolioKeys.summary('yield'),
      });
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
