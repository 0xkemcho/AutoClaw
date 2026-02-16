'use client';

import { useMemo, useState } from 'react';
import {
  History,
  CheckCircle2,
  Radio,
  RefreshCcw,
  AlertTriangle,
  ArrowDownToLine
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useYieldTimeline } from '@/hooks/use-yield-agent';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

import { useRouter, useSearchParams } from 'next/navigation';

export function YieldRecentActivityTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: timelineData, isLoading } = useYieldTimeline({ limit: 5 });
  const [filter, setFilter] = useState<'all' | 'deposits' | 'analysis'>('all');

  const events = timelineData?.entries ?? [];

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'deposits') return events.filter(e => e.eventType === 'deposit' || e.eventType === 'trade');
    if (filter === 'analysis') return events.filter(e => e.eventType === 'analysis');
    return events;
  }, [events, filter]);

  return (
    <Card className="flex w-full flex-col overflow-hidden border-border/50 bg-card shadow-sm dark:bg-[#18181b] py-0 gap-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-4 dark:bg-[#18181b]">
        <div className="flex items-center gap-2">
          <History className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-md border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn("px-3 py-1 transition-colors hover:bg-muted", filter === 'all' ? "bg-muted font-medium text-foreground" : "bg-card text-muted-foreground")}
            >
              All
            </button>
            <div className="w-px bg-border/50" />
            <button
              type="button"
              onClick={() => setFilter('deposits')}
              className={cn("px-3 py-1 transition-colors hover:bg-muted", filter === 'deposits' ? "bg-muted font-medium text-foreground" : "bg-card text-muted-foreground")}
            >
              Deposits
            </button>
            <div className="w-px bg-border/50" />
            <button
              type="button"
              onClick={() => setFilter('analysis')}
              className={cn("px-3 py-1 transition-colors hover:bg-muted", filter === 'analysis' ? "bg-muted font-medium text-foreground" : "bg-card text-muted-foreground")}
            >
              Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Event Type</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Tags/Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                 <tr key={i}>
                   <td className="px-4 py-3"><Skeleton className="h-4 w-12"/></td>
                   <td className="px-4 py-3"><Skeleton className="h-8 w-8 rounded"/></td>
                   <td className="px-4 py-3"><Skeleton className="h-4 w-full"/></td>
                   <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-16"/></td>
                 </tr>
               ))
            ) : filteredEvents.length === 0 ? (
                <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">No recent activity.</td>
                </tr>
            ) : (
                filteredEvents.map((event) => (
                    <ActivityRow key={event.id} event={event} />
                ))
            )}
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div className="border-t border-border/50 bg-muted/30 p-2">
        <Button
          variant="ghost"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', 'timeline');
            router.replace(`?${params.toString()}`);
          }}
        >
          View Full Timeline
        </Button>
      </div>
    </Card>
  );
}

function ActivityRow({ event }: { event: any }) {
  const date = new Date(event.createdAt);

  let icon = <CheckCircle2 className="size-4 text-primary" />;
  let bgClass = "bg-primary/10 border-primary/20";
  let title = "System Event";
  let tagColor = "bg-gray-500/10 text-gray-500 border-gray-500/10";
  let tagText = "Info";

  if (event.eventType === 'analysis') {
    icon = <Radio className="size-4 text-blue-500" />;
    bgClass = "bg-blue-500/10 border-blue-500/20";
    title = "Signal Detected";
    tagColor = "bg-blue-500/10 text-blue-400 border-blue-500/10";
    tagText = "Analysis";
  } else if (event.eventType === 'trade') {
    icon = <RefreshCcw className="size-4 text-green-500" />;
    bgClass = "bg-green-500/10 border-green-500/20";
    title = "Trade Executed";
    tagColor = "bg-green-500/10 text-green-500 border-green-500/10";
    tagText = "Success";
  } else if (event.eventType === 'deposit') {
    icon = <ArrowDownToLine className="size-4 text-emerald-500" />;
    bgClass = "bg-emerald-500/10 border-emerald-500/20";
    title = "Deposit Executed";
    tagColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/10";
    tagText = "Deposit";
  } else if (event.eventType === 'guardrail') {
    icon = <AlertTriangle className="size-4 text-yellow-500" />;
    bgClass = "bg-yellow-500/10 border-yellow-500/20";
    title = "Guardrail Alert";
    tagColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/10";
    tagText = "Warning";
  }

  return (
    <tr className="group transition-colors hover:bg-muted/30">
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <div className="flex flex-col">
          <span className="font-mono text-xs font-medium text-foreground/80">{format(date, 'hh:mm a')}</span>
          <span className="text-[10px] text-muted-foreground">{format(date, 'MMM dd')}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", bgClass)}>
            {icon}
          </div>
          <div>
            <div className="text-xs font-medium text-foreground">{title}</div>
            <div className="text-[10px] text-muted-foreground capitalize">{event.eventType}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs leading-relaxed text-muted-foreground align-middle">
        <span className="line-clamp-2">{event.summary ?? event.title}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle text-right">
        <div className="flex flex-col items-end gap-1">
          <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium", tagColor)}>
            {tagText}
          </span>
        </div>
      </td>
    </tr>
  );
}
