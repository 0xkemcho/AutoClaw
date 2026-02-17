'use client';

import { useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowUpRight } from 'lucide-react';
import { ConnectCTA } from './connect-cta';

const navLinks = [
  { label: 'Agents', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  const scrollTo = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-neutral-800 bg-background/60 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo size="sm" />
          </button>

          {/* Desktop links */}
          <ul className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <button
                  onClick={() => scrollTo(link.href)}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <ConnectCTA
              // @ts-ignore
              variant="brand"
              size="sm"
              className="rounded-full h-10 px-5 font-semibold"
          >
            Ape In
          </ConnectCTA>
        </div>

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-background">
            <div className="mt-8 flex flex-col gap-6">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-left text-lg text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </button>
              ))}
              <ConnectCTA className="mt-4 rounded-full">
                Ape In
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </ConnectCTA>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
