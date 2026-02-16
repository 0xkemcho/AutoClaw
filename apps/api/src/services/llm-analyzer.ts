import { generateText, Output } from 'ai';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { z } from 'zod';
import type { NewsArticle } from './news-fetcher.js';

const gemini = createGeminiProvider({
  authType: (process.env.GEMINI_CLI_AUTH_TYPE as 'oauth-personal') || 'oauth-personal',
});

export const SignalSchema = z.object({
  signals: z.array(z.object({
    currency: z.string(),
    direction: z.enum(['buy', 'sell', 'hold']),
    confidence: z.number().min(0).max(100),
    allocationPct: z.number().min(0).max(100),
    reasoning: z.string(),
    timeHorizon: z.enum(['short', 'medium', 'long']),
  })),
  marketSummary: z.string(),
  sourcesUsed: z.number(),
});

export type TradingSignals = z.infer<typeof SignalSchema>;

interface AnalysisParams {
  news: NewsArticle[];
  currentPositions: Array<{ tokenSymbol: string; balance: number }>;
  portfolioValueUsd: number;
  allowedCurrencies: string[];
  walletBalances?: Array<{ symbol: string; formatted: string; valueUsd: number }>;
  customPrompt?: string | null;
}

export async function analyzeFxNews(params: AnalysisParams): Promise<TradingSignals> {
  const { news, currentPositions, portfolioValueUsd, allowedCurrencies, walletBalances, customPrompt } = params;

  try {
    const result = await generateText({
      model: gemini('gemini-2.5-flash'),
      output: Output.object({ schema: SignalSchema }),
      system: buildSystemPrompt({ allowedCurrencies, currentPositions, portfolioValueUsd, walletBalances, customPrompt }),
      prompt: buildAnalysisPrompt({ news }),
    });

    if (!result.output) {
      console.error('LLM returned no output');
      return { signals: [], marketSummary: 'Analysis failed: no output from LLM', sourcesUsed: 0 };
    }

    return result.output;
  } catch (err) {
    console.error('LLM analysis failed:', err);
    return { signals: [], marketSummary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`, sourcesUsed: 0 };
  }
}

export function buildSystemPrompt(params: {
  allowedCurrencies: string[];
  currentPositions: Array<{ tokenSymbol: string; balance: number }>;
  portfolioValueUsd: number;
  walletBalances?: Array<{ symbol: string; formatted: string; valueUsd: number }>;
  customPrompt?: string | null;
}): string {
  const { allowedCurrencies, currentPositions, portfolioValueUsd, walletBalances, customPrompt } = params;

  const positionsSummary = currentPositions.length > 0
    ? currentPositions.map(p => `${p.tokenSymbol}: ${p.balance}`).join(', ')
    : 'No positions';

  // Show actual wallet balances so the LLM can size trades correctly
  const balanceLines = walletBalances && walletBalances.length > 0
    ? walletBalances.map(b => `  ${b.symbol}: ${b.formatted} (~$${b.valueUsd.toFixed(2)})`).join('\n')
    : '  Empty wallet';

  // Calculate available buying power from base stables (USDC, USDT, USDm)
  const baseStables = ['USDC', 'USDT', 'USDm'];
  const availableUsd = walletBalances
    ? walletBalances.filter(b => baseStables.includes(b.symbol)).reduce((sum, b) => sum + b.valueUsd, 0)
    : portfolioValueUsd;

  return [
    'You are an FX analyst for a stablecoin portfolio on the Celo blockchain.',
    'Your base currencies are USDC, USDT, or USDm (all pegged to USD). Buys spend one of these.',
    `Your trading universe is limited to these currencies: ${allowedCurrencies.join(', ')}.`,
    '',
    '## Wallet State',
    `Total portfolio value: $${portfolioValueUsd.toFixed(2)}`,
    `Available buying power (USDC/USDT/USDm): $${availableUsd.toFixed(2)}`,
    `On-chain balances:\n${balanceLines}`,
    `Tracked positions: ${positionsSummary}`,
    '',
    '## Rules',
    'Generate trading signals based on the provided news articles.',
    'For each signal:',
    '- confidence: 0-100 (only signals >= 60 will be considered)',
    '- allocationPct: 0-100, what percentage of available buying power (for buys) or position size (for sells) to use for this trade',
    '- reasoning: must cite specific news articles or data points',
    '- direction: buy (spend USDC/USDT/USDm to acquire the currency), sell (convert back to USD stables), or hold',
    '- timeHorizon: short (hours), medium (days), long (weeks)',
    '',
    '## ALLOCATION GUIDELINES',
    `- Available buying power: $${availableUsd.toFixed(2)}. The sum of allocationPct across ALL buy signals must not exceed 100%.`,
    '- Diversify: spread across multiple currencies when evidence supports it. Avoid putting everything into one trade.',
    '- Scale allocation with conviction: higher confidence → higher allocationPct, but never go all-in.',
    '- Suggested ranges: low conviction (60-70 confidence) → 5-15% allocation, medium (70-85) → 15-30%, high (85+) → 30-50%.',
    '- For sells: allocationPct is the % of your held position to sell.',
    '',
    '## CRITICAL CONSTRAINTS',
    '- You can only SELL currencies you actually hold. Check on-chain balances above.',
    '- Do NOT generate sell signals for currencies with zero balance.',
    '- Do NOT generate hold signals for currencies you do not currently hold. Only generate buy or hold signals for positions in your wallet.',
    '- Only generate signals for currencies in your allowed list.',
    '- Be conservative — only recommend trades when evidence is strong.',
    '- Consider gold/commodity market context when evaluating FX strength.',
    customPrompt ? `\nUser instructions: ${customPrompt}` : '',
  ].join('\n');
}

export function buildAnalysisPrompt(params: { news: NewsArticle[] }): string {
  if (params.news.length === 0) {
    return 'No news articles available. Return empty signals array and a brief market summary.';
  }

  const articles = params.news.map((n, i) =>
    `[${i + 1}] ${n.title}\n    Source: ${n.source || n.url}\n    ${n.excerpt}`
  ).join('\n\n');

  return `Analyze these ${params.news.length} FX news articles and generate trading signals:\n\n${articles}`;
}
