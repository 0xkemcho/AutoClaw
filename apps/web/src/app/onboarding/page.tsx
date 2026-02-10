'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from 'thirdweb/react';
import { ConnectButton } from 'thirdweb/react';
import { client, wallets, walletTheme, connectButtonStyle } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';
import { fetchWithAuth } from '@/lib/api';
import { useEnsureAuth } from '@/providers/thirdweb-provider';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { Kbd } from '@/components/ui/kbd';
import type { RiskAnswers } from '@autoclaw/shared';
import { Spinner } from '@/components/ui/spinner';

const QUESTIONS = [
  {
    key: 'name' as const,
    question: "What's your name?",
    placeholder: 'Enter your name...',
    type: 'text' as const,
  },
  {
    key: 'experience' as const,
    question: 'How would you describe your investment experience?',
    type: 'chip' as const,
    options: [
      { label: 'Beginner', value: 'beginner' },
      { label: 'Some experience', value: 'some_experience' },
      { label: 'Advanced', value: 'advanced' },
    ],
  },
  {
    key: 'horizon' as const,
    question: "What's your investment horizon?",
    type: 'chip' as const,
    options: [
      { label: '< 6 months', value: 'short' },
      { label: '6-24 months', value: 'medium' },
      { label: '2+ years', value: 'long' },
    ],
  },
  {
    key: 'volatility' as const,
    question: 'How would you react if your portfolio dropped 20% in a week?',
    type: 'chip' as const,
    options: [
      { label: 'Sell everything', value: 'sell' },
      { label: 'Hold and wait', value: 'hold' },
      { label: 'Buy more', value: 'buy' },
    ],
  },
  {
    key: 'currencies' as const,
    question: 'Which currencies interest you most?',
    type: 'chip-multi' as const,
    options: [
      { label: 'USD', value: 'USD' },
      { label: 'EUR', value: 'EUR' },
      { label: 'GBP', value: 'GBP' },
      { label: 'BRL', value: 'BRL' },
      { label: 'KES', value: 'KES' },
      { label: 'JPY', value: 'JPY' },
      { label: 'Gold', value: 'XAUT' },
      { label: 'All', value: 'ALL' },
    ],
  },
  {
    key: 'investmentAmount' as const,
    question: 'How much are you planning to invest?',
    type: 'chip' as const,
    options: [
      { label: '< $100', value: 'under_100' },
      { label: '$100-$1,000', value: '100_1000' },
      { label: '$1,000-$10,000', value: '1000_10000' },
      { label: '$10,000+', value: 'over_10000' },
    ],
  },
] as const;

function getDisplayValue(q: (typeof QUESTIONS)[number], value: unknown): string {
  if (q.key === 'currencies') return (value as string[]).join(', ');
  if (q.type === 'text') return String(value || '');
  const options = 'options' in q ? q.options : [];
  return options.find((o) => o.value === value)?.label || String(value || '');
}

