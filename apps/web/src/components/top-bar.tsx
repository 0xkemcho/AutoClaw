'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Menu } from 'lucide-react';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const WalletConnect = dynamic(
  () => import('@/components/wallet-connect').then((m) => m.WalletConnect),
  { ssr: false },
);

const NAV_LINKS = [
  { href: '/fx-agent', label: 'FX Agent' },
  { href: '/yield-agent', label: 'Yield Agent' },
  { href: '/swap', label: 'Swap' },
];

export function TopBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Warm gradient accent line */}
      <div
        className="h-[2px] w-full shrink-0"
        style={{
          background:
            'linear-gradient(90deg, oklch(0.55 0.15 30), oklch(0.65 0.16 60), oklch(0.55 0.15 30))',
        }}
      />

      <header className="sticky top-0 z-40 flex h-14 items-center bg-background/80 backdrop-blur-xl px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center">
          <Link href="/fx-agent" aria-label="AutoClaw home">
            <Logo size="sm" showWordmark className="text-white" />
          </Link>

          {/* Desktop pill nav — hidden below md */}
          <nav aria-label="Main" className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 rounded-full border border-border bg-card/80 backdrop-blur-xl px-1.5 py-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile hamburger — visible below md */}
          <div className="md:hidden ml-auto mr-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex flex-col gap-1 mt-8">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        pathname.startsWith(link.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="ml-auto md:ml-auto">
            <WalletConnect />
          </div>
        </div>
      </header>
    </>
  );
}
