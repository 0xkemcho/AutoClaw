'use client';

import { useEffect, useState } from 'react';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { useRouter, usePathname } from 'next/navigation';
import { client, wallets, walletTheme, connectButtonStyle } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';
import { fetchWithAuth } from '@/lib/api';
import { Header } from '@/components/header';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useState(() => new Set<string>())[0];

  useEffect(() => {
    if (!account) return;

    // Skip onboarding check on the onboarding page itself
    if (pathname === '/onboarding') return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Only check once per session per path
    const key = `${account.address}:${pathname}`;
    if (checkedRef.has(key)) return;
    checkedRef.add(key);

    // Non-blocking: check onboarding status in background, redirect if needed
    fetchWithAuth('/api/auth/me', token)
      .then((data) => {
        if (!data.onboarding_completed) {
          router.replace('/onboarding');
        }
      })
      .catch(() => {
        // Ignore — let the page render
      });
  }, [account, pathname, router, checkedRef]);

  if (!account) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex flex-col items-center justify-center px-6 pt-32">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Connect your wallet
            </h2>
            <p className="text-foreground-secondary">
              Please connect your wallet to access this page.
            </p>
            <ConnectButton
              client={client}
              wallets={wallets}
              chain={celo}
              theme={walletTheme}
              connectButton={{ label: 'Connect Wallet', style: connectButtonStyle }}
            />
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
