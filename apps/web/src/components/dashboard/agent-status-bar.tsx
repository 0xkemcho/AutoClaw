'use client';

import { useMemo } from 'react';
import { Pause, Play, Clock, BarChart3, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStatus, useToggleAgent, useRunAgentNow } from '@/hooks/use-agent';
import { Spinner } from '@/components/ui/spinner';

function formatCountdown(nextRunAt: string | null): string | null {
  if (!nextRunAt) return null;
  const diff = new Date(nextRunAt).getTime() - Date.now();
  if (diff <= 0) return 'any moment';
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function AgentStatusBar() {
  const { data, isLoading } = useAgentStatus();
  const toggle = useToggleAgent();
  const runNow = useRunAgentNow();

  const countdown = useMemo(
    () => (data ? formatCountdown(data.config.nextRunAt) : null),
    [data],
  );

  if (isLoading) {
    return (
      <div className="bg-background-card border border-border rounded-card p-4 flex items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!data) return null;

  const isActive = data.config.active;

  return (
    <div className="bg-background-card border border-border rounded-card p-4 flex items-center justify-between gap-4">
      {/* Left section: status indicators */}
      <div className="flex items-center gap-4 flex-wrap min-w-0">
        {/* Running / Paused indicator */}
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isActive ? (
              <motion.span
                key="active"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="relative flex h-2.5 w-2.5"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </motion.span>
            ) : (
              <motion.span
                key="paused"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="inline-flex h-2.5 w-2.5 rounded-full bg-foreground-muted"
              />
            )}
          </AnimatePresence>
          <span className="text-sm font-medium text-foreground">
            {isActive ? 'Running' : 'Paused'}
          </span>
        </div>

        {/* Next run countdown */}
        {isActive && countdown && (
          <div className="flex items-center gap-1.5 text-sm text-foreground-muted">
            <Clock size={14} />
            <span>Next run in {countdown}</span>
          </div>
        )}

        {/* Trades today badge */}
        <div className="flex items-center gap-1.5">
          <BarChart3 size={14} className="text-foreground-muted" />
          <span className="text-xs font-medium bg-background-secondary text-foreground-muted border border-border rounded-pill px-2.5 py-0.5">
            {data.tradesToday} trade{data.tradesToday !== 1 ? 's' : ''} today
          </span>
        </div>
      </div>

      {/* Right section: action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {isActive && (
          <button
            type="button"
            disabled={runNow.isPending}
            onClick={() => runNow.mutate()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-pill transition-colors bg-accent text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runNow.isPending ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Zap size={14} />
                Run Now
              </>
            )}
          </button>
        )}
        <button
          type="button"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate()}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-pill transition-colors ${
            isActive
              ? 'bg-background-secondary text-foreground border border-border hover:bg-background-card'
              : 'bg-accent text-white hover:brightness-110'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {toggle.isPending ? (
            <Spinner size="sm" />
          ) : isActive ? (
            <>
              <Pause size={14} />
              Pause
            </>
          ) : (
            <>
              <Play size={14} />
              Resume
            </>
          )}
        </button>
      </div>
    </div>
  );
}
