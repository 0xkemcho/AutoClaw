'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-[280px] h-screen sticky top-0 bg-background-card border-r border-border">
      {/* Logo area */}
      <div className="h-14 flex items-center px-5 border-b border-border gap-2">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="w-20 h-4" />
      </div>

      {/* Portfolio card */}
      <div className="px-4 pt-5 pb-3">
        <div className="rounded-card bg-background-secondary border border-border p-4">
          <Skeleton className="w-16 h-3 mb-2" />
          <Skeleton className="w-28 h-6 mb-1" />
          <Skeleton className="w-20 h-3 mt-1" />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="w-[18px] h-[18px] rounded" />
            <Skeleton className={`h-4 ${i === 1 ? 'w-20' : i === 2 ? 'w-16' : 'w-14'}`} />
          </div>
        ))}
      </nav>

      {/* Agent toggle + Logout */}
      <div className="px-4 pb-5 space-y-2">
        <Skeleton className="w-full h-10 rounded-pill" />
        <Skeleton className="w-full h-9 rounded-pill" />
      </div>
    </aside>
  );
}

function ContentSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Page title */}
      <Skeleton className="w-40 h-7" />

      {/* Cards with varying heights */}
      <Skeleton className="w-full h-36" />
      <Skeleton className="w-full h-52" />
      <Skeleton className="w-full h-44" />
    </div>
  );
}

function MobileBottomNavSkeleton() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-card/95 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 px-3 py-1.5">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-10 h-2.5" />
          </div>
        ))}
      </div>
    </nav>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="md:hidden">
        <Header />
      </div>

      <div className="flex md:grid md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr_320px]">
        <SidebarSkeleton />
        <main className="flex-1 min-h-screen overflow-y-auto">
          <ContentSkeleton />
        </main>
      </div>

      <MobileBottomNavSkeleton />
    </div>
  );
}
