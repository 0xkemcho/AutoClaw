'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { getContract, prepareContractCall } from 'thirdweb';
import { prepareEvent, parseEventLogs } from 'thirdweb/event';
import {
  useSendAndConfirmTransaction,
  useActiveAccount,
} from 'thirdweb/react';
import { celo } from 'thirdweb/chains';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { client } from '@/lib/thirdweb';
import { useMotionSafe } from '@/lib/motion';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const IDENTITY_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const registeredEvent = prepareEvent({
  signature:
    'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
});

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface RegisterAgentProps {
  serverWalletAddress: string | null;
  walletAddress: string;
}

type RegistrationStep =
  | 'idle'
  | 'registering'
  | 'linking'
  | 'confirming'
  | 'success'
  | 'error';

interface StepInfo {
  label: string;
  description: string;
}

const STEP_INFO: Record<
  Exclude<RegistrationStep, 'idle' | 'success' | 'error'>,
  StepInfo
> = {
  registering: {
    label: 'Registering',
    description: 'Registering your agent on ERC-8004...',
  },
  linking: {
    label: 'Linking wallet',
    description: 'Linking your server wallet to the agent...',
  },
  confirming: {
    label: 'Confirming',
    description: 'Confirming registration with backend...',
  },
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function RegisterAgent({
  serverWalletAddress,
  walletAddress,
}: RegisterAgentProps) {
  const m = useMotionSafe();
  const router = useRouter();
  const account = useActiveAccount();
  const { mutateAsync: sendAndConfirm } = useSendAndConfirmTransaction();

  const [step, setStep] = useState<RegistrationStep>('idle');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = useCallback(async () => {
    if (!client || !account) {
      setErrorMessage(
        'Wallet not connected. Please reconnect and try again.',
      );
      setStep('error');
      return;
    }

    try {
      setStep('registering');
      setErrorMessage(null);

      const contract = getContract({
        client,
        chain: celo,
        address: IDENTITY_REGISTRY_ADDRESS,
      });

      // Step 1: Call IdentityRegistry.register(metadataUrl)
      const metadataUrl = `${API_BASE}/api/agent/${walletAddress}/8004-metadata`;

      const registerTx = prepareContractCall({
        contract,
        method:
          'function register(string agentURI) returns (uint256 agentId)',
        params: [metadataUrl],
      });

      const registerReceipt = await sendAndConfirm(registerTx);

      // Parse Registered event from receipt logs to get agentId
      const logs = parseEventLogs({
        logs: registerReceipt.logs,
        events: [registeredEvent],
      });

      if (logs.length === 0) {
        throw new Error(
          'Registration transaction succeeded but no Registered event was found.',
        );
      }

      const registeredAgentId = (logs[0] as any).args.agentId.toString();
      setAgentId(registeredAgentId);

      // Step 2: Call POST /api/agent/prepare-8004-link to get server wallet EIP-712 signature
      setStep('linking');

      const linkData = await api.post<{
        signature: string;
        deadline: string;
        serverWalletAddress: string;
      }>('/api/agent/prepare-8004-link', { agentId: registeredAgentId });

      // Step 3: Call IdentityRegistry.setAgentWallet(agentId, serverWalletAddress, deadline, signature)
      const setWalletTx = prepareContractCall({
        contract,
        method:
          'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature)',
        params: [
          BigInt(registeredAgentId),
          linkData.serverWalletAddress as `0x${string}`,
          BigInt(linkData.deadline),
          linkData.signature as `0x${string}`,
        ],
      });

      const linkReceipt = await sendAndConfirm(setWalletTx);

      // Step 4: Call POST /api/agent/confirm-8004-registration
      setStep('confirming');

      await api.post('/api/agent/confirm-8004-registration', {
        agentId: registeredAgentId,
        txHash: linkReceipt.transactionHash,
      });

      // Step 5: Success
      setStep('success');
    } catch (err: any) {
      console.error('ERC-8004 registration failed:', err);
      setErrorMessage(
        err?.message?.includes('User rejected')
          ? 'Transaction was rejected. Please try again.'
          : err?.message ?? 'Registration failed. Please try again.',
      );
      setStep('error');
    }
  }, [account, walletAddress, sendAndConfirm]);

  const handleSkip = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleRetry = useCallback(() => {
    setStep('idle');
    setErrorMessage(null);
  }, []);

  /* ---- Progress indicator ------------------------------------------------ */

  function renderStepIndicator() {
    const steps = ['registering', 'linking', 'confirming'] as const;
    const currentIndex = steps.indexOf(step as (typeof steps)[number]);

    return (
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => {
          const info = STEP_INFO[s];
          const isActive = s === step;
          const isComplete = currentIndex > i;

          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isComplete
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'bg-primary/20 text-primary ring-2 ring-primary/40'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs transition-colors',
                  isActive
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {info.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-px w-6 transition-colors',
                    isComplete ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ---- Idle state -------------------------------------------------------- */

  if (step === 'idle') {
    return (
      <motion.div
        className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
        initial={m.fadeUp.initial}
        animate={m.fadeUp.animate}
        transition={m.spring}
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="size-8 text-primary" />
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Register Your Agent on ERC-8004
          </h2>
          <p className="mt-2 text-muted-foreground">
            Register your autonomous trading agent on-chain with the ERC-8004
            identity standard. This creates a verifiable on-chain identity for
            your agent.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button onClick={handleRegister}>Register on 8004</Button>
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
        </div>
      </motion.div>
    );
  }

  /* ---- Loading state ----------------------------------------------------- */

  if (step === 'registering' || step === 'linking' || step === 'confirming') {
    const info = STEP_INFO[step];

    return (
      <motion.div
        className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
        initial={m.fadeUp.initial}
        animate={m.fadeUp.animate}
        transition={m.spring}
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {info.description}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Please confirm the transaction in your wallet.
          </p>
        </div>

        {renderStepIndicator()}
      </motion.div>
    );
  }

  /* ---- Error state ------------------------------------------------------- */

  if (step === 'error') {
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
            Registration Failed
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button onClick={handleRetry}>Try Again</Button>
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
        </div>
      </motion.div>
    );
  }

  /* ---- Success state ----------------------------------------------------- */

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
          Agent #{agentId} registered on ERC-8004!
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your autonomous agent now has a verifiable on-chain identity.
        </p>
      </div>

      <a
        href={`https://www.8004scan.io/agents/${agentId}?chain=42220`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        View on 8004scan
        <ExternalLink className="size-3.5" />
      </a>

      <div className="flex w-full flex-col gap-3">
        <Button onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </motion.div>
  );
}