export default function OnboardingPage() {
  const account = useActiveAccount();
  const ensureAuth = useEnsureAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<RiskAnswers>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const hasCheckedRef = useRef(false);

  // Redirect if already onboarded — wait briefly for wallet to hydrate
  useEffect(() => {
    if (hasCheckedRef.current) return;

    if (account) {
      hasCheckedRef.current = true;
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setCheckingOnboarding(false);
        return;
      }
      fetchWithAuth('/api/auth/me', token)
        .then((data) => {
          if (data.onboarding_completed) {
            router.replace('/home');
          } else {
            setCheckingOnboarding(false);
          }
        })
        .catch(() => {
          setCheckingOnboarding(false);
        });
      return;
    }

    // Give wallet 500ms to hydrate before showing "connect wallet"
    const timeout = setTimeout(() => {
      if (!hasCheckedRef.current) {
        hasCheckedRef.current = true;
        setCheckingOnboarding(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [account, router]);

  useEffect(() => {
    if (step < QUESTIONS.length && QUESTIONS[step].type === 'text' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const isComplete = step >= QUESTIONS.length;

  // Keyboard shortcuts for chip selection
  useEffect(() => {
    if (isComplete) return;
    const currentQ = QUESTIONS[step];
    if (!currentQ || currentQ.type === 'text') return;

    const options = 'options' in currentQ ? currentQ.options : [];

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= options.length) {
        const option = options[num - 1];
        if (currentQ.type === 'chip') {
          handleChipSelect(currentQ.key, option.value);
        } else if (currentQ.type === 'chip-multi') {
          handleMultiChipSelect(currentQ.key, option.value);
        }
      }

      if (e.key === 'Enter' && currentQ.type === 'chip-multi') {
        const currencies = (answers.currencies || []) as string[];
        if (currencies.length > 0) {
          setStep((s) => s + 1);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, isComplete, answers]);

  const submitAnswers = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const token = await ensureAuth();
      if (!token) {
        setError('Could not authenticate. Please reconnect your wallet.');
        setSubmitting(false);
        return;
      }
      await fetchWithAuth('/api/user/risk-profile', token, {
        method: 'POST',
        body: JSON.stringify(answers),
      });
      router.push('/home');
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }, [answers, ensureAuth]);

  // Auto-submit when all questions are answered
  useEffect(() => {
    if (isComplete && !submitting && !error) {
      submitAnswers();
    }
  }, [isComplete, submitting, error, submitAnswers]);

  if (checkingOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center pt-32">
          <Spinner size="lg" />
        </main>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex flex-col items-center justify-center px-6 pt-32">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Connect your wallet
            </h2>
            <p className="text-foreground-secondary">
              Please connect your wallet to continue.
            </p>
            <ConnectButton
              client={client}
              wallets={wallets}
              chain={celo}
              theme={walletTheme}
              connectButton={{ label: 'Connect Wallet', style: connectButtonStyle }}
            />
          </div>
        </main>
      </div>
    );
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = (answers.name || '').trim();
    if (!name) return;
    setAnswers((prev) => ({ ...prev, name }));
    setStep((s) => s + 1);
  };

  const handleChipSelect = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setTimeout(() => setStep((s) => s + 1), 200);
  };

  const handleMultiChipSelect = (key: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[key as keyof RiskAnswers] as string[] | undefined) || [];
      if (value === 'ALL') return { ...prev, [key]: ['ALL'] };
      const filtered = current.filter((v) => v !== 'ALL');
      const updated = filtered.includes(value)
        ? filtered.filter((v) => v !== value)
        : [...filtered, value];
      return { ...prev, [key]: updated };
    });
  };

  const handleMultiSubmit = () => {
    const currencies = (answers.currencies || []) as string[];
    if (currencies.length === 0) return;
    setStep((s) => s + 1);
  };

  const currentQ = isComplete ? null : QUESTIONS[step];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-6 pt-10 pb-8">
        <div className="max-w-lg mx-auto">
          <AnimatePresence>
            {QUESTIONS.slice(0, step).map((q) => (
              <motion.div
                key={q.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 mb-5"
              >
                <svg
                  className="w-5 h-5 text-foreground-muted mt-0.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-foreground-muted text-lg">
                  {getDisplayValue(q, answers[q.key as keyof RiskAnswers])}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {!isComplete && currentQ && (
            <motion.div
              key={currentQ.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {currentQ.type === 'text' && (
                <form onSubmit={handleTextSubmit} className="flex items-center gap-3">
                  <span className="text-foreground text-2xl shrink-0 leading-none select-none">&#x203A;</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={(answers.name as string) || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={currentQ.placeholder}
                    className="w-full text-xl bg-transparent outline-none text-foreground placeholder:text-foreground-muted py-0 border-0"
                  />
                  <Kbd>↵</Kbd>
                </form>
              )}

              {(currentQ.type === 'chip' || currentQ.type === 'chip-multi') && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-bold text-foreground leading-tight">
                    {currentQ.question}
                  </h2>

                  {currentQ.type === 'chip' && currentQ.options && (
                    <ChipGroup
                      options={[...currentQ.options]}
                      selected={(answers[currentQ.key as keyof RiskAnswers] as string) || ''}
                      onSelect={(value) => handleChipSelect(currentQ.key, value)}
                      showShortcuts
                    />
                  )}

                  {currentQ.type === 'chip-multi' && currentQ.options && (
                    <div className="space-y-4">
                      <ChipGroup
                        options={[...currentQ.options]}
                        selected={(answers[currentQ.key as keyof RiskAnswers] as string[]) || []}
                        onSelect={(value) => handleMultiChipSelect(currentQ.key, value)}
                        multiSelect
                        showShortcuts
                      />
                      {((answers.currencies as string[] | undefined) || []).length > 0 && (
                        <Button onClick={handleMultiSubmit} size="sm">
                          Continue <Kbd className="ml-1.5">↵</Kbd>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-4"
            >
              {error ? (
                <div className="space-y-3">
                  <p className="text-error text-sm">{error}</p>
                  <Button onClick={submitAnswers} disabled={submitting} size="sm">
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Spinner size="md" />
                  <span className="text-foreground-secondary text-sm">Setting up your profile...</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
