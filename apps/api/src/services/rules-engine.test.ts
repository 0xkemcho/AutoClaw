import { checkGuardrails, calculateTradeAmount } from './rules-engine';

// ---------------------------------------------------------------------------
// Helpers – reusable defaults to keep individual tests focused
// ---------------------------------------------------------------------------

function makeSignal(overrides: Partial<{ currency: string; direction: 'buy' | 'sell'; confidence: number; reasoning: string }> = {}) {
  return {
    currency: 'CELO',
    direction: 'buy' as const,
    confidence: 85,
    reasoning: 'test signal',
    ...overrides,
  };
}

function makeConfig(overrides: Partial<{
  maxTradeSizePct: number;
  maxAllocationPct: number;
  stopLossPct: number;
  dailyTradeLimit: number;
  allowedCurrencies: string[];
  blockedCurrencies: string[];
  availableBuyingPowerUsd: number;
}> = {}) {
  return {
    maxTradeSizePct: 50,
    maxAllocationPct: 50,
    stopLossPct: 10,
    dailyTradeLimit: 10,
    allowedCurrencies: [] as string[],
    blockedCurrencies: [] as string[],
    availableBuyingPowerUsd: 2000, // 50% of 2000 = 1000 max
    ...overrides,
  };
}

function makeParams(overrides: Partial<{
  signal: ReturnType<typeof makeSignal>;
  config: ReturnType<typeof makeConfig>;
  positions: { tokenSymbol: string; balance: number; avgEntryRate: number }[];
  portfolioValueUsd: number;
  tradesToday: number;
  tradeAmountUsd: number;
  positionPrices: Record<string, number>;
  availableBuyingPowerUsd: number;
}> = {}) {
  return {
    signal: makeSignal(),
    config: makeConfig(),
    positions: [] as { tokenSymbol: string; balance: number; avgEntryRate: number }[],
    portfolioValueUsd: 10000,
    tradesToday: 0,
    tradeAmountUsd: 500,
    positionPrices: {} as Record<string, number>,
    availableBuyingPowerUsd: 2000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// checkGuardrails
// ---------------------------------------------------------------------------

describe('checkGuardrails', () => {
  // ---- Allowed currencies ------------------------------------------------

  describe('allowed currencies rule', () => {
    it('passes when currency is in the allowed list', () => {
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ currency: 'CELO' }),
          config: makeConfig({ allowedCurrencies: ['CELO', 'cUSD'] }),
        }),
      );
      expect(result.passed).toBe(true);
    });

    it('blocks when currency is not in the allowed list', () => {
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ currency: 'BTC' }),
          config: makeConfig({ allowedCurrencies: ['CELO', 'cUSD'] }),
        }),
      );
      expect(result).toEqual({
        passed: false,
        blockedReason: 'BTC is not in allowed currencies',
        ruleName: 'allowed_currencies',
      });
    });

    it('passes any currency when allowed list is empty (no restriction)', () => {
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ currency: 'DOGE' }),
          config: makeConfig({ allowedCurrencies: [] }),
        }),
      );
      expect(result.passed).toBe(true);
    });
  });

  // ---- Blocked currencies ------------------------------------------------

  describe('blocked currencies rule', () => {
    it('blocks when currency is in the blocked list', () => {
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ currency: 'SCAM' }),
          config: makeConfig({ blockedCurrencies: ['SCAM', 'RUG'] }),
        }),
      );
      expect(result).toEqual({
        passed: false,
        blockedReason: 'SCAM is blocked',
        ruleName: 'blocked_currencies',
      });
    });

    it('passes when currency is not in the blocked list', () => {
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ currency: 'CELO' }),
          config: makeConfig({ blockedCurrencies: ['SCAM'] }),
        }),
      );
      expect(result.passed).toBe(true);
    });
  });

  // ---- Daily trade limit -------------------------------------------------

  describe('daily trade limit rule', () => {
    it('passes when trades today are under the limit', () => {
      const result = checkGuardrails(
        makeParams({
          tradesToday: 5,
          config: makeConfig({ dailyTradeLimit: 10 }),
        }),
      );
      expect(result.passed).toBe(true);
    });

    it('blocks when trades today equal the limit', () => {
      const result = checkGuardrails(
        makeParams({
          tradesToday: 10,
          config: makeConfig({ dailyTradeLimit: 10 }),
        }),
      );
      expect(result).toEqual({
        passed: false,
        blockedReason: 'Daily trade limit reached (10)',
        ruleName: 'daily_trade_limit',
      });
    });

    it('blocks when trades today exceed the limit', () => {
      const result = checkGuardrails(
        makeParams({
          tradesToday: 15,
          config: makeConfig({ dailyTradeLimit: 10 }),
        }),
      );
      expect(result).toEqual({
        passed: false,
        blockedReason: 'Daily trade limit reached (10)',
        ruleName: 'daily_trade_limit',
      });
    });
  });

  // ---- Max trade size ----------------------------------------------------

  describe('max trade size rule', () => {
    it('passes when trade amount is under the max', () => {
      const result = checkGuardrails(
        makeParams({
          tradeAmountUsd: 500,
          config: makeConfig({ maxTradeSizePct: 50, availableBuyingPowerUsd: 2000 }),
        }),
      );
      expect(result.passed).toBe(true);
    });

    it('passes when trade amount equals the max', () => {
      const result = checkGuardrails(
        makeParams({
          tradeAmountUsd: 1000,
          config: makeConfig({ maxTradeSizePct: 50, availableBuyingPowerUsd: 2000 }),
        }),
      );
      expect(result.passed).toBe(true);
    });

    it('blocks when trade amount exceeds the max (% of available balance)', () => {
      const result = checkGuardrails(
        makeParams({
          tradeAmountUsd: 1500,
          config: makeConfig({ maxTradeSizePct: 50, availableBuyingPowerUsd: 2000 }),
          availableBuyingPowerUsd: 2000,
        }),
      );
      expect(result.passed).toBe(false);
      expect(result.blockedReason).toContain('Trade size $1500');
      expect(result.blockedReason).toContain('exceeds max');
      expect(result.ruleName).toBe('max_trade_size');
    });
  });

  // ---- Max allocation ----------------------------------------------------

  describe('max allocation rule', () => {
    it('passes when post-trade allocation is within the limit (buy)', () => {
      // Portfolio: $10000, existing CELO position: 1000 tokens * $1.0 = $1000, buying $500 more
      // Post-trade: ($1000 + $500) / ($10000 + $500) = 1500/10500 = 14.3%
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ direction: 'buy', currency: 'CELO' }),
          config: makeConfig({ maxAllocationPct: 50 }),
          positions: [{ tokenSymbol: 'CELO', balance: 1000, avgEntryRate: 0.9 }],
          portfolioValueUsd: 10000,
          tradeAmountUsd: 500,
          positionPrices: { CELO: 1.0 },
        }),
      );
      expect(result.passed).toBe(true);
    });

    it('blocks when post-trade allocation exceeds the limit (buy)', () => {
      // Portfolio: $1000, existing CELO position: 400 tokens * $1.0 = $400, buying $500 more
      // Post-trade: ($400 + $500) / ($1000 + $500) = 900/1500 = 60%
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ direction: 'buy', currency: 'CELO' }),
          config: makeConfig({ maxAllocationPct: 50 }),
          positions: [{ tokenSymbol: 'CELO', balance: 400, avgEntryRate: 0.9 }],
          portfolioValueUsd: 1000,
          tradeAmountUsd: 500,
          positionPrices: { CELO: 1.0 },
        }),
      );
      expect(result.passed).toBe(false);
      expect(result.ruleName).toBe('max_allocation');
      expect(result.blockedReason).toContain('exceeds max 50%');
    });

    it('skips allocation check for sell signals', () => {
      // Sell: position 400 @ $1 = $400. maxTradeSizePct 50% => max $200. Use tradeAmountUsd=200.
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ direction: 'sell', currency: 'CELO' }),
          config: makeConfig({ maxAllocationPct: 50, maxTradeSizePct: 50 }),
          positions: [{ tokenSymbol: 'CELO', balance: 400, avgEntryRate: 0.9 }],
          portfolioValueUsd: 1000,
          tradeAmountUsd: 200,
          positionPrices: { CELO: 1.0 },
        }),
      );
      expect(result.passed).toBe(true);
    });

    it('skips allocation check when portfolio value is zero', () => {
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ direction: 'buy', currency: 'CELO' }),
          config: makeConfig({ maxAllocationPct: 50 }),
          positions: [],
          portfolioValueUsd: 0,
          tradeAmountUsd: 500,
        }),
      );
      expect(result.passed).toBe(true);
    });
  });

  // ---- Stop-loss ---------------------------------------------------------

  describe('stop-loss rule', () => {
    it('blocks sell when loss exceeds stop-loss threshold', () => {
      // Position: 100 @ $0.85 = $85. maxTradeSizePct 50% => max $42.5. Use tradeAmountUsd=40.
      // Loss: (0.85-1)/1 = -15% > -10% stop → block stop_loss
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ direction: 'sell', currency: 'CELO' }),
          config: makeConfig({ stopLossPct: 10, maxTradeSizePct: 50 }),
          positions: [{ tokenSymbol: 'CELO', balance: 100, avgEntryRate: 1.0 }],
          positionPrices: { CELO: 0.85 },
          tradeAmountUsd: 40,
        }),
      );
      expect(result.passed).toBe(false);
      expect(result.ruleName).toBe('stop_loss');
    });

    it('passes sell when loss is within stop-loss threshold', () => {
      // Position: 100 @ $0.95 = $95. maxTradeSizePct 50% => max $47.5. Use tradeAmountUsd=40.
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ direction: 'sell', currency: 'CELO' }),
          config: makeConfig({ stopLossPct: 10, maxTradeSizePct: 50 }),
          positions: [{ tokenSymbol: 'CELO', balance: 100, avgEntryRate: 1.0 }],
          positionPrices: { CELO: 0.95 },
          tradeAmountUsd: 40,
        }),
      );
      expect(result.passed).toBe(true);
    });

    it('blocks sell when no position exists', () => {
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ direction: 'sell', currency: 'CELO' }),
          config: makeConfig({ stopLossPct: 10 }),
          positions: [],
          tradeAmountUsd: 100,
        }),
      );
      expect(result.passed).toBe(false);
      expect(result.ruleName).toBe('max_trade_size');
      expect(result.blockedReason).toContain('No position');
    });
  });

  // ---- Rule priority (short-circuit) -------------------------------------

  describe('rule priority', () => {
    it('returns the first failing rule when multiple rules would fail', () => {
      // Signal currency not allowed AND blocked AND over daily limit AND over trade size
      // The allowed_currencies rule should fire first.
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ currency: 'SCAM' }),
          config: makeConfig({
            allowedCurrencies: ['CELO'],
            blockedCurrencies: ['SCAM'],
            dailyTradeLimit: 1,
            maxTradeSizePct: 25,
          }),
          tradesToday: 5,
          tradeAmountUsd: 500,
        }),
      );
      expect(result.ruleName).toBe('allowed_currencies');
    });
  });

  // ---- All rules pass ----------------------------------------------------

  describe('all rules pass', () => {
    it('returns { passed: true } with no blockedReason or ruleName', () => {
      const result = checkGuardrails(
        makeParams({
          signal: makeSignal({ currency: 'CELO', direction: 'buy' }),
          config: makeConfig({
            allowedCurrencies: ['CELO'],
            blockedCurrencies: [],
            dailyTradeLimit: 10,
            maxTradeSizePct: 50,
            maxAllocationPct: 50,
          }),
          positions: [],
          portfolioValueUsd: 10000,
          tradesToday: 0,
          tradeAmountUsd: 500,
        }),
      );
      expect(result).toEqual({ passed: true });
    });
  });
});

