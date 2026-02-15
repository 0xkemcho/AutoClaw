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
  summary: () => [...portfolioKeys.all, 'summary'] as const,
  positions: () => [...portfolioKeys.all, 'positions'] as const,
};

export function usePortfolio() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: portfolioKeys.summary(),
    queryFn: () => api.get<PortfolioResponse>('/api/agent/portfolio'),
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
