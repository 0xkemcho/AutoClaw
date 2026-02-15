export type { AgentStrategy, AgentConfigRow, StrategyContext, WalletBalance, StrategyAnalysisResult, ExecutionResult, WalletContext, GuardrailContext } from './types';
export { FxStrategy } from './fx-strategy';
export { YieldStrategy } from './yield-strategy';

import type { AgentStrategy } from './types';
import { FxStrategy } from './fx-strategy';
import { YieldStrategy } from './yield-strategy';

const strategies: Record<string, AgentStrategy> = {
  fx: new FxStrategy(),
  yield: new YieldStrategy(),
};

export function getStrategy(agentType: string): AgentStrategy {
  const strategy = strategies[agentType];
  if (!strategy) throw new Error(`Unknown agent type: ${agentType}`);
  return strategy;
}
