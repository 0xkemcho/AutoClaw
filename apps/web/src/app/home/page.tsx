'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { TokenRowCard } from '@/components/token-row-card';
import { CountUp } from '@/components/ui/count-up';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMarketTokens } from '@/hooks/use-market-data';

function TokenSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-background-secondary rounded-full" />
        <div className="space-y-1.5">
          <div className="w-12 h-3.5 bg-background-secondary rounded" />
          <div className="w-20 h-3 bg-background-secondary rounded" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-7 bg-background-secondary rounded" />
        <div className="space-y-1.5 text-right">
          <div className="w-14 h-3.5 bg-background-secondary rounded ml-auto" />
          <div className="w-10 h-3 bg-background-secondary rounded ml-auto" />
        </div>
      </div>
    </div>
  );
}

function HomeContent() {
  const { data, isLoading, error, refetch } = useMarketTokens();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      if (deltaY > 80 && scrollTop <= 0 && !isRefreshing) {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
      }
    },
    [refetch, isRefreshing],
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white pb-20 md:pb-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Header />

      <main className="max-w-lg mx-auto px-4 pt-6">
        {/* Pull-to-refresh indicator */}
        {isRefreshing && (
          <div className="flex justify-center pb-3">
            <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Portfolio Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card variant="dark" className="mb-6">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
              Portfolio Value
            </p>
            <CountUp
              value={0}
              prefix="$"
              decimals={2}
              className="text-3xl font-bold text-white"
            />
            <p className="text-white/40 text-xs mt-1">
              Connect portfolio to see your holdings
            </p>
          </Card>
        </motion.div>

        {/* Market Section */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground px-1">Market</h2>
        </div>

        {error && (
          <div className="text-center py-8 space-y-3">
            <p className="text-foreground-muted text-sm">
              Failed to load market data
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {isLoading && !data && (
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <TokenSkeleton key={i} />
            ))}
          </div>
        )}

        {data?.tokens && (
          <div className="space-y-0.5">
            {data.tokens.map((token, index) => (
              <TokenRowCard key={token.symbol} token={token} index={index} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
