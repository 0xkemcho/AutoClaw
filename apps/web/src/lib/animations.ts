export const questionEnter = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

export const answeredScroll = {
  animate: { y: -80, opacity: 0.3 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

export const profileReveal = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
};

export const tokenCardStagger = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: (index: number) => ({
    duration: 0.3,
    delay: index * 0.03,
  }),
};

export const sparklineDrawIn = {
  initial: { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: { duration: 0.8, ease: 'easeOut' as const },
};

export const changeIndicator = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
};
