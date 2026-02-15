'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReasoningViewProps {
  reasoning: string;
  isActive?: boolean;
  /** Shown when reasoning is empty during analysis (e.g. "Comparing APRs...") */
  stageMessage?: string;
}

/** Renders reasoning text with basic structure: paragraphs, lists, and line breaks. */
function FormattedReasoning({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const isList = lines.every(
          (l) => /^\s*[-*]\s/.test(l) || /^\s*\d+\.\s/.test(l),
        );
        if (isList && lines.length > 0) {
          return (
            <ul key={i} className="list-disc list-inside space-y-1 pl-1">
              {lines.map((line, j) => {
                const content = line.replace(/^\s*[-*]\s/, '').replace(/^\s*\d+\.\s/, '');
                return <li key={j}>{content}</li>;
              })}
            </ul>
          );
        }
        return (
          <div key={i} className="whitespace-pre-wrap">
            {block}
          </div>
        );
      })}
    </div>
  );
}

export function ReasoningView({ reasoning, isActive = true, stageMessage }: ReasoningViewProps) {
  const [dismissed, setDismissed] = useState(false);
  const prevHadContent = useRef(false);
  const prevHadReasoning = useRef(false);

  useEffect(() => {
    const hasContent = Boolean(reasoning || stageMessage);
    const hadReasoning = Boolean(reasoning);

    // Reset when new run starts (no content -> has content)
    if (hasContent && !prevHadContent.current) {
      setDismissed(false);
    }
    // Reset when final reasoning arrives (user may have dismissed during stages)
    if (hadReasoning && !prevHadReasoning.current) {
      setDismissed(false);
    }

    prevHadContent.current = hasContent;
    prevHadReasoning.current = hadReasoning;
  }, [reasoning, stageMessage]);

  if (!reasoning && !isActive && !stageMessage) return null;
  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Brain className="size-4 shrink-0 text-amber-500" />
              <CardTitle className="text-base">Agent Reasoning</CardTitle>
              {isActive && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="size-3.5 shrink-0 text-amber-400" />
                </motion.div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Dismiss reasoning"
              onClick={() => setDismissed(true)}
            >
              <X className="size-4" />
            </Button>
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
                  <FormattedReasoning text={reasoning} />
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Brain className="size-4" />
                  </motion.div>
                  <span>{stageMessage || 'Analyzing yield opportunities...'}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
