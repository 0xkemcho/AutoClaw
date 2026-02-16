import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

interface Holding {
  tokenSymbol: string;
  tokenAddress?: string;
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

const EMPTY_PORTFOLIO: PortfolioResponse = {
  totalValueUsd: 0,
  totalPnl: null,
  totalPnlPct: null,
  holdings: [],
};

const YIELD_PAGE_SYNC_MS = 10_000;
const DEFAULT_SYNC_MS = 30_000;

export function usePortfolio(agentType: 'fx' | 'yield' = 'fx') {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const onYieldPage = pathname?.startsWith('/yield-agent') ?? false;
  const refetchInterval =
    agentType === 'yield' && onYieldPage ? YIELD_PAGE_SYNC_MS : DEFAULT_SYNC_MS;

  return useQuery({
    queryKey: portfolioKeys.summary(agentType),
    queryFn: async () => {
      try {
        return await api.get<PortfolioResponse>(
          `/api/agent/portfolio?agent_type=${agentType}`,
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return EMPTY_PORTFOLIO;
        }
        throw err;
      }
    },
    refetchInterval,
    enabled: isAuthenticated,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
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
