'use client';

import { motion } from 'motion/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMotionSafe } from '@/lib/motion';
import { YieldAgentControlCard } from './dashboard/yield-agent-control-card';
import { YieldPortfolioGuardrailsCard } from './dashboard/yield-portfolio-guardrails-card';
import { LiveExecutionFeed } from '../../fx-agent/_components/dashboard/live-execution-feed';
import { YieldRecentActivityTable } from './dashboard/yield-recent-activity-table';
import { YieldAgentTimeline } from './dashboard/yield-agent-timeline';
import { YieldSettingsTab } from './dashboard/yield-settings-tab';
import { YieldPositionsSection } from './dashboard/yield-positions-section';
import { YieldOpportunitiesSection } from './dashboard/yield-opportunities-section';
import { YieldRewardsSection } from './dashboard/yield-rewards-section';

import { FundingBanner } from '@/app/(app)/dashboard/_components/funding-banner';
import { useYieldAgentStatus } from '@/hooks/use-yield-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useAgentProgress } from '@/hooks/use-agent-progress';
import { ReasoningView } from '@/components/reasoning-view';
import { cn } from '@/lib/utils';

export function YieldAgentDashboard() {
  const m = useMotionSafe();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const activeTab = (tabParam === 'timeline' || tabParam === 'settings') ? tabParam : 'agent';

  const { data: agent } = useYieldAgentStatus();
  const { data: portfolio } = usePortfolio('yield');
  const progress = useAgentProgress();

  const serverWalletAddress = agent?.config.serverWalletAddress ?? null;
  const totalValueUsd = portfolio?.totalValueUsd ?? 0;
  const showFundingBanner = totalValueUsd === 0 && !!serverWalletAddress;

  const handleTabChange = (tab: 'agent' | 'timeline' | 'settings') => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'agent') {
        params.delete('tab');
    } else {
        params.set('tab', tab);
    }
    router.replace(`?${params.toString()}`);
  };

  return (
    <motion.div
        className="flex flex-col gap-6"
        initial={m.fadeUp.initial}
        animate={m.fadeUp.animate}
        transition={m.spring}
    >
        {/* Tab Switcher - Styled like Reference */}
        <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-gray-200 dark:bg-[#1e2025] p-0.5 rounded-md">
                <button
                    type="button"
                    onClick={() => handleTabChange('agent')}
                    className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-all",
                        activeTab === 'agent'
                            ? "bg-white dark:bg-[#2d3039] shadow-sm text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    Agent
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('timeline')}
                    className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-all",
                        activeTab === 'timeline'
                            ? "bg-white dark:bg-[#2d3039] shadow-sm text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    Timeline
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('settings')}
                    className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-all",
                        activeTab === 'settings'
                            ? "bg-white dark:bg-[#2d3039] shadow-sm text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    Settings
                </button>
            </div>
        </div>

        {/* Content */}
        {activeTab === 'agent' && (
            <div className="flex flex-col gap-6 pb-10">
                {/* Funding Banner if needed */}
                {showFundingBanner && (
                    <FundingBanner serverWalletAddress={serverWalletAddress ?? ''} />
                )}

                {/* Top Row: Controls & Portfolio */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <YieldAgentControlCard />
                    <YieldPortfolioGuardrailsCard />
                </div>

                {/* Reasoning View */}
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

                {/* Live Feed & Activity */}
                <div className="flex flex-col gap-6">
                    {(progress.isRunning || progress.steps.length > 0) && (
                    <LiveExecutionFeed progress={progress} />
                    )}
                    <YieldRecentActivityTable />
                </div>

                {/* Yield Specific Sections */}
                <YieldPositionsSection />
                <YieldOpportunitiesSection />
                <YieldRewardsSection />
            </div>
        )}

        {activeTab === 'timeline' && (
            <div className="flex-1 overflow-hidden">
                <YieldAgentTimeline />
            </div>
        )}

        {activeTab === 'settings' && (
             <div className="flex-1">
                <YieldSettingsTab />
             </div>
        )}
    </motion.div>
  );
}
