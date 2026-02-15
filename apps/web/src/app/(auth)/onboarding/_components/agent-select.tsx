'use client';

import { motion } from 'motion/react';
import { TrendingUp, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMotionSafe } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface AgentSelectProps {
  onSelect: (type: 'fx' | 'yield') => void;
  onSkip?: () => void;
}

export function AgentSelect({ onSelect, onSkip }: AgentSelectProps) {
  const m = useMotionSafe();

  return (
    <motion.div
      className="flex w-full max-w-2xl flex-col items-center gap-8"
      initial={m.fadeUp.initial}
      animate={m.fadeUp.animate}
      transition={m.spring}
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Choose Your Agent
        </h2>
        <p className="mt-2 text-muted-foreground">
          What kind of autonomous agent would you like to set up?
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {/* FX Agent Card */}
        <button
          onClick={() => onSelect('fx')}
          className={cn(
            'group relative flex flex-col items-start gap-4 rounded-xl border-2 border-border p-6 text-left transition-all cursor-pointer',
            'hover:border-primary hover:bg-primary/5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">FX Agent</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Trade stablecoin pairs on Mento. AI-driven FX signals with
              configurable risk guardrails.
            </p>
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {['USDm', 'EURm', 'BRLm', 'JPYm'].map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +12 more
            </span>
          </div>
        </button>

        {/* Yield Agent Card */}
        <button
          onClick={() => onSelect('yield')}
          className={cn(
            'group relative flex flex-col items-start gap-4 rounded-xl border-2 border-border p-6 text-left transition-all cursor-pointer',
            'hover:border-primary hover:bg-primary/5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <Sprout className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Yield Agent</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Automated yield farming across Ichi vaults on Celo with Merkl
              incentives.
            </p>
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {['USDC', 'USDT', 'WETH'].map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </button>
      </div>

      {onSkip && (
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
      )}
    </motion.div>
  );
}
