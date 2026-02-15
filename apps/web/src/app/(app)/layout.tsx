'use client';

import { AuthGuard } from '@/components/auth-guard';
import { AppSidebar } from '@/components/app-sidebar';
import { PageTransition } from '@/components/page-transition';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireOnboarded={true}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Warm gradient accent line */}
          <div
            className="h-[2px] w-full shrink-0"
            style={{
              background:
                'linear-gradient(90deg, oklch(0.55 0.15 30), oklch(0.65 0.16 60), oklch(0.55 0.15 30))',
            }}
          />
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
