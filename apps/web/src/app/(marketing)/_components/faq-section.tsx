'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUpRight } from 'lucide-react';

const faqs = [
  {
    q: 'What is AutoClaw?',
    a: 'AutoClaw is an autonomous FX trading platform built on the Celo blockchain. It uses AI-powered agents to analyze markets and execute stablecoin swaps via the Mento protocol.',
  },
  {
    q: 'Is AutoClaw secure?',
    a: 'Yes. AutoClaw uses Privy server wallets for secure key management, all trades go through audited smart contracts, and guardrails prevent unauthorized or excessive trading.',
  },
  {
    q: 'Which currencies are supported?',
    a: 'AutoClaw supports 15+ Mento stablecoins including USDm, EURm, BRLm, KESm, PHPm, COPm, XOFm, NGNm, JPYm, CHFm, ZARm, GBPm, AUDm, CADm, and GHSm.',
  },
  {
    q: 'What are the fees for transactions?',
    a: 'Fees vary by plan. The Free tier has 0.8% standard fees, Pro offers 0.4%, and Business enjoys ultra-low 0.1% fees per trade. No hidden charges.',
  },
  {
    q: 'How fast are transactions?',
    a: 'Transactions on Celo are near-instant, typically confirming in under 5 seconds. AutoClaw executes swaps in real-time with no manual intervention needed.',
  },
  {
    q: 'Do I need to verify my identity?',
    a: 'No KYC is required. AutoClaw uses Sign-In With Ethereum (SIWE) for authentication — just connect your wallet to get started.',
  },
  {
    q: 'Can I access AutoClaw on mobile?',
    a: 'Yes. AutoClaw is fully responsive and works on any device. Connect your mobile wallet to access the full trading experience on the go.',
  },
  {
    q: 'How can I contact support?',
    a: 'You can reach our support team via email, Discord, or through the in-app help center. Pro and Business users get priority response times.',
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
              Your Questions, Answered
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Find everything you need to know about AutoClaw, from security to
              supported assets.
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
