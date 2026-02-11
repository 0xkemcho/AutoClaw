'use client';

const CURRENCIES = [
  { symbol: 'EURm', flag: '\u{1F1EA}\u{1F1FA}', name: 'Euro' },
  { symbol: 'BRLm', flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazilian Real' },
  { symbol: 'KESm', flag: '\u{1F1F0}\u{1F1EA}', name: 'Kenyan Shilling' },
  { symbol: 'PHPm', flag: '\u{1F1F5}\u{1F1ED}', name: 'Philippine Peso' },
  { symbol: 'COPm', flag: '\u{1F1E8}\u{1F1F4}', name: 'Colombian Peso' },
  { symbol: 'XOFm', flag: '\u{1F1F8}\u{1F1F3}', name: 'CFA Franc' },
  { symbol: 'NGNm', flag: '\u{1F1F3}\u{1F1EC}', name: 'Nigerian Naira' },
  { symbol: 'JPYm', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japanese Yen' },
  { symbol: 'CHFm', flag: '\u{1F1E8}\u{1F1ED}', name: 'Swiss Franc' },
  { symbol: 'ZARm', flag: '\u{1F1FF}\u{1F1E6}', name: 'South African Rand' },
  { symbol: 'GBPm', flag: '\u{1F1EC}\u{1F1E7}', name: 'British Pound' },
  { symbol: 'AUDm', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australian Dollar' },
  { symbol: 'CADm', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canadian Dollar' },
  { symbol: 'GHSm', flag: '\u{1F1EC}\u{1F1ED}', name: 'Ghanaian Cedi' },
  { symbol: 'XAUT', flag: '\u{1F947}', name: 'Gold' },
] as const;

interface CurrencyGridProps {
  selected: string[];
  blocked: string[];
  onSelectedChange: (v: string[]) => void;
  onBlockedChange: (v: string[]) => void;
}

export function CurrencyGrid({
  selected,
  blocked,
  onSelectedChange,
  onBlockedChange,
}: CurrencyGridProps) {
  const handleToggle = (symbol: string) => {
    // If blocked, unblock first
    if (blocked.includes(symbol)) {
      onBlockedChange(blocked.filter((s) => s !== symbol));
      return;
    }

    // Toggle selection
    if (selected.includes(symbol)) {
      onSelectedChange(selected.filter((s) => s !== symbol));
    } else {
      onSelectedChange([...selected, symbol]);
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    symbol: string,
  ) => {
    e.preventDefault();
    // Toggle blocked status
    if (blocked.includes(symbol)) {
      onBlockedChange(blocked.filter((s) => s !== symbol));
    } else {
      // Remove from selected if it was selected
      if (selected.includes(symbol)) {
        onSelectedChange(selected.filter((s) => s !== symbol));
      }
      onBlockedChange([...blocked, symbol]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {CURRENCIES.map((currency) => {
          const isSelected = selected.includes(currency.symbol);
          const isBlocked = blocked.includes(currency.symbol);

          return (
            <button
              key={currency.symbol}
              type="button"
              onClick={() => handleToggle(currency.symbol)}
              onContextMenu={(e) => handleContextMenu(e, currency.symbol)}
              title={`${currency.name}${isBlocked ? ' (blocked)' : ''}`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-pill text-sm font-medium transition-all border ${
                isBlocked
                  ? 'border-red-500/50 bg-red-500/10 text-red-400 line-through'
                  : isSelected
                    ? 'border-accent bg-accent/10 text-accent-text'
                    : 'border-border bg-background-secondary text-foreground-muted hover:border-foreground-muted'
              }`}
            >
              <span className="text-base leading-none">{currency.flag}</span>
              <span>{currency.symbol}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-foreground-muted">
        Click to select. Right-click to block.
      </p>
    </div>
  );
}
