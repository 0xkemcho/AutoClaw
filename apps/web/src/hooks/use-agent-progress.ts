'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken } from '@/lib/token-store';
import { agentKeys } from './use-agent';
import { timelineKeys } from './use-timeline';
import type { ProgressStep, ProgressData } from '@autoclaw/shared';

export type { ProgressStep };

const STEP_LABELS: Record<ProgressStep, string> = {
  fetching_news: 'Fetching news...',
  analyzing: 'Analyzing with AI...',
  checking_signals: 'Checking signals...',
  executing_trades: 'Executing trades...',
  scanning_vaults: 'Scanning vaults...',
  analyzing_yields: 'Analyzing yields...',
  checking_yield_guardrails: 'Checking guardrails...',
  executing_yields: 'Executing yields...',
  claiming_rewards: 'Claiming rewards...',
  complete: 'Done',
  error: 'Failed',
};

export interface StepEntry {
  step: ProgressStep;
  message: string;
  data?: ProgressData;
  timestamp: number;
}

export interface ProgressState {
  isRunning: boolean;
  currentStep: ProgressStep | null;
  stepLabel: string;
  stepMessage: string;
  steps: StepEntry[];
}

const IDLE_STATE: ProgressState = {
  isRunning: false,
  currentStep: null,
  stepLabel: '',
  stepMessage: '',
  steps: [],
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Safety timeout: if no progress event arrives for 2 minutes, assume the run
// finished (or the WS dropped it) and reset to idle.
const STALE_RUN_TIMEOUT_MS = 2 * 60 * 1000;

function getWsUrl(): string {
  const url = new URL(API_BASE);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/api/ws';
  return url.toString();
}

export function useAgentProgress(): ProgressState {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const staleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  const [state, setState] = useState<ProgressState>(IDLE_STATE);

  // Reset the stale-run safety timer every time we receive a progress event.
  // If the timer fires, it means we stopped getting events mid-run.
  const resetStaleTimer = useCallback(() => {
    clearTimeout(staleTimer.current);
    staleTimer.current = setTimeout(() => {
      setState((prev) => {
        if (!prev.isRunning) return prev;
        // Auto-recover: mark as error so the user sees feedback
        return {
          isRunning: false,
          currentStep: 'error',
          stepLabel: 'Failed',
          stepMessage: 'Connection lost — run may have completed in the background.',
          steps: [
            ...prev.steps,
            {
              step: 'error',
              message: 'Connection lost — run may have completed in the background.',
              timestamp: Date.now(),
            },
          ],
        };
      });
      // Refresh data in case the run did complete server-side
      queryClient.invalidateQueries({ queryKey: agentKeys.status() });
      queryClient.invalidateQueries({ queryKey: timelineKeys.all });
    }, STALE_RUN_TIMEOUT_MS);
  }, [queryClient]);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    // Don't create duplicate connections
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('[ws] received:', msg.type, msg.step ?? '', msg.message ?? '');

        if (msg.type === 'progress') {
          const step = msg.step as ProgressStep;
          const isTerminal = step === 'complete' || step === 'error';
          const entry: StepEntry = {
            step,
            message: msg.message ?? '',
            data: msg.data,
            timestamp: Date.now(),
          };

          setState((prev) => {
            // If we were idle and this is a non-terminal event, start a new run
            const steps = !prev.isRunning && !isTerminal
              ? [entry]
              : [...prev.steps, entry];

            return {
              isRunning: !isTerminal,
              currentStep: step,
              stepLabel: STEP_LABELS[step] ?? step,
              stepMessage: msg.message ?? '',
              steps,
            };
          });

          if (isTerminal) {
            clearTimeout(staleTimer.current);

            // Invalidate queries to refresh UI with latest data
            queryClient.invalidateQueries({ queryKey: agentKeys.status() });
            queryClient.invalidateQueries({ queryKey: timelineKeys.all });

            // Clear steps after a delay so user sees the completion state
            setTimeout(() => {
              setState(prev => prev.currentStep === step
                ? IDLE_STATE
                : prev
              );
            }, 3000);
          } else {
            // Non-terminal step — reset the stale timer
            resetStaleTimer();
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      // Only clear the ref if it still points to this socket (avoids
      // clobbering a newer connection created during React Strict Mode
      // double-mount or rapid reconnect cycles).
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      // Don't reconnect or update state if the hook has unmounted
      if (!mountedRef.current) return;
      // If we were mid-run when the WS dropped, start the stale timer
      // so we don't stay stuck forever
      setState((prev) => {
        if (prev.isRunning) resetStaleTimer();
        return prev;
      });
      // Reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [queryClient, resetStaleTimer]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      clearTimeout(staleTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return state;
}
