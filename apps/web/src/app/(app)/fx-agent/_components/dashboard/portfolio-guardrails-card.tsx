'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Added
import { Progress } from '@/components/ui/progress';
import { useAgentStatus } from '@/hooks/use-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { TokenLogo } from '@/components/token-logo';
import { formatUsd, formatTokenAmount } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { SendModal } from '@/app/(app)/dashboard/_components/send-modal'; // Added
import { ReceiveModal } from '@/app/(app)/dashboard/_components/receive-modal'; // Added

export function PortfolioGuardrailsCard() {
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolio('fx');
  const { data: agent, isLoading: isAgentLoading } = useAgentStatus();

  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const config = agent?.config;
  const holdings = portfolio?.holdings ?? [];
  const totalValue = portfolio?.totalValueUsd ?? 0;
  const serverWalletAddress = config?.serverWalletAddress ?? '';

  // Sort holdings by value
  const sortedHoldings = [...holdings].sort((a, b) => b.valueUsd - a.valueUsd);

  // Guardrails Data
  const dailyLimit = config?.dailyTradeLimit ?? 5000;
  const dailyUsage = 0; // Mocked until backend provides real usage volume
  const dailyUsagePct = (dailyUsage / dailyLimit) * 100;

  const maxTradeSize = config?.maxTradeSizeUsd ?? 2000;

  const stopLoss = config?.stopLossPct ?? 5; // Default 5% if missing

  const isLoading = isPortfolioLoading || isAgentLoading;

  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-xl" />;
  }

  return (
    <>
      <Card className="flex flex-col border-border/50 bg-card p-6 shadow-sm dark:bg-[#18181b]">
        <div className="mb-6 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-foreground">Portfolio & Guardrails</h3>
           <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setSendOpen(true)}
            >
                <ArrowUpRight className="size-3.5" />
                Send
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setReceiveOpen(true)}
            >
                <ArrowDownLeft className="size-3.5" />
                Receive
            </Button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-5 dark:bg-[#27272a]/20">
          <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Portfolio Summary</span>
          </div>

          <div className="space-y-4">
              {sortedHoldings.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2 italic">No holdings found</div>
              ) : (
                  sortedHoldings.map((holding) => (
                      <div key={holding.tokenSymbol} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <TokenLogo symbol={holding.tokenSymbol} size={24} />
                              <span className="font-medium text-foreground">{holding.tokenSymbol}</span>
                          </div>
                          <div className="text-right">
                              <div className="font-mono font-medium text-foreground">{formatTokenAmount(holding.balance)}</div>
                              {Number.isFinite(holding.valueUsd) && holding.valueUsd > 0 && (
                                <div className="text-xs text-muted-foreground">{formatUsd(holding.valueUsd)}</div>
                              )}
                          </div>
                      </div>
                  ))
              )}
          </div>

          {Number.isFinite(totalValue) && totalValue > 0 && (
            <div className="mt-5 border-t border-border/50 pt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Value Estimate</span>
                <span className="font-mono text-xl font-bold text-foreground">{formatUsd(totalValue)}</span>
            </div>
          )}
        </div>

        {/* Active Guardrails */}
        <div className="flex flex-1 flex-col rounded-xl border border-border/50 bg-secondary/30 p-5 dark:bg-[#27272a]/20">
          <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Active Guardrails</span>
              <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-500">
                  <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active
              </span>
          </div>

          <div className="space-y-6">
              {/* Daily Limit */}
              <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-foreground">
                          <ShieldCheck className="size-3.5 text-primary" />
                          <span>Daily Limit</span>
                      </div>
                      <span className="text-muted-foreground">{dailyUsagePct.toFixed(0)}% Used ({dailyUsage}/{dailyLimit} USDC)</span>
                  </div>
                  <Progress value={dailyUsagePct} className="h-1.5 bg-secondary" />
              </div>

              {/* Max Trade Size */}
              <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-foreground">
                          <ShieldCheck className="size-3.5 text-primary" />
                          <span>Max Trade Size</span>
                      </div>
                      <span className="text-muted-foreground">{formatUsd(maxTradeSize)}</span>
                  </div>
                  <Progress value={10} className="h-1.5 bg-secondary text-primary" />
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-foreground">
                          <ShieldAlert className="size-3.5 text-red-500" />
                          <span>Stop Loss</span>
                      </div>
                      <span className="text-muted-foreground">-{stopLoss}%</span>
                  </div>
                  <Progress value={stopLoss * 5} className="h-1.5 bg-secondary [&>div]:bg-red-500" />
              </div>
          </div>
        </div>
      </Card>

      <SendModal
        open={sendOpen}
        onOpenChange={setSendOpen}
        holdings={holdings}
        agentType="fx"
      />
      <ReceiveModal
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        walletAddress={serverWalletAddress}
      />
    </>
  );
}
