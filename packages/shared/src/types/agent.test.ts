import { DEFAULT_GUARDRAILS, parseFrequencyToMs } from './agent';

describe('parseFrequencyToMs', () => {
  const HOUR_MS = 60 * 60 * 1000;

  it('parses numeric frequency (4 -> 4h)', () => {
    expect(parseFrequencyToMs(4)).toBe(4 * HOUR_MS);
  });

  it('parses string numeric frequency ("4" -> 4h)', () => {
    expect(parseFrequencyToMs('4')).toBe(4 * HOUR_MS);
  });

  it('parses FREQUENCY_MS keys (hourly, 4h, daily)', () => {
    expect(parseFrequencyToMs('hourly')).toBe(1 * HOUR_MS);
    expect(parseFrequencyToMs('4h')).toBe(4 * HOUR_MS);
    expect(parseFrequencyToMs('daily')).toBe(24 * HOUR_MS);
  });

  it('falls back to 24h for unknown values', () => {
    expect(parseFrequencyToMs('unknown')).toBe(24 * HOUR_MS);
    expect(parseFrequencyToMs(null)).toBe(24 * HOUR_MS);
  });
});

describe('DEFAULT_GUARDRAILS', () => {
  describe('conservative profile', () => {
    it('has the strictest limits (lowest maxTradeSizePct, maxAllocationPct, dailyTradeLimit)', () => {
      const { conservative } = DEFAULT_GUARDRAILS;
      expect(conservative.maxTradeSizePct).toBe(5);
      expect(conservative.maxAllocationPct).toBe(15);
      expect(conservative.dailyTradeLimit).toBe(2);
    });

    it('has frequency set to 24 (daily)', () => {
      expect(DEFAULT_GUARDRAILS.conservative.frequency).toBe(24);
    });
  });

  describe('moderate profile', () => {
    it('has middle-ground limits', () => {
      const { moderate } = DEFAULT_GUARDRAILS;
      expect(moderate.maxTradeSizePct).toBe(25);
      expect(moderate.maxAllocationPct).toBe(25);
      expect(moderate.dailyTradeLimit).toBe(5);
    });

    it('has frequency set to 4', () => {
      expect(DEFAULT_GUARDRAILS.moderate.frequency).toBe(4);
    });
  });

  describe('aggressive profile', () => {
    it('has the most permissive limits', () => {
      const { aggressive } = DEFAULT_GUARDRAILS;
      expect(aggressive.maxTradeSizePct).toBe(50);
      expect(aggressive.maxAllocationPct).toBe(40);
      expect(aggressive.dailyTradeLimit).toBe(10);
    });

    it('has frequency set to 1 (hourly)', () => {
      expect(DEFAULT_GUARDRAILS.aggressive.frequency).toBe(1);
    });
  });

  describe('all profiles have required fields', () => {
    it.each(['conservative', 'moderate', 'aggressive'] as const)(
      '%s profile contains all required guardrail fields',
      (profile) => {
        const guardrail = DEFAULT_GUARDRAILS[profile];
        expect(guardrail).toHaveProperty('frequency');
        expect(guardrail).toHaveProperty('maxTradeSizePct');
        expect(guardrail).toHaveProperty('maxAllocationPct');
        expect(guardrail).toHaveProperty('stopLossPct');
        expect(guardrail).toHaveProperty('dailyTradeLimit');
      },
    );
  });

  describe('all numeric values are positive', () => {
    it.each(['conservative', 'moderate', 'aggressive'] as const)(
      '%s profile has all positive numeric values',
      (profile) => {
        const guardrail = DEFAULT_GUARDRAILS[profile];
        expect(guardrail.maxTradeSizePct).toBeGreaterThan(0);
        expect(guardrail.maxAllocationPct).toBeGreaterThan(0);
        expect(guardrail.stopLossPct).toBeGreaterThan(0);
        expect(guardrail.dailyTradeLimit).toBeGreaterThan(0);
      },
    );
  });

  describe('ordering across profiles', () => {
    it('maxTradeSizePct increases from conservative to moderate to aggressive', () => {
      expect(DEFAULT_GUARDRAILS.conservative.maxTradeSizePct).toBeLessThan(
        DEFAULT_GUARDRAILS.moderate.maxTradeSizePct,
      );
      expect(DEFAULT_GUARDRAILS.moderate.maxTradeSizePct).toBeLessThan(
        DEFAULT_GUARDRAILS.aggressive.maxTradeSizePct,
      );
    });

    it('stopLossPct increases from conservative to moderate to aggressive', () => {
      expect(DEFAULT_GUARDRAILS.conservative.stopLossPct).toBeLessThan(
        DEFAULT_GUARDRAILS.moderate.stopLossPct,
      );
      expect(DEFAULT_GUARDRAILS.moderate.stopLossPct).toBeLessThan(
        DEFAULT_GUARDRAILS.aggressive.stopLossPct,
      );
    });
  });

  describe('type and structure validation', () => {
    it('is an object with exactly 3 keys', () => {
      expect(typeof DEFAULT_GUARDRAILS).toBe('object');
      expect(Object.keys(DEFAULT_GUARDRAILS)).toHaveLength(3);
    });

    it('contains only conservative, moderate, and aggressive keys', () => {
      const keys = Object.keys(DEFAULT_GUARDRAILS).sort();
      expect(keys).toEqual(['aggressive', 'conservative', 'moderate']);
    });
  });
});
