'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import type { RiskAnswers } from '@autoclaw/shared';
import { useAuth } from '@/providers/auth-provider';
import { useSubmitRiskProfile } from '@/hooks/use-user';
import { api } from '@/lib/api-client';
import { AgentSelect } from './_components/agent-select';
import { Questionnaire } from './_components/questionnaire';
import { YieldSetup } from './_components/yield-setup';
import { FundWallet } from './_components/fund-wallet';
import { RegisterAgent } from './_components/register-agent';
import { useMotionSafe } from '@/lib/motion';

type Phase = 'agent-select' | 'questionnaire' | 'yield-setup' | 'funding' | 'registration';

export default function OnboardingPage() {
  const m = useMotionSafe();
  const { isOnboarded, walletAddress, refreshSession } = useAuth();
  const router = useRouter();
  const submitMutation = useSubmitRiskProfile();

  const [phase, setPhase] = useState<Phase>('agent-select');
  const [agentType, setAgentType] = useState<'fx' | 'yield'>('fx');
  const [submissionResult, setSubmissionResult] = useState<{
    serverWalletAddress: string | null;
    riskProfile: string;
  } | null>(null);
  const [lastAnswers, setLastAnswers] = useState<RiskAnswers | null>(null);

  // If already onboarded on initial load, redirect to dashboard
  useEffect(() => {
    if (isOnboarded) {
      router.replace('/fx-agent');
    }
  }, [isOnboarded, router]);

  const handleComplete = useCallback(
    async (answers: RiskAnswers) => {
      setLastAnswers(answers);
      submitMutation.mutate(answers, {
        onSuccess: (data) => {
          setSubmissionResult({
            serverWalletAddress: data.serverWalletAddress,
            riskProfile: data.riskProfile,
          });
          setPhase('funding');
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
        },
      });
    },
    [submitMutation],
  );

  const handleRetry = useCallback(() => {
    if (lastAnswers) {
      handleComplete(lastAnswers);
    }
  }, [lastAnswers, handleComplete]);

  const handleFundingContinue = useCallback(() => {
    setPhase('registration');
  }, []);

  // Called when registration completes (or is skipped) — marks onboarding done
  const handleOnboardingDone = useCallback(async () => {
    const redirectPath = agentType === 'yield' ? '/yield-agent' : '/fx-agent';
    try {
      await api.post('/api/user/complete-onboarding', {});
      await refreshSession();
      router.push(redirectPath);
    } catch {
      // Even if marking fails, send them to the dashboard
      router.push(redirectPath);
    }
  }, [agentType, refreshSession, router]);

  if (isOnboarded) return null;

  return (
    <AnimatePresence mode="wait">
      {phase === 'agent-select' && (
        <motion.div
          key="agent-select"
          initial={m.fadeUp.initial}
          animate={m.fadeUp.animate}
          exit={{ opacity: 0, y: -20 }}
          transition={m.spring}
          className="flex w-full justify-center"
        >
          <AgentSelect
            onSelect={(type) => {
              setAgentType(type);
              setPhase(type === 'yield' ? 'yield-setup' : 'questionnaire');
            }}
          />
        </motion.div>
      )}

      {phase === 'questionnaire' && (
        <motion.div
          key="questionnaire"
          initial={m.fadeUp.initial}
          animate={m.fadeUp.animate}
          exit={{ opacity: 0, y: -20 }}
          transition={m.spring}
          className="flex w-full justify-center"
        >
          <Questionnaire
            onComplete={handleComplete}
            isSubmitting={submitMutation.isPending}
          />
        </motion.div>
      )}

      {phase === 'yield-setup' && (
        <motion.div
          key="yield-setup"
          initial={m.fadeUp.initial}
          animate={m.fadeUp.animate}
          exit={{ opacity: 0, y: -20 }}
          transition={m.spring}
          className="flex w-full justify-center"
        >
          <YieldSetup
            onComplete={(result) => {
              setSubmissionResult({
                serverWalletAddress: result.serverWalletAddress,
                riskProfile: result.riskProfile,
              });
              setPhase('funding');
            }}
            isSubmitting={false}
          />
        </motion.div>
      )}

      {phase === 'funding' && (
        <motion.div
          key="funding"
          initial={m.fadeUp.initial}
          animate={m.fadeUp.animate}
          exit={{ opacity: 0, y: -20 }}
          transition={m.spring}
          className="flex w-full justify-center"
        >
          <FundWallet
            serverWalletAddress={submissionResult?.serverWalletAddress ?? null}
            riskProfile={submissionResult?.riskProfile ?? 'moderate'}
            onRetry={handleRetry}
            isRetrying={submitMutation.isPending}
            onContinue={handleFundingContinue}
          />
        </motion.div>
      )}

      {phase === 'registration' && (
        <motion.div
          key="registration"
          initial={m.fadeUp.initial}
          animate={m.fadeUp.animate}
          exit={{ opacity: 0, y: -20 }}
          transition={m.spring}
          className="flex w-full justify-center"
        >
          <RegisterAgent
            serverWalletAddress={submissionResult?.serverWalletAddress ?? null}
            walletAddress={walletAddress ?? ''}
            onDone={handleOnboardingDone}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
