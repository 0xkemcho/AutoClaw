'use client';

import { useQuery } from '@tanstack/react-query';
import type { MarketTokensResponse, TokenInfo } from '@autoclaw/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchMarketTokens(): Promise<MarketTokensResponse> {
  const res = await fetch(`${API_URL}/api/market/tokens`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useMarketTokens() {
  return useQuery({
    queryKey: ['market-tokens'],
    queryFn: fetchMarketTokens,
    refetchInterval: 30_000,
  });
}

export function useTokenDetail(symbol: string): {
  token: TokenInfo | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useMarketTokens();
  const token = data?.tokens.find((t) => t.symbol === symbol);
  return { token, isLoading, error };
}
