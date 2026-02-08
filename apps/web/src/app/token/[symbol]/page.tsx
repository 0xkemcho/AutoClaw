'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/header';
import { ProtectedRoute } from '@/components/protected-route';
import { CountUp } from '@/components/ui/count-up';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTokenDetail } from '@/hooks/use-market-data';

function TokenDetailContent({
  symbol,
}: {
  symbol: string;
}) {
  const router = useRouter();
  const { token, isLoading } = useTokenDetail(symbol);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="flex items-center justify-center pt-32">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="px-6 pt-10">
          <div className="max-w-lg mx-auto text-center space-y-4">
            <p className="text-foreground-muted">Token not found</p>
            <Button variant="secondary" onClick={() => router.push('/home')}>
              Back to Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isPositive = token.change24hPct >= 0;
  const chartColor = isPositive ? '#10B981' : '#EF4444';
  const chartData = token.sparkline7d.map((price, i) => ({
    index: i,
    price,
  }));

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-lg mx-auto px-4 pt-4 pb-8">
        {/* Back + Token Header */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">
              {token.flag || '💰'}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {token.symbol}
              </h1>
              <p className="text-sm text-foreground-muted">{token.name}</p>
            </div>
          </div>
        </motion.div>

        {/* Price */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-6"
        >
          <CountUp
            value={token.priceUsd}
            prefix="$"
            decimals={token.priceUsd >= 100 ? 2 : 4}
            className="text-4xl font-bold text-foreground"
          />
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-semibold ${
                isPositive
                  ? 'bg-success/10 text-success'
                  : 'bg-error/10 text-error'
              }`}
            >
              {isPositive ? '▲' : '▼'}{' '}
              {Math.abs(token.change24hPct).toFixed(2)}% (24h)
            </span>
          </div>
        </motion.div>

        {/* 7-Day Chart */}
        {chartData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-6"
          >
            <Card className="p-4">
              <p className="text-xs font-medium text-foreground-muted mb-3">
                7-Day Price
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <YAxis
                    domain={['auto', 'auto']}
                    hide
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1A1A1A',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(value) => [
                      `$${Number(value).toFixed(4)}`,
                      'Price',
                    ]}
                    labelFormatter={() => ''}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={chartColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: chartColor }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* Token Info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mb-6"
        >
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Token Info
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-foreground-muted text-xs">Symbol</p>
                <p className="font-medium">{token.symbol}</p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Name</p>
                <p className="font-medium">{token.name}</p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Price (USD)</p>
                <p className="font-medium">
                  ${token.priceUsd.toFixed(token.priceUsd >= 100 ? 2 : 4)}
                </p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">24h Change</p>
                <p
                  className={`font-medium ${
                    isPositive ? 'text-success' : 'text-error'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {token.change24hPct.toFixed(2)}%
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Buy Button */}
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.push(`/swap?to=${token.symbol}`)}
        >
          Buy {token.symbol}
        </Button>
      </main>
    </div>
  );
}

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);

  return (
    <ProtectedRoute>
      <TokenDetailContent symbol={symbol} />
    </ProtectedRoute>
  );
}