// ---------------------------------------------------------------------------
// calculateTradeAmount
// ---------------------------------------------------------------------------

describe('calculateTradeAmount', () => {
  const maxTrade = 1000;

  it('returns full amount for confidence >= 90', () => {
    expect(calculateTradeAmount(90, maxTrade)).toBe(1000);
    expect(calculateTradeAmount(95, maxTrade)).toBe(1000);
    expect(calculateTradeAmount(100, maxTrade)).toBe(1000);
  });

  it('returns 75% for confidence >= 80 and < 90', () => {
    expect(calculateTradeAmount(80, maxTrade)).toBe(750);
    expect(calculateTradeAmount(85, maxTrade)).toBe(750);
    expect(calculateTradeAmount(89, maxTrade)).toBe(750);
  });

  it('returns 50% for confidence >= 70 and < 80', () => {
    expect(calculateTradeAmount(70, maxTrade)).toBe(500);
    expect(calculateTradeAmount(75, maxTrade)).toBe(500);
    expect(calculateTradeAmount(79, maxTrade)).toBe(500);
  });

  it('returns 25% for confidence >= 60 and < 70', () => {
    expect(calculateTradeAmount(60, maxTrade)).toBe(250);
    expect(calculateTradeAmount(65, maxTrade)).toBe(250);
    expect(calculateTradeAmount(69, maxTrade)).toBe(250);
  });

  it('returns 0 for confidence below 60', () => {
    expect(calculateTradeAmount(59, maxTrade)).toBe(0);
    expect(calculateTradeAmount(30, maxTrade)).toBe(0);
    expect(calculateTradeAmount(0, maxTrade)).toBe(0);
  });
});
