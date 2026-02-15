'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { formatFrequency } from '@autoclaw/shared';
import { useAgentStatus, useUpdateSettings } from '@/hooks/use-agent';
import { useMotionSafe } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CurrencyManager } from './currency-manager';

interface FormState {
  frequency: number;
  maxTradeSizeUsd: number;
  maxAllocationPct: number;
  dailyTradeLimit: number;
  stopLossPct: number;
  allowedCurrencies: string[];
  blockedCurrencies: string[];
  customPrompt: string;
}

function validate(state: FormState) {
  const errors: Record<string, string> = {};
  if (state.customPrompt.length > 500)
    errors.customPrompt = 'Must be 500 characters or less';
  return errors;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-4 w-64 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SliderField({
  label,
  tooltip,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  disabled,
  badge,
  formatValue,
}: {
  label: string;
  tooltip?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  disabled?: boolean;
  badge?: string;
  formatValue?: (value: number) => string;
}) {
  const displayValue = formatValue ? formatValue(value) : `${value}${suffix ?? ''}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className={disabled ? 'text-muted-foreground' : ''}>
            {label}
          </Label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {badge && (
            <span className="text-[11px] px-1.5 py-0 rounded-full border border-primary/30 text-primary bg-primary/10">
              {badge}
            </span>
          )}
        </div>
        <span className="text-sm font-mono tabular-nums text-muted-foreground">
          {displayValue}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </div>
  );
}

export function SettingsContent() {
  const m = useMotionSafe();
  const { data, isLoading } = useAgentStatus();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<FormState | null>(null);
  const [initialState, setInitialState] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data?.config || form !== null) return;
    const config = data.config;
    const state: FormState = {
      frequency: config.frequency,
      maxTradeSizeUsd: config.maxTradeSizeUsd,
      maxAllocationPct: config.maxAllocationPct,
      dailyTradeLimit: config.dailyTradeLimit,
      stopLossPct: config.stopLossPct,
      allowedCurrencies: [...config.allowedCurrencies],
      blockedCurrencies: [...config.blockedCurrencies],
      customPrompt: config.customPrompt ?? '',
    };
    setForm(state);
    setInitialState(state);
  }, [data, form]);

  const isDirty = useMemo(() => {
    if (!form || !initialState) return false;
    return JSON.stringify(form) !== JSON.stringify(initialState);
  }, [form, initialState]);

  const hasErrors = useMemo(
    () => Object.keys(errors).length > 0,
    [errors],
  );

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      setErrors(validate(next));
      return next;
    });
  }

  async function handleSave() {
    if (!form) return;
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        frequency: form.frequency,
        maxTradeSizeUsd: form.maxTradeSizeUsd,
        maxAllocationPct: form.maxAllocationPct,
        dailyTradeLimit: form.dailyTradeLimit,
        allowedCurrencies: form.allowedCurrencies,
        blockedCurrencies: form.blockedCurrencies,
        customPrompt: form.customPrompt || undefined,
      });
      setInitialState({ ...form });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !form) {
    return <SettingsSkeleton />;
  }

  return (
    <motion.div
      {...m.fadeUp}
      transition={m.spring}
      className="space-y-6"
    >
      {/* Card 1: Trading Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trading Frequency</CardTitle>
          <CardDescription>
            How often should your agent analyze markets and trade?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SliderField
            label="Frequency"
            tooltip="How many hours between each agent run. Lower values mean more frequent trading."
            value={form.frequency}
            onChange={(v) => updateField('frequency', v)}
            min={1}
            max={24}
            step={1}
            suffix=""
            formatValue={(v) => formatFrequency(v)}
          />
        </CardContent>
      </Card>

      {/* Card 2: Risk Guardrails */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Guardrails</CardTitle>
          <CardDescription>
            Set limits to control your agent&apos;s trading behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderField
            label="Max trade size"
            tooltip="Maximum percentage of your portfolio value that can be used in a single trade."
            value={form.maxTradeSizeUsd}
            onChange={(v) => updateField('maxTradeSizeUsd', v)}
            min={1}
            max={100}
            step={1}
            suffix="% of portfolio"
          />
          <SliderField
            label="Max allocation per currency"
            tooltip="Maximum percentage of your portfolio that can be allocated to a single currency."
            value={form.maxAllocationPct}
            onChange={(v) => updateField('maxAllocationPct', v)}
            min={1}
            max={100}
            step={1}
            suffix="%"
          />
          <SliderField
            label="Daily trade limit"
            tooltip="Maximum number of trades your agent can execute per day."
            value={form.dailyTradeLimit}
            onChange={(v) => updateField('dailyTradeLimit', v)}
            min={1}
            max={20}
            step={1}
          />
          <SliderField
            label="Stop loss"
            value={form.stopLossPct}
            onChange={() => {}}
            min={1}
            max={50}
            step={1}
            suffix="%"
            disabled
            badge="Coming soon"
          />
        </CardContent>
      </Card>

      {/* Card 3: Currencies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Currencies</CardTitle>
          <CardDescription>
            Choose which currencies your agent can trade. Click to toggle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencyManager
            allowedCurrencies={form.allowedCurrencies}
            onAllowedChange={(c) => updateField('allowedCurrencies', c)}
          />
        </CardContent>
      </Card>

      {/* Card 4: Custom Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom Prompt</CardTitle>
          <CardDescription>
            Give your agent additional trading instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.customPrompt}
            onChange={(e) => updateField('customPrompt', e.target.value)}
            maxLength={500}
            rows={6}
            placeholder="e.g., Focus on Latin American currencies with high volatility..."
          />
          <div className="mt-1.5 flex items-center justify-between">
            {errors.customPrompt ? (
              <p className="text-xs text-destructive">{errors.customPrompt}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted-foreground">
              {form.customPrompt.length} / 500
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={!isDirty || hasErrors || saving}
          className="h-12 px-8"
        >
          {saving && <Loader2 className="size-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </div>
    </motion.div>
  );
}
