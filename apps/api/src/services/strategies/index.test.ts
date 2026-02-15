import { getStrategy } from './index';
import { FxStrategy } from './fx-strategy';
import { YieldStrategy } from './yield-strategy';

describe('Strategy Registry', () => {
  describe('getStrategy', () => {
    it('should return FX strategy instance with correct type', () => {
      const strategy = getStrategy('fx');
      expect(strategy).toBeInstanceOf(FxStrategy);
      expect(strategy.type).toBe('fx');
    });

    it('should return Yield strategy instance with correct type', () => {
      const strategy = getStrategy('yield');
      expect(strategy).toBeInstanceOf(YieldStrategy);
      expect(strategy.type).toBe('yield');
    });

    it('should throw error for unknown agent type', () => {
      expect(() => getStrategy('unknown')).toThrow('Unknown agent type: unknown');
    });
  });

  describe('FxStrategy', () => {
    it('should have correct progress steps', () => {
      const strategy = new FxStrategy();
      const steps = strategy.getProgressSteps();
      expect(steps).toEqual(['fetching_news', 'analyzing', 'checking_signals', 'executing_trades']);
    });
  });

  describe('YieldStrategy', () => {
    it('should have correct progress steps', () => {
      const strategy = new YieldStrategy();
      const steps = strategy.getProgressSteps();
      expect(steps).toEqual([
        'scanning_vaults',
        'analyzing_yields',
        'checking_yield_guardrails',
        'executing_yields',
        'claiming_rewards',
      ]);
    });
  });
});
