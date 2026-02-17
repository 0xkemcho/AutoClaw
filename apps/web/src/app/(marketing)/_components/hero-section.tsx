'use client';

import { ArrowUpRight, PlayCircle } from 'lucide-react';
import { ConnectCTA } from './connect-cta';
import { Button } from '@/components/ui/button';
import { VideoModal } from './video-modal';

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
          Fire your analyst.
          <br />
          Deploy your agent.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          AutoClaw runs autonomous AI agents that read the news, hunt yield,
          rebalance your portfolio, and execute on-chain — while you touch
          grass. No Bloomberg terminal. No gas fees. No babysitting.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ConnectCTA
              variant="brand"
              size="lg"
              className="rounded-full px-8 py-6 text-base font-semibold"
            >
              Ape In
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </ConnectCTA>
            <VideoModal
              trigger={
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-white/15 bg-white/[0.03] px-8 py-6 text-base font-semibold hover:bg-white/[0.08]"
                >
                  Watch Demo
                  <PlayCircle className="h-4 w-4" />
                </Button>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Connect with wallet or social login — no KYC, no forms.
          </p>
        </div>

      </div>
    </section>
  );
}
