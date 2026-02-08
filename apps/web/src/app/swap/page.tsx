'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { SwapCard } from '@/components/swap/swap-card';
import { Spinner } from '@/components/ui/spinner';

function SwapParams({ children }: { children: (toToken?: string) => React.ReactNode }) {
  const searchParams = useSearchParams();
  const initialTo = searchParams.get('to') || undefined;
  return <>{children(initialTo)}</>;
}

function SwapContent() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Header />

      <main className="max-w-lg mx-auto px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-lg font-bold text-foreground mb-4 px-1">Swap</h1>
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            }
          >
            <SwapParams>
              {(toToken) => <SwapCard initialToToken={toToken} />}
            </SwapParams>
          </Suspense>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function SwapPage() {
  return (
    <ProtectedRoute>
      <SwapContent />
    </ProtectedRoute>
  );
}
