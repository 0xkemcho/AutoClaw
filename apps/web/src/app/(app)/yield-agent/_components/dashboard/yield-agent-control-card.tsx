'use client';

import { useState } from 'react';
import {
  Zap,
  Pause,
  Play,
  Wallet,
  TrendingUp,
  Activity,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useYieldAgentStatus,
  useToggleYieldAgent,
  useRunYieldNow,
  useYieldAttestations,
} from '@/hooks/use-yield-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useAgentProgress } from '@/hooks/use-agent-progress';
import { useSelfClawStatus } from '@/hooks/use-selfclaw';
import { SelfClawVerificationDialog } from '@/app/(app)/_components/selfclaw-verification-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { formatUsd } from '@/lib/format';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function YieldAgentControlCard() {
  const router = useRouter();
  const { data: agent } = useYieldAgentStatus();
  const selfclawStatus = useSelfClawStatus();
  const selfclawVerified = selfclawStatus.data?.verified ?? false;
  const { data: attestationsData } = useYieldAttestations(25, 0);
  const [selfclawDialogOpen, setSelfclawDialogOpen] = useState(false);
  const [attestationsOpen, setAttestationsOpen] = useState(false);
  const { data: portfolio } = usePortfolio('yield');
  const { isRunning, stepLabel } = useAgentProgress();
  const toggleMutation = useToggleYieldAgent();
  const runNowMutation = useRunYieldNow();

  const config = agent?.config;
  const isActive = config?.active ?? false;
  const nextRunAt = config?.nextRunAt ? new Date(config.nextRunAt) : null;
  const tradesToday = agent?.tradesToday ?? 0;
  const positionCount = agent?.positionCount ?? 0;
  const agent8004Id = config?.agent8004Id ?? null;
  const isRegistered8004 = agent8004Id !== null;

  // Real Data
  const totalPnl = portfolio?.totalPnl ?? 0;
  const totalPnlPct = portfolio?.totalPnlPct ?? 0;
  const totalValueUsd = portfolio?.totalValueUsd ?? 0;
  const hasInsufficientBalance = totalValueUsd < 5;

  // Helpers for PnL color
  const pnlColor = totalPnl >= 0 ? "text-green-500" : "text-red-500";
  const pnlSign = totalPnl >= 0 ? "+" : "";

  const handleRunNow = () => {
    runNowMutation.mutate(undefined, {
      onSuccess: () => toast.success('Run triggered'),
      onError: (err) => {
        const body = (err as { body?: { error?: string } })?.body;
        const msg = body?.error ?? err.message;
        toast.error(msg);
      },
    });
  };

  const handleToggle = () => {
    toggleMutation.mutate(undefined, {
      onSuccess: () =>
        toast.success(isActive ? 'Agent paused' : 'Agent activated'),
      onError: () => toast.error('Failed to toggle agent'),
    });
  };

  return (
    <Card className="flex flex-col justify-between overflow-hidden border-border/50 bg-card p-6 shadow-sm dark:bg-[#18181b]">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <h3 className="text-lg font-semibold text-foreground">Agent Controls & Status</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px] uppercase tracking-wide"
            onClick={() => setAttestationsOpen(true)}
          >
            Past Attestations
          </Button>
          {selfclawVerified ? (
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              <UserCheck className="size-3.5" />
              Human-Backed
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSelfclawDialogOpen(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <UserCheck className="size-3.5 opacity-50" />
              Verify Identity
            </button>
          )}
        </div>
      </div>

      <SelfClawVerificationDialog
        open={selfclawDialogOpen}
        onOpenChange={setSelfclawDialogOpen}
      />
      <Dialog open={attestationsOpen} onOpenChange={setAttestationsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Past Attestations</DialogTitle>
            <DialogDescription>
              TEE attestations for recent Yield agent runs.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-auto rounded-md border border-border/60 p-3">
            {(attestationsData?.entries ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No attestations yet.</p>
            ) : (
              (attestationsData?.entries ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-muted-foreground">
                      {entry.runId ? `Run ${entry.runId.slice(0, 8)}...` : 'No run id'}
                    </span>
                    <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-400">
                      Verified
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()} · {entry.algorithm}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Status Circle */}
      <div className="flex flex-1 flex-col items-center justify-center py-6">
         <div className="relative flex size-40 items-center justify-center rounded-full border-4 border-dashed border-border/50 bg-secondary/20">
            <div className={cn("absolute inset-0 rounded-full border-4 border-primary/20", isActive && "animate-spin-slow")} />
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
              <span className={cn("text-3xl font-bold tracking-tighter", isActive ? "text-primary" : "text-muted-foreground")}>
                {isActive ? "ON" : "OFF"}
              </span>
              {isActive && nextRunAt && (
                 <span className="mt-1 text-[10px] text-primary/80">
                   Next: {formatDistanceToNow(nextRunAt)}
                 </span>
              )}
            </div>
         </div>
      </div>

      {/* Controls */}
      <div className="mb-8 mt-6 grid grid-cols-2 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block w-full">
                <Button
                  className="w-full gap-2 font-semibold transition-all"
                  variant={isActive ? "default" : "outline"}
                  size="lg"
                  onClick={handleRunNow}
                  disabled={
                    runNowMutation.isPending ||
                    isRunning ||
                    !isActive ||
                    hasInsufficientBalance ||
                    !isRegistered8004
                  }
                >
                  {runNowMutation.isPending || isRunning ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Zap className="size-5 fill-current" />
                  )}
                  {isRunning ? (stepLabel || "Running...") : "Run Now"}
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

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block w-full">
                <Button
                  className="w-full gap-2 font-semibold"
                  variant="outline"
                  size="lg"
                  onClick={handleToggle}
                  disabled={toggleMutation.isPending || !isRegistered8004}
                >
                  {toggleMutation.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : isActive ? (
                    <>
                      <Pause className="size-5 fill-current" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="size-5 fill-current" />
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

      {!isRegistered8004 && (
        <p className="mb-4 text-center text-xs text-muted-foreground">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50 pt-6">
        {/* Metric 1: Active Vaults */}
        <div className="flex flex-col items-center gap-1 px-2">
          <Wallet className="size-4 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase text-muted-foreground">Active Vaults</span>
          <span className="text-2xl font-bold text-foreground">{positionCount}</span>
        </div>

        {/* Metric 2: Total Yield */}
        <div className="flex flex-col items-center gap-1 px-2">
          <TrendingUp className={cn("size-4", pnlColor)} />
          <span className="text-[10px] font-medium uppercase text-muted-foreground">Total Yield</span>
          <div className="flex flex-col items-center">
             <span className={cn("text-xl font-bold", pnlColor)}>
               {pnlSign}{formatUsd(totalPnl)}
             </span>
             <span className={cn("text-[10px] font-medium", pnlColor)}>
               ({pnlSign}{totalPnlPct.toFixed(2)}%)
             </span>
          </div>
        </div>

        {/* Metric 3: Trades Today */}
        <div className="flex flex-col items-center gap-1 px-2">
          <Activity className="size-4 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase text-muted-foreground">Trades Today</span>
          <span className="text-2xl font-bold text-foreground">{tradesToday}</span>
        </div>
      </div>
    </Card>
  );
}
