'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Percent,
  PieChart,
  Vault,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  useYieldAgentStatus,
  useYieldPositions,
  useYieldOpportunities,
} from '@/hooks/use-yield-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { TokenLogo } from '@/components/token-logo';
import { formatUsd, formatTokenAmount } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { SendModal } from '@/app/(app)/dashboard/_components/send-modal';
import { ReceiveModal } from '@/app/(app)/dashboard/_components/receive-modal';
import { getProtocolLogo } from './utils';

const DUST_THRESHOLD = 0.000001;
const isLpToken = (symbol: string) =>
  /VAULT|LP|UNIV3/i.test(symbol);

export function YieldPortfolioGuardrailsCard() {
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolio('yield');
  const { data: agent, isLoading: isAgentLoading } = useYieldAgentStatus();
  const { data: positionsData } = useYieldPositions();
  const { data: opportunitiesData } = useYieldOpportunities();

  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const config = agent?.config;
  const strategy = config?.strategyParams;
  const holdings = portfolio?.holdings ?? [];
  const serverWalletAddress = config?.serverWalletAddress ?? '';

  // Wallet Balances: liquid tokens only (exclude LP), filter dust
  const walletBalances = useMemo(() => {
    return holdings
      .filter(
        (h) =>
          !isLpToken(h.tokenSymbol) &&
          h.balance >= DUST_THRESHOLD
      )
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [holdings]);

  // Vault Positions: from yield_positions + opportunities for human-readable names
  const vaultPositions = useMemo(() => {
    const positions = positionsData?.positions ?? [];
    const opportunities = opportunitiesData?.opportunities ?? [];
    const oppByVault = new Map(
      opportunities.map((o) => [(o.vaultAddress ?? o.id ?? '').toLowerCase(), o])
    );
    return positions.map((pos) => {
      const opp = oppByVault.get((pos.vaultAddress ?? '').toLowerCase());
      return {
        ...pos,
        vaultName: opp?.name ?? pos.depositToken,
        protocol: pos.protocol,
      };
    });
  }, [positionsData?.positions, opportunitiesData?.opportunities]);

  // Guardrails Data
  const minApr = strategy?.minAprThreshold ?? 5;
  const maxAlloc = strategy?.maxSingleVaultPct ?? 40;
  const maxVaults = strategy?.maxVaultCount ?? 5;

  const isLoading = isPortfolioLoading || isAgentLoading;

  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-xl" />;
  }

  return (
    <>
      <Card className="flex flex-col border-border/50 bg-card p-5 shadow-sm dark:bg-[#18181b]">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-base font-semibold text-foreground">Portfolio & Guardrails</h3>
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

        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-4">
            {/* Vault Positions */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Vault className="size-3.5 text-muted-foreground" />
                <Label className="text-xs font-medium text-muted-foreground">
                  Vault Positions
                </Label>
              </div>
              {vaultPositions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-1">
                  No active vault positions
                </p>
              ) : (
                <div className="space-y-2">
                  {vaultPositions.map((pos) => {
                    const logo = getProtocolLogo(pos.protocol);
                    const depositUsd = Number(pos.depositAmountUsd ?? 0);
                    const apr = pos.currentApr ?? null;
                    return (
                      <div
                        key={pos.id}
                        className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/20 px-2.5 py-1.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {logo ? (
                            <img
                              src={logo}
                              alt={pos.protocol}
                              className="size-7 shrink-0 rounded-full object-contain bg-muted/20 p-0.5"
                            />
                          ) : (
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                              {pos.protocol.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">
                              {pos.vaultName}
                            </p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {pos.protocol}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {depositUsd > 0 && (
                            <p className="text-xs font-mono font-medium text-foreground">
                              {formatUsd(depositUsd)}
                            </p>
                          )}
                          {apr != null && (
                            <p className="text-[10px] font-medium text-amber-500">
                              {Number(apr).toFixed(1)}% APR
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator className="bg-border/50" />

            {/* Wallet Balances */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="size-3.5 text-muted-foreground" />
                <Label className="text-xs font-medium text-muted-foreground">
                  Wallet Balances
                </Label>
              </div>
              {walletBalances.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-1">
                  No liquid balance in wallet
                </p>
              ) : (
                <div className="space-y-2">
                  {walletBalances.map((holding) => (
                    <div
                      key={holding.tokenAddress || holding.tokenSymbol}
                      className="flex items-center justify-between py-0.5 px-1"
                    >
                      <div className="flex items-center gap-2">
                        <TokenLogo symbol={holding.tokenSymbol} size={20} />
                        <span className="text-sm font-medium text-foreground">
                          {holding.tokenSymbol}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-medium text-foreground">
                          {formatTokenAmount(holding.balance)}
                        </div>
                        {Number.isFinite(holding.valueUsd) && holding.valueUsd > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            {formatUsd(holding.valueUsd)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="guardrails">
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 dark:bg-[#27272a]/20">
              <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Active Guardrails</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-500">
                      <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                      Active
                  </span>
              </div>

              <div className="space-y-4">
                  {/* Min APR */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-foreground">
                              <Percent className="size-3.5 text-primary" />
                              <span>Min APR Threshold</span>
                          </div>
                          <span className="text-muted-foreground">{minApr}%</span>
                      </div>
                      <Progress value={minApr * 2} className="h-1.5 bg-secondary" />
                  </div>

                  {/* Max Allocation */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-foreground">
                              <PieChart className="size-3.5 text-primary" />
                              <span>Max Single Vault Alloc</span>
                          </div>
                          <span className="text-muted-foreground">{maxAlloc}%</span>
                      </div>
                      <Progress value={maxAlloc} className="h-1.5 bg-secondary" />
                  </div>

                  {/* Max Vaults */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-foreground">
                              <Layers className="size-3.5 text-primary" />
                              <span>Max Vault Count</span>
                          </div>
                          <span className="text-muted-foreground">{maxVaults}</span>
                      </div>
                      <Progress value={(maxVaults / 10) * 100} className="h-1.5 bg-secondary" />
                  </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <SendModal
        open={sendOpen}
        onOpenChange={setSendOpen}
        holdings={holdings}
        agentType="yield"
      />
      <ReceiveModal
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        walletAddress={serverWalletAddress}
      />
    </>
  );
}
