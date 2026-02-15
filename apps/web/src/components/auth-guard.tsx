'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

interface AuthGuardProps {
  children: React.ReactNode;
  requireOnboarded?: boolean;
}

export function AuthGuard({ children, requireOnboarded = true }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isOnboarded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    if (requireOnboarded && isOnboarded === false) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isLoading, isOnboarded, requireOnboarded, router]);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading application">
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
  if (!isAuthenticated) return null;
  if (requireOnboarded && !isOnboarded) return null;

  return <>{children}</>;
}
