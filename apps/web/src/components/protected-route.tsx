'use client';

import { useEffect, useState, useRef } from 'react';
import { ConnectButton } from 'thirdweb/react';
import { useWalletReady } from '@/hooks/use-wallet-ready';
import { AppShellSkeleton } from '@/components/app-shell-skeleton';
import { useRouter, usePathname } from 'next/navigation';
import { client, wallets, walletTheme, connectButtonStyle } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';
import { fetchWithAuth } from '@/lib/api';
import { Header } from '@/components/header';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { account, isHydrating } = useWalletReady();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!account) return;
    if (pathname === '/onboarding') return;
    if (checkingRef.current || onboardingChecked) return;

    if (sessionStorage.getItem('onboarding_checked') === 'true') {
      setOnboardingChecked(true);
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      // No token yet — allow page to render, auth will happen on interaction
      setOnboardingChecked(true);
      return;
    }

    checkingRef.current = true;

    fetchWithAuth('/api/auth/me', token)
      .then((data) => {
        if (!data.onboarding_completed) {
          router.replace('/onboarding');
        } else {
          sessionStorage.setItem('onboarding_checked', 'true');
          setOnboardingChecked(true);
        }
      })
      .catch(() => {
        // Auth failed — allow page to render
        setOnboardingChecked(true);
      })
      .finally(() => {
        checkingRef.current = false;
      });
  }, [account, pathname, router, onboardingChecked]);

  if (isHydrating) {
    return <AppShellSkeleton />;
  }

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

  // Block rendering until onboarding check completes — prevents dashboard flash
  if (!onboardingChecked && pathname !== '/onboarding') {
    return <AppShellSkeleton />;
  }

  return <>{children}</>;
}
