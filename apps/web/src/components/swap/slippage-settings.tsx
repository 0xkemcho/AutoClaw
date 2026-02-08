'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings2 } from 'lucide-react';

interface SlippageSettingsProps {
  value: number;
  onChange: (value: number) => void;
}

const PRESETS = [0.1, 0.5, 1.0];

export function SlippageSettings({ value, onChange }: SlippageSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const isCustom = !PRESETS.includes(value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.01 && num <= 50) {
      onChange(num);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
      >
        <Settings2 size={14} />
        <span>{value}% slippage</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-background rounded-xl border border-border shadow-lg p-3 z-50 w-56">
          <p className="text-xs font-medium text-foreground mb-2">
            Slippage tolerance
          </p>

          <div className="flex gap-1.5 mb-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onChange(preset);
                  setCustomValue('');
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  value === preset && !isCustom
                    ? 'bg-foreground text-white'
                    : 'bg-background-secondary text-foreground hover:bg-border'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Custom"
              value={isCustom ? String(value) : customValue}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  handleCustomChange(val);
                }
              }}
              className="w-full px-3 py-1.5 text-xs bg-background-secondary rounded-lg border-none outline-none focus:ring-2 focus:ring-accent/20 placeholder:text-foreground-muted"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
