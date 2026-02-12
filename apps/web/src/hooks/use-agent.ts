'use client';

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

// --- Types ---

export interface AgentConfig {
  id: string;
  active: boolean;
  frequency: string;
  maxTradeSizeUsd: number;
  maxAllocationPct: number;
  stopLossPct: number;
  dailyTradeLimit: number;
  allowedCurrencies: string[] | null;
  blockedCurrencies: string[] | null;
  customPrompt: string | null;
  serverWalletAddress: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface AgentStatus {
  config: AgentConfig;
  tradesToday: number;
  positionCount: number;
}

export interface TimelineEntry {
  id: string;
  eventType: 'trade' | 'analysis' | 'funding' | 'guardrail' | 'system';
  summary: string;
  detail: Record<string, unknown>;
  citations: Array<{ url: string; title: string; excerpt?: string }>;
  confidencePct: number | null;
  currency: string | null;
  amountUsd: number | null;
  direction: 'buy' | 'sell' | null;
  txHash: string | null;
  createdAt: string;
}

interface TimelinePage {
  entries: TimelineEntry[];
  total: number;
  hasMore: boolean;
}

export interface TimelineFilters {
  type?: string;
  currency?: string;
}

export interface PortfolioHolding {
  tokenSymbol: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
}

export interface Portfolio {
  totalValueUsd: number;
  holdings: PortfolioHolding[];
}

// --- Hooks ---

export function useAgentStatus() {
  return useQuery<AgentStatus>({
    queryKey: ['agent', 'status'],
    queryFn: () => fetchApi('/api/agent/status'),
    refetchInterval: 30_000,
  });
}

export function useAgentTimeline(filters?: TimelineFilters) {
  return useInfiniteQuery<TimelinePage>({
    queryKey: ['agent', 'timeline', filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('offset', String(pageParam));
      params.set('limit', '20');
      if (filters?.type) params.set('type', filters.type);
      return fetchApi(`/api/agent/timeline?${params.toString()}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasMore ? (lastPageParam as number) + 20 : undefined,
  });
}

export function usePortfolio() {
  return useQuery<Portfolio>({
    queryKey: ['agent', 'portfolio'],
    queryFn: () => fetchApi('/api/agent/portfolio'),
    refetchInterval: 60_000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AgentConfig>) =>
      fetchApi('/api/agent/settings', { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'status'] });
    },
  });
}

export function useToggleAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchApi('/api/agent/toggle', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'status'] });
    },
  });
}

export function useRunAgentNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchApi('/api/agent/run-now', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['agent', 'timeline'] });
      // Poll for new entries as agent executes
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['agent', 'timeline'] }), 2000);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['agent', 'timeline'] }), 5000);
    },
  });
}
