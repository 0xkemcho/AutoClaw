'use client';

import { useReducedMotion } from 'motion/react';

export const MOTION = {
  fadeIn: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
  },
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
  spring: { type: 'spring' as const, stiffness: 300, damping: 24 },
  springSnappy: { type: 'spring' as const, stiffness: 400, damping: 20 },
  duration: { fast: 0.15, normal: 0.3, slow: 0.5 },
} as const;

const MOTION_NOOP = {
  fadeIn: {
    initial: { opacity: 1, y: 0 },
    animate: { opacity: 1, y: 0 },
  },
  fadeUp: {
    initial: { opacity: 1, y: 0 },
    animate: { opacity: 1, y: 0 },
  },
  spring: { type: 'spring' as const, stiffness: 300, damping: 24, duration: 0 },
  springSnappy: { type: 'spring' as const, stiffness: 400, damping: 20, duration: 0 },
  duration: { fast: 0, normal: 0, slow: 0 },
} as const;

export function useMotionSafe() {
  const shouldReduce = useReducedMotion();
  return shouldReduce ? MOTION_NOOP : MOTION;
}
