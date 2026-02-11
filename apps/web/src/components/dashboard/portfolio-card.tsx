'use client';

import { useState } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolio } from '@/hooks/use-agent';
import { CountUp } from '@/components/ui/count-up';
import { Spinner } from '@/components/ui/spinner';

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PortfolioCard() {
  const { data, isLoading } = usePortfolio();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-card-lg p-6 bg-background-card border border-border flex items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-card-lg bg-background-card border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full p-6 flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background-secondary border border-border shrink-0">
            <Wallet size={18} className="text-accent-text" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">
              Portfolio Value
            </p>
            <p className="text-xl font-bold text-foreground">
              <CountUp value={data.totalValueUsd} prefix="$" decimals={2} />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium bg-background-secondary text-foreground-muted border border-border rounded-pill px-2.5 py-0.5">
            {data.holdings.length} position{data.holdings.length !== 1 ? 's' : ''}
          </span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className="text-foreground-muted" />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="holdings"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-2">
              <div className="h-px bg-border" />
              {data.holdings.length === 0 ? (
                <p className="text-sm text-foreground-muted py-2">
                  No holdings yet.
                </p>
              ) : (
                data.holdings.map((holding) => (
                  <div
                    key={holding.tokenSymbol}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-foreground">
                        {holding.tokenSymbol}
                      </span>
                      <span className="text-xs text-foreground-muted">
                        {holding.balance.toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatUsd(holding.valueUsd)}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        @ {formatUsd(holding.priceUsd)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
