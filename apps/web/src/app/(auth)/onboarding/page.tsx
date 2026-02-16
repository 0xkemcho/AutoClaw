'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import type { RiskAnswers } from '@autoclaw/shared';
import { useAuth } from '@/providers/auth-provider';
import { useSubmitRiskProfile } from '@/hooks/use-user';
import { api, ApiError } from '@/lib/api-client';
import { AgentSelect } from './_components/agent-select';
import { Questionnaire } from './_components/questionnaire';
import { YieldSetup } from './_components/yield-setup';
import { FundWallet } from './_components/fund-wallet';
import { RegisterAgent } from './_components/register-agent';
import { useMotionSafe } from '@/lib/motion';

type Phase = 'agent-select' | 'questionnaire' | 'yield-setup' | 'funding' | 'registration';

function OnboardingContent() {
  const m = useMotionSafe();
  const { isOnboarded, walletAddress, refreshSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const submitMutation = useSubmitRiskProfile();

  // If ?agent= is specified, skip agent-select and go straight to the right step
  const preselectedAgent = searchParams.get('agent') as 'fx' | 'yield' | null;
  const step = searchParams.get('step');
  const initialPhase: Phase =
    step === 'register' && preselectedAgent
      ? 'registration'
      : preselectedAgent === 'yield'
        ? 'yield-setup'
        : preselectedAgent === 'fx'
          ? 'questionnaire'
          : 'agent-select';
  const initialAgentType: 'fx' | 'yield' = preselectedAgent === 'yield' ? 'yield' : 'fx';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [agentType, setAgentType] = useState<'fx' | 'yield'>(initialAgentType);
  const [submissionResult, setSubmissionResult] = useState<{
    serverWalletAddress: string | null;
    riskProfile: string;
  } | null>(null);
  const [lastAnswers, setLastAnswers] = useState<RiskAnswers | null>(null);

  // If already onboarded and no specific agent requested, redirect to overview
  useEffect(() => {
    if (isOnboarded && !preselectedAgent) {
      router.replace('/overview');
    }
  }, [isOnboarded, preselectedAgent, router]);

  // When entering registration via step=register, fetch agent config for submissionResult
  useEffect(() => {
    if (phase !== 'registration' || submissionResult !== null) return;

    const fetchAgentConfig = async () => {
      try {
        if (agentType === 'yield') {
          const data = await api.get<{ config: { serverWalletAddress: string | null } }>(
            '/api/yield-agent/status',
          );
          setSubmissionResult({
            serverWalletAddress: data.config?.serverWalletAddress ?? null,
            riskProfile: 'moderate',
          });
        } else {
          const data = await api.get<{ config: { serverWalletAddress: string | null } }>(
            '/api/agent/status',
          );
          setSubmissionResult({
            serverWalletAddress: data.config?.serverWalletAddress ?? null,
            riskProfile: 'moderate',
          });
        }
      } catch (err) {
        // Agent not configured — redirect to setup flow
        if (err instanceof ApiError && err.status === 404) {
          setPhase(agentType === 'yield' ? 'yield-setup' : 'questionnaire');
        } else {
          toast.error('Failed to load agent. Please try again.');
        }
      }
    };

    fetchAgentConfig();
  }, [phase, submissionResult, agentType]);

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

  // Skip onboarding entirely — marks onboarded with no agents, user sees hero CTAs
  const handleSkipOnboarding = useCallback(async () => {
    try {
      await api.post('/api/user/complete-onboarding', {});
      await refreshSession();
    } catch {
      // Non-fatal
    }
    router.push('/overview');
  }, [refreshSession, router]);

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

  if (isOnboarded && !preselectedAgent) return null;

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
              router.replace(`/onboarding?agent=${type}`);
              setAgentType(type);
              setPhase(type === 'yield' ? 'yield-setup' : 'questionnaire');
            }}
            onSkip={handleSkipOnboarding}
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
            agentType={agentType}
            serverWalletAddress={submissionResult?.serverWalletAddress ?? null}
            walletAddress={walletAddress ?? ''}
            onDone={handleOnboardingDone}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
