'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Wallet,
  Shield,
  Settings,
  AlertTriangle,
  Pause,
} from 'lucide-react';
import { useAgentStatus, useAgentTimeline, usePortfolio } from '@/hooks/use-agent';
import type { TimelineEntry } from '@/hooks/use-agent';
import { Skeleton } from '@/components/ui/skeleton';

// Compact event config for the small activity items
type EventKey = 'trade-buy' | 'trade-sell' | 'analysis' | 'funding' | 'guardrail' | 'system';

function getEventKey(entry: TimelineEntry): EventKey {
  if (entry.eventType === 'trade') {
    return entry.direction === 'sell' ? 'trade-sell' : 'trade-buy';
  }
  return entry.eventType;
}

const EVENT_STYLES: Record<EventKey, { color: string; bg: string; icon: typeof ArrowUpRight }> = {
  'trade-buy': { color: 'text-success', bg: 'bg-success/10', icon: ArrowUpRight },
  'trade-sell': { color: 'text-error', bg: 'bg-error/10', icon: ArrowDownRight },
  analysis: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Search },
  funding: { color: 'text-warning', bg: 'bg-warning/10', icon: Wallet },
  guardrail: { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Shield },
  system: { color: 'text-foreground-muted', bg: 'bg-foreground-muted/10', icon: Settings },
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d`;
}

function CompactEntry({ entry }: { entry: TimelineEntry }) {
  const key = getEventKey(entry);
  const style = EVENT_STYLES[key];
  const Icon = style.icon;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${style.bg}`}>
        <Icon size={13} className={style.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug line-clamp-2">{entry.summary}</p>
        <p className="text-[10px] text-foreground-muted mt-0.5">{formatRelativeTime(entry.createdAt)}</p>
      </div>
    </div>
  );
}

export function ActivitiesPanel() {
  const { data: status } = useAgentStatus();
  const { data: portfolio } = usePortfolio();
  const { data: timelineData, isLoading } = useAgentTimeline();

  const entries = timelineData?.pages.flatMap((p) => p.entries).slice(0, 10) ?? [];
  const isAgentPaused = status && !status.config.active;
  const isLowBalance = portfolio && portfolio.totalValueUsd < 5;

  return (
    <div className="p-5 space-y-6">
      {/* Alerts */}
      {(isAgentPaused || isLowBalance) && (
        <div className="space-y-2">
          {isAgentPaused && (
            <div className="rounded-card bg-warning/10 border border-warning/20 p-3 flex items-start gap-2.5">
              <Pause size={14} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-warning">Agent Paused</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Resume to continue trading</p>
              </div>
            </div>
          )}
          {isLowBalance && (
            <div className="rounded-card bg-error/10 border border-error/20 p-3 flex items-start gap-2.5">
              <AlertTriangle size={14} className="text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-error">Low Balance</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Fund your agent wallet to enable trading</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Activities</h3>
          <Link href="/history" className="text-xs text-accent-text hover:underline">
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-foreground-muted py-4 text-center">
            No activity yet. Resume the agent to get started.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <CompactEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
