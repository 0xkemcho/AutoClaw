'use client';

import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SliderFieldProps {
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
}

export function SliderField({
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
}: SliderFieldProps) {
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
