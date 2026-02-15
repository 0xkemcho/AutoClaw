'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionSafe } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SignalCard } from '@/components/signal-card';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  TimelineNode,
  EVENT_NODE_CONFIG,
  GROUP_NODE_CONFIG,
} from '@/app/(app)/timeline/_components/timeline-entry';

interface ActivityEntry {
  id: string;
  eventType: string;
  summary: string;
  detail: Record<string, unknown>;
  createdAt: string;
  currency: string | null;
  amountUsd: number | null;
  direction: string | null;
  runId?: string | null;
}

interface ActivityPreviewProps {
  entries: ActivityEntry[];
  isLoading: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  trade: 'Trade',
  analysis: 'Analysis',
  guardrail: 'Guardrail',
  funding: 'Funding',
  system: 'System',
};

/* ------------------------------------------------------------------ */
/*  Grouping logic                                                     */
/* ------------------------------------------------------------------ */

interface RunGroup {
  runId: string;
  entries: ActivityEntry[];
  createdAt: string;
  summary: string;
}

function groupByRun(entries: ActivityEntry[]): Array<RunGroup | ActivityEntry> {
  const groups = new Map<string, ActivityEntry[]>();
  const result: Array<RunGroup | ActivityEntry> = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.runId) {
      if (!groups.has(entry.runId)) {
        groups.set(entry.runId, []);
      }
      groups.get(entry.runId)!.push(entry);
    }
  }

  for (const entry of entries) {
    if (entry.runId && groups.has(entry.runId) && !seen.has(entry.runId)) {
      seen.add(entry.runId);
      const groupEntries = groups.get(entry.runId)!;
      if (groupEntries.length === 1) {
        result.push(groupEntries[0]);
      } else {
        const analysis = groupEntries.find((e) => e.eventType === 'analysis');
        const trades = groupEntries.filter((e) => e.eventType === 'trade');
        let summary = analysis?.summary ?? 'Agent run';
        if (trades.length > 0) {
          summary += ` — ${trades.length} trade${trades.length > 1 ? 's' : ''}`;
        }
        result.push({
          runId: entry.runId,
          entries: groupEntries,
          createdAt: groupEntries[0].createdAt,
          summary,
        });
      }
    } else if (!entry.runId) {
      result.push(entry);
    }
  }

  return result;
}

function isRunGroup(item: RunGroup | ActivityEntry): item is RunGroup {
  return 'entries' in item && Array.isArray(item.entries);
}

/* ------------------------------------------------------------------ */
/*  Compact entry row (borderless — spine provides visual grouping)    */
/* ------------------------------------------------------------------ */

function EntryRow({ entry }: { entry: ActivityEntry }) {
  const nodeConfig = EVENT_NODE_CONFIG[entry.eventType] ?? EVENT_NODE_CONFIG.system;
  const signals =
    entry.eventType === 'analysis' && Array.isArray(entry.detail?.signals)
      ? (entry.detail.signals as Array<{
          currency: string;
          direction: string;
          confidence: number;
        }>)
      : [];

  return (
    <div className="timeline-item">
      <div className="timeline-node-col">
        <TimelineNode config={nodeConfig} compact />
      </div>
      <div className="timeline-card-col">
        <div className="min-w-0 py-0.5">
          <p className="text-sm leading-snug line-clamp-1">{entry.summary}</p>
          {signals.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {signals.slice(0, 3).map((s, i) => (
                <SignalCard
                  key={i}
                  currency={s.currency}
                  direction={s.direction}
                  confidence={s.confidence}
                  compact
                />
              ))}
              {signals.length > 3 && (
                <span className="inline-flex items-center text-[11px] text-muted-foreground">
                  +{signals.length - 3} more
                </span>
              )}
            </div>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(entry.createdAt)}
            </span>
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
              {EVENT_LABELS[entry.eventType] ?? entry.eventType}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact grouped run row                                            */
/* ------------------------------------------------------------------ */

function RunGroupRow({ group }: { group: RunGroup }) {
  const m = useMotionSafe();
  const [expanded, setExpanded] = useState(false);

  const analysisEntry = group.entries.find((e) => e.eventType === 'analysis');
  const signals =
    analysisEntry && Array.isArray(analysisEntry.detail?.signals)
      ? (analysisEntry.detail.signals as Array<{
          currency: string;
          direction: string;
          confidence: number;
        }>)
      : [];

  return (
    <div className="timeline-item">
      <div className="timeline-node-col">
        <TimelineNode config={GROUP_NODE_CONFIG} compact />
      </div>
      <div className="timeline-card-col">
        <div
          className="rounded-lg border border-primary/20 bg-primary/5 cursor-pointer transition-colors"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
        >
          <div className="flex items-start gap-2 p-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug line-clamp-1">{group.summary}</p>
              {signals.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {signals.slice(0, 3).map((s, i) => (
                    <SignalCard
                      key={i}
                      currency={s.currency}
                      direction={s.direction}
                      confidence={s.confidence}
                      compact
                    />
                  ))}
                  {signals.length > 3 && (
                    <span className="inline-flex items-center text-[11px] text-muted-foreground">
                      +{signals.length - 3} more
                    </span>
                  )}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(group.createdAt)}
                </span>
                <Badge className="text-[11px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30" variant="outline">
                  {group.entries.length} events
                </Badge>
              </div>
            </div>
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform shrink-0 mt-0.5',
                expanded && 'rotate-180',
              )}
            />
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: m.duration.fast }}
                className="overflow-hidden"
              >
                <div
                  className="px-2.5 pb-2.5 border-t border-primary/10 pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="timeline-spine timeline-spine--compact">
                    {group.entries.map((entry) => (
                      <EntryRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ActivityPreview                                                     */
/* ------------------------------------------------------------------ */

export function ActivityPreview({ entries, isLoading }: ActivityPreviewProps) {
  const grouped = useMemo(() => groupByRun(entries), [entries]);

  if (!isLoading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <p className="text-sm text-muted-foreground text-center">
            No activity yet. Your agent will log events here once it starts
            running.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardAction>
          <Link
            href="/fx-agent?tab=timeline"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View full timeline
            <ArrowRight className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-6 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="timeline-spine timeline-spine--compact">
            {grouped.map((item) =>
              isRunGroup(item) ? (
                <RunGroupRow key={item.runId} group={item} />
              ) : (
                <EntryRow key={item.id} entry={item} />
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
