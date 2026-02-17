'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

function ScrollReveal({ children }: { children: string }) {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start 0.9', 'start 0.5'],
  });

  const words = children.split(' ');

  return (
    <span ref={container} className="inline-block leading-snug">
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + (1 / words.length) * 0.5;
        // eslint-disable-next-line
        const opacity = useTransform(scrollYProgress, [start, end], [0.3, 1]);
        return (
          <span key={i} className="relative inline-block mr-[0.2em]">
            <motion.span style={{ opacity }} className="relative z-10">
              {word}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

export function TaglineBanner() {
  return (
    <section className="border-y border-neutral-800 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-center text-3xl font-light leading-snug tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-snug">
          <ScrollReveal>
            Your portfolio doesn't sleep. Neither does AutoClaw. Agents trade, farm yield, and rebalance around the clock — so you don't have to.
          </ScrollReveal>
        </p>
      </div>
    </section>
  );
}
