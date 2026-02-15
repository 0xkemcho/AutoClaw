import { TrendingUp, TrendingDown, Minus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TokenLogo } from '@/components/token-logo';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  YieldSignalCard — for yield agent analysis signals                */
/* ------------------------------------------------------------------ */

interface YieldSignalCardProps {
  vaultName: string;
  action: string;
  amountUsd: number;
  estimatedApr: number;
  confidence: number;
  reasoning?: string;
}

const YIELD_ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof ArrowDownToLine }> = {
  deposit: { label: 'Deposit', color: 'text-success', icon: ArrowDownToLine },
  withdraw: { label: 'Withdraw', color: 'text-destructive', icon: ArrowUpFromLine },
  hold: { label: 'Hold', color: 'text-muted-foreground', icon: Minus },
};

export function YieldSignalCard({
  vaultName,
  action,
  amountUsd,
  estimatedApr,
  confidence,
  reasoning,
}: YieldSignalCardProps) {
  const config = YIELD_ACTION_CONFIG[action] ?? YIELD_ACTION_CONFIG.hold;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <Icon className={cn('mt-0.5 size-3.5 shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium truncate">{vaultName}</span>
          <Badge
            variant={action === 'deposit' ? 'default' : action === 'withdraw' ? 'destructive' : 'secondary'}
            className="text-[11px] px-1.5 py-0"
          >
            {config.label}
          </Badge>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            ${amountUsd.toFixed(2)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {estimatedApr.toFixed(1)}% APR
          </span>
          <span
            className="text-xs font-mono tabular-nums"
            style={{ opacity: 0.4 + (confidence / 100) * 0.6 }}
          >
            {confidence}%
          </span>
        </div>
        {reasoning && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reasoning}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SignalCard — for FX agent analysis signals                        */
/* ------------------------------------------------------------------ */

interface SignalCardProps {
  currency: string;
  direction: string;
  confidence: number;
  reasoning?: string;
  timeHorizon?: string;
  compact?: boolean;
}

const DIRECTION_CONFIG: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
  buy: { label: 'Buy', color: 'text-success', icon: TrendingUp },
  sell: { label: 'Sell', color: 'text-destructive', icon: TrendingDown },
  hold: { label: 'Hold', color: 'text-muted-foreground', icon: Minus },
};

export function SignalCard({ currency, direction, confidence, reasoning, timeHorizon, compact }: SignalCardProps) {
  const config = DIRECTION_CONFIG[direction] ?? DIRECTION_CONFIG.hold;
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-xs')}>
        <TokenLogo symbol={currency} size={14} />
        <span className="font-medium">{currency}</span>
        <span className={config.color}>{config.label.toLowerCase()}</span>
        <span className="font-mono tabular-nums text-muted-foreground">{confidence}%</span>
      </span>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <Icon className={cn('mt-0.5 size-3.5 shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] px-1.5 py-0 gap-1">
            <TokenLogo symbol={currency} size={12} />
            {currency}
          </Badge>
          <Badge
            variant={direction === 'buy' ? 'default' : direction === 'sell' ? 'destructive' : 'secondary'}
            className="text-[11px] px-1.5 py-0"
          >
            {config.label}
          </Badge>
          <span
            className="text-xs font-mono tabular-nums"
            style={{ opacity: 0.4 + (confidence / 100) * 0.6 }}
          >
            {confidence}%
          </span>
          {timeHorizon && (
            <span className="text-[11px] text-muted-foreground capitalize">{timeHorizon}</span>
          )}
        </div>
        {reasoning && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reasoning}</p>
        )}
      </div>
    </div>
  );
}
