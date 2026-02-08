'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import {
  MENTO_TOKENS,
  BASE_TOKENS,
  COMMODITY_TOKENS,
  TOKEN_METADATA,
} from '@autoclaw/shared';

export interface TokenOption {
  symbol: string;
  name: string;
  flag: string;
  balance?: string;
}

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: string) => void;
  title?: string;
  /** Which tokens to show: 'base' for USDC/USDT, 'target' for Mento + XAUT, 'all' for everything */
  tokenFilter?: 'base' | 'target' | 'all';
  balances?: Record<string, string>;
  selectedToken?: string;
}

function getTokenList(filter: 'base' | 'target' | 'all'): string[] {
  switch (filter) {
    case 'base':
      return [...BASE_TOKENS];
    case 'target':
      return [...MENTO_TOKENS, ...COMMODITY_TOKENS];
    case 'all':
      return [...BASE_TOKENS, ...MENTO_TOKENS, ...COMMODITY_TOKENS];
  }
}

export function TokenSelectorModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select token',
  tokenFilter = 'all',
  balances = {},
  selectedToken,
}: TokenSelectorModalProps) {
  const [search, setSearch] = useState('');

  const tokens = useMemo(() => {
    const list = getTokenList(tokenFilter);
    const query = search.toLowerCase().trim();
    if (!query) return list;

    return list.filter((symbol) => {
      const meta = TOKEN_METADATA[symbol];
      if (!meta) return false;
      return (
        symbol.toLowerCase().includes(query) ||
        meta.name.toLowerCase().includes(query) ||
        meta.flag.includes(query)
      );
    });
  }, [tokenFilter, search]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setSearch('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-background rounded-t-2xl md:rounded-2xl max-h-[80vh] md:max-h-[500px] md:w-[400px] flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-background-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
                />
                <input
                  type="text"
                  placeholder="Search by name or symbol..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-background-secondary rounded-xl border-none outline-none focus:ring-2 focus:ring-accent/20 placeholder:text-foreground-muted"
                  autoFocus
                />
              </div>
            </div>

            {/* Token list */}
            <div className="flex-1 overflow-y-auto px-2 pb-5">
              {tokens.length === 0 && (
                <p className="text-center text-foreground-muted text-sm py-8">
                  No tokens found
                </p>
              )}

              {tokens.map((symbol) => {
                const meta = TOKEN_METADATA[symbol];
                if (!meta) return null;
                const isSelected = symbol === selectedToken;
                const isGold = symbol === 'XAUT';
                const balance = balances[symbol];

                return (
                  <button
                    key={symbol}
                    onClick={() => handleSelect(symbol)}
                    disabled={isSelected}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-background-secondary cursor-default'
                        : 'hover:bg-background-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{meta.flag}</span>
                      <div className="text-left">
                        <p
                          className={`text-sm font-semibold ${
                            isGold ? 'text-gold' : 'text-foreground'
                          }`}
                        >
                          {symbol}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {meta.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {balance !== undefined && (
                        <p className="text-sm text-foreground-secondary font-medium">
                          {balance}
                        </p>
                      )}
                      {isSelected && (
                        <p className="text-xs text-accent font-medium">
                          Selected
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
