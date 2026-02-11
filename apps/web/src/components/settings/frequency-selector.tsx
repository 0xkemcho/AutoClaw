'use client';

import { Clock, TrendingUp, Zap } from 'lucide-react';

interface FrequencyOption {
  value: string;
  label: string;
  description: string;
  icon: typeof Clock;
}

const OPTIONS: FrequencyOption[] = [
  {
    value: 'daily',
    label: 'Conservative',
    description: 'Once per day',
    icon: Clock,
  },
  {
    value: '4h',
    label: 'Moderate',
    description: 'Every 4 hours',
    icon: TrendingUp,
  },
  {
    value: 'hourly',
    label: 'Aggressive',
    description: 'Every hour',
    icon: Zap,
  },
];

interface FrequencySelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export function FrequencySelector({ value, onChange }: FrequencySelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-card-lg border-2 transition-all text-center ${
              isActive
                ? 'border-accent bg-accent/10 text-accent-text'
                : 'border-border bg-background-card text-foreground-muted hover:border-foreground-muted hover:bg-background-secondary'
            }`}
          >
            <Icon
              size={20}
              strokeWidth={isActive ? 2.5 : 1.5}
              className={isActive ? 'text-accent-text' : 'text-foreground-muted'}
            />
            <span className="text-sm font-semibold">{option.label}</span>
            <span className="text-xs text-foreground-muted">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
