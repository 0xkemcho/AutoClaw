'use client';

import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { ConnectButton } from 'thirdweb/react';
import { useRouter, usePathname } from 'next/navigation';
import { client, wallets, walletTheme, connectButtonStyle } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';
import { fetchWithAuth } from '@/lib/api';
import { Header } from '@/components/header';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!account) {
      setChecking(false);
      return;
    }

    // Skip onboarding check on the onboarding page itself
    if (pathname === '/onboarding') {
      setAllowed(true);
      setChecking(false);
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setChecking(false);
      setAllowed(true);
      return;
    }

    fetchWithAuth('/api/auth/me', token)
      .then((data) => {
        if (!data.onboarding_completed) {
          router.replace('/onboarding');
        } else {
          setAllowed(true);
        }
      })
      .catch(() => {
        setAllowed(true);
      })
      .finally(() => setChecking(false));
  }, [account, pathname, router]);

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

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center pt-32">
          <div className="w-8 h-8 border-2 border-foreground-secondary border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
