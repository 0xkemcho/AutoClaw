'use client';

import { useState } from 'react';
import { Copy, Check, Wallet } from 'lucide-react';

interface WalletSectionProps {
  walletAddress: string | null;
}

const ACCEPTED_TOKENS = ['USDm', 'USDC', 'USDT'];

export function WalletSection({ walletAddress }: WalletSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: noop
    }
  };

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="space-y-4">
      {/* Wallet address */}
      <div className="flex items-center gap-3 p-4 rounded-card-lg bg-background-secondary border border-border">
        <Wallet size={18} className="text-foreground-muted shrink-0" />

        {walletAddress ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <code className="text-sm text-foreground font-mono truncate">
              {truncatedAddress}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-card transition-colors"
              title="Copy address"
            >
              {copied ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
            {copied && (
              <span className="text-xs text-green-400 shrink-0">Copied!</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-foreground-muted">
            No wallet assigned
          </span>
        )}
      </div>

      {/* Accepted tokens */}
      <div>
        <p className="text-xs text-foreground-muted mb-2">
          Accepted funding tokens
        </p>
        <div className="flex gap-2">
          {ACCEPTED_TOKENS.map((token) => (
            <span
              key={token}
              className="inline-flex items-center px-3 py-1.5 rounded-pill text-xs font-medium bg-background-secondary text-foreground-secondary border border-border"
            >
              {token}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
