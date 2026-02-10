'use client';

import { motion } from 'framer-motion';
import { useActiveAccount } from 'thirdweb/react';
import { Header } from '@/components/header';
import { NoiseBackground } from '@/components/ui/noise-background';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

const ONE_LINERS: { text: string; bold: string }[] = [
  { text: 'AI-powered FX investing on Celo.', bold: 'AI-powered' },
  { text: '15+ Mento stablecoins. Zero platform fees.', bold: '15+' },
  { text: '1-tap swaps. Instant settlement.', bold: '1-tap' },
  { text: 'Recurring investments on autopilot.', bold: 'autopilot' },
  { text: 'Your portfolio. AI-guided.', bold: 'AI-guided' },
];

function highlightBold(text: string, bold: string) {
  const idx = text.indexOf(bold);
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const after = text.slice(idx + bold.length);
  return (
    <>
      {before}
      <span className="font-bold">{bold}</span>
      {after}
    </>
  );
}

export default function LandingPage() {
  const account = useActiveAccount();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero — Fold 1 with ripple grid background */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-32 overflow-hidden">
        {/* Ripple grid bg */}
        <BackgroundRippleEffect rows={10} cols={30} cellSize={52} />

        {/* Radial fade overlay so grid fades at edges */}
        <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-background)_75%)]" />

        {/* Content */}
        <div className="relative z-10">
          <img
            src="https://cdn.prod.website-files.com/64078f74f400a576b871a774/65cfccdcd2a4fdd64f05be09_autopilotAppIcon.png"
            alt="AutoClaw"
            className="w-16 h-16 rounded-2xl mb-4 mx-auto"
          />
          <p className="text-sm font-semibold text-foreground-secondary mb-6">AutoClaw</p>

          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight max-w-2xl">
            FX Investing
            <br />
            Made Easy
          </h1>

          <p className="text-foreground-muted mt-6 text-base max-w-md mx-auto">
            Pick a strategy. Connect your wallet. That&apos;s it.
          </p>

          {/* CTA with noise background */}
          <div className="mt-10 inline-block">
            <NoiseBackground
              containerClassName="rounded-pill"
              className="px-8 py-4"
              gradientColors={[
                'rgb(99, 102, 241)',
                'rgb(139, 92, 246)',
                'rgb(59, 130, 246)',
              ]}
              noiseIntensity={0.15}
              speed={0.08}
            >
              <a
                href={account ? '/home' : '/onboarding'}
                className="inline-flex items-center gap-2 text-white text-base font-semibold"
              >
                {account ? 'Go to Dashboard' : 'Get Started'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </NoiseBackground>
          </div>
        </div>
      </section>

      {/* One-liners — Fold 2 */}
      <section className="bg-background border-t border-border px-6">
        <div className="max-w-4xl mx-auto">
          {ONE_LINERS.map((item, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="text-center text-foreground font-light text-2xl md:text-4xl lg:text-5xl leading-snug py-10 md:py-14"
            >
              {highlightBold(item.text, item.bold)}
            </motion.p>
          ))}
        </div>
      </section>
    </div>
  );
}
