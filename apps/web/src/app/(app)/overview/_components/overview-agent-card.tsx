'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Activity,
  Play,
  Sprout,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAgentStatus, useToggleAgent, useRunNow } from '@/hooks/use-agent';
import { useYieldAgentStatus, useToggleYieldAgent, useRunYieldNow } from '@/hooks/use-yield-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useAgentReputation, useYieldReputation } from '@/hooks/use-reputation';
import { useAgentProgress } from '@/hooks/use-agent-progress';

const ERC8004_SCAN_BASE = 'https://www.8004scan.io/agents/celo';

interface OverviewAgentCardProps {
  agentType: 'fx' | 'yield';
}

export function OverviewAgentCard({ agentType }: OverviewAgentCardProps) {
  const isFx = agentType === 'fx';
  const title = isFx ? 'FX Agent' : 'Yield Agent';
  const Icon = isFx ? Activity : Sprout;
  const href = isFx ? '/fx-agent' : '/yield-agent';

  const { data: fxAgent, isLoading: fxStatusLoading } = useAgentStatus();
  const { data: yieldAgent, isLoading: yieldStatusLoading } = useYieldAgentStatus();
  const { data: fxPortfolio } = usePortfolio('fx');
  const { data: yieldPortfolio } = usePortfolio('yield');
  const { isRunning } = useAgentProgress();

  const toggleFxMutation = useToggleAgent();
  const toggleYieldMutation = useToggleYieldAgent();
  const runFxMutation = useRunNow();
  const runYieldMutation = useRunYieldNow();

  const agent = isFx ? fxAgent : yieldAgent;
  const portfolio = isFx ? fxPortfolio : yieldPortfolio;
  const config = agent?.config;
  const agent8004Id = config?.agent8004Id ?? null;
  const active = config?.active ?? false;
  const nextRunAt = config?.nextRunAt ? new Date(config.nextRunAt) : null;

  const fxRep = useAgentReputation(isFx ? agent8004Id : null);
  const yieldRep = useYieldReputation(!isFx ? agent8004Id : null);
  const reputationData = isFx ? fxRep.data : yieldRep.data;
  const reputationScore =
    reputationData != null
      ? reputationData.summaryValue / Math.pow(10, reputationData.summaryDecimals)
      : null;

  const pnl = portfolio?.totalPnl ?? null;
  const pnlPct = portfolio?.totalPnlPct ?? null;
  const hasPnl = pnl != null;
  const pnlColor = hasPnl ? (pnl >= 0 ? 'text-green-500' : 'text-red-500') : 'text-muted-foreground';
  const pnlBg = hasPnl ? (pnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10') : 'bg-muted/50';
  const pnlSign = hasPnl && pnl >= 0 ? '+' : hasPnl && pnl < 0 ? '' : '';

  const [isActive, setIsActive] = useState(active);
  useEffect(() => {
    setIsActive(active);
  }, [active]);

  const toggleMutation = isFx ? toggleFxMutation : toggleYieldMutation;
  const runMutation = isFx ? runFxMutation : runYieldMutation;

  const handleToggle = () => {
    toggleMutation.mutate(undefined, {
      onSuccess: () => toast.success(isActive ? 'Agent paused' : 'Agent activated'),
      onError: () => toast.error('Failed to toggle agent'),
    });
  };

  const handleRun = () => {
    runMutation.mutate(undefined, {
      onSuccess: () => toast.success(isFx ? 'Run triggered' : 'Harvest triggered'),
      onError: (err: unknown) => {
        const body = (err as { body?: { error?: string } })?.body;
        const msg = body?.error ?? (err as Error).message;
        toast.error(msg);
      },
    });
  };

  const isRegistered8004 = agent8004Id !== null;
  const isLoading = isFx ? fxStatusLoading : yieldStatusLoading;

  if (isLoading) {
    return (
      <Card className="flex flex-col border-border/50 bg-card p-5 shadow-sm dark:bg-[#18181b]">
        <Skeleton className="mb-4 h-10 w-3/4" />
        <Skeleton className="mb-5 h-20 w-full rounded-lg" />
        <Skeleton className="h-9 w-full" />
      </Card>
    );
  }

  // Agent not configured (404)
  if (!agent?.config) {
    return (
      <Card className="flex flex-col justify-between overflow-hidden border-dashed border-border/50 bg-card p-5 shadow-sm dark:bg-[#18181b]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground">
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">Not configured</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={href}>Set up {title}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between overflow-hidden border-border/50 bg-card p-5 shadow-sm transition-all hover:border-primary/20 dark:bg-[#18181b]">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/50 text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn('flex items-center gap-1', isActive ? 'text-primary' : 'text-muted-foreground')}>
                <div className={cn('size-1.5 rounded-full', isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground')} />
                {isActive ? 'Active' : 'Paused'}
              </span>
              {nextRunAt && (
                <span>• Next: {nextRunAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </div>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending || !isRegistered8004}
        />
      </div>

      {/* Stats Grid */}
      <div className="mb-5 grid grid-cols-2 gap-4 rounded-lg bg-secondary/20 p-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">24h PnL</span>
          <div className="flex items-baseline gap-1.5">
            {hasPnl ? (
              <>
                <span className={cn('font-mono text-lg font-semibold tabular-nums', pnlColor)}>
                  {pnlSign}{formatUsd(pnl!)}
                </span>
                <span className={cn('rounded px-1 text-[10px] font-medium', pnlBg, pnlColor)}>
                  {pnlPct != null ? `${pnlSign}${pnlPct.toFixed(2)}%` : ''}
                </span>
              </>
            ) : (
              <span className="font-mono text-lg font-semibold tabular-nums text-muted-foreground">
                —
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">Identity</span>
          {agent8004Id ? (
            <div className="flex flex-col gap-0.5">
              <a
                href={`${ERC8004_SCAN_BASE}/${agent8004Id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <ShieldCheck className="size-3" />
                8004 #{agent8004Id}
                <ExternalLink className="size-2.5 opacity-50" />
              </a>
              {reputationScore != null && (
                <span className="text-[10px] text-muted-foreground">Rep: {Math.round(reputationScore)}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Not registered</span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
          <Link href={href}>View Dashboard</Link>
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          disabled={!isActive || isRunning || runMutation.isPending || !isRegistered8004}
          onClick={handleRun}
        >
          {isFx ? (
            <>
              <Play className="size-3 fill-current" /> Run Now
            </>
          ) : (
            <>
              <Sprout className="size-3" /> Harvest
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
