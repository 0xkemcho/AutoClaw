'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Header } from '@/components/header';

const STATS = [
  { value: '15+', label: 'Mento stablecoins supported' },
  { value: '$0', label: 'platform fees' },
  { value: '1-tap', label: 'swaps on Celo' },
  { value: 'AI', label: 'powered recommendations' },
];

function StatItem({ value, label, index }: { value: string; label: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="text-center"
    >
      <p className="text-2xl md:text-3xl font-bold text-black">{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </motion.div>
  );
}

export default function LandingPage() {
  const secondFoldRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(secondFoldRef, { once: true, amount: 0.3 });

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero — Fold 1 */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-32">
        <img
          src="https://cdn.prod.website-files.com/64078f74f400a576b871a774/65cfccdcd2a4fdd64f05be09_autopilotAppIcon.png"
          alt="AutoClaw"
          className="w-16 h-16 rounded-2xl mb-4"
        />
        <p className="text-sm font-semibold text-gray-500 mb-6">AutoClaw</p>

        <h1 className="text-4xl md:text-6xl font-light text-black leading-tight max-w-2xl">
          FX Investing
          <br />
          Made Easy
        </h1>

        <p className="text-gray-400 mt-6 text-base max-w-md">
          Pick a strategy. Connect your wallet. That&apos;s it.
        </p>

        <a
          href="/onboarding"
          className="mt-10 inline-flex items-center gap-2 px-8 py-4 bg-black text-white text-base font-semibold rounded-pill hover:bg-gray-800 transition-colors"
        >
          Get Started
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </section>

      {/* Stats — Fold 2 */}
      <section
        ref={secondFoldRef}
        className="bg-white border-t border-gray-100 py-24 px-6"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {STATS.map((stat, i) => (
              <StatItem key={stat.label} value={stat.value} label={stat.label} index={i} />
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center text-gray-400 text-sm mt-16 max-w-md mx-auto"
          >
            AI-powered FX investment on Celo. Buy any Mento stablecoin,
            set up recurring investments, and let AI guide your portfolio.
          </motion.p>
        </motion.div>
      </section>
    </div>
  );
}
