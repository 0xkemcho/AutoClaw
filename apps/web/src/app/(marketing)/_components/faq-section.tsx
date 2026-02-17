'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUpRight } from 'lucide-react';

const faqs = [
  {
    q: 'What is AutoClaw?',
    a: 'AutoClaw is an autonomous agent platform on Celo. AI agents trade stablecoins, farm yield across Uniswap and ICHI vaults, rebalance your portfolio, and monitor markets — on-chain, non-custodial, while you do other things.',
  },
  {
    q: 'Is AutoClaw secure?',
    a: 'You stay non-custodial throughout. Agents execute via server wallets using gasless EIP-7702 transactions — your private keys never move. Every agent registers on-chain via ERC-8004 for a transparent, verifiable track record.',
  },
  {
    q: 'How do I sign in?',
    a: 'Connect with any wallet (MetaMask, Coinbase Wallet, etc.) or use social login (Google, Apple, X) via thirdweb. No KYC, no email required, no forms.',
  },
  {
    q: 'Which assets are supported?',
    a: '15+ Mento stablecoins (USDm, EURm, BRLm, KESm, NGNm, JPYm, CHFm, GBPm, AUDm, CADm, and more), USDC, USDT, and yield positions across ICHI/Uniswap vaults tracked via Merkl.',
  },
  {
    q: 'What are the fees?',
    a: 'Gas is fully sponsored — you pay zero for transactions on Celo. AutoClaw fees vary by plan. No hidden spreads, no surprises.',
  },
  {
    q: 'Do I need to verify my identity?',
    a: 'No KYC, no ID verification. Connect a wallet or social account and you\'re in.',
  },
  {
    q: 'Can I control how aggressive the agents are?',
    a: 'Yes. Every agent has configurable guardrails — max trade size, daily trade limits, allocation caps, stop-loss thresholds, allowed/blocked currencies, minimum APR requirements. You\'re always in control.',
  },
  {
    q: 'Can I access AutoClaw on mobile?',
    a: 'Yes. AutoClaw is fully responsive and works on any device. Connect your mobile wallet or use social login to access your agents and portfolio on the go.',
  },
];

function FaqItem({ faq }: { faq: (typeof faqs)[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-neutral-800 px-8 transition-colors hover:bg-neutral-900/50 cursor-pointer">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-6 text-left"
      >
        <span className="text-sm font-medium pr-4 text-white">{faq.q}</span>
        <Plus
          className={`h-4 w-4 shrink-0 text-emerald-500 transition-transform duration-200 ${
            open ? 'rotate-45' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  const leftFaqs = faqs.slice(0, 4);
  const rightFaqs = faqs.slice(4);

  return (
    <section
      className="border-b border-neutral-800"
      id="faq"
    >
      <div className="mx-auto max-w-7xl border-x border-neutral-800">
        {/* Header Grid */}
        <div className="grid grid-cols-1 border-b border-neutral-800 lg:grid-cols-2">
          <div className="border-b lg:border-b-0 lg:border-r border-neutral-800 p-8 lg:p-12">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your questions, actually answered.
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              No corporate waffle. Just the real stuff about how AutoClaw works,
              what it costs, and what it does with your money.
            </p>
          </div>
          <div className="flex items-center lg:items-end justify-start lg:justify-end p-8 lg:p-12">
            <a
              href="#get-started"
              className="flex items-center gap-1 text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-400"
            >
              AutoClaw for Web
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* FAQ grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="lg:border-r border-neutral-800">
            {leftFaqs.map((faq) => (
              <FaqItem key={faq.q} faq={faq} />
            ))}
          </div>
          <div>
            {rightFaqs.map((faq) => (
              <FaqItem key={faq.q} faq={faq} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
