'use client';

import { AuthGuard } from '@/components/auth-guard';
import { TopBar } from '@/components/top-bar';
import { PageTransition } from '@/components/page-transition';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireOnboarded={true}>
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </AuthGuard>
  );
}
