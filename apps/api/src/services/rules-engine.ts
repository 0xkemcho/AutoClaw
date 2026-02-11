import type { Signal, GuardrailCheck } from '@autoclaw/shared';

interface AgentConfigForRules {
  maxTradeSizeUsd: number;
  maxAllocationPct: number;
  stopLossPct: number;
  dailyTradeLimit: number;
  allowedCurrencies: string[];
  blockedCurrencies: string[];
}

interface PositionForRules {
  tokenSymbol: string;
  balance: number;
}

/**
 * Check a trading signal against all user guardrails.
 * Rules are checked in priority order — first failure short-circuits.
 */
export function checkGuardrails(params: {
  signal: Signal;
  config: AgentConfigForRules;
  positions: PositionForRules[];
  portfolioValueUsd: number;
  tradesToday: number;
  tradeAmountUsd: number;
}): GuardrailCheck {
  const { signal, config, positions, portfolioValueUsd, tradesToday, tradeAmountUsd } = params;

  // 1. Currency must be allowed and not blocked
  if (config.allowedCurrencies.length > 0 && !config.allowedCurrencies.includes(signal.currency)) {
    return {
      passed: false,
      blockedReason: `${signal.currency} is not in allowed currencies`,
      ruleName: 'allowed_currencies',
    };
  }

  if (config.blockedCurrencies.includes(signal.currency)) {
    return {
      passed: false,
      blockedReason: `${signal.currency} is blocked`,
      ruleName: 'blocked_currencies',
    };
  }

  // 2. Daily trade limit
  if (tradesToday >= config.dailyTradeLimit) {
    return {
      passed: false,
      blockedReason: `Daily trade limit reached (${config.dailyTradeLimit})`,
      ruleName: 'daily_trade_limit',
    };
  }

  // 3. Max trade size
  if (tradeAmountUsd > config.maxTradeSizeUsd) {
    return {
      passed: false,
      blockedReason: `Trade size $${tradeAmountUsd} exceeds max $${config.maxTradeSizeUsd}`,
      ruleName: 'max_trade_size',
    };
  }

  // 4. Max allocation per currency (only applies to buys)
  if (signal.direction === 'buy' && portfolioValueUsd > 0) {
    const currentPosition = positions.find((p) => p.tokenSymbol === signal.currency);
    const currentValueUsd = currentPosition?.balance ?? 0;
    const postTradeValueUsd = currentValueUsd + tradeAmountUsd;
    const postTradeAllocationPct = (postTradeValueUsd / (portfolioValueUsd + tradeAmountUsd)) * 100;

    if (postTradeAllocationPct > config.maxAllocationPct) {
      return {
        passed: false,
        blockedReason: `Post-trade allocation ${postTradeAllocationPct.toFixed(1)}% exceeds max ${config.maxAllocationPct}%`,
        ruleName: 'max_allocation',
      };
    }
  }

  // 5. Stop-loss check (only applies to sells — checks if loss exceeds threshold)
  if (signal.direction === 'sell') {
    const position = positions.find((p) => p.tokenSymbol === signal.currency);
    if (position && position.balance > 0) {
      // If the position has an avg entry rate, we'd check loss here.
      // For now, the stop-loss is checked externally by comparing current rate vs entry rate.
      // This rule will be refined in Part 2 when we have real-time price data.
    }
  }

  return { passed: true };
}

/**
 * Calculate trade amount based on confidence score and max trade size.
 * Higher confidence = larger trade.
 */
export function calculateTradeAmount(confidence: number, maxTradeSizeUsd: number): number {
  if (confidence >= 90) return maxTradeSizeUsd;
  if (confidence >= 80) return maxTradeSizeUsd * 0.75;
  if (confidence >= 70) return maxTradeSizeUsd * 0.5;
  if (confidence >= 60) return maxTradeSizeUsd * 0.25;
  return 0; // Below 60% confidence, no trade
}
