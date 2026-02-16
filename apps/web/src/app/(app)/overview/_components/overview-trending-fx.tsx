'use client';

import { useMemo } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TokenLogo } from '@/components/token-logo';
import { formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SupportedToken } from '@autoclaw/shared';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { OverviewTrendingFxAnalysis } from '@/hooks/use-overview';
import { useOverviewTrendingFx } from '@/hooks/use-overview';

interface TrendingTokenDisplay {
  symbol: SupportedToken;
  price: number;
  change24hPct: number;
  signal: 'Buy' | 'Sell' | 'Hold';
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  headline: string;
  summary: string;
  hasAnalysis: boolean;
}

function mergeMarketWithSignals(
  tokens: { symbol: SupportedToken; priceUsd: number; change24hPct: number }[],
  analysis: OverviewTrendingFxAnalysis | null,
): TrendingTokenDisplay[] {
  const top5 = [...tokens]
    .sort((a, b) => Math.abs(b.change24hPct) - Math.abs(a.change24hPct))
    .slice(0, 5);

  const signals = analysis?.detail?.signals ?? [];
  const marketSummary = analysis?.detail?.marketSummary ?? analysis?.summary ?? '';

  const signalMap = new Map<string, (typeof signals)[0]>();
  for (const s of signals) {
    if (s.currency) signalMap.set(s.currency, s);
  }

  return top5.map((t) => {
    const signal = signalMap.get(t.symbol);
    const direction = signal?.direction ?? 'hold';
    const confidence = signal?.confidence ?? 50;
    const reasoning = signal?.reasoning ?? '';

    const sentiment: 'Positive' | 'Negative' | 'Neutral' =
      confidence >= 70 ? 'Positive' : confidence <= 40 ? 'Negative' : 'Neutral';
    const signalLabel: 'Buy' | 'Sell' | 'Hold' =
      direction === 'buy' ? 'Buy' : direction === 'sell' ? 'Sell' : 'Hold';

    const hasAnalysis = !!signal;
    const headline = hasAnalysis
      ? (reasoning.length > 60 ? reasoning.slice(0, 60) + '...' : reasoning) ||
        marketSummary.slice(0, 60)
      : 'Market data';
    const summary = hasAnalysis
      ? reasoning || marketSummary
      : 'Price and 24h change';

    return {
      symbol: t.symbol,
      price: t.priceUsd,
      change24hPct: t.change24hPct,
      signal: signalLabel,
      sentiment,
      headline: headline.slice(0, 80),
      summary: summary.slice(0, 200),
      hasAnalysis,
    };
  });
}

export function OverviewTrendingFx() {
  const { data, isLoading } = useOverviewTrendingFx();

  const tokens = useMemo(() => {
    const marketTokens = data?.tokens ?? [];
    const analysis = data?.analysis ?? null;
    return mergeMarketWithSignals(
      marketTokens.map((t) => ({
        symbol: t.symbol,
        priceUsd: t.priceUsd,
        change24hPct: t.change24hPct,
      })),
      analysis,
    );
  }, [data?.tokens, data?.analysis]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card shadow-sm dark:bg-[#18181b]">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-40" shimmer />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 px-6 py-4">
                <Skeleton className="h-8 w-full" shimmer />
                <Skeleton className="h-4 w-3/4" shimmer />
                <Skeleton className="h-3 w-full" shimmer />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card className="border-border/50 bg-card shadow-sm dark:bg-[#18181b]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase text-muted-foreground">
            <TrendingUp className="size-4 text-primary" />
            Trending FX Signals
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No market data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card shadow-sm dark:bg-[#18181b]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase text-muted-foreground">
          <TrendingUp className="size-4 text-primary" />
          Trending FX Signals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {tokens.map((token) => {
            const isPositive = token.sentiment === 'Positive';
            const isNegative = token.sentiment === 'Negative';

            const badgeVariant = isPositive
              ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20'
              : isNegative
                ? 'bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 border-border/50';

            const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;

            return (
              <div
                key={token.symbol}
                className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TokenLogo symbol={token.symbol} size={32} />
                    <div>
                      <div className="font-bold text-foreground">{token.symbol}</div>
                      <div className="text-xs text-muted-foreground">{formatUsd(token.price)}</div>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                      badgeVariant
                    )}
                  >
                    <Icon className="size-3.5" />
                    {token.sentiment}/{token.signal}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">{token.headline}</div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {token.summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
