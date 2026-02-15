'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useMotionSafe } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const m = useMotionSafe();

  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <motion.div
      {...m.fadeUp}
      transition={m.spring}
      className="flex items-center justify-center py-24"
    >
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
          <AlertTriangle className="size-10 text-destructive" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RotateCcw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
