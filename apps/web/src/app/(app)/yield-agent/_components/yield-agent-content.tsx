'use client';

import { Suspense, useCallback, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
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
  Info,
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
import { usePortfolio } from '@/hooks/use-portfolio';
import { useMarketTokens } from '@/hooks/use-market';
import type { YieldTimelineFilters } from '@/hooks/use-yield-agent';
import { useAgentProgress } from '@/hooks/use-agent-progress';
import { formatUsd, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PortfolioCard } from '@/app/(app)/dashboard/_components/portfolio-card';
import { FundingBanner } from '@/app/(app)/dashboard/_components/funding-banner';
import {
  CountdownRing,
  AgentProgressStepper,
} from '@/app/(app)/dashboard/_components/agent-countdown';
import { ReasoningView } from '@/components/reasoning-view';
import { EmptyState } from '@/components/empty-state';

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
  const { data: timelineData } = useYieldTimeline({ limit: 5 });
  const toggleAgent = useToggleYieldAgent();
  const runNow = useRunYieldNow();
  const progress = useAgentProgress();

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
  const isRunning =
    progress.isRunning ||
    progress.currentStep === 'complete' ||
    progress.currentStep === 'error';

  const latestEntry = timelineData?.entries?.[0];

  return (
    <Card className={isActive ? 'border-amber-500/20 bg-amber-500/5' : ''}>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-block size-2.5 rounded-full',
                isActive ? 'bg-success' : 'bg-muted-foreground',
              )}
            />
            <CardTitle className="text-lg">
              {isActive ? 'Active' : 'Paused'}
            </CardTitle>
          </div>
          <Badge variant="secondary">{config.frequency}h</Badge>
        </div>
        <CardDescription>
          Automated yield optimization across Celo DeFi protocols
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <AnimatePresence mode="wait">
          {isRunning ? (
            <motion.div
              key="stepper"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <AgentProgressStepper
                currentStep={progress.currentStep}
                stepLabel={progress.stepLabel}
                stepMessage={progress.stepMessage}
                variant="yield"
              />
            </motion.div>
          ) : (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <CountdownRing
                nextRunAt={config.nextRunAt}
                lastRunAt={config.lastRunAt}
                frequency={config.frequency}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex w-full items-center justify-around border-y py-4">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-xl tabular-nums font-semibold">
              {tradesToday}
            </span>
            <span className="text-xs text-muted-foreground">trades today</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-lg tabular-nums font-semibold">
              {positionCount}
            </span>
            <span className="text-xs text-muted-foreground">positions</span>
          </div>
        </div>

        {latestEntry && (
          <div className="w-full rounded-lg bg-muted/50 p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Latest Action
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(latestEntry.createdAt)}
                </span>
              </div>
              <p className="text-sm line-clamp-2">{latestEntry.summary}</p>
            </div>
          </div>
        )}

        <div className="flex w-full items-center gap-3">
          <Button
            variant={isActive ? 'outline' : 'default'}
            size="sm"
            className="flex-1 gap-1.5"
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
            <span>{isActive ? 'Pause' : 'Activate'}</span>
          </Button>
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className="flex-1 gap-1.5"
            disabled={!isActive || progress.isRunning}
            onClick={() => {
              runNow.mutate(undefined, {
                onSuccess: () => toast.success('Run triggered'),
              });
            }}
          >
            {progress.isRunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            <span>
              {progress.isRunning ? progress.stepLabel : 'Run Now'}
            </span>
          </Button>
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
          <CardContent className="p-0">
            <EmptyState
              icon={ArrowDownToLine}
              title="No active vault positions yet"
              description="The agent will deposit into vaults when it finds suitable opportunities."
            />
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

// Protocol logo map
const PROTOCOL_LOGOS: Record<string, string> = {
  Uniswap: '/protocols/uniswap.png',
  Ichi: '/protocols/ichi.avif',
  Steer: '/protocols/steer.webp',
  Merkl: '/protocols/merkl.svg',
};

function YieldOpportunitiesSection() {
  const { data, isLoading } = useYieldOpportunities();

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Top Opportunities</h3>
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const opportunities = (data?.opportunities ?? [])
    .sort((a, b) => b.apr - a.apr)
    .slice(0, 10);

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
      <h3 className="mb-3 text-sm font-semibold">
        Top Opportunities{' '}
        <Badge variant="secondary" className="ml-1.5 text-xs">
          {opportunities.length}
        </Badge>
      </h3>
      <Card>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Composition</span>
            <span className="w-24 text-right">TVL</span>
            <span className="w-24 text-right">Rewards/day</span>
            <span className="w-20 text-right">APR</span>
          </div>

          {/* Table rows */}
          <div className="divide-y">
            {opportunities.map((opp, idx) => (
              <div
                key={opp.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30",
                  opp.depositUrl && "cursor-pointer"
                )}
                onClick={() => {
                  if (opp.depositUrl) {
                    window.open(opp.depositUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                role={opp.depositUrl ? "button" : undefined}
                tabIndex={opp.depositUrl ? 0 : undefined}
              >
                {/* Rank */}
                <span className="w-8 text-center text-sm text-muted-foreground font-mono">
                  {idx + 1}
                </span>

                {/* Name + Protocol + Tokens */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{opp.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-[11px] border-blue-500/30 text-blue-400 flex items-center gap-1.5"
                    >
                      {PROTOCOL_LOGOS[opp.protocol] && (
                        <img
                          src={PROTOCOL_LOGOS[opp.protocol]}
                          alt={opp.protocol}
                          className="size-3 object-contain"
                        />
                      )}
                      {opp.protocol}
                    </Badge>
                    {opp.tokens.slice(0, 3).map((t) => (
                      <span
                        key={t.address}
                        className="inline-flex items-center rounded-md bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {t.symbol}
                      </span>
                    ))}
                  </div>
                </div>

                {/* TVL */}
                <span className="w-24 text-right text-sm font-mono tabular-nums text-muted-foreground">
                  {formatUsd(opp.tvl)}
                </span>

                {/* Daily Rewards */}
                <span className="w-24 text-right text-sm font-mono tabular-nums text-muted-foreground">
                  {formatUsd(opp.dailyRewards)}
                </span>

                {/* APR */}
                <span className="w-20 text-right text-sm font-semibold font-mono tabular-nums text-amber-500">
                  {opp.apr.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
  const progress = useAgentProgress();
  const { data: statusData } = useYieldAgentStatus();
  const portfolioQuery = usePortfolio('yield');
  const marketQuery = useMarketTokens();

  // Show error toast when progress enters error state
  useEffect(() => {
    if (progress.currentStep === 'error') {
      toast.error(progress.stepMessage || 'Agent run failed');
    }
  }, [progress.currentStep, progress.stepMessage]);

  const totalValueUsd = portfolioQuery.data?.totalValueUsd ?? 0;
  const serverWalletAddress = statusData?.config?.serverWalletAddress ?? null;
  const showFundingBanner = totalValueUsd === 0 && serverWalletAddress;

  return (
    <div className="space-y-6">
      {/* Agent and Portfolio side-by-side (matches FX layout) */}
      <div className="grid gap-7 lg:grid-cols-[1fr_1fr]">
        <YieldStatusSection />
        <PortfolioCard
          totalValueUsd={portfolioQuery.data?.totalValueUsd ?? 0}
          totalPnl={portfolioQuery.data?.totalPnl ?? null}
          totalPnlPct={portfolioQuery.data?.totalPnlPct ?? null}
          holdings={portfolioQuery.data?.holdings ?? []}
          isLoading={portfolioQuery.isLoading}
          serverWalletAddress={serverWalletAddress}
          marketTokens={marketQuery.data?.tokens}
        />
      </div>

      {/* Empty wallet funding banner */}
      {showFundingBanner && serverWalletAddress && (
        <FundingBanner
          serverWalletAddress={serverWalletAddress}
          message="Add funds to your wallet to start investing in yield opportunities. Your agent will explore and analyze opportunities, but needs funds to execute deposits."
          dismissKey="autoclaw_yield_funding_banner_dismissed"
        />
      )}

      {/* Real-time reasoning display during analysis */}
      {progress.isRunning && progress.reasoning && (
        <ReasoningView
          reasoning={progress.reasoning}
          isActive={progress.currentStep === 'analyzing_yields'}
        />
      )}

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

/* ------------------------------------------------------------------ */
/*  Hero CTA for unregistered users                                    */
/* ------------------------------------------------------------------ */

function YieldHero() {
  const m = useMotionSafe();
  const router = useRouter();

  const features = [
    {
      icon: TrendingUp,
      title: 'High-Yield Vaults',
      desc: 'Automatically finds the best Merkl-incentivized vaults on Celo — Ichi, Uniswap, Steer & more.',
    },
    {
      icon: RefreshCw,
      title: 'Auto-Rebalancing',
      desc: 'Continuously monitors APRs and rotates into higher-yielding positions.',
    },
    {
      icon: Coins,
      title: 'Reward Claiming',
      desc: 'Claims Merkl rewards and optionally auto-compounds them back into vaults.',
    },
  ];

  return (
    <motion.div
      {...m.fadeIn}
      transition={{ duration: m.duration.normal }}
      className="space-y-8"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Sprout className="size-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Yield Farming Agent</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          Put your stablecoins to work. The yield agent automatically deposits
          into the highest-APR vaults on Celo and manages your positions 24/7.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="flex flex-col items-center p-5 text-center">
              <f.icon className="mb-3 size-6 text-primary" />
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="gap-2"
          onClick={() => router.push('/onboarding?agent=yield')}
        >
          <Sprout className="size-4" />
          Create Yield Agent
        </Button>
      </div>
    </motion.div>
  );
}


/* ------------------------------------------------------------------ */
/*  Main: Tabbed layout (or hero if no agent registered)               */
/* ------------------------------------------------------------------ */

function YieldAgentTabs() {
  const m = useMotionSafe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, isError } = useYieldAgentStatus();

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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Skeleton className="mx-auto h-7 w-48" />
          <Skeleton className="mx-auto mt-2 h-4 w-72" />
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-3">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No yield agent registered — show hero CTA
  if (!data || isError) {
    return <YieldHero />;
  }

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

      {!data.config.agent8004Id && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Info className="size-4 shrink-0 text-primary" />
          <p className="flex-1 text-sm text-muted-foreground">
            Your agent isn&apos;t registered on ERC-8004 yet.{' '}
            <span className="text-primary">Registration is free (gasless).</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/onboarding?agent=yield&step=register')}
          >
            Register Now
          </Button>
        </div>
      )}

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
