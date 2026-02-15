'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shortenAddress } from '@/lib/format';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionSafe } from '@/lib/motion';

const DISMISS_KEY = 'autoclaw_funding_banner_dismissed';

interface FundingBannerProps {
  serverWalletAddress: string;
}

export function FundingBanner({ serverWalletAddress }: FundingBannerProps) {
  const m = useMotionSafe();
  const [dismissed, setDismissed] = useState(() => {
    // Check localStorage during initialization
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DISMISS_KEY) === 'true';
  });
  const [copied, setCopied] = useState(false);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(serverWalletAddress);
    toast('Address copied!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={m.fadeIn.initial}
          animate={m.fadeIn.animate}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
        >
          <Coins className="size-5 text-primary shrink-0" aria-hidden="true" />
          <p className="text-sm">
            Fund your agent to start trading.
          </p>
          <Button
            variant="ghost"
            size="xs"
            className="font-mono"
            onClick={handleCopy}
          >
            {shortenAddress(serverWalletAddress)}
            {copied ? (
              <Check className="size-3 text-success" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto shrink-0"
            onClick={handleDismiss}
          >
            <X />
            <span className="sr-only">Dismiss</span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
