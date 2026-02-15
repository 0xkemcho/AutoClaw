'use client';

import { Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Zap,
  Info,
} from 'lucide-react';
import { useMotionSafe } from '@/lib/motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardContent } from '@/app/(app)/dashboard/_components/dashboard-content';
import { TimelineContent } from '@/app/(app)/timeline/_components/timeline-content';
import { SettingsContent } from '@/app/(app)/settings/_components/settings-content';
import { useAgentStatus } from '@/hooks/use-agent';

const DEFAULT_TAB = 'agent';

/* ------------------------------------------------------------------ */
/*  Hero CTA for users with no FX agent configured                     */
/* ------------------------------------------------------------------ */

function FxHero() {
  const m = useMotionSafe();
  const router = useRouter();

  const features = [
    {
      icon: BarChart3,
      title: 'AI-Driven Signals',
      desc: 'Real-time FX news analysis powered by Gemini, generating buy/sell/hold signals with confidence scores.',
    },
    {
      icon: ShieldCheck,
      title: 'Risk Guardrails',
      desc: 'Configurable trade limits, max allocation, stop-loss, and daily caps based on your risk profile.',
    },
    {
      icon: Zap,
      title: 'Mento Protocol',
      desc: 'Executes stablecoin swaps across 15+ Mento pairs — USDm, EURm, BRLm, JPYm, and more.',
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
          onClick={() => router.push('/onboarding')}
        >
          <TrendingUp className="size-4" />
          Create FX Agent
        </Button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main tabbed layout                                                 */
/* ------------------------------------------------------------------ */

function FxAgentTabs() {
  const m = useMotionSafe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, isError } = useAgentStatus();

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

  // No FX agent configured — show hero CTA
  if (!data || isError) {
    return <FxHero />;
  }

  return (
    <motion.div
      {...m.fadeIn}
      transition={{ duration: m.duration.normal }}
      className="space-y-6"
    >
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

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="agent">Agent</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="mt-4">
          <DashboardContent />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineContent />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsContent />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export function FxAgentContent() {
  return (
    <Suspense>
      <FxAgentTabs />
    </Suspense>
  );
}
