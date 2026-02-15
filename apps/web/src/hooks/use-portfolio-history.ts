import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

interface PortfolioHistoryPoint {
  date: string;
  valueUsd: number;
}

interface PortfolioHistoryResponse {
  history: PortfolioHistoryPoint[];
}

export const portfolioHistoryKeys = {
  all: ['portfolio-history'] as const,
};

export function usePortfolioHistory() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: portfolioHistoryKeys.all,
    queryFn: () => api.get<PortfolioHistoryResponse>('/api/agent/portfolio/history'),
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });
}
