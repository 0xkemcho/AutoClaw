'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';

const testimonials = [
  {
    quote:
      'I literally set the guardrails once and forgot about it. Woke up to the yield agent having auto-compounded rewards overnight. This is the way.',
    name: 'Alex M.',
    role: 'DeFi degen, previously manual trader',
  },
  {
    quote:
      'The FX agent reads the news, picks the signal, and executes — all without me touching anything. I used to spend hours on this. Now I don\'t.',
    name: 'Sarah K.',
    role: 'Portfolio manager, Celo ecosystem',
  },
  {
    quote:
      'Finally a platform that treats agents as first-class citizens. The ERC-8004 on-chain identity for agents is a nice touch — verifiable, not a black box.',
    name: 'James T.',
    role: 'Founder, BlockBridge',
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);

  const prev = () =>
    setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () =>
    setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  return (
    <section
      className="border-y border-neutral-700 py-24"
      id="testimonials"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Don't take our word for it.
              <br />
              Take theirs.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Here's what the early believers say — the ones who deployed agents
            before you did.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_380px]">
          {/* Testimonial card */}
          <div className="relative overflow-hidden p-8 md:p-10">
            {/* Avatar */}
            <div className="mb-8 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-primary/10 text-sm font-bold">
                {testimonials[current].name.charAt(0)}
              </div>
              <BadgeCheck className="h-5 w-5 text-primary" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <blockquote className="text-xl font-light leading-relaxed text-muted-foreground md:text-2xl">
                  &ldquo;{testimonials[current].quote}&rdquo;
                </blockquote>

                <div className="mt-8 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {testimonials[current].name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonials[current].role}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {current + 1}/{testimonials.length}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation panel */}
          <div className="flex flex-row gap-4 md:flex-col">
            <button
              onClick={prev}
              className="flex flex-1 items-center justify-center gap-2 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground md:py-0"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={next}
              className="flex flex-1 items-center justify-center gap-2 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground md:py-0"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
