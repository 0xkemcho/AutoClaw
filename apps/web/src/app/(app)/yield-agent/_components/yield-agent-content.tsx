'use client';

import { Suspense, useCallback, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { useMotionSafe } from '@/lib/motion';
import {
  Sprout,
  TrendingUp,
  Coins,
  RefreshCw,
  Play,
  Pause,
  Settings,
  ArrowDownToLine,
  ExternalLink,
  Loader2,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  useYieldAgentStatus,
  useYieldPositions,
  useYieldOpportunities,
  useYieldRewards,
  useYieldTimeline,
  useToggleYieldAgent,
  useRunYieldNow,
  useUpdateYieldSettings,
  useWithdrawAll,
} from '@/hooks/use-yield-agent';
import type { YieldTimelineFilters } from '@/hooks/use-yield-agent';
import { formatUsd, formatRelativeTime, formatCountdown } from '@/lib/format';
import { cn } from '@/lib/utils';

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_CELO_EXPLORER_URL || 'https://celoscan.io';

const DEFAULT_TAB = 'agent';
const TIMELINE_LIMIT = 20;

/* ------------------------------------------------------------------ */
/*  Event type badge helpers                                           */
/* ------------------------------------------------------------------ */

const EVENT_TYPE_STYLES: Record<string, string> = {
  trade: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  analysis: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  guardrail: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  system: 'bg-muted text-muted-foreground border-border',
};

function eventBadgeClass(eventType: string): string {
  return EVENT_TYPE_STYLES[eventType] ?? EVENT_TYPE_STYLES.system;
}

/* ------------------------------------------------------------------ */
/*  Agent Tab: Status Section                                          */
/* ------------------------------------------------------------------ */

function YieldStatusSection() {
  const { data, isLoading } = useYieldAgentStatus();
  const toggleAgent = useToggleYieldAgent();
  const runNow = useRunYieldNow();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-1 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { config, positionCount, tradesToday } = data;
  const isActive = config.active;

  return (
    <Card className={isActive ? 'border-amber-500/20 bg-amber-500/5' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="size-5 text-amber-500" />
            <CardTitle className="text-base">Yield Agent</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              isActive
                ? 'border-emerald-500/40 text-emerald-400'
                : 'border-muted-foreground/40 text-muted-foreground',
            )}
          >
            {isActive ? 'Active' : 'Paused'}
          </Badge>
        </div>
        <CardDescription>
          Automated yield optimization across Celo DeFi protocols
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant={isActive ? 'outline' : 'default'}
            size="sm"
            disabled={toggleAgent.isPending}
            onClick={() => {
              toggleAgent.mutate(undefined, {
                onSuccess: () =>
                  toast.success(
                    isActive ? 'Agent paused' : 'Agent activated',
                  ),
                onError: () => toast.error('Failed to toggle agent'),
              });
            }}
          >
            {toggleAgent.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isActive ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            <span className="ml-1.5">
              {isActive ? 'Pause' : 'Activate'}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!isActive || runNow.isPending}
            onClick={() => {
              runNow.mutate(undefined, {
                onSuccess: () => toast.success('Run triggered'),
                onError: () => toast.error('Failed to trigger run'),
              });
            }}
          >
            {runNow.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            <span className="ml-1.5">Run Now</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Positions: </span>
            <span className="font-medium">{positionCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Trades today: </span>
            <span className="font-medium">{tradesToday}</span>
          </div>
          {config.nextRunAt && (
            <div>
              <span className="text-muted-foreground">Next run: </span>
              <span className="font-mono text-amber-500">
                {formatCountdown(config.nextRunAt)}
              </span>
            </div>
          )}
          {config.lastRunAt && (
            <div>
              <span className="text-muted-foreground">Last run: </span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(config.lastRunAt)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Tab: Positions Section                                       */
/* ------------------------------------------------------------------ */

function YieldPositionsSection() {
  const { data, isLoading } = useYieldPositions();

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Active Positions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const positions = data?.positions ?? [];

  if (positions.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Active Positions</h3>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <ArrowDownToLine className="mb-3 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No active vault positions yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              The agent will deposit into vaults when it finds suitable
              opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">
        Active Positions{' '}
        <Badge variant="secondary" className="ml-1.5 text-xs">
          {positions.length}
        </Badge>
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {positions.map((pos) => (
          <Card key={pos.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {pos.depositToken}
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-1 text-[11px] border-blue-500/30 text-blue-400"
                  >
                    {pos.protocol}
                  </Badge>
                </div>
                {pos.currentApr !== null && (
                  <span className="text-sm font-semibold text-amber-500">
                    {pos.currentApr.toFixed(1)}% APR
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Deposited: {formatUsd(pos.depositAmountUsd)}</span>
                {pos.depositedAt && (
                  <span>{formatRelativeTime(pos.depositedAt)}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Tab: Opportunities Section                                   */
/* ------------------------------------------------------------------ */

function YieldOpportunitiesSection() {
  const { data, isLoading } = useYieldOpportunities();

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Top Opportunities</h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const opportunities = (data?.opportunities ?? [])
    .sort((a, b) => b.apr - a.apr)
    .slice(0, 5);

  if (opportunities.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Top Opportunities</h3>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="mb-3 size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No opportunities discovered yet
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Top Opportunities</h3>
      <div className="space-y-2">
        {opportunities.map((opp) => (
          <Card key={opp.id}>
            <CardContent className="flex items-center gap-4 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{opp.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[11px] border-blue-500/30 text-blue-400"
                  >
                    {opp.protocol}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    TVL {formatUsd(opp.tvl)}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-amber-500">
                  {opp.apr.toFixed(1)}%
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatUsd(opp.dailyRewards)}/day
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Tab: Rewards Section                                         */
/* ------------------------------------------------------------------ */

function YieldRewardsSection() {
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

/* ------------------------------------------------------------------ */
/*  Agent Tab (composite)                                              */
/* ------------------------------------------------------------------ */

function AgentTab() {
  return (
    <div className="space-y-6">
      <YieldStatusSection />
      <YieldPositionsSection />
      <YieldOpportunitiesSection />
      <YieldRewardsSection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline Tab                                                       */
/* ------------------------------------------------------------------ */

function TimelineTab() {
  const m = useMotionSafe();
  const [offset, setOffset] = useState(0);
  const [allEntries, setAllEntries] = useState<
    NonNullable<
      ReturnType<typeof useYieldTimeline>['data']
    >['entries']
  >([]);

  const filters: YieldTimelineFilters = useMemo(
    () => ({ limit: TIMELINE_LIMIT, offset }),
    [offset],
  );

  const { data, isLoading } = useYieldTimeline(filters);
  const hasMore = data?.hasMore ?? false;

  useEffect(() => {
    if (!data?.entries?.length) return;

    setAllEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const newEntries = data.entries.filter((e) => !existingIds.has(e.id));
      if (newEntries.length === 0) return prev;
      return [...prev, ...newEntries];
    });
  }, [data]);

  const loadMore = useCallback(() => {
    setOffset((prev) => prev + TIMELINE_LIMIT);
  }, []);

  return (
    <motion.div {...m.fadeIn} transition={{ duration: m.duration.normal }}>
      <div className="mb-4 text-sm text-muted-foreground font-mono tabular-nums">
        {data?.total ?? 0} events
      </div>

      {isLoading && allEntries.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 p-4">
                <Skeleton className="h-5 w-16 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allEntries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Ban className="mb-3 size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No events found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[11px] px-1.5 py-0',
                          eventBadgeClass(entry.eventType),
                        )}
                      >
                        {entry.eventType}
                      </Badge>
                      {entry.currency && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {entry.currency}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-snug">
                      {entry.summary}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(entry.createdAt)}</span>
                      {entry.amountUsd !== null && (
                        <span>{formatUsd(entry.amountUsd)}</span>
                      )}
                    </div>
                  </div>

                  {entry.txHash && (
                    <a
                      href={`${EXPLORER_BASE}/tx/${entry.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasMore && !isLoading && (
        <Button
          onClick={loadMore}
          variant="outline"
          className="mt-4 w-full"
        >
          Load More
        </Button>
      )}

      {isLoading && allEntries.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Tab                                                       */
/* ------------------------------------------------------------------ */

function SettingsTab() {
  const m = useMotionSafe();
  const { data: statusData, isLoading: statusLoading } =
    useYieldAgentStatus();
  const updateSettings = useUpdateYieldSettings();
  const withdrawAll = useWithdrawAll();
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const config = statusData?.config;
  const params = config?.strategyParams;

  const [frequency, setFrequency] = useState<string>('');
  const [minAprThreshold, setMinAprThreshold] = useState('');
  const [maxSingleVaultPct, setMaxSingleVaultPct] = useState('');
  const [minHoldPeriodDays, setMinHoldPeriodDays] = useState('');
  const [maxVaultCount, setMaxVaultCount] = useState('');
  const [minTvlUsd, setMinTvlUsd] = useState('');
  const [autoCompound, setAutoCompound] = useState(false);

  // Sync form state when data loads
  useEffect(() => {
    if (!config) return;
    setFrequency(String(config.frequency));

    if (params) {
      setMinAprThreshold(String(params.minAprThreshold));
      setMaxSingleVaultPct(String(params.maxSingleVaultPct));
      setMinHoldPeriodDays(String(params.minHoldPeriodDays));
      setMaxVaultCount(String(params.maxVaultCount));
      setMinTvlUsd(String(params.minTvlUsd));
      setAutoCompound(params.autoCompound);
    }
  }, [config, params]);

  const handleSave = () => {
    updateSettings.mutate(
      {
        frequency: Number(frequency),
        strategyParams: {
          minAprThreshold: Number(minAprThreshold),
          maxSingleVaultPct: Number(maxSingleVaultPct),
          minHoldPeriodDays: Number(minHoldPeriodDays),
          maxVaultCount: Number(maxVaultCount),
          minTvlUsd: Number(minTvlUsd),
          autoCompound,
        },
      },
      {
        onSuccess: () => toast.success('Settings saved'),
        onError: () => toast.error('Failed to save settings'),
      },
    );
  };

  const handleWithdraw = () => {
    withdrawAll.mutate(undefined, {
      onSuccess: () => {
        toast.success('Withdrawal initiated');
        setWithdrawOpen(false);
      },
      onError: () => toast.error('Failed to withdraw'),
    });
  };

  if (statusLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Settings className="mb-3 size-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No yield agent configured. Complete onboarding first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      {...m.fadeIn}
      transition={{ duration: m.duration.normal }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="size-4 text-amber-500" />
            Strategy Settings
          </CardTitle>
          <CardDescription>
            Configure how the yield agent selects and manages vault positions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Run Frequency (hours)</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    Every {h} hour{h > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Min APR Threshold */}
          <div className="space-y-2">
            <Label htmlFor="minAprThreshold">Min APR Threshold (%)</Label>
            <Input
              id="minAprThreshold"
              type="number"
              min="0"
              step="0.1"
              value={minAprThreshold}
              onChange={(e) => setMinAprThreshold(e.target.value)}
              placeholder="e.g. 5.0"
            />
            <p className="text-xs text-muted-foreground">
              Only enter vaults with APR above this threshold.
            </p>
          </div>

          {/* Max Single Vault % */}
          <div className="space-y-2">
            <Label htmlFor="maxSingleVaultPct">
              Max Single Vault Allocation (%)
            </Label>
            <Input
              id="maxSingleVaultPct"
              type="number"
              min="1"
              max="100"
              step="1"
              value={maxSingleVaultPct}
              onChange={(e) => setMaxSingleVaultPct(e.target.value)}
              placeholder="e.g. 50"
            />
            <p className="text-xs text-muted-foreground">
              Maximum percentage of portfolio in a single vault.
            </p>
          </div>

          {/* Min Hold Period */}
          <div className="space-y-2">
            <Label htmlFor="minHoldPeriodDays">Min Hold Period (days)</Label>
            <Input
              id="minHoldPeriodDays"
              type="number"
              min="0"
              step="1"
              value={minHoldPeriodDays}
              onChange={(e) => setMinHoldPeriodDays(e.target.value)}
              placeholder="e.g. 7"
            />
            <p className="text-xs text-muted-foreground">
              Minimum days to hold a vault position before rotating.
            </p>
          </div>

          {/* Max Vault Count */}
          <div className="space-y-2">
            <Label htmlFor="maxVaultCount">Max Vault Count</Label>
            <Input
              id="maxVaultCount"
              type="number"
              min="1"
              step="1"
              value={maxVaultCount}
              onChange={(e) => setMaxVaultCount(e.target.value)}
              placeholder="e.g. 5"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of vaults to hold positions in simultaneously.
            </p>
          </div>

          {/* Min TVL */}
          <div className="space-y-2">
            <Label htmlFor="minTvlUsd">Min TVL (USD)</Label>
            <Input
              id="minTvlUsd"
              type="number"
              min="0"
              step="1000"
              value={minTvlUsd}
              onChange={(e) => setMinTvlUsd(e.target.value)}
              placeholder="e.g. 100000"
            />
            <p className="text-xs text-muted-foreground">
              Only consider vaults with TVL above this amount.
            </p>
          </div>

          {/* Auto Compound */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="autoCompound" className="text-sm font-medium">
                Auto-Compound
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically reinvest earned rewards back into the vault.
              </p>
            </div>
            <Switch
              id="autoCompound"
              checked={autoCompound}
              onCheckedChange={setAutoCompound}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : null}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Withdraw All */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Withdraw all funds from active vault positions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <ArrowDownToLine className="size-4 mr-2" />
                Withdraw All Positions
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw All Positions</DialogTitle>
                <DialogDescription>
                  This will withdraw all funds from every active vault
                  position. Pending rewards will be claimed before withdrawal.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={withdrawAll.isPending}
                  onClick={handleWithdraw}
                >
                  {withdrawAll.isPending ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : null}
                  Confirm Withdraw
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main: Tabbed layout                                                */
/* ------------------------------------------------------------------ */

function YieldAgentTabs() {
  const m = useMotionSafe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = searchParams.get('tab') ?? DEFAULT_TAB;

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === DEFAULT_TAB) {
        params.delete('tab');
      } else {
        params.set('tab', value);
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname],
  );

  return (
    <motion.div
      {...m.fadeIn}
      transition={{ duration: m.duration.normal }}
      className="space-y-6"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold">Yield Farming Agent</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Automated yield optimization across Celo DeFi protocols
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="agent">Agent</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="mt-4">
          <AgentTab />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export function YieldAgentContent() {
  return (
    <Suspense>
      <YieldAgentTabs />
    </Suspense>
  );
}
