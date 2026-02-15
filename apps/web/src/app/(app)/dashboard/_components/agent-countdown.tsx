'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { formatCountdown } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ProgressStep } from '@/hooks/use-agent-progress';

export const RING_SIZE = 140;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/* ------------------------------------------------------------------ */
/*  useCountdown                                                       */
/* ------------------------------------------------------------------ */

export function useCountdown(
  nextRunAt: string | null,
  lastRunAt: string | null,
  frequencyHours: number,
) {
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
/*  CountdownRing                                                      */
/* ------------------------------------------------------------------ */

interface CountdownRingProps {
  nextRunAt: string | null;
  lastRunAt: string | null;
  frequency: number;
}

export function CountdownRing({
  nextRunAt,
  lastRunAt,
  frequency,
}: CountdownRingProps) {
  const { timeLeft, progress } = useCountdown(nextRunAt, lastRunAt, frequency);
  const strokeOffset = RING_CIRCUMFERENCE - progress * RING_CIRCUMFERENCE;

  return (
    <div
      className="relative"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={RING_STROKE}
        />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl tabular-nums font-bold">
          {timeLeft}
        </span>
        <span className="text-xs text-muted-foreground">next run</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AgentProgressStepper (configurable steps)                          */
/* ------------------------------------------------------------------ */

const YIELD_STEPS: ProgressStep[] = [
  'scanning_vaults',
  'analyzing_yields',
  'checking_yield_guardrails',
  'executing_yields',
  'claiming_rewards',
];

const FX_STEPS: ProgressStep[] = [
  'fetching_news',
  'analyzing',
  'checking_signals',
  'executing_trades',
];

const STEP_LABELS: Record<string, string> = {
  fetching_news: 'Fetch',
  analyzing: 'Analyze',
  checking_signals: 'Signals',
  executing_trades: 'Trade',
  scanning_vaults: 'Scan',
  analyzing_yields: 'Analyze',
  checking_yield_guardrails: 'Guard',
  executing_yields: 'Execute',
  claiming_rewards: 'Claim',
};

interface AgentProgressStepperProps {
  currentStep: ProgressStep | null;
  stepLabel: string;
  stepMessage: string;
  variant?: 'fx' | 'yield';
}

export function AgentProgressStepper({
  currentStep,
  stepLabel,
  stepMessage,
  variant = 'fx',
}: AgentProgressStepperProps) {
  const shouldReduceMotion = useReducedMotion();
  const steps = variant === 'yield' ? YIELD_STEPS : FX_STEPS;
  const currentIdx = currentStep ? steps.indexOf(currentStep) : -1;
  const isComplete = currentStep === 'complete';
  const isError = currentStep === 'error';

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ width: RING_SIZE, minHeight: RING_SIZE }}
    >
      <div className="flex items-center gap-1.5 w-full justify-center">
        {steps.map((step, i) => {
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
                    !isDone &&
                      !isActive &&
                      'border-muted-foreground/30 text-muted-foreground/50',
                  )}
                  animate={
                    isActive && !shouldReduceMotion
                      ? { scale: [1, 1.1, 1] }
                      : {}
                  }
                  transition={
                    isActive && !shouldReduceMotion
                      ? { repeat: Infinity, duration: 1.5 }
                      : {}
                  }
                >
                  {isDone ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : isActive ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span
                  className={cn(
                    'text-[11px] leading-none',
                    isDone || isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground/50',
                  )}
                >
                  {STEP_LABELS[step] ?? step}
                </span>
              </div>
              {i < steps.length - 1 && (
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
