'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function CountUp({
  value,
  prefix = '',
  decimals = 2,
  duration = 600,
  className = '',
}: CountUpProps) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    startValue.current = displayed;
    startTime.current = null;
    cancelAnimationFrame(rafId.current);

    function animate(timestamp: number) {
      if (startTime.current === null) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current =
        startValue.current + (value - startValue.current) * eased;
      setDisplayed(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    }

    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayed.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
