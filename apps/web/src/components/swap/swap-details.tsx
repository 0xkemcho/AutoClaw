'use client';

import { TOKEN_METADATA } from '@autoclaw/shared';

interface SwapDetailsProps {
  fromSymbol: string;
  toSymbol: string;
  exchangeRate: string;
  minimumReceived: string;
  priceImpact: number;
  estimatedGas: string;
}

export function SwapDetails({
  fromSymbol,
  toSymbol,
  exchangeRate,
  minimumReceived,
  priceImpact,
  estimatedGas,
}: SwapDetailsProps) {
  const toMeta = TOKEN_METADATA[toSymbol];
  const isGold = toSymbol === 'XAUT';

  return (
    <div className="space-y-2 px-1 text-sm">
      <DetailRow
        label={`1 ${fromSymbol}`}
        value={
          <span className={isGold ? 'text-gold' : ''}>
            {exchangeRate} {toSymbol}
          </span>
        }
      />
      <DetailRow
        label="Minimum received"
        value={`${minimumReceived} ${toSymbol}`}
      />
      {priceImpact > 0 && (
        <DetailRow
          label="Price impact"
          value={
            <span
              className={
                priceImpact > 1 ? 'text-error' : 'text-foreground-secondary'
              }
            >
              {priceImpact.toFixed(2)}%
            </span>
          }
        />
      )}
      <DetailRow label="Network fee" value={`~${estimatedGas} CELO`} />
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground-muted">{label}</span>
      <span className="text-foreground-secondary font-medium">{value}</span>
    </div>
  );
}
