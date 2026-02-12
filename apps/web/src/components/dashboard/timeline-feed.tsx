'use client';

import { Inbox, Loader2 } from 'lucide-react';
import { useAgentTimeline } from '@/hooks/use-agent';
import { Skeleton } from '@/components/ui/skeleton';
import { TimelineEntry } from './timeline-entry';

interface TimelineFeedProps {
  filters?: { type?: string; currency?: string };
}

export function TimelineFeed({ filters }: TimelineFeedProps) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useAgentTimeline(filters);

  const entries = data?.pages.flatMap((p) => p.entries) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-card-lg p-4 bg-background-card border border-border flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background-secondary border border-border">
          <Inbox size={22} className="text-foreground-muted" />
        </div>
        <p className="text-sm text-foreground-muted">No activity yet.</p>
        <p className="text-xs text-foreground-muted">
          Events will appear here once the agent starts running.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <TimelineEntry key={entry.id} entry={entry} />
      ))}

      {hasNextPage && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-foreground-muted bg-background-secondary border border-border rounded-pill hover:bg-background-card hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
