import { DEFAULT_GUARDRAILS } from './agent';

describe('DEFAULT_GUARDRAILS', () => {
  describe('conservative profile', () => {
    it('has the strictest limits (lowest maxTradeSizeUsd, maxAllocationPct, dailyTradeLimit)', () => {
      const { conservative } = DEFAULT_GUARDRAILS;
      expect(conservative.maxTradeSizeUsd).toBe(50);
      expect(conservative.maxAllocationPct).toBe(15);
      expect(conservative.dailyTradeLimit).toBe(2);
    });

    it('has frequency set to daily', () => {
      expect(DEFAULT_GUARDRAILS.conservative.frequency).toBe('daily');
    });
  });

  describe('moderate profile', () => {
    it('has middle-ground limits', () => {
      const { moderate } = DEFAULT_GUARDRAILS;
      expect(moderate.maxTradeSizeUsd).toBe(200);
      expect(moderate.maxAllocationPct).toBe(25);
      expect(moderate.dailyTradeLimit).toBe(5);
    });

    it('has frequency set to 4h', () => {
      expect(DEFAULT_GUARDRAILS.moderate.frequency).toBe('4h');
    });
  });

  describe('aggressive profile', () => {
    it('has the most permissive limits', () => {
      const { aggressive } = DEFAULT_GUARDRAILS;
      expect(aggressive.maxTradeSizeUsd).toBe(500);
      expect(aggressive.maxAllocationPct).toBe(40);
      expect(aggressive.dailyTradeLimit).toBe(10);
    });

    it('has frequency set to hourly', () => {
      expect(DEFAULT_GUARDRAILS.aggressive.frequency).toBe('hourly');
    });
  });

  describe('all profiles have required fields', () => {
    it.each(['conservative', 'moderate', 'aggressive'] as const)(
      '%s profile contains all required guardrail fields',
      (profile) => {
        const guardrail = DEFAULT_GUARDRAILS[profile];
        expect(guardrail).toHaveProperty('frequency');
        expect(guardrail).toHaveProperty('maxTradeSizeUsd');
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
        expect(guardrail.maxTradeSizeUsd).toBeGreaterThan(0);
        expect(guardrail.maxAllocationPct).toBeGreaterThan(0);
        expect(guardrail.stopLossPct).toBeGreaterThan(0);
        expect(guardrail.dailyTradeLimit).toBeGreaterThan(0);
      },
    );
  });

  describe('ordering across profiles', () => {
    it('maxTradeSizeUsd increases from conservative to moderate to aggressive', () => {
      expect(DEFAULT_GUARDRAILS.conservative.maxTradeSizeUsd).toBeLessThan(
        DEFAULT_GUARDRAILS.moderate.maxTradeSizeUsd,
      );
      expect(DEFAULT_GUARDRAILS.moderate.maxTradeSizeUsd).toBeLessThan(
        DEFAULT_GUARDRAILS.aggressive.maxTradeSizeUsd,
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
