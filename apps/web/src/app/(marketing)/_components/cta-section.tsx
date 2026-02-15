'use client';

import { ArrowUpRight } from 'lucide-react';
import { ConnectCTA } from './connect-cta';

export function CtaSection() {
  return (
    <section className="relative border-y border-neutral-800 py-32" id="get-started">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 border-x border-neutral-800 md:grid-cols-4">
          <div className="hidden border-r border-neutral-800 md:block" />
          <div className="col-span-2 flex flex-col items-center justify-center p-12 text-center md:py-32">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-7xl">
              Ready to take control
              <br />
              of your crypto?
            </h2>
            <p className="mx-auto mt-6 max-w-md text-lg text-muted-foreground">
              Join thousands of users who trust AutoClaw for secure, seamless, and
              efficient stablecoin transactions.
            </p>
            <div className="mt-10">
              <ConnectCTA
                  // @ts-ignore
                  variant="brand"
                  size="lg"
                  className="rounded-full px-8 text-base font-semibold"
              >
                AutoClaw for Web
                <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </ConnectCTA>
            </div>
          </div>
          <div className="hidden border-l border-neutral-800 md:block" />
        </div>
      </div>
    </section>
  );
}
