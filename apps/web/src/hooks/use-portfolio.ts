import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

interface Holding {
  tokenSymbol: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  avgEntryRate: number | null;
  costBasis: number | null;
  pnl: number;
}

interface PortfolioResponse {
  totalValueUsd: number;
  totalPnl: number | null;
  totalPnlPct: number | null;
  holdings: Holding[];
}

interface Position {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  balance: number;
  avgEntryRate: number | null;
  updatedAt: string;
}

interface PositionsResponse {
  positions: Position[];
}

export const portfolioKeys = {
  all: ['portfolio'] as const,
  summary: (agentType?: 'fx' | 'yield') =>
    [...portfolioKeys.all, 'summary', agentType ?? 'fx'] as const,
  positions: () => [...portfolioKeys.all, 'positions'] as const,
};

export function usePortfolio(agentType: 'fx' | 'yield' = 'fx') {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: portfolioKeys.summary(agentType),
    queryFn: () =>
      api.get<PortfolioResponse>(
        `/api/agent/portfolio?agent_type=${agentType}`,
      ),
    refetchInterval: 30_000,
    enabled: isAuthenticated,
  });
}

export function usePositions() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: portfolioKeys.positions(),
    queryFn: () => api.get<PositionsResponse>('/api/agent/positions'),
    enabled: isAuthenticated,
  });
}
