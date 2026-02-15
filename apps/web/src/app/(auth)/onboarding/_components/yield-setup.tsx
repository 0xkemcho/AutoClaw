'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useMotionSafe } from '@/lib/motion';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Gauge, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YieldSetupProps {
  onComplete: (result: {
    serverWalletAddress: string | null;
    riskProfile: string;
  }) => void;
  isSubmitting: boolean;
}

const RISK_OPTIONS = [
  {
    value: 'conservative',
    label: 'Conservative',
    desc: 'Lower risk vaults with stable yields',
    icon: Shield,
  },
  {
    value: 'moderate',
    label: 'Moderate',
    desc: 'Balanced risk-reward across vaults',
    icon: Gauge,
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    desc: 'Higher risk vaults for maximum yield',
    icon: Zap,
  },
] as const;

const FREQUENCY_OPTIONS = [
  { value: '4', label: 'Every 4 hours' },
  { value: '8', label: 'Every 8 hours' },
  { value: '12', label: 'Every 12 hours' },
  { value: '24', label: 'Every 24 hours' },
] as const;

export function YieldSetup({ onComplete }: YieldSetupProps) {
  const m = useMotionSafe();
  const [riskProfile, setRiskProfile] = useState<string>('moderate');
  const [frequency, setFrequency] = useState<string>('12');
  const [autoCompound, setAutoCompound] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const data = await api.post<{
        serverWalletAddress: string | null;
        riskProfile: string;
      }>('/api/yield-agent/register', {
        riskProfile,
        frequency: Number(frequency),
        autoCompound,
      });
      onComplete({
        serverWalletAddress: data.serverWalletAddress,
        riskProfile: data.riskProfile,
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to register yield agent. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="flex w-full max-w-lg flex-col gap-8"
      initial={m.fadeUp.initial}
      animate={m.fadeUp.animate}
      transition={m.spring}
    >
      <div>
        <p className="mb-1 text-sm text-muted-foreground">Yield Agent Setup</p>
        <h2 className="text-2xl font-bold tracking-tight">
          Configure Your Strategy
        </h2>
        <p className="mt-1 text-muted-foreground">
          Set your risk tolerance and automation preferences.
        </p>
      </div>

      {/* Risk Profile Selection */}
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Risk Tolerance</Label>
        <div className="flex flex-col gap-3">
          {RISK_OPTIONS.map((opt) => {
            const isSelected = riskProfile === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setRiskProfile(opt.value)}
                disabled={submitting}
                className={cn(
                  'flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground',
                  submitting && 'pointer-events-none opacity-50',
                )}
              >
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg',
                    isSelected ? 'bg-primary/20' : 'bg-muted',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-5',
                      isSelected
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                  />
                </div>
                <div>
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frequency & Auto-Compound */}
      <Card className="border-border">
        <CardContent className="flex flex-col gap-6 p-6">
          {/* Frequency */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="frequency" className="text-sm font-medium">
              Check Frequency
            </Label>
            <Select
              value={frequency}
              onValueChange={setFrequency}
              disabled={submitting}
            >
              <SelectTrigger id="frequency" className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often the agent checks vault performance and rebalances.
            </p>
          </div>

          {/* Auto-Compound */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="auto-compound" className="text-sm font-medium">
                Auto-Compound Rewards
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically reinvest earned rewards back into vaults.
              </p>
            </div>
            <Switch
              id="auto-compound"
              checked={autoCompound}
              onCheckedChange={setAutoCompound}
              disabled={submitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={submitting || !riskProfile}
        size="lg"
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Setting up agent...
          </>
        ) : (
          'Continue'
        )}
      </Button>
    </motion.div>
  );
}
