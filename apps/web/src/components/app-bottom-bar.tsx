'use client';

import Link from 'next/link';
import { useCeloPrice } from '@/hooks/use-celo-price';

function formatUsd(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value > 0) return `$${value.toFixed(4)}`;
  return '$0.00';
}

export function AppBottomBar() {
  const { data, isLoading } = useCeloPrice();

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-muted/30 px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">
          CELO {isLoading ? '...' : formatUsd(data?.priceUsd ?? 0)}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/terms"
          className="transition-colors hover:text-foreground"
        >
          Terms
        </Link>
        <Link
          href="/privacy"
          className="transition-colors hover:text-foreground"
        >
          Privacy
        </Link>
      </div>
    </footer>
  );
}
