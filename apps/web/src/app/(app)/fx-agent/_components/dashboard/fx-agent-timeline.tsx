'use client';

import { useState } from 'react';
import { useTimeline } from '@/hooks/use-timeline';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRightLeft,
  Brain,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  FileDown,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { exportTimelineToCsv } from '@/lib/csv-export';

export function FxAgentTimeline() {
  const { data: timelineData, isLoading } = useTimeline({ limit: 100 });
  const events = timelineData?.entries ?? [];
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const handleDownloadCsv = () => {
    exportTimelineToCsv(
      events as unknown as Record<string, unknown>[],
      `fx-agent-timeline-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <>
      <div className="flex bg-white dark:bg-[#18181b] rounded-lg border border-gray-200 dark:border-[#27272a] shadow-sm flex-col w-full overflow-hidden h-full">
        {/* Toolbar */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-[#27272a] flex flex-col md:flex-row justify-between items-center gap-2 bg-gray-50/50 dark:bg-[#18181b] shrink-0">
          <div className="flex items-center gap-2 w-full md:w-auto">
             {/* Search */}
             <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#131418] border border-gray-200 dark:border-[#27272a] rounded-md text-sm focus:ring-1 focus:ring-primary focus:border-primary text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-600 h-9 focus:outline-none"
                  placeholder="Search..."
                  type="text"
                />
             </div>
             {/* Filters */}
             <button type="button" className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#131418] border border-gray-200 dark:border-[#27272a] rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1e2025] transition-colors h-9">
                <Filter className="text-gray-400 size-4" />
                <span>Filter</span>
             </button>
             <button type="button" className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#131418] border border-gray-200 dark:border-[#27272a] rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1e2025] transition-colors h-9">
                <Calendar className="text-gray-400 size-4" />
                <span>24h</span>
             </button>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline-block">{events.length} events</span>
             <button
               type="button"
               onClick={handleDownloadCsv}
               disabled={events.length === 0}
               className="text-emerald-500 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1.5"
             >
                <FileDown className="size-4" />
                <span className="hidden sm:inline">CSV</span>
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-[#18181b] shadow-sm ring-1 ring-gray-200 dark:ring-[#27272a] ring-opacity-5">
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-[#27272a]">
                  <th className="pl-4 pr-4 py-3 font-medium w-48">Timestamp</th>
                  <th className="px-4 py-3 font-medium w-56">Action</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium w-40 text-right">Impact</th>
                  <th className="px-4 py-3 font-medium w-32 text-center">Status</th>
                  <th className="pr-4 pl-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#27272a] text-sm">
                 {isLoading ? (
                   Array.from({length: 5}).map((_, i) => (
                     <tr key={i} className="h-12">
                       <td className="pl-4 pr-4"><Skeleton className="h-4 w-32" /></td>
                       <td className="px-4"><Skeleton className="h-4 w-40" /></td>
                       <td className="px-4"><Skeleton className="h-4 w-full" /></td>
                       <td className="px-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                       <td className="px-4"><Skeleton className="h-4 w-20 mx-auto" /></td>
                       <td className="pr-4"><Skeleton className="h-4 w-4" /></td>
                     </tr>
                   ))
                 ) : events.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground text-base">No timeline events found.</td>
                   </tr>
                 ) : (
                   events.map((event, index) => {
                      const prevEvent = events[index - 1];
                      const isNewSession = event.runId && (!prevEvent || event.runId !== prevEvent.runId);

                      return (
                        <div key={event.id} style={{ display: 'contents' }}>
                          {isNewSession && (
                            <tr className="bg-primary/5 dark:bg-primary/10">
                              <td colSpan={6} className="px-4 py-2 border-y border-primary/20">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                  <span className="text-xs font-mono font-medium text-primary uppercase tracking-wider">
                                    Session {event.runId?.slice(0, 8)}...
                                  </span>
                                  <div className="h-px bg-primary/20 flex-1 ml-2" />
                                </div>
                              </td>
                            </tr>
                          )}
                          <TimelineRow
                            event={event}
                            onViewLogs={() => setSelectedEvent(event)}
                          />
                        </div>
                      );
                   })
                 )}
              </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#27272a]">
          <DialogHeader>
            <DialogTitle>Event Logs</DialogTitle>
            <DialogDescription>
              Detailed logs for event {selectedEvent?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#131418] p-4 rounded-md font-mono text-xs border border-gray-200 dark:border-[#27272a]">
            <pre className="text-gray-800 dark:text-gray-300">
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TimelineRow({ event, onViewLogs }: { event: any, onViewLogs: () => void }) {
  const date = new Date(event.createdAt);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });

  // Default styles
  let icon = <RefreshCw className="size-4" />;
  let iconBg = "bg-gray-500/10 border-gray-500/20 text-gray-500";
  let title = "System Event";
  let impact: React.ReactNode = <span className="text-gray-500 font-mono text-sm">-</span>;
  let statusBadge = (
    <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-gray-700/30 text-gray-400 border border-gray-700/50 leading-none">
       Logged
    </span>
  );

  // Map event types to styles
  if (event.eventType === 'trade') {
    icon = <ArrowRightLeft className="size-4" />;
    iconBg = "bg-green-500/10 border-green-500/20 text-green-500";
    title = event.direction === 'buy' ? "Buy Executed" : "Sell Executed";

    const amount = event.amount_usd ? `$${event.amount_usd.toFixed(2)}` : null;
    if (amount) {
       impact = <span className="font-mono font-medium text-emerald-500 text-sm">+{amount}</span>;
    }

    statusBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20 leading-none">
            Success
        </span>
    );
  } else if (event.eventType === 'analysis') {
    icon = <Brain className="size-4" />;
    iconBg = "bg-blue-500/10 border-blue-500/20 text-blue-500";
    title = "AI Analysis";

    const confidence = event.confidence_pct ?? 0;
    impact = (
        <div className="flex items-center justify-end gap-2">
            <div className="w-16 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${confidence}%` }}></div>
            </div>
            <span className="font-mono font-medium text-blue-400 text-sm">{confidence}%</span>
        </div>
    );

    statusBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 leading-none">
            Done
        </span>
    );
  } else if (event.eventType === 'guardrail') {
    icon = <AlertTriangle className="size-4" />;
    iconBg = "bg-red-500/10 border-red-500/20 text-red-500";
    title = "Guardrail Alert";

    impact = <span className="text-red-400 font-mono font-medium text-sm">High</span>;

    statusBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 leading-none">
            Fixed
        </span>
    );
  }

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group h-12 border-b border-gray-100 dark:border-gray-800 last:border-0">
       {/* Timestamp */}
       <td className="pl-4 pr-4 py-3 whitespace-nowrap">
          <span className="font-mono text-gray-500 dark:text-gray-400 text-sm">{timeAgo}</span>
       </td>

       {/* Action */}
       <td className="px-4 py-3">
          <div className="flex items-center gap-3">
             <div className={cn("w-6 h-6 rounded flex items-center justify-center border shrink-0", iconBg)}>
                {icon}
             </div>
             <span className="font-medium text-gray-900 dark:text-white text-sm">{title}</span>
          </div>
       </td>

       {/* Details */}
       <td className="px-4 py-3">
           <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-300 truncate max-w-md text-sm">
                 {event.summary ?? event.title}
              </span>
              {event.eventType === 'trade' && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-600 bg-gray-100 dark:bg-[#27272a] px-1.5 rounded border border-gray-200 dark:border-gray-700">Mento</span>
              )}
           </div>
       </td>

       {/* Impact */}
       <td className="px-4 py-3 text-right">
           {impact}
       </td>

       {/* Status */}
       <td className="px-4 py-3 text-center">
           {statusBadge}
       </td>

       {/* Actions */}
       <td className="pr-4 pl-4 py-3 text-center">
          <button
            type="button"
            onClick={onViewLogs}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="View Logs"
          >
             <Code className="size-4" />
          </button>
       </td>
    </tr>
  );
}
