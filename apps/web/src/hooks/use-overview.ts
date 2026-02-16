import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { MarketTokensResponse } from '@autoclaw/shared';

interface YieldOpportunityResponse {
  id: string;
  name: string;
  vaultAddress: string;
  protocol: string;
  apr: number;
  tvl: number;
  dailyRewards: number;
  tokens: Array<{ symbol: string; address: string; decimals: number; icon?: string }>;
  depositUrl?: string;
  type?: string;
  merklUrl?: string;
  status?: string;
}

export const overviewKeys = {
  all: ['overview'] as const,
  trendingFx: () => [...overviewKeys.all, 'trending-fx'] as const,
  yieldOpportunities: () => [...overviewKeys.all, 'yield-opportunities'] as const,
};

export interface OverviewTrendingFxAnalysis {
  detail?: {
    signals?: Array<{
      currency: string;
      direction: string;
      confidence: number;
      reasoning: string;
    }>;
    marketSummary?: string;
  };
  summary?: string;
}

export function useOverviewTrendingFx() {
  return useQuery({
    queryKey: overviewKeys.trendingFx(),
    queryFn: () =>
      api.get<{
        tokens: MarketTokensResponse['tokens'];
        analysis: OverviewTrendingFxAnalysis | null;
        updatedAt: string;
      }>('/api/overview/trending-fx'),
    staleTime: 60 * 60_000, // 1h - matches DB cache TTL
  });
}

export function useOverviewYieldOpportunities() {
  return useQuery({
    queryKey: overviewKeys.yieldOpportunities(),
    queryFn: () =>
      api.get<{
        opportunities: YieldOpportunityResponse[];
        updatedAt: string;
      }>('/api/overview/yield-opportunities'),
    staleTime: 60 * 60_000, // 1h - matches DB cache TTL
  });
}
