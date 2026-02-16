'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { TrendingUp, Info } from 'lucide-react';
import { useMotionSafe } from '@/lib/motion';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { FxAgentDashboard } from './fx-agent-dashboard';
import { useAgentStatus } from '@/hooks/use-agent';

/* ------------------------------------------------------------------ */
/*  Hero CTA for users with no FX agent configured                     */
/* ------------------------------------------------------------------ */

function FxHero() {
  const m = useMotionSafe();
  const router = useRouter();

  const features = [
    {
      title: 'AI-Driven Signals',
      desc: 'Real-time FX news analysis powered by Gemini, generating buy/sell/hold signals with confidence scores.',
      tags: ['Gemini', 'Real-time'],
    },
    {
      title: 'Risk Guardrails',
      desc: 'Configurable trade limits, max allocation, stop-loss, and daily caps based on your risk profile.',
      tags: ['Configurable', 'Safe'],
    },
    {
      title: 'Mento Protocol',
      desc: 'Executes stablecoin swaps across 15+ Mento pairs — USDm, EURm, BRLm, JPYm, and more.',
      tags: ['15+ pairs', 'USDm'],
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
          <TrendingUp className="size-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">FX Trading Agent</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          Let your agent trade stablecoin pairs autonomously on Celo. AI-driven
          analysis, configurable risk guardrails, and 24/7 execution.
        </p>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="gap-2"
          onClick={() => router.push('/onboarding?agent=fx')}
        >
          <TrendingUp className="size-4" />
          Create FX Agent
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

function FxAgentWrapper() {
    const { data, isLoading, isError } = useAgentStatus();
    const router = useRouter();

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

    // No FX agent configured — show hero CTA
    if (!data || isError) {
        return <FxHero />;
    }

    return (
        <div className="space-y-6">
             <div className="text-center">
                <h1 className="text-2xl font-bold">FX Trading Agent</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                Autonomous FX stablecoin trading on Celo
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
                    onClick={() => router.push('/onboarding?agent=fx&step=register')}
                >
                    Register Now
                </Button>
                </div>
            )}

            <FxAgentDashboard />
        </div>
    );
}

export function FxAgentContent() {
  return (
    <Suspense>
      <FxAgentWrapper />
    </Suspense>
  );
}
