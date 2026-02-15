'use client';

import { ArrowUpRight, Star } from 'lucide-react';
import { ConnectCTA } from './connect-cta';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20" id="hero">
      {/* Subtle amber gradient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/[0.06] blur-[150px]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/[0.08] blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <h1 className="text-5xl font-normal leading-[1.08] tracking-tight sm:text-7xl lg:text-[5.5rem]">
          Take Control of
          <br />
          Your Digital Assets
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          AutoClaw offers a seamless, secure experience for managing your
          digital assets. Instant transactions, optimized fees, and premium
          design.
        </p>

        <div className="mt-10">
          <ConnectCTA
            size="lg"
            className="rounded-full px-10 py-6 text-base shadow-[0_0_40px_oklch(0.78_0.16_75/0.3)]"
          >
            Get started now
            <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </ConnectCTA>
        </div>

        {/* Trust badge */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">They trust us</p>
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 fill-primary text-primary"
              />
            ))}
            <span className="ml-1 text-sm font-medium">4.9</span>
          </div>
        </div>
      </div>
    </section>
  );
}
