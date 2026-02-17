'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export function LandingPageClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/overview');
    }
  }, [isAuthenticated, isLoading, router]);

  // Only hide content when authenticated (redirecting). During loading, show
  // the static content immediately to avoid layout glitch (empty main + footer).
  if (isAuthenticated) return null;

  return <>{children}</>;
}
