'use client';

import { useMotionValue, motion, useMotionTemplate } from 'motion/react';
import React, { type MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '@/lib/utils';

type CardSpotlightProps = {
  radius?: number;
  color?: string;
  children: React.ReactNode;
  className?: string;
};

export function CardSpotlight({
  children,
  radius = 350,
  color = '#262626',
  className,
}: CardSpotlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: ReactMouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, ${color}, transparent 80%)`;

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      className={cn(
        'group relative flex overflow-hidden rounded-3xl bg-card shadow-[0_0_24px_-4px_rgba(251,191,36,0.08)] transition-shadow duration-300 hover:shadow-[0_0_32px_-4px_rgba(251,191,36,0.12)]',
        className
      )}
    >
      <div className="absolute inset-0 bg-card" />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </motion.div>
  );
}
