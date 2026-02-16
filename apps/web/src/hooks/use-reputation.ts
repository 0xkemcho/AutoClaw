import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface ReputationData {
  feedbackCount: number;
  summaryValue: number;
  summaryDecimals: number;
}

export function useAgentReputation(agent8004Id: number | null) {
  return useQuery<ReputationData>({
    queryKey: ['agent-reputation', agent8004Id],
    queryFn: () => api.get<ReputationData>('/api/agent/reputation'),
    enabled: !!agent8004Id,
    staleTime: 60_000, // 1 minute
  });
}

export function useYieldReputation(agent8004Id: number | null) {
  return useQuery<ReputationData>({
    queryKey: ['yield-agent-reputation', agent8004Id],
    queryFn: () => api.get<ReputationData>('/api/yield-agent/reputation'),
    enabled: !!agent8004Id,
    staleTime: 60_000, // 1 minute
  });
}
