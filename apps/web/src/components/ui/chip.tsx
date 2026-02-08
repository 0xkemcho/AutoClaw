'use client';

import { motion } from 'framer-motion';
import { Kbd } from '@/components/ui/kbd';

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  shortcut?: string;
}

export function Chip({ label, selected, onClick, shortcut }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-5 py-3 rounded-pill text-sm font-semibold transition-all border ${
        selected
          ? 'bg-black text-white border-black'
          : 'bg-white text-black border-gray-300 hover:border-black'
      }`}
    >
      {label}
      {shortcut && !selected && <Kbd>{shortcut}</Kbd>}
    </button>
  );
}

interface ChipGroupProps {
  options: { label: string; value: string }[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  showShortcuts?: boolean;
}

export function ChipGroup({
  options,
  selected,
  onSelect,
  multiSelect = false,
  showShortcuts = false,
}: ChipGroupProps) {
  const isSelected = (value: string) =>
    multiSelect ? (selected as string[]).includes(value) : selected === value;

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option, index) => (
        <motion.div
          key={option.value}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.04, duration: 0.2 }}
        >
          <Chip
            label={option.label}
            selected={isSelected(option.value)}
            onClick={() => onSelect(option.value)}
            shortcut={showShortcuts ? String(index + 1) : undefined}
          />
        </motion.div>
      ))}
    </div>
  );
}
