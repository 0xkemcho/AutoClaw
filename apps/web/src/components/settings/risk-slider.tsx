'use client';

interface RiskSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function RiskSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: RiskSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-bold text-accent-text">
          {value}
          {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent w-full h-2 rounded-pill appearance-none bg-background-secondary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-muted">
          {min}
          {unit}
        </span>
        <span className="text-xs text-foreground-muted">
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}
