import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const celoPriceKeys = {
  all: ['celo-price'] as const,
};

export function useCeloPrice() {
  return useQuery({
    queryKey: celoPriceKeys.all,
    queryFn: async () => {
      const res = await api.get<{ priceUsd: number; updatedAt: string }>(
        '/api/market/celo-price',
      );
      return res;
    },
    staleTime: 60_000, // 1 minute
  });
}
