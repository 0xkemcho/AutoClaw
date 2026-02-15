'use client';

import { ArrowUpRight } from 'lucide-react';
import { ConnectCTA } from './connect-cta';

export function CtaSection() {
  return (
    <section className="relative border-y border-neutral-700 py-32" id="get-started">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Ready to take control
          <br />
          of your crypto?
        </h2>
        <p className="mx-auto mt-5 max-w-md text-muted-foreground">
          Join thousands of users who trust AutoClaw for secure, seamless, and
          efficient stablecoin transactions.
        </p>
        <div className="mt-8">
          <ConnectCTA size="lg" className="rounded-full px-8 text-base">
            Get started now
            <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </ConnectCTA>
        </div>
      </div>
    </section>
  );
}
