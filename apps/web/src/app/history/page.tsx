'use client';

import { useMemo, useState } from 'react';
import { Loader2, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { HistoryFilters } from '@/components/history/history-filters';
import { ExportCsvButton } from '@/components/history/export-csv-button';
import { TimelineEntry as TimelineEntryComponent } from '@/components/dashboard/timeline-entry';
import {
  useAgentTimeline,
  type TimelineFilters as TFilters,
} from '@/hooks/use-agent';

function HistoryContent() {
  const [filters, setFilters] = useState<TFilters>({});
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAgentTimeline(filters);

  const allEntries = useMemo(
    () => data?.pages.flatMap((page) => page.entries) ?? [],
    [data],
  );

  const total = data?.pages[0]?.total ?? 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">History</h1>
            {total > 0 && (
              <p className="text-sm text-foreground-muted mt-1">
                {total} event{total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <ExportCsvButton entries={allEntries} />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <HistoryFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-card-lg p-4 bg-background-card border border-border flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allEntries.length === 0 && (
          <div className="rounded-card-lg p-6 bg-background-card border border-border flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={40} className="text-foreground-muted mb-3" />
            <p className="text-foreground-muted text-sm">
              No events found.{' '}
              {(filters.type || filters.currency) &&
                'Try adjusting your filters.'}
            </p>
          </div>
        )}

        {/* Timeline entries */}
        {allEntries.length > 0 && (
          <div className="space-y-3">
            {allEntries.map((entry) => (
              <TimelineEntryComponent
                key={entry.id}
                entry={entry}
                defaultExpanded
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasNextPage && (
          <div className="flex justify-center mt-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-2"
            >
              {isFetchingNextPage && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Load more
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
