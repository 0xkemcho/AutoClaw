'use client';

import { Suspense, useCallback, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionSafe } from '@/lib/motion';
import {
  Sprout,
  TrendingUp,
  Coins,
  Play,
  Pause,
  Settings,
  ArrowDownToLine,
  ArrowRightLeft,
  ExternalLink,
  Loader2,
  Ban,
  Info,
  ShieldCheck,
  ShieldAlert,
  Star,
  ChevronDown,
  Zap,
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
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  useConvertToUsdc,
  useSyncYieldPositions,
} from '@/hooks/use-yield-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useMarketTokens } from '@/hooks/use-market';
import type { YieldTimelineFilters } from '@/hooks/use-yield-agent';
import { useAgentProgress } from '@/hooks/use-agent-progress';
import { useAgentReputation } from '@/hooks/use-reputation';
import { formatFrequency, TOKEN_METADATA } from '@autoclaw/shared';
import { formatUsd, formatUsdCompact, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SliderField } from '@/components/slider-field';
import { PortfolioCard } from '@/app/(app)/dashboard/_components/portfolio-card';
import { TokenLogo } from '@/components/token-logo';
import { FundingBanner } from '@/app/(app)/dashboard/_components/funding-banner';
import {
  CountdownRing,
  AgentProgressStepper,
} from '@/app/(app)/dashboard/_components/agent-countdown';
import { ReasoningView } from '@/components/reasoning-view';
import { EmptyState } from '@/components/empty-state';
import {
  TimelineEntry,
  TimelineNode,
  GROUP_NODE_CONFIG,
} from '@/app/(app)/timeline/_components/timeline-entry';

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_CELO_EXPLORER_URL || 'https://celoscan.io';
const ERC8004_SCAN_BASE = 'https://www.8004scan.io/agents/celo';

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
  const router = useRouter();
  const { data, isLoading } = useYieldAgentStatus();
  const { data: timelineData } = useYieldTimeline({ limit: 5 });
  const portfolioQuery = usePortfolio('yield');
  const toggleAgent = useToggleYieldAgent();
  const runNow = useRunYieldNow();
  const progress = useAgentProgress();
  const agent8004Id = data?.config?.agent8004Id ?? null;
  const isRegistered8004 = agent8004Id !== null;
  const reputationQuery = useAgentReputation(agent8004Id);
  const reputation = reputationQuery.data ?? null;
  const reputationScore =
    reputation !== null
      ? reputation.summaryValue / Math.pow(10, reputation.summaryDecimals)
      : null;

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
  const totalValueUsd = portfolioQuery.data?.totalValueUsd ?? 0;
  const hasInsufficientBalance = totalValueUsd < 5;
  const isRunning =
    progress.isRunning ||
    runNow.isPending ||
    progress.currentStep === 'complete' ||
    progress.currentStep === 'error';
  const stepLabel =
    runNow.isPending && !progress.stepLabel
      ? 'Starting...'
      : progress.stepLabel;

  const latestEntry = timelineData?.entries?.[0];

  return (
    <Card>
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

        {/* ERC-8004 Identity Badge */}
        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          {isRegistered8004 ? (
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <a
                href={`${ERC8004_SCAN_BASE}/${agent8004Id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                8004 #{agent8004Id}
                <ExternalLink className="size-3" />
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Not registered on 8004
              </span>
            </div>
          )}
          {isRegistered8004 && reputation !== null ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-3.5 fill-primary text-primary" />
              <span className="font-mono tabular-nums font-medium text-foreground">
                {reputationScore?.toFixed(1)}
              </span>
              <span className="text-xs">
                | {reputation.feedbackCount}{' '}
                {reputation.feedbackCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          ) : isRegistered8004 && reputationQuery.isLoading ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : !isRegistered8004 ? (
            <button
              type="button"
              onClick={() =>
                router.push('/onboarding?agent=yield&step=register')
              }
              className="text-xs text-primary hover:underline"
            >
              Register
            </button>
          ) : null}
        </div>
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

        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full gap-3">
            <div className="flex-1 min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block w-full">
                      <Button
                        variant="default"
                        className="w-full h-11"
                    disabled={
                      !isActive ||
                      isRunning ||
                      hasInsufficientBalance ||
                      !isRegistered8004
                    }
                    onClick={() => {
                      runNow.mutate(undefined, {
                        onSuccess: () => toast.success('Run triggered'),
                        onError: (err) => {
                          const body = (err as { body?: { error?: string } })?.body;
                          const msg = body?.error ?? err.message;
                          toast.error(msg);
                        },
                      });
                    }}
                  >
                    {isRunning ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Zap className="size-4" />
                    )}
                    {isRunning ? stepLabel : 'Run Now'}
                  </Button>
                  </span>
                </TooltipTrigger>
                {(hasInsufficientBalance || !isRegistered8004) && (
                  <TooltipContent side="top" className="max-w-xs">
                    {hasInsufficientBalance
                      ? 'Add at least $5 to your wallet to run the agent'
                      : 'Register on 8004 to activate your agent'}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            </div>

            <div className="flex-1 min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block w-full">
                      <Button
                        variant="outline"
                        className="w-full h-11"
                    disabled={toggleAgent.isPending || !isRegistered8004}
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
                      <>
                        <Pause className="size-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="size-4" />
                        Resume
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isRegistered8004 && (
                <TooltipContent>
                  Register on 8004 to activate your agent
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
            </div>
          </div>

          {!isRegistered8004 && (
            <p className="text-center text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => router.push('/onboarding?agent=yield&step=register')}
                className="text-primary hover:underline"
              >
                Register on ERC-8004
              </button>{' '}
              to activate your agent
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Protocol logo map (shared by Positions and Opportunities)        */
/* ------------------------------------------------------------------ */

const PROTOCOL_LOGOS: Record<string, string> = {
  uniswap: '/protocols/uniswap.png',
  ichi: '/protocols/ichi.avif',
  steer: '/protocols/steer.webp',
  merkl: '/protocols/merkl.svg',
};

function getProtocolLogo(protocol: string): string | undefined {
  if (!protocol) return undefined;
  const key = protocol.toLowerCase().trim();
  return PROTOCOL_LOGOS[key] ?? PROTOCOL_LOGOS[protocol];
}

/* ------------------------------------------------------------------ */
/*  Agent Tab: Positions Section                                       */
/* ------------------------------------------------------------------ */

type YieldPositionResponse = NonNullable<
  ReturnType<typeof useYieldPositions>['data']
>['positions'][number];
type YieldOpportunityResponse = NonNullable<
  ReturnType<typeof useYieldOpportunities>['data']
>['opportunities'][number];

function YieldPositionCard({
  position,
  opportunity,
}: {
  position: YieldPositionResponse;
  opportunity: YieldOpportunityResponse | null;
}) {
  const logo = getProtocolLogo(position.protocol);
  const name = opportunity?.name ?? position.depositToken;
  const apr = opportunity?.apr ?? position.currentApr ?? null;
  const tvl = opportunity?.tvl;
  const dailyRewards = opportunity?.dailyRewards;
  const tokens = opportunity?.tokens ?? [];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-4">
        <div className="flex items-center gap-3">
          {logo ? (
            <img
              src={logo}
              alt={position.protocol}
              className="size-10 shrink-0 rounded-full object-contain bg-muted/20 p-1"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {position.protocol.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <h4 className="font-semibold text-base leading-tight">{name}</h4>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-5 font-medium bg-muted text-muted-foreground hover:bg-muted"
              >
                {position.protocol}
              </Badge>
              {tokens.filter((t) => !t.symbol.includes('VAULT') && !t.symbol.includes('UNIV3')).length > 0 && (
                <div className="flex -space-x-1.5">
                  {tokens
                    .filter((t) => !t.symbol.includes('VAULT') && !t.symbol.includes('UNIV3'))
                    .slice(0, 3)
                    .map((t) => {
                    const logoUrl = (t.icon && t.icon.trim()) || TOKEN_METADATA[t.symbol]?.logo;
                    const flag = TOKEN_METADATA[t.symbol]?.flag;
                    return (
                      <div
                        key={t.address}
                        className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-card bg-muted ring-2 ring-card"
                        title={t.symbol}
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={t.symbol}
                            className="size-full object-cover"
                          />
                        ) : flag ? (
                          <TokenLogo symbol={t.symbol} size={14} />
                        ) : (
                          <span className="text-[9px] font-medium text-muted-foreground">
                            {t.symbol.slice(0, 1)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {apr !== null && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-medium mb-0.5">APR</span>
            <span className="text-lg font-bold text-amber-500 tabular-nums leading-none">
              {apr.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-px bg-border/50 border-y border-border/50">
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Deposited</span>
          <span className="text-sm font-mono font-medium tabular-nums">
            {formatUsd(position.depositAmountUsd)}
          </span>
        </div>
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Daily Rewards</span>
          <span className="text-sm font-mono font-medium tabular-nums">
            {dailyRewards ? formatUsd(dailyRewards) : '-'}
          </span>
        </div>
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">TVL</span>
          <span className="text-sm font-mono font-medium tabular-nums text-muted-foreground">
            {tvl ? formatUsdCompact(tvl) : '-'}
          </span>
        </div>
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Time Held</span>
          <span className="text-sm font-mono font-medium tabular-nums text-muted-foreground">
            {position.depositedAt
              ? formatRelativeTime(position.depositedAt).replace(' ago', '')
              : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

function YieldPositionsSection() {
  const { data: positionsData, isLoading: positionsLoading } =
    useYieldPositions();
  const { data: opportunitiesData, isLoading: opportunitiesLoading } =
    useYieldOpportunities();

  const enrichedPositions = useMemo(() => {
    const positions = positionsData?.positions ?? [];
    const opportunities = opportunitiesData?.opportunities ?? [];
    const oppByVault = new Map<string, YieldOpportunityResponse>();
    for (const opp of opportunities) {
      const key = (opp.vaultAddress ?? opp.id ?? '').toLowerCase();
      if (key) oppByVault.set(key, opp);
    }
    return positions.map((pos) => {
      const vaultKey = (pos.vaultAddress ?? '').toLowerCase();
      const opportunity = oppByVault.get(vaultKey) ?? null;
      return { position: pos, opportunity };
    });
  }, [positionsData?.positions, opportunitiesData?.opportunities]);

  const isLoading = positionsLoading;
  const positions = positionsData?.positions ?? [];

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Active Positions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-4 min-h-[100px] flex flex-col justify-between"
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2 mt-2" />
              <Skeleton className="h-3 w-2/3 mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        {enrichedPositions.map(({ position, opportunity }) => (
          <YieldPositionCard
            key={position.id}
            position={position}
            opportunity={opportunity}
          />
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
                  (opp.merklUrl ?? opp.depositUrl) && "cursor-pointer"
                )}
                onClick={() => {
                  const url = opp.merklUrl ?? opp.depositUrl;
                  if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
                role={opp.merklUrl ?? opp.depositUrl ? "button" : undefined}
                tabIndex={opp.merklUrl ?? opp.depositUrl ? 0 : undefined}
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
                      {(() => {
                        const logo = getProtocolLogo(opp.protocol);
                        return logo ? (
                          <img src={logo} alt={opp.protocol} className="size-3 object-contain" />
                        ) : null;
                      })()}
                      {opp.protocol}
                    </Badge>
                    {opp.tokens
                      .filter((t) => !t.symbol.includes('VAULT') && !t.symbol.includes('UNIV3'))
                      .slice(0, 3)
                      .map((t) => {
                        const logoUrl = (t.icon && t.icon.trim()) || TOKEN_METADATA[t.symbol]?.logo;
                        return (
                          <span
                            key={t.address}
                            className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                          >
                            {logoUrl ? (
                              <img src={logoUrl} alt={t.symbol} className="size-3 rounded-full object-cover" />
                            ) : null}
                            {t.symbol}
                          </span>
                        );
                      })}
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

  // Show toast for execution failures (stepMessage indicates failure during execute step)
  useEffect(() => {
    const msg = progress.stepMessage;
    const isExecuteStep =
      progress.currentStep === 'executing_yields' ||
      progress.currentStep === 'executing_trades';
    if (isExecuteStep && msg && (msg.startsWith('Failed ') || msg.startsWith('Error executing'))) {
      toast.error(msg);
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
          agentType="yield"
        />
      </div>

      {/* Empty wallet funding banner */}
      {showFundingBanner && serverWalletAddress && (
        <FundingBanner
          serverWalletAddress={serverWalletAddress}
          message="Add funds to start investing."
          dismissKey="autoclaw_yield_funding_banner_dismissed"
        />
      )}

      {/* Real-time reasoning display during analysis */}
      {progress.isRunning &&
        (progress.reasoning || progress.currentStep === 'analyzing_yields') && (
        <ReasoningView
          reasoning={progress.reasoning}
          isActive={progress.currentStep === 'analyzing_yields'}
          stageMessage={
            !progress.reasoning && progress.currentStep === 'analyzing_yields'
              ? progress.stepMessage
              : undefined
          }
        />
      )}

      <YieldPositionsSection />
      <YieldOpportunitiesSection />
      <YieldRewardsSection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline: run grouping (like FX)                                    */
/* ------------------------------------------------------------------ */

type YieldEntry = NonNullable<
  ReturnType<typeof useYieldTimeline>['data']
>['entries'][number];

interface YieldRunGroup {
  runId: string;
  entries: YieldEntry[];
  createdAt: string;
  summary: string;
}

type YieldGroupedItem = YieldRunGroup | YieldEntry;

function groupYieldByRun(entries: YieldEntry[]): YieldGroupedItem[] {
  const groups = new Map<string, YieldEntry[]>();
  const result: YieldGroupedItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.runId) {
      if (!groups.has(entry.runId)) {
        groups.set(entry.runId, []);
      }
      groups.get(entry.runId)!.push(entry);
    }
  }

  for (const entry of entries) {
    if (entry.runId && groups.has(entry.runId) && !seen.has(entry.runId)) {
      seen.add(entry.runId);
      const groupEntries = groups.get(entry.runId)!;
      if (groupEntries.length === 1) {
        result.push(groupEntries[0]);
      } else {
        const analysis = groupEntries.find((e) => e.eventType === 'analysis');
        const deposits = groupEntries.filter(
          (e) => e.eventType === 'trade' || e.eventType === 'deposit',
        );
        let summary = analysis?.summary ?? 'YIELD agent run';
        if (deposits.length > 0) {
          summary += ` — ${deposits.length} action${deposits.length > 1 ? 's' : ''}`;
        }
        result.push({
          runId: entry.runId,
          entries: groupEntries,
          createdAt: groupEntries[0].createdAt,
          summary,
        });
      }
    } else if (!entry.runId) {
      result.push(entry);
    }
  }

  return result;
}

function isYieldRunGroup(item: YieldGroupedItem): item is YieldRunGroup {
  return (
    'entries' in item &&
    Array.isArray(item.entries) &&
    'runId' in item &&
    !('eventType' in item)
  );
}

function YieldRunGroupCard({ group }: { group: YieldRunGroup }) {
  const m = useMotionSafe();
  const [expanded, setExpanded] = useState(false);

  const card = (
    <div
      className="rounded-xl border border-primary/20 bg-primary/5 cursor-pointer transition-colors"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug line-clamp-1 font-medium">
            {group.summary}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(group.createdAt)}
            </span>
            <Badge
              className="text-[11px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30"
              variant="outline"
            >
              {group.entries.length} events
            </Badge>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform shrink-0 mt-1',
            expanded && 'rotate-180',
          )}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: m.duration.fast }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 border-t border-primary/10 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="timeline-spine timeline-spine--compact">
                {group.entries.map((entry) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={{
                      ...entry,
                      detail: entry.detail ?? {},
                      citations: entry.citations ?? [],
                    }}
                    compact
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="timeline-item">
      <div className="timeline-node-col">
        <TimelineNode config={GROUP_NODE_CONFIG} />
      </div>
      <div className="timeline-card-col">{card}</div>
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

  const grouped = useMemo(
    () => groupYieldByRun(allEntries),
    [allEntries],
  );

  const total = data?.total ?? 0;

  return (
    <motion.div {...m.fadeIn} transition={{ duration: m.duration.normal }}>
      <div className="mb-4 text-sm text-muted-foreground font-mono tabular-nums">
        {total} events
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
        <div className="timeline-spine">
          {grouped.map((item) =>
            isYieldRunGroup(item) ? (
              <YieldRunGroupCard key={item.runId} group={item} />
            ) : (
              <TimelineEntry
                key={item.id}
                entry={{
                  ...item,
                  detail: item.detail ?? {},
                  citations: item.citations ?? [],
                }}
              />
            ),
          )}
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
  const convertToUsdc = useConvertToUsdc();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const config = statusData?.config;
  const params = config?.strategyParams;

  const [frequency, setFrequency] = useState(4);
  const [minAprThreshold, setMinAprThreshold] = useState(5);
  const [maxSingleVaultPct, setMaxSingleVaultPct] = useState(40);
  const [minHoldPeriodDays, setMinHoldPeriodDays] = useState(3);
  const [maxVaultCount, setMaxVaultCount] = useState(5);
  const [minTvlUsd, setMinTvlUsd] = useState(50_000);
  const [autoCompound, setAutoCompound] = useState(false);

  // Sync form state when data loads
  useEffect(() => {
    if (!config) return;
    setFrequency(config.frequency);

    if (params) {
      setMinAprThreshold(params.minAprThreshold);
      setMaxSingleVaultPct(params.maxSingleVaultPct);
      setMinHoldPeriodDays(params.minHoldPeriodDays);
      setMaxVaultCount(params.maxVaultCount);
      setMinTvlUsd(params.minTvlUsd);
      setAutoCompound(params.autoCompound);
    }
  }, [config, params]);

  const handleSave = () => {
    updateSettings.mutate(
      {
        frequency,
        strategyParams: {
          minAprThreshold,
          maxSingleVaultPct,
          minHoldPeriodDays,
          maxVaultCount,
          minTvlUsd,
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
      onSuccess: (data) => {
        setWithdrawOpen(false);
        const results = data?.results ?? [];
        const convertResult = data?.convertResult;
        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success && !r.skipped);
        const total = results.length;

        if (total === 0) {
          toast.info('No active positions to withdraw');
        } else if (failed.length === 0) {
          let convertMsg = '';
          if (convertResult) {
            if (convertResult.swapped.length > 0) {
              convertMsg =
                convertResult.skipped.length > 0
                  ? ` Converted to USDC. ${convertResult.skipped.length} token(s) skipped.`
                  : ' Converted to USDC.';
            } else if (convertResult.skipped.length > 0) {
              convertMsg = ` Could not convert: ${convertResult.skipped.map((s) => `${s.symbol}: ${s.reason}`).join('; ')}`;
            }
          }
          toast.success(
            (total === 1 ? 'Position withdrawn' : `${succeeded}/${total} positions withdrawn`) +
              convertMsg,
          );
        } else {
          const errMsg = failed[0]?.error ?? 'Unknown error';
          toast.error(
            `${succeeded}/${total} withdrawn. ${failed.length} failed: ${errMsg}`,
          );
        }
      },
      onError: () => toast.error('Failed to withdraw'),
    });
  };

  const handleConvertToUsdc = () => {
    convertToUsdc.mutate(undefined, {
      onSuccess: (data) => {
        setConvertOpen(false);
        const swapped = data?.swapped ?? [];
        const skipped = data?.skipped ?? [];

        if (swapped.length === 0 && skipped.length === 0) {
          toast.info('No convertible tokens');
        } else if (swapped.length > 0 && skipped.length === 0) {
          toast.success(
            swapped.length === 1
              ? `Converted ${swapped[0].symbol} to USDC`
              : `Converted ${swapped.length} tokens to USDC`,
          );
        } else if (swapped.length > 0 && skipped.length > 0) {
          const skipList = skipped.map((s) => `${s.symbol}: ${s.reason}`).join('; ');
          toast.success(
            `Converted ${swapped.length} tokens to USDC`,
            { description: `Skipped: ${skipList}` },
          );
        } else {
          const skipList = skipped.map((s) => `${s.symbol}: ${s.reason}`).join('; ');
          toast.warning('No tokens converted', { description: skipList });
        }
      },
      onError: () => toast.error('Failed to convert to USDC'),
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
        <CardContent className="space-y-6">
          <SliderField
            label="Run Frequency"
            tooltip="How many hours between each agent run. Lower values mean more frequent yield optimization."
            value={frequency}
            onChange={setFrequency}
            min={1}
            max={24}
            step={1}
            formatValue={formatFrequency}
          />

          <SliderField
            label="Min APR Threshold"
            tooltip="Only enter vaults with APR above this threshold."
            value={minAprThreshold}
            onChange={setMinAprThreshold}
            min={0}
            max={50}
            step={0.5}
            suffix="%"
          />

          <SliderField
            label="Max Single Vault Allocation"
            tooltip="Maximum percentage of portfolio in a single vault."
            value={maxSingleVaultPct}
            onChange={setMaxSingleVaultPct}
            min={1}
            max={100}
            step={1}
            suffix="%"
          />

          <SliderField
            label="Min Hold Period"
            tooltip="Minimum days to hold a vault position before rotating."
            value={minHoldPeriodDays}
            onChange={setMinHoldPeriodDays}
            min={0}
            max={30}
            step={1}
            suffix=" days"
          />

          <SliderField
            label="Max Vault Count"
            tooltip="Maximum number of vaults to hold positions in simultaneously."
            value={maxVaultCount}
            onChange={setMaxVaultCount}
            min={1}
            max={10}
            step={1}
          />

          <SliderField
            label="Min TVL (USD)"
            tooltip="Only consider vaults with TVL above this amount."
            value={minTvlUsd}
            onChange={setMinTvlUsd}
            min={0}
            max={500_000}
            step={10_000}
            formatValue={(v) => `$${v.toLocaleString()}`}
          />

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

      {/* Convert to USDC */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-amber-500" />
            Convert to USDC
          </CardTitle>
          <CardDescription>
            Swap all wallet tokens to USDC. Only tokens with a Mento swap route
            are converted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <ArrowRightLeft className="size-4 mr-2" />
                Convert to USDC
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convert to USDC</DialogTitle>
                <DialogDescription>
                  This will swap all convertible tokens (USDT, USDm, EURm, etc.)
                  to USDC. Tokens without a swap route will be skipped. Continue?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  disabled={convertToUsdc.isPending}
                  onClick={handleConvertToUsdc}
                >
                  {convertToUsdc.isPending ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : null}
                  Convert
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                  This will withdraw all funds from every active vault position
                  and convert them to USDC. Claim any pending rewards separately
                  before withdrawing if needed. This action cannot be undone.
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
      title: 'High-Yield Vaults',
      desc: 'Automatically finds the best Merkl-incentivized vaults on Celo — Ichi, Uniswap, Steer & more.',
      tags: ['Ichi', 'Uniswap', 'Steer'],
    },
    {
      title: 'Auto-Rebalancing',
      desc: 'Continuously monitors APRs and rotates into higher-yielding positions.',
      tags: ['APR', '24/7', 'AUTO'],
    },
    {
      title: 'Reward Claiming',
      desc: 'Claims Merkl rewards and optionally auto-compounds them back into vaults.',
      tags: ['Merkl', 'Compound'],
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

      <div className="grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <CardSpotlight
            key={f.title}
            color="rgba(251, 191, 36, 0.12)"
            radius={280}
          >
            <div className="flex flex-col items-center p-6 text-center">
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {f.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </CardSpotlight>
        ))}
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
          Autonomous yield farming on Celo — deposits into vaults and manages
          positions 24/7.
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
  const syncPositions = useSyncYieldPositions();

  // Sync positions from chain once per visit (backfills for pre-tracking deposits)
  useEffect(() => {
    syncPositions.mutate(undefined, {
      onError: () => {
        // Ignore 404 (yield agent not configured) and other errors
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return (
    <Suspense>
      <YieldAgentTabs />
    </Suspense>
  );
}
