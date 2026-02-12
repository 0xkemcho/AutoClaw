'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { TOKEN_METADATA } from '@autoclaw/shared';
import { TokenSelectorModal } from '@/components/swap/token-selector-modal';

export function SidebarSwap() {
  const [fromToken, setFromToken] = useState('cUSD');
  const [toToken, setToToken] = useState('cEUR');
  const [fromAmount, setFromAmount] = useState('');
  const [selectorOpen, setSelectorOpen] = useState<'from' | 'to' | null>(null);

  const swapTokens = () => {
    const tmp = fromToken;
    setFromToken(toToken);
    setToToken(tmp);
  };

  const fromMeta = TOKEN_METADATA[fromToken];
  const toMeta = TOKEN_METADATA[toToken];

  return (
    <div className="rounded-card bg-background-secondary border border-border p-4">
      <p className="text-xs text-foreground-muted uppercase tracking-wider mb-3">Quick Swap</p>

      {/* From row */}
      <div className="flex items-center gap-2 bg-background rounded-xl p-3">
        <button
          type="button"
          onClick={() => setSelectorOpen('from')}
          className="flex items-center gap-1.5 shrink-0 text-sm font-medium text-foreground hover:text-accent-text transition-colors"
        >
          <span className="text-base">{fromMeta?.flag}</span>
          <span>{fromToken}</span>
          <span className="text-foreground-muted text-xs">▾</span>
        </button>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={fromAmount}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              setFromAmount(val);
            }
          }}
          className="flex-1 text-right text-sm font-medium bg-transparent border-none outline-none placeholder:text-foreground-muted text-foreground min-w-0"
        />
      </div>

      {/* Swap direction button */}
      <div className="flex justify-center -my-1.5 relative z-10">
        <button
          type="button"
          onClick={swapTokens}
          className="rounded-full bg-background-secondary border border-border p-1.5 hover:bg-background-card transition-colors"
        >
          <ArrowUpDown size={14} className="text-foreground-muted" />
        </button>
      </div>

      {/* To row */}
      <div className="flex items-center gap-2 bg-background rounded-xl p-3">
        <button
          type="button"
          onClick={() => setSelectorOpen('to')}
          className="flex items-center gap-1.5 shrink-0 text-sm font-medium text-foreground hover:text-accent-text transition-colors"
        >
          <span className="text-base">{toMeta?.flag}</span>
          <span>{toToken}</span>
          <span className="text-foreground-muted text-xs">▾</span>
        </button>
        <span className="flex-1 text-right text-sm text-foreground-muted">0.00</span>
      </div>

      {/* Swap button */}
      <button
        type="button"
        disabled
        className="w-full mt-3 py-2.5 rounded-pill bg-accent text-white text-sm font-semibold disabled:opacity-40 transition-colors"
      >
        Swap (Coming Soon)
      </button>

      {/* Token selector modal */}
      <TokenSelectorModal
        isOpen={selectorOpen !== null}
        onClose={() => setSelectorOpen(null)}
        onSelect={(symbol) => {
          if (selectorOpen === 'from') {
            setFromToken(symbol);
          } else {
            setToToken(symbol);
          }
          setSelectorOpen(null);
        }}
        tokenFilter={selectorOpen === 'from' ? 'base' : 'target'}
        selectedToken={selectorOpen === 'from' ? fromToken : toToken}
      />
    </div>
  );
}
