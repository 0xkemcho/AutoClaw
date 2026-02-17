import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PriceData {
  usd: number;
  usd_24h_change?: number;
}

interface CryptoPriceCardProps {
  prices: Record<string, PriceData>;
}

export function CryptoPriceCard({ prices }: CryptoPriceCardProps) {
  if (!prices || Object.keys(prices).length === 0) return null;

  return (
    <Card className="w-full max-w-sm bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-200">
          Market Data
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0">
        {Object.entries(prices).map(([id, data]) => {
          const isPositive = (data.usd_24h_change || 0) >= 0;
          return (
            <div
              key={id}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-300 capitalize">
                  {id.replace(/-/g, ' ')}
                </span>
                <span className="text-xs text-zinc-500">USD Market</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-zinc-100">
                  ${data.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </span>
                {data.usd_24h_change !== undefined && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(data.usd_24h_change).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
