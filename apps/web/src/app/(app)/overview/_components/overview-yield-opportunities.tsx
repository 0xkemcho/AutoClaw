'use client';

import { useMemo } from 'react';
import { Sprout } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUsd } from '@/lib/format';
import { useOverviewYieldOpportunities } from '@/hooks/use-overview';
import { getProtocolLogo } from '@/app/(app)/yield-agent/_components/dashboard/utils';

export function OverviewYieldOpportunities() {
  const { data, isLoading } = useOverviewYieldOpportunities();

  const opportunities = useMemo(() => {
    const list = data?.opportunities ?? [];
    return list
      .sort((a, b) => b.apr - a.apr)
      .slice(0, 5)
      .map((opp) => ({
        id: opp.id,
        name: opp.name,
        protocol: opp.protocol,
        apr: opp.apr,
        tvl: opp.tvl,
        protocolLogo: getProtocolLogo(opp.protocol),
      }));
  }, [data?.opportunities]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card shadow-sm dark:bg-[#18181b]">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-40" shimmer />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <Skeleton className="h-8 w-32" shimmer />
                <Skeleton className="h-6 w-20" shimmer />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (opportunities.length === 0) {
    return (
      <Card className="border-border/50 bg-card shadow-sm dark:bg-[#18181b] gap-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase text-muted-foreground">
            <Sprout className="size-4 text-primary" />
            Top Yield Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No opportunities available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card shadow-sm dark:bg-[#18181b] gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase text-muted-foreground">
          <Sprout className="size-4 text-primary" />
          Top Yield Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {opportunities.map((opp, i) => (
            <div
              key={opp.id}
              className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                  {i + 1}
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {opp.protocolLogo && (
                    <img
                      src={opp.protocolLogo}
                      alt={opp.protocol}
                      className="size-8 shrink-0 rounded-full object-contain bg-white/5 p-0.5"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{opp.name}</div>
                    <div className="text-xs text-muted-foreground">{opp.protocol}</div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  {opp.apr.toFixed(2)}% APR
                </Badge>
                <div className="mt-1 text-xs text-muted-foreground">TVL: {formatUsd(opp.tvl)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
