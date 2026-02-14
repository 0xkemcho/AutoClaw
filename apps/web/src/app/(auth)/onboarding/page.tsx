'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import type { RiskAnswers } from '@autoclaw/shared';
import { useAuth } from '@/providers/auth-provider';
import { useSubmitRiskProfile } from '@/hooks/use-user';
import { Questionnaire } from './_components/questionnaire';
import { FundWallet } from './_components/fund-wallet';
import { RegisterAgent } from './_components/register-agent';
import { useMotionSafe } from '@/lib/motion';

type Phase = 'questionnaire' | 'funding' | 'registration';

export default function OnboardingPage() {
  const m = useMotionSafe();
  const { isOnboarded, walletAddress, refreshSession } = useAuth();
  const router = useRouter();
  const submitMutation = useSubmitRiskProfile();

  const [phase, setPhase] = useState<Phase>('questionnaire');
  const [submissionResult, setSubmissionResult] = useState<{
    serverWalletAddress: string | null;
    riskProfile: string;
  } | null>(null);
  const [lastAnswers, setLastAnswers] = useState<RiskAnswers | null>(null);

  // If already onboarded, redirect to dashboard
  useEffect(() => {
    if (isOnboarded) {
      router.replace('/dashboard');
    }
  }, [isOnboarded, router]);

  const handleComplete = useCallback(
    async (answers: RiskAnswers) => {
      setLastAnswers(answers);
      submitMutation.mutate(answers, {
        onSuccess: async (data) => {
          setSubmissionResult({
            serverWalletAddress: data.serverWalletAddress,
            riskProfile: data.riskProfile,
          });
          // Refresh auth session to update isOnboarded
          await refreshSession();
          setPhase('funding');
        },
      });
    },
    [submitMutation, refreshSession],
  );

  const handleRetry = useCallback(() => {
    if (lastAnswers) {
      handleComplete(lastAnswers);
    }
  }, [lastAnswers, handleComplete]);

  const handleFundingContinue = useCallback(() => {
    setPhase('registration');
  }, []);

  if (isOnboarded) return null;

  return (
    <AnimatePresence mode="wait">
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
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
