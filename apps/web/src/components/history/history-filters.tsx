'use client';

import { type TimelineFilters } from '@/hooks/use-agent';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

const EVENT_TYPES = [
  { label: 'All types', value: '' },
  { label: 'Trade', value: 'trade' },
  { label: 'Analysis', value: 'analysis' },
  { label: 'Funding', value: 'funding' },
  { label: 'Guardrail', value: 'guardrail' },
  { label: 'System', value: 'system' },
] as const;

const CURRENCIES = [
  { label: 'All currencies', value: '' },
  { label: 'EURm', value: 'EURm' },
  { label: 'BRLm', value: 'BRLm' },
  { label: 'KESm', value: 'KESm' },
  { label: 'PHPm', value: 'PHPm' },
  { label: 'COPm', value: 'COPm' },
  { label: 'XOFm', value: 'XOFm' },
  { label: 'NGNm', value: 'NGNm' },
  { label: 'JPYm', value: 'JPYm' },
  { label: 'CHFm', value: 'CHFm' },
  { label: 'ZARm', value: 'ZARm' },
  { label: 'GBPm', value: 'GBPm' },
  { label: 'AUDm', value: 'AUDm' },
  { label: 'CADm', value: 'CADm' },
  { label: 'GHSm', value: 'GHSm' },
  { label: 'XAUT', value: 'XAUT' },
] as const;

interface HistoryFiltersProps {
  filters: TimelineFilters;
  onFiltersChange: (f: TimelineFilters) => void;
}

export function HistoryFilters({ filters, onFiltersChange }: HistoryFiltersProps) {
  const hasActiveFilters = !!filters.type || !!filters.currency;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.type ?? ''}
        onChange={(e) =>
          onFiltersChange({ ...filters, type: e.target.value || undefined })
        }
        className="bg-background-secondary border border-border rounded-card px-3 py-2 text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {EVENT_TYPES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={filters.currency ?? ''}
        onChange={(e) =>
          onFiltersChange({ ...filters, currency: e.target.value || undefined })
        }
        className="bg-background-secondary border border-border rounded-card px-3 py-2 text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {CURRENCIES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({})}
          className="flex items-center gap-1.5"
        >
          <RotateCcw size={14} />
          Reset
        </Button>
      )}
    </div>
  );
}
