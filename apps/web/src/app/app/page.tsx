'use client';

import { useActiveAccount } from 'thirdweb/react';
import { ProtectedRoute } from '@/components/protected-route';

function AppHome() {
  const account = useActiveAccount();

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="p-6 bg-dark-card rounded-card-lg">
          <p className="text-sm text-foreground-muted">Wallet Address</p>
          <p className="font-mono text-dark-card-text text-sm mt-1">
            {account?.address}
          </p>
        </div>
        <p className="text-foreground-secondary">
          Your portfolio and AI-powered recommendations will appear here.
        </p>
      </div>
    </main>
  );
}

export default function AppPage() {
  return (
    <ProtectedRoute>
      <AppHome />
    </ProtectedRoute>
  );
}
