'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUpdateSettings, AgentConfig } from '@/hooks/use-agent';
import { FrequencySelector } from '@/components/settings/frequency-selector';
import { RiskSlider } from '@/components/settings/risk-slider';
import { CurrencyGrid } from '@/components/settings/currency-grid';
import { WalletSection } from '@/components/settings/wallet-section';

interface SettingsFormProps {
  config: AgentConfig;
}

export function SettingsForm({ config }: SettingsFormProps) {
  const updateSettings = useUpdateSettings();

  // Local form state initialized from the config prop
  const [frequency, setFrequency] = useState(config.frequency);
  const [maxTradeSizeUsd, setMaxTradeSizeUsd] = useState(config.maxTradeSizeUsd);
  const [maxAllocationPct, setMaxAllocationPct] = useState(config.maxAllocationPct);
  const [stopLossPct, setStopLossPct] = useState(config.stopLossPct);
  const [dailyTradeLimit, setDailyTradeLimit] = useState(config.dailyTradeLimit);
  const [allowedCurrencies, setAllowedCurrencies] = useState<string[]>(
    config.allowedCurrencies ?? [],
  );
  const [blockedCurrencies, setBlockedCurrencies] = useState<string[]>(
    config.blockedCurrencies ?? [],
  );
  const [customPrompt, setCustomPrompt] = useState(config.customPrompt ?? '');

  const handleSave = () => {
    updateSettings.mutate(
      {
        frequency,
        maxTradeSizeUsd,
        maxAllocationPct,
        stopLossPct,
        dailyTradeLimit,
        allowedCurrencies: allowedCurrencies.length > 0 ? allowedCurrencies : null,
        blockedCurrencies: blockedCurrencies.length > 0 ? blockedCurrencies : null,
        customPrompt: customPrompt.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Settings saved successfully');
        },
        onError: () => {
          toast.error('Failed to save settings');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Trading Frequency */}
      <Card>
        <h2 className="text-base font-semibold text-foreground mb-1">
          Trading Frequency
        </h2>
        <p className="text-sm text-foreground-muted mb-4">
          How often the agent analyzes markets and places trades.
        </p>
        <FrequencySelector value={frequency} onChange={setFrequency} />
      </Card>

      {/* Risk Parameters */}
      <Card>
        <h2 className="text-base font-semibold text-foreground mb-1">
          Risk Parameters
        </h2>
        <p className="text-sm text-foreground-muted mb-6">
          Control position sizing, allocation limits, and stop losses.
        </p>
        <div className="space-y-8">
          <RiskSlider
            label="Max Trade Size"
            value={maxTradeSizeUsd}
            min={10}
            max={1000}
            step={10}
            unit="$"
            onChange={setMaxTradeSizeUsd}
          />
          <RiskSlider
            label="Max Allocation"
            value={maxAllocationPct}
            min={5}
            max={100}
            step={5}
            unit="%"
            onChange={setMaxAllocationPct}
          />
          <RiskSlider
            label="Stop Loss"
            value={stopLossPct}
            min={1}
            max={50}
            step={1}
            unit="%"
            onChange={setStopLossPct}
          />
          <RiskSlider
            label="Daily Trade Limit"
            value={dailyTradeLimit}
            min={1}
            max={20}
            step={1}
            onChange={setDailyTradeLimit}
          />
        </div>
      </Card>

      {/* Currency Selection */}
      <Card>
        <h2 className="text-base font-semibold text-foreground mb-1">
          Currencies
        </h2>
        <p className="text-sm text-foreground-muted mb-4">
          Select which Mento currencies the agent can trade.
        </p>
        <CurrencyGrid
          selected={allowedCurrencies}
          blocked={blockedCurrencies}
          onSelectedChange={setAllowedCurrencies}
          onBlockedChange={setBlockedCurrencies}
        />
      </Card>

      {/* Agent Instructions */}
      <Card>
        <h2 className="text-base font-semibold text-foreground mb-1">
          Agent Instructions
        </h2>
        <p className="text-sm text-foreground-muted mb-4">
          Custom guidance for the AI agent when making trading decisions.
        </p>
        <div className="relative">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value.slice(0, 500))}
            placeholder="e.g. Be conservative with emerging market currencies. Prioritize EUR and GBP."
            rows={4}
            className="w-full bg-background-secondary border border-border rounded-card px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 resize-none focus:outline-none focus:border-accent transition-colors"
          />
          <span className="absolute bottom-3 right-3 text-xs text-foreground-muted">
            {customPrompt.length}/500
          </span>
        </div>
      </Card>

      {/* Wallet */}
      <Card>
        <h2 className="text-base font-semibold text-foreground mb-1">
          Agent Wallet
        </h2>
        <p className="text-sm text-foreground-muted mb-4">
          Your server-managed wallet for agent operations. Fund it to enable
          trading.
        </p>
        <WalletSection walletAddress={config.serverWalletAddress} />
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-4">
        <Button
          variant="cta"
          size="md"
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="flex items-center gap-2"
        >
          <Save size={16} />
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
