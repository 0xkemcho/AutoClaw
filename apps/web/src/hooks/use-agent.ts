import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

interface AgentConfigResponse {
  id: string;
  active: boolean;
  frequency: number;
  maxTradeSizeUsd: number;
  maxAllocationPct: number;
  stopLossPct: number;
  dailyTradeLimit: number;
  allowedCurrencies: string[];
  blockedCurrencies: string[];
  customPrompt: string | null;
  serverWalletAddress: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  agent8004Id: number | null;
}

interface AgentStatusResponse {
  config: AgentConfigResponse;
  tradesToday: number;
  positionCount: number;
}

export const agentKeys = {
  all: ['agent'] as const,
  status: () => [...agentKeys.all, 'status'] as const,
};

export function useAgentStatus() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: agentKeys.status(),
    queryFn: () => api.get<AgentStatusResponse>('/api/agent/status'),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useToggleAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ active: boolean }>('/api/agent/toggle'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.status() });
    },
  });
}

export function useRunNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ triggered: boolean }>('/api/agent/run-now'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.status() });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: {
      frequency?: number;
      maxTradeSizeUsd?: number;
      maxAllocationPct?: number;
      stopLossPct?: number;
      dailyTradeLimit?: number;
      allowedCurrencies?: string[];
      blockedCurrencies?: string[];
      customPrompt?: string;
    }) => api.put<{ success: boolean }>('/api/agent/settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.status() });
    },
  });
}
