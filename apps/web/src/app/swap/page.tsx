'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { SwapCard } from '@/components/swap/swap-card';

function SwapContent() {
  const searchParams = useSearchParams();
  const initialTo = searchParams.get('to') || undefined;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <Header />

      <main className="max-w-lg mx-auto px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-lg font-bold text-foreground mb-4 px-1">Swap</h1>
          <SwapCard initialToToken={initialTo} />
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function SwapPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <SwapContent />
      </Suspense>
    </ProtectedRoute>
  );
}
