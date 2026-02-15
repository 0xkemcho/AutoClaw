'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center px-6 py-4">
        <Logo size="sm" />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        {children}
      </main>
    </div>
  );
}
