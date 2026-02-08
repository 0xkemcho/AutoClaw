'use client';

import { useActiveAccount } from 'thirdweb/react';
import { ConnectButton } from 'thirdweb/react';
import { client, wallets } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();

  if (!account) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Connect your wallet
          </h2>
          <p className="text-foreground-secondary">
            Please connect your wallet to access the app.
          </p>
          <ConnectButton client={client} wallets={wallets} chain={celo} />
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
