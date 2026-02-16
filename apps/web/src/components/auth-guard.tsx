'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

interface AuthGuardProps {
  children: React.ReactNode;
  requireOnboarded?: boolean;
}

export function AuthGuard({ children, requireOnboarded = true }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isOnboarded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    if (requireOnboarded && isOnboarded === false && pathname !== '/overview') {
      router.replace('/overview');
    }
  }, [isAuthenticated, isLoading, isOnboarded, requireOnboarded, router, pathname]);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading application">
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
  if (!isAuthenticated) return null;
  if (requireOnboarded && !isOnboarded && pathname !== '/overview') return null;

  return <>{children}</>;
}
