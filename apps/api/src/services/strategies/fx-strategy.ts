import type { GuardrailCheck } from '@autoclaw/shared';
import { MENTO_TOKENS } from '@autoclaw/shared';
import { fetchFxNews } from '../news-fetcher';
import { analyzeFxNews } from '../llm-analyzer';
import { executeTrade } from '../trade-executor';
import { checkGuardrails, calculateTradeAmount } from '../rules-engine';
import type {
  AgentStrategy,
  AgentConfigRow,
  StrategyContext,
  StrategyAnalysisResult,
  ExecutionResult,
  WalletContext,
  GuardrailContext,
} from './types';

interface FxSignal {
  currency: string;
  direction: 'buy' | 'sell' | 'hold';
  confidence: number;
  allocationPct?: number;
  reasoning: string;
  timeHorizon: string;
}

interface FxData {
  news: Array<{ title: string; url: string; excerpt: string; source?: string }>;
  currencies: string[];
}

export class FxStrategy implements AgentStrategy {
  type = 'fx' as const;

  async fetchData(config: AgentConfigRow, _context: StrategyContext): Promise<FxData> {
    const rawAllowed = (config.allowed_currencies ?? []) as string[];
    const allowedCurrencies =
      rawAllowed.length === 0 || rawAllowed.includes('ALL')
        ? MENTO_TOKENS.filter((t) => t !== 'USDm')
        : rawAllowed;
    const currencies = allowedCurrencies.length > 0 ? [...allowedCurrencies] : ['EURm', 'GBPm', 'JPYm'];

    const news = await fetchFxNews(currencies);
    return { news, currencies };
  }

  async analyze(
    data: unknown,
    config: AgentConfigRow,
    context: StrategyContext,
  ): Promise<StrategyAnalysisResult> {
    const { news, currencies } = data as FxData;

    if (news.length === 0) {
      return { signals: [], summary: 'No news articles found', sourcesUsed: 0 };
    }

    const rawAllowed = (config.allowed_currencies ?? []) as string[];
    const allowedCurrencies =
      rawAllowed.length === 0 || rawAllowed.includes('ALL')
        ? MENTO_TOKENS.filter((t) => t !== 'USDm')
        : rawAllowed;

    const result = await analyzeFxNews({
      news,
      currentPositions: context.positions.map((p: any) => ({
        tokenSymbol: p.token_symbol ?? p.tokenSymbol,
        balance: p.balance,
      })),
      portfolioValueUsd: context.portfolioValueUsd,
      allowedCurrencies,
      walletBalances: context.walletBalances
        .filter(b => b.balance > 0n)
        .map(b => ({ symbol: b.symbol, formatted: b.formatted, valueUsd: b.valueUsd })),
      customPrompt: config.custom_prompt,
    });

    return {
      signals: result.signals,
      summary: result.marketSummary,
      sourcesUsed: result.sourcesUsed,
    };
  }

  async executeSignal(
    signal: unknown,
    wallet: WalletContext,
    config: AgentConfigRow,
  ): Promise<ExecutionResult> {
    const s = signal as FxSignal & { amountUsd: number };

    const result = await executeTrade({
      serverWalletId: wallet.serverWalletId,
      serverWalletAddress: wallet.serverWalletAddress,
      currency: s.currency,
      direction: s.direction as 'buy' | 'sell',
      amountUsd: s.amountUsd,
    });

    return {
      success: true,
      txHash: result.txHash,
      amountUsd: s.amountUsd,
    };
  }

  checkGuardrails(
    signal: unknown,
    config: AgentConfigRow,
    context: GuardrailContext,
  ): GuardrailCheck {
    const s = signal as FxSignal & { amountUsd: number };

    const rawAllowed = (config.allowed_currencies ?? []) as string[];
    const allowedCurrencies =
      rawAllowed.length === 0 || rawAllowed.includes('ALL')
        ? MENTO_TOKENS.filter((t) => t !== 'USDm')
        : rawAllowed;

    return checkGuardrails({
      signal: { currency: s.currency, direction: s.direction as 'buy' | 'sell', confidence: s.confidence, reasoning: s.reasoning },
      config: {
        maxTradeSizeUsd: config.max_trade_size_usd,
        maxAllocationPct: config.max_allocation_pct,
        stopLossPct: config.stop_loss_pct,
        dailyTradeLimit: config.daily_trade_limit,
        allowedCurrencies,
        blockedCurrencies: (config.blocked_currencies ?? []) as string[],
      },
      positions: context.positions.map((p: any) => ({
        tokenSymbol: p.token_symbol ?? p.tokenSymbol,
        balance: p.balance,
        avgEntryRate: p.avg_entry_rate ?? p.avgEntryRate ?? 0,
      })),
      portfolioValueUsd: context.portfolioValueUsd,
      tradesToday: context.dailyTradeCount,
      tradeAmountUsd: s.amountUsd,
      positionPrices: context.positionPrices,
    });
  }

  getProgressSteps(): string[] {
    return ['fetching_news', 'analyzing', 'checking_signals', 'executing_trades'];
  }
}
