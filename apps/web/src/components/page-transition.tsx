'use client';

import { motion } from 'motion/react';
import { useMotionSafe } from '@/lib/motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const m = useMotionSafe();
  return (
    <motion.div
      initial={m.fadeIn.initial}
      animate={m.fadeIn.animate}
      transition={{ duration: m.duration.fast }}
    >
      {children}
    </motion.div>
  );
}
