'use client';

import { useRef, useEffect, useState } from 'react';
import { Terminal, Maximize2, MoreHorizontal, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTimeline } from '@/hooks/use-timeline';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ProgressState } from '@/hooks/use-agent-progress';

const LOADING_MESSAGES = [
  "Initializing neural network...",
  "Calibrating market sensors...",
  "Establishing secure uplink...",
  "Syncing with Celo mainnet...",
  "Analyzing liquidity pools...",
  "Decrypting market signals..."
];

export function LiveExecutionFeed({ progress }: { progress: ProgressState }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // We use the real-time steps from progress, NOT the historical timeline
  // This ensures it feels "Live" and matches the websocket feed
  const feedEvents = progress.steps;
  const hasData = feedEvents.length > 0;

  // Random message rotation
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  useEffect(() => {
    if (hasData) return;
    const interval = setInterval(() => {
      setLoadingMsg(prev => {
        const idx = LOADING_MESSAGES.indexOf(prev);
        return LOADING_MESSAGES[(idx + 1) % LOADING_MESSAGES.length];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [hasData]);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feedEvents.length, hasData]);

  return (
    <Card className="flex w-full flex-col overflow-hidden border-border/50 bg-card shadow-sm dark:bg-[#18181b] py-0 gap-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-4 dark:bg-[#18181b]">
        <div className="flex items-center gap-3">
          <Terminal className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Live Execution Feed</h3>
        </div>
        <div className="flex gap-2">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded hover:bg-muted hover:text-destructive"
            onClick={() => progress.clear()}
            title="Close Feed"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Terminal View */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto bg-black p-6 font-mono text-sm"
      >
        <div className="space-y-1">
          {!hasData ? (
             <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary" />
                <div className="font-mono text-sm animate-pulse">{loadingMsg}</div>
             </div>
          ) : (
            feedEvents.map((step, i) => (
              <LogEntry key={`${step.timestamp}-${i}`} step={step} />
            ))
          )}

          {/* Typing cursor effect */}
          {hasData && (
             <div className="flex gap-2 p-1 text-gray-500 opacity-50 mt-2">
                 <span className="shrink-0">_</span>
             </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function LogEntry({ step }: { step: any }) {
  const time = format(new Date(step.timestamp), 'HH:mm:ss');

  let typeLabel = <span className="text-blue-400">➜ Process:</span>;
  const content = <span className="text-gray-300">{step.message}</span>;

  // Simple mapping based on step name or message content
  if (step.step === 'complete') {
     typeLabel = <span className="text-green-400">✔ Success:</span>;
  } else if (step.step === 'error') {
     typeLabel = <span className="text-red-500">✖ Error:</span>;
  } else if (step.step === 'analyzing') {
     typeLabel = <span className="text-purple-400">⚛ AI Analyzing:</span>;
  }

  return (
    <div className="group flex gap-3 rounded p-1 transition-colors hover:bg-white/5">
      <span className="shrink-0 text-gray-500">[{time}]</span>
      {typeLabel}
      <span>{content}</span>
    </div>
  );
}
