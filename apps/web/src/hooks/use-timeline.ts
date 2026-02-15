import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import type { TimelineEventType, TradeDirection, Citation } from '@autoclaw/shared';

interface TimelineEntry {
  id: string;
  eventType: TimelineEventType;
  summary: string;
  detail: Record<string, unknown>;
  citations: Citation[];
  confidencePct: number | null;
  currency: string | null;
  amountUsd: number | null;
  direction: TradeDirection | null;
  txHash: string | null;
  runId: string | null;
  createdAt: string;
}

interface TimelineResponse {
  entries: TimelineEntry[];
  total: number;
  hasMore: boolean;
}

export interface TimelineFilters {
  type?: TimelineEventType;
  limit?: number;
  offset?: number;
}

export const timelineKeys = {
  all: ['timeline'] as const,
  list: (filters?: TimelineFilters) => [...timelineKeys.all, 'list', filters] as const,
  entry: (id: string) => [...timelineKeys.all, 'entry', id] as const,
};

export function useTimeline(filters?: TimelineFilters) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: timelineKeys.list(filters),
    queryFn: () =>
      api.get<TimelineResponse>('/api/agent/timeline', {
        params: {
          type: filters?.type,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      }),
    enabled: isAuthenticated,
  });
}

export function useTimelineEntry(id: string) {
  return useQuery({
    queryKey: timelineKeys.entry(id),
    queryFn: () => api.get<TimelineEntry>(`/api/agent/timeline/${id}`),
    enabled: !!id,
  });
}
