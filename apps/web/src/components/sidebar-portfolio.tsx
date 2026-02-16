'use client';

import * as React from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useYieldPositions } from '@/hooks/use-yield-agent';
import { formatUsd } from '@/lib/format';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';

const isLpToken = (symbol: string) => /VAULT|LP|UNIV3/i.test(symbol);

export function SidebarPortfolio() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: fxData, isLoading: fxLoading } = usePortfolio('fx');
  const { data: yieldData, isLoading: yieldLoading } = usePortfolio('yield');
  const { data: yieldPositionsData } = useYieldPositions();

  // Total Balance = FX token value + Yield wallet balance + Yield vault positions
  const fxTotal = fxData?.totalValueUsd ?? 0;
  const yieldLiquidTotal = (yieldData?.holdings ?? [])
    .filter((h) => !isLpToken(h.tokenSymbol))
    .reduce((s, h) => s + (h.valueUsd || 0), 0);
  const yieldVaultTotal = (yieldPositionsData?.positions ?? []).reduce(
    (s, p) => s + Number(p.depositAmountUsd ?? 0),
    0,
  );
  const totalValue = fxTotal + yieldLiquidTotal + yieldVaultTotal;
  const isLoading = fxLoading || yieldLoading;

  // Filter out very small balances to keep the list clean
  const fxHoldings = (fxData?.holdings || []).filter((h) => h.valueUsd > 0.01);
  const yieldHoldings = (yieldData?.holdings || []).filter((h) => h.valueUsd > 0.01);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
      <div className="group/collapsible">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg bg-sidebar-accent/50 p-3 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Wallet className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold">Total Balance</span>
              <span className="text-xs text-muted-foreground">
                {isLoading ? 'Loading...' : formatUsd(totalValue)}
              </span>
            </div>
          </div>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-auto"
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2 px-1">
                {/* FX Agent */}
                <div className="rounded-md border bg-sidebar-accent/20 p-3 min-h-[4.5rem] text-xs">
                  <div className="flex items-center justify-between font-medium mb-2">
                    <span className="text-muted-foreground">FX Agent</span>
                    <span>{formatUsd(fxData?.totalValueUsd || 0)}</span>
                  </div>
                  {fxHoldings.length > 0 ? (
                    <div className="space-y-1">
                      {fxHoldings.map((h) => (
                        <div
                          key={h.tokenSymbol}
                          className="flex justify-between text-muted-foreground"
                        >
                          <span>{h.tokenSymbol}</span>
                          <span>{formatUsd(h.valueUsd)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No positions</p>
                  )}
                </div>

                {/* Yield Agent */}
                <div className="rounded-md border bg-sidebar-accent/20 p-3 min-h-[4.5rem] text-xs">
                  <div className="flex items-center justify-between font-medium mb-2">
                    <span className="text-muted-foreground">Yield Agent</span>
                    <span>{formatUsd(yieldLiquidTotal + yieldVaultTotal)}</span>
                  </div>
                  {yieldHoldings.length > 0 ? (
                    <div className="space-y-1">
                      {yieldHoldings.map((h) => (
                        <div
                          key={h.tokenSymbol}
                          className="flex justify-between text-muted-foreground"
                        >
                          <span>{h.tokenSymbol}</span>
                          <span>{formatUsd(h.valueUsd)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No positions</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SidebarGroup>
  );
}
