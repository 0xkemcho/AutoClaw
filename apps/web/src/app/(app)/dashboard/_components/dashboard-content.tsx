'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgentStatus } from '@/hooks/use-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useTimeline } from '@/hooks/use-timeline';
import { useAgentProgress } from '@/hooks/use-agent-progress';
import { useMarketTokens } from '@/hooks/use-market';
import { useMotionSafe } from '@/lib/motion';
import { AgentStatusCard } from './agent-status-card';
import { PortfolioCard } from './portfolio-card';
import { ActivityPreview } from './activity-preview';
import { FundingBanner } from './funding-banner';
import { LiveRunCard } from './live-run-card';

export function DashboardContent() {
  const m = useMotionSafe();
  const agentQuery = useAgentStatus();
  const portfolioQuery = usePortfolio();
  const timelineQuery = useTimeline({ limit: 10 });
  const progress = useAgentProgress();
  const marketQuery = useMarketTokens();

  const config = agentQuery.data?.config;
  const tradesToday = agentQuery.data?.tradesToday ?? 0;
  const positionCount = agentQuery.data?.positionCount ?? 0;
  const totalValueUsd = portfolioQuery.data?.totalValueUsd ?? 0;
  const holdings = portfolioQuery.data?.holdings ?? [];
  const timelineEntries = timelineQuery.data?.entries ?? [];

  // Filter out system events for dashboard — keep them in full timeline
  const dashboardEntries = useMemo(
    () => timelineEntries.filter((e) => e.eventType !== 'system'),
    [timelineEntries],
  );

  const latestSignal = useMemo(() => {
    // Prefer 'analysis' entries — they contain the full set of signals from a run.
    // Trade entries are per-token and would only show the last traded currency.
    const entry =
      dashboardEntries.find((e) => e.eventType === 'analysis') ??
      dashboardEntries.find((e) => e.eventType === 'trade');
    if (!entry) return null;
    return {
      summary: entry.summary,
      currency: entry.currency,
      direction: entry.direction,
      confidencePct: (entry as { confidencePct?: number | null }).confidencePct ?? null,
      createdAt: entry.createdAt,
      signals: Array.isArray(entry.detail?.signals)
        ? (entry.detail.signals as Array<{
            currency: string;
            direction: string;
            confidence: number;
            reasoning: string;
          }>)
        : [],
    };
  }, [dashboardEntries]);

  const serverWalletAddress = config?.serverWalletAddress ?? null;
  const showFundingBanner = totalValueUsd === 0 && !!serverWalletAddress;

  return (
    <motion.div
      className="flex flex-col gap-7"
      initial={m.fadeUp.initial}
      animate={m.fadeUp.animate}
      transition={m.spring}
    >
      {showFundingBanner && (
        <FundingBanner serverWalletAddress={serverWalletAddress!} />
      )}

      <AnimatePresence>
        {progress.steps.length > 0 && (
          <LiveRunCard
            steps={progress.steps}
            isRunning={progress.isRunning}
            currentStep={progress.currentStep}
          />
        )}
      </AnimatePresence>

      <div className="grid gap-7 lg:grid-cols-[1fr_1fr]">
        {config ? (
          <AgentStatusCard
            config={config}
            tradesToday={tradesToday}
            positionCount={positionCount}
            latestSignal={latestSignal}
            progress={progress}
          />
        ) : (
          <div className="rounded-xl border bg-card p-6 animate-pulse" />
        )}

        <PortfolioCard
          totalValueUsd={totalValueUsd}
          totalPnl={portfolioQuery.data?.totalPnl ?? null}
          totalPnlPct={portfolioQuery.data?.totalPnlPct ?? null}
          holdings={holdings}
          isLoading={portfolioQuery.isLoading}
          serverWalletAddress={serverWalletAddress}
          marketTokens={marketQuery.data?.tokens}
        />
      </div>

      <ActivityPreview
        entries={dashboardEntries}
        isLoading={timelineQuery.isLoading}
      />
    </motion.div>
  );
}
