'use client';

import { ConnectButton } from 'thirdweb/react';
import { useActiveAccount } from 'thirdweb/react';
import { client, wallets } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';

export default function LandingPage() {
  const account = useActiveAccount();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          AutoClaw
        </h1>
        <p className="text-lg text-foreground-secondary">
          AI-powered FX investment on Celo. Buy any Mento stablecoin in one tap.
        </p>

        <div className="flex justify-center">
          <ConnectButton client={client} wallets={wallets} chain={celo} />
        </div>

        {account && (
          <div className="mt-6 p-4 bg-background-card rounded-card border border-border">
            <p className="text-sm text-foreground-muted">Connected as</p>
            <p className="font-mono text-sm text-foreground truncate">
              {account.address}
            </p>
            <a
              href="/app"
              className="mt-4 inline-block px-6 py-3 bg-cta text-cta-text rounded-pill font-medium hover:bg-cta-hover transition-colors"
            >
              Enter App
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
