'use client';

import { useMotionSafe } from '@/lib/motion';
import { motion } from 'motion/react';
import { OverviewBalanceHero } from './overview-balance-hero';
import { OverviewAgentCard } from './overview-agent-card';
import { OverviewTrendingFx } from './overview-trending-fx';
import { OverviewYieldOpportunities } from './overview-yield-opportunities';

export function OverviewContent() {
  const m = useMotionSafe();

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={m.fadeUp.initial}
      animate={m.fadeUp.animate}
      transition={m.spring}
    >
      <OverviewBalanceHero />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OverviewAgentCard agentType="fx" />
        <OverviewAgentCard agentType="yield" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OverviewTrendingFx />
        <OverviewYieldOpportunities />
      </div>
    </motion.div>
  );
}
