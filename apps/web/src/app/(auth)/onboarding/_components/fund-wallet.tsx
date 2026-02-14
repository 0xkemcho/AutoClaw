'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMotionSafe } from '@/lib/motion';
import { toast } from 'sonner';

interface FundWalletProps {
  serverWalletAddress: string | null;
  riskProfile: string;
  onRetry: () => void;
  isRetrying: boolean;
  onContinue?: () => void;
}

export function FundWallet({
  serverWalletAddress,
  riskProfile,
  onRetry,
  isRetrying,
  onContinue,
}: FundWalletProps) {
  const m = useMotionSafe();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!serverWalletAddress) return;
    await navigator.clipboard.writeText(serverWalletAddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!serverWalletAddress) {
    return (
      <motion.div
        className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
        initial={m.fadeUp.initial}
        animate={m.fadeUp.animate}
        transition={m.spring}
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-8 text-destructive" />
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Wallet creation failed
          </h2>
          <p className="mt-2 text-muted-foreground">
            We couldn&apos;t create your agent wallet. Please try again.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? 'Retrying...' : 'Retry Setup'}
          </Button>
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            Skip for now
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
      initial={m.fadeUp.initial}
      animate={m.fadeUp.animate}
      transition={m.spring}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <Check className="size-8 text-primary" />
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Your agent is ready.
        </h2>
        <p className="mt-2 text-muted-foreground">
          Fund it to start trading.
        </p>
      </div>

      <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-card p-4">
        <code className="flex-1 truncate font-mono text-sm">
          {serverWalletAddress}
        </code>
        <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
          {copied ? (
            <Check className="size-4 text-primary" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Send USDC, USDT, or any Mento stablecoin on Celo to this address.
      </p>

      <div className="flex w-full flex-col gap-3">
        <Button onClick={onContinue ?? (() => router.push('/dashboard'))}>
          Continue
        </Button>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          Skip for now
        </Button>
      </div>
    </motion.div>
  );
}
