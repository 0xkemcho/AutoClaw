'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Play,
  Pause,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Star,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import type { ProgressStep } from '@/hooks/use-agent-progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToggleAgent, useRunNow } from '@/hooks/use-agent';
import { useAgentReputation } from '@/hooks/use-reputation';
import { SignalCard } from '@/components/signal-card';
import { formatCountdown, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ERC8004_SCAN_BASE = 'https://www.8004scan.io/agents';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentStatusCardProps {
  config: {
    id: string;
    active: boolean;
    frequency: number;
    maxTradeSizeUsd: number;
    maxAllocationPct: number;
    stopLossPct: number;
    dailyTradeLimit: number;
    allowedCurrencies: string[];
    blockedCurrencies: string[];
    customPrompt: string | null;
    serverWalletAddress: string | null;
    lastRunAt: string | null;
    nextRunAt: string | null;
    agent8004Id: number | null;
  };
  tradesToday: number;
  positionCount: number;
  latestSignal: {
    summary: string;
    currency: string | null;
    direction: string | null;
    confidencePct: number | null;
    createdAt: string;
    signals: Array<{
      currency: string;
      direction: string;
      confidence: number;
      reasoning: string;
    }>;
  } | null;
  progress: {
    isRunning: boolean;
    currentStep: ProgressStep | null;
    stepLabel: string;
    stepMessage: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Progress Stepper                                                   */
/* ------------------------------------------------------------------ */

const STEPS: ProgressStep[] = [
  'fetching_news',
  'analyzing',
  'checking_signals',
  'executing_trades',
];

const STEP_SHORT_LABELS: Record<string, string> = {
  fetching_news: 'Fetch',
  analyzing: 'Analyze',
  checking_signals: 'Signals',
  executing_trades: 'Trade',
};

function ProgressStepper({
  currentStep,
  stepLabel,
  stepMessage,
}: {
  currentStep: ProgressStep | null;
  stepLabel: string;
  stepMessage: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const currentIdx = currentStep ? STEPS.indexOf(currentStep) : -1;
  const isComplete = currentStep === 'complete';
  const isError = currentStep === 'error';

  return (
    <div className="flex flex-col items-center gap-3" style={{ width: RING_SIZE, minHeight: RING_SIZE }}>
      {/* Step indicators */}
      <div className="flex items-center gap-1.5 w-full justify-center">
        {STEPS.map((step, i) => {
          const isDone = isComplete || i < currentIdx;
          const isActive = i === currentIdx && !isComplete && !isError;
          return (
            <div key={step} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  className={cn(
                    'size-6 rounded-full flex items-center justify-center text-[11px] font-medium border transition-colors',
                    isDone && 'bg-success border-success text-success-foreground',
                    isActive && 'border-primary bg-primary/10 text-primary',
                    !isDone && !isActive && 'border-muted-foreground/30 text-muted-foreground/50',
                  )}
                  animate={isActive && !shouldReduceMotion ? { scale: [1, 1.1, 1] } : {}}
                  transition={isActive && !shouldReduceMotion ? { repeat: Infinity, duration: 1.5 } : {}}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : isActive ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span className={cn(
                  'text-[11px] leading-none',
                  (isDone || isActive) ? 'text-foreground' : 'text-muted-foreground/50',
                )}>
                  {STEP_SHORT_LABELS[step]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px w-3 mb-3',
                    i < currentIdx || isComplete
                      ? 'bg-success'
                      : 'bg-muted-foreground/20',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-center"
        >
          {isComplete ? (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="size-4" />
              <span className="text-sm font-medium">Done</span>
            </div>
          ) : isError ? (
            <div className="flex items-center gap-1.5 text-destructive">
              <XCircle className="size-4" />
              <span className="text-sm font-medium">Failed</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{stepLabel}</p>
          )}
          {stepMessage && !isComplete && !isError && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1 max-w-[200px]">
              {stepMessage}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Countdown Ring constants                                           */
/* ------------------------------------------------------------------ */

const RING_SIZE = 140;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/* ------------------------------------------------------------------ */
/*  useCountdown hook                                                  */
/* ------------------------------------------------------------------ */

function useCountdown(nextRunAt: string | null, lastRunAt: string | null, frequencyHours: number) {
  const [timeLeft, setTimeLeft] = useState('--');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!nextRunAt) {
      setTimeLeft('--');
      setProgress(0);
      return;
    }

    const nextMs = new Date(nextRunAt).getTime();
    const lastMs = lastRunAt ? new Date(lastRunAt).getTime() : 0;
    const fallbackMs = (frequencyHours || 4) * 60 * 60 * 1000;
    const intervalMs = lastMs > 0 ? nextMs - lastMs : fallbackMs;

    function tick() {
      const diff = nextMs - Date.now();
      if (diff <= 0) {
        setTimeLeft('Now');
        setProgress(1);
        return;
      }
      setTimeLeft(formatCountdown(nextRunAt!));
      setProgress(Math.min(1, Math.max(0, 1 - diff / intervalMs)));
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextRunAt, lastRunAt, frequencyHours]);

  return { timeLeft, progress };
}

/* ------------------------------------------------------------------ */
/*  Direction icon helper                                              */
/* ------------------------------------------------------------------ */

function DirectionIcon({ direction }: { direction: string | null }) {
  if (direction === 'buy') return <TrendingUp className="size-4 text-success" />;
  if (direction === 'sell')
    return <TrendingDown className="size-4 text-destructive" />;
  return <Minus className="size-4 text-muted-foreground" />;
}

/* ------------------------------------------------------------------ */
/*  AgentStatusCard                                                    */
/* ------------------------------------------------------------------ */

export function AgentStatusCard({
  config,
  tradesToday,
  positionCount,
  latestSignal,
  progress,
}: AgentStatusCardProps) {
  /* ---- mutations ---- */
  const toggleMutation = useToggleAgent();
  const runNowMutation = useRunNow();

  /* ---- 8004 identity ---- */
  const agent8004Id = config.agent8004Id;
  const isRegistered8004 = agent8004Id !== null;
  const reputationQuery = useAgentReputation(agent8004Id);
  const reputation = reputationQuery.data ?? null;
  const reputationScore =
    reputation !== null
      ? reputation.summaryValue / Math.pow(10, reputation.summaryDecimals)
      : null;

  /* ---- optimistic active state ---- */
  const [isActive, setIsActive] = useState(config.active);

  useEffect(() => {
    setIsActive(config.active);
  }, [config.active]);

  /* ---- countdown ---- */
  const { timeLeft, progress: countdownProgress } = useCountdown(config.nextRunAt, config.lastRunAt, config.frequency);

  /* ---- handlers ---- */
  function handleToggle() {
    const previous = isActive;
    setIsActive(!previous);

    toggleMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(previous ? 'Agent paused' : 'Agent resumed');
      },
      onError: () => {
        setIsActive(previous);
        toast.error('Failed to toggle agent');
      },
    });
  }

  function handleRunNow() {
    runNowMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Agent run triggered');
      },
      onError: () => {
        toast.error('Failed to trigger run');
      },
    });
  }

  /* ---- derived ---- */
  const strokeOffset =
    RING_CIRCUMFERENCE - countdownProgress * RING_CIRCUMFERENCE;

  return (
    <Card>
      {/* ============================================================ */}
      {/* A. Header with status indicator                               */}
      {/* ============================================================ */}
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

        {/* ---- ERC-8004 Identity Badge ---- */}
        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          {isRegistered8004 ? (
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <a
                href={`${ERC8004_SCAN_BASE}/${agent8004Id}?chain=42220`}
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
            <a
              href="/settings"
              className="text-xs text-primary hover:underline"
            >
              Register
            </a>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6">
        {/* ============================================================ */}
        {/* B. Countdown Ring or Progress Stepper                         */}
        {/* ============================================================ */}
        <AnimatePresence mode="wait">
          {progress.isRunning || progress.currentStep === 'complete' || progress.currentStep === 'error' ? (
            <motion.div
              key="stepper"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <ProgressStepper
                currentStep={progress.currentStep}
                stepLabel={progress.stepLabel}
                stepMessage={progress.stepMessage}
              />
            </motion.div>
          ) : (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative"
              style={{ width: RING_SIZE, height: RING_SIZE }}
            >
              <svg
                width={RING_SIZE}
                height={RING_SIZE}
                className="-rotate-90"
                aria-hidden="true"
              >
                {/* Background circle */}
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={RING_STROKE}
                />
                {/* Progress circle */}
                <motion.circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  animate={{ strokeDashoffset: strokeOffset }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                />
              </svg>

              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-2xl tabular-nums font-bold">
                  {timeLeft}
                </span>
                <span className="text-xs text-muted-foreground">next run</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================ */}
        {/* C. Stats Row                                                  */}
        {/* ============================================================ */}
        <div className="flex w-full items-center justify-around border-y py-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-mono text-xl tabular-nums font-semibold">
                    {tradesToday}/{config.dailyTradeLimit}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    trades today
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {tradesToday} of {config.dailyTradeLimit} daily trades used
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-8 w-px bg-border" />

          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-lg tabular-nums font-semibold">
              {positionCount}
            </span>
            <span className="text-xs text-muted-foreground">positions</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* D. Latest Signal                                              */}
        {/* ============================================================ */}
        <div className="w-full rounded-lg bg-muted/50 p-3">
          {latestSignal ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Latest Signal</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(latestSignal.createdAt)}
                </span>
              </div>
              {latestSignal.signals.length > 0 ? (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {latestSignal.signals.map((s, i) => (
                    <SignalCard
                      key={i}
                      currency={s.currency}
                      direction={s.direction}
                      confidence={s.confidence}
                      reasoning={s.reasoning}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <DirectionIcon direction={latestSignal.direction} />
                    {latestSignal.confidencePct !== null && (
                      <Badge variant="outline">
                        {latestSignal.confidencePct}%
                      </Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {latestSignal.summary}
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No signals yet
            </p>
          )}
        </div>

        {/* ============================================================ */}
        {/* E. Action Buttons                                             */}
        {/* ============================================================ */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full gap-3">
            <Button
              variant="default"
              className="flex-1 h-11"
              disabled={
                runNowMutation.isPending ||
                progress.isRunning ||
                !isActive ||
                !isRegistered8004
              }
              onClick={handleRunNow}
            >
              {progress.isRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              {progress.isRunning ? 'Running...' : 'Run Now'}
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full h-11"
                      disabled={toggleMutation.isPending || !isRegistered8004}
                      onClick={handleToggle}
                    >
                      {isActive ? (
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

          {!isRegistered8004 && (
            <p className="text-center text-xs text-muted-foreground">
              <a href="/settings" className="text-primary hover:underline">
                Register on ERC-8004
              </a>{' '}
              to activate your agent
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
