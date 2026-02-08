'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkline } from '@/components/ui/sparkline';
import type { TokenInfo } from '@autoclaw/shared';

interface TokenRowCardProps {
  token: TokenInfo;
  index: number;
}

function formatPrice(price: number): string {
  if (price >= 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

export function TokenRowCard({ token, index }: TokenRowCardProps) {
  const isPositive = token.change24hPct >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <Link
        href={`/token/${token.symbol}`}
        className="flex items-center justify-between px-4 py-3 rounded-card hover:bg-background-secondary transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl leading-none shrink-0">
            {token.flag || '💰'}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {token.symbol}
            </p>
            <p className="text-xs text-foreground-muted truncate">
              {token.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <Sparkline data={token.sparkline7d} width={64} height={28} />

          <div className="text-right min-w-[80px]">
            <p className="text-sm font-semibold text-foreground tabular-nums">
              ${formatPrice(token.priceUsd)}
            </p>
            <p
              className={`text-xs font-medium tabular-nums ${
                isPositive ? 'text-success' : 'text-error'
              }`}
            >
              {isPositive ? '▲' : '▼'} {Math.abs(token.change24hPct).toFixed(2)}%
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
