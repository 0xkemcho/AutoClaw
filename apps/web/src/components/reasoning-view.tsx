'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReasoningViewProps {
  reasoning: string;
  isActive?: boolean;
}

export function ReasoningView({ reasoning, isActive = true }: ReasoningViewProps) {
  if (!reasoning && !isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-amber-500" />
              <CardTitle className="text-base">Agent Reasoning</CardTitle>
              {isActive && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="size-3.5 text-amber-400" />
                </motion.div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {reasoning ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="prose prose-invert prose-sm max-w-none"
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {reasoning}
                  </p>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Brain className="size-4" />
                  </motion.div>
                  <span>Analyzing yield opportunities...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
