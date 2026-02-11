'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Wallet,
  Shield,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TimelineEntry as TimelineEntryType } from '@/hooks/use-agent';
import { CitationChip } from './citation-chip';

// --- Event type configuration ---

type EventKey = 'trade-buy' | 'trade-sell' | 'analysis' | 'funding' | 'guardrail' | 'system';

function getEventKey(entry: TimelineEntryType): EventKey {
  if (entry.eventType === 'trade') {
    return entry.direction === 'sell' ? 'trade-sell' : 'trade-buy';
  }
  return entry.eventType;
}

const EVENT_CONFIG: Record<
  EventKey,
  { label: string; barColor: string; badgeBg: string; badgeText: string; icon: typeof ArrowUpRight }
> = {
  'trade-buy': {
    label: 'Buy',
    barColor: 'bg-success',
    badgeBg: 'bg-success/15',
    badgeText: 'text-success',
    icon: ArrowUpRight,
  },
  'trade-sell': {
    label: 'Sell',
    barColor: 'bg-error',
    badgeBg: 'bg-error/15',
    badgeText: 'text-error',
    icon: ArrowDownRight,
  },
  analysis: {
    label: 'Analysis',
    barColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-400',
    icon: Search,
  },
  funding: {
    label: 'Funding',
    barColor: 'bg-warning',
    badgeBg: 'bg-warning/15',
    badgeText: 'text-warning',
    icon: Wallet,
  },
  guardrail: {
    label: 'Guardrail',
    barColor: 'bg-orange-500',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-400',
    icon: Shield,
  },
  system: {
    label: 'System',
    barColor: 'bg-foreground-muted',
    badgeBg: 'bg-foreground-muted/15',
    badgeText: 'text-foreground-muted',
    icon: Settings,
  },
};

// --- Time formatting ---

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// --- Component ---

interface TimelineEntryProps {
  entry: TimelineEntryType;
  defaultExpanded?: boolean;
}

export function TimelineEntry({ entry, defaultExpanded = false }: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const eventKey = getEventKey(entry);
  const config = EVENT_CONFIG[eventKey];
  const Icon = config.icon;

  const hasDetail =
    Object.keys(entry.detail).length > 0 ||
    entry.citations.length > 0 ||
    entry.txHash;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex rounded-card-lg bg-background-card border border-border overflow-hidden"
    >
      {/* Left accent bar */}
      <div className={`w-1 shrink-0 ${config.barColor}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Main row - clickable */}
        <button
          type="button"
          onClick={() => hasDetail && setExpanded((prev) => !prev)}
          disabled={!hasDetail}
          className="w-full text-left p-4 flex items-start gap-3 disabled:cursor-default"
        >
          {/* Icon */}
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${config.badgeBg}`}
          >
            <Icon size={15} className={config.badgeText} />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Top row: badge + time */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-semibold rounded-pill px-2 py-0.5 ${config.badgeBg} ${config.badgeText}`}
              >
                {config.label}
              </span>
              <span className="text-xs text-foreground-muted">
                {formatTime(entry.createdAt)}
              </span>
            </div>

            {/* Summary */}
            <p className="text-sm text-foreground leading-relaxed">
              {entry.summary}
            </p>

            {/* Metadata row */}
            <div className="flex items-center gap-2 flex-wrap">
              {entry.confidencePct !== null && (
                <span className="text-xs text-foreground-muted">
                  {entry.confidencePct}% confidence
                </span>
              )}
              {entry.currency && (
                <span className="text-xs font-medium bg-background-secondary text-foreground-muted border border-border rounded-pill px-2 py-0.5">
                  {entry.currency}
                </span>
              )}
              {entry.amountUsd !== null && (
                <span className="text-xs font-medium text-foreground">
                  {formatUsd(entry.amountUsd)}
                </span>
              )}
            </div>
          </div>

          {/* Expand indicator */}
          {hasDetail && (
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 mt-1"
            >
              <ChevronDown size={16} className="text-foreground-muted" />
            </motion.span>
          )}
        </button>

        {/* Expandable detail section */}
        <AnimatePresence initial={false}>
          {expanded && hasDetail && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 ml-11 space-y-3">
                <div className="h-px bg-border" />

                {/* Detail / Reasoning */}
                {Object.keys(entry.detail).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Reasoning
                    </p>
                    <p className="text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">
                      {entry.detail.reasoning
                        ? String(entry.detail.reasoning)
                        : JSON.stringify(entry.detail, null, 2)}
                    </p>
                  </div>
                )}

                {/* Citations */}
                {entry.citations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entry.citations.map((citation, idx) => (
                        <CitationChip
                          key={`${citation.url}-${idx}`}
                          url={citation.url}
                          title={citation.title}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Transaction hash */}
                {entry.txHash && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Transaction
                    </p>
                    <a
                      href={`https://celoscan.io/tx/${entry.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent-text hover:underline break-all"
                    >
                      {entry.txHash}
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
