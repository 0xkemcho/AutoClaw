'use client';

import { TOKEN_METADATA } from '@autoclaw/shared';
import { ChevronDown } from 'lucide-react';

interface SwapTokenInputProps {
  label: string;
  symbol: string | null;
  amount: string;
  onAmountChange?: (value: string) => void;
  onTokenClick: () => void;
  balance?: string;
  readOnly?: boolean;
  estimating?: boolean;
}

export function SwapTokenInput({
  label,
  symbol,
  amount,
  onAmountChange,
  onTokenClick,
  balance,
  readOnly = false,
  estimating = false,
}: SwapTokenInputProps) {
  const meta = symbol ? TOKEN_METADATA[symbol] : null;
  const isGold = symbol === 'XAUT';

  return (
    <div className="rounded-xl bg-background-secondary p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
          {label}
        </span>
        {balance !== undefined && symbol && (
          <button
            type="button"
            className="text-xs text-foreground-muted hover:text-foreground transition-colors"
            onClick={() => onAmountChange?.(balance)}
          >
            Balance: {balance}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Token selector */}
        <button
          type="button"
          onClick={onTokenClick}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-border transition-colors shrink-0"
        >
          {meta ? (
            <>
              <span className="text-lg">{meta.flag}</span>
              <span
                className={`text-sm font-semibold ${isGold ? 'text-gold' : 'text-foreground'}`}
              >
                {symbol}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-foreground-muted">
              Select
            </span>
          )}
          <ChevronDown size={14} className="text-foreground-muted" />
        </button>

        {/* Amount input */}
        {readOnly ? (
          <div className="flex-1 text-right">
            {estimating ? (
              <div className="flex items-center justify-end gap-2">
                <div className="w-4 h-4 border-2 border-foreground-muted border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-foreground-muted">
                  Estimating...
                </span>
              </div>
            ) : (
              <p
                className={`text-xl font-semibold ${amount ? 'text-foreground' : 'text-foreground-muted'}`}
              >
                {amount || '0.00'}
              </p>
            )}
          </div>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              // Allow digits, one decimal point, and empty string
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                onAmountChange?.(val);
              }
            }}
            className="flex-1 text-right text-xl font-semibold bg-transparent border-none outline-none placeholder:text-foreground-muted"
          />
        )}
      </div>
    </div>
  );
}
