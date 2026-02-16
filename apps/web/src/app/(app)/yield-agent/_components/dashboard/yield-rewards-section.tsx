'use client';

import { Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUsd } from '@/lib/format';
import { useYieldRewards } from '@/hooks/use-yield-agent';

export function YieldRewardsSection() {
  const { data, isLoading } = useYieldRewards();

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Claimable Rewards</h3>
        <Card>
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const rewards = data?.rewards ?? [];
  const claimable = rewards.filter(
    (r) => parseFloat(r.claimableAmount) > 0,
  );

  if (claimable.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Claimable Rewards</h3>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Coins className="mb-3 size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No claimable rewards
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Claimable Rewards</h3>
      <Card>
        <CardContent className="divide-y p-0">
          {claimable.map((reward) => (
            <div
              key={reward.token.address}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-amber-500" />
                <span className="text-sm font-medium">
                  {reward.token.symbol}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {parseFloat(reward.claimableAmount).toFixed(4)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatUsd(reward.claimableValueUsd)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
