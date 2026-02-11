import { generateText, Output } from 'ai';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { z } from 'zod';
import type { NewsArticle } from './news-fetcher';

const gemini = createGeminiProvider({
  authType: (process.env.GEMINI_CLI_AUTH_TYPE as 'oauth-personal') || 'oauth-personal',
});

export const SignalSchema = z.object({
  signals: z.array(z.object({
    currency: z.string(),
    direction: z.enum(['buy', 'sell', 'hold']),
    confidence: z.number().min(0).max(100),
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
  customPrompt?: string | null;
}

export async function analyzeFxNews(params: AnalysisParams): Promise<TradingSignals> {
  const { news, currentPositions, portfolioValueUsd, allowedCurrencies, customPrompt } = params;

  const result = await generateText({
    model: gemini('gemini-2.5-flash'),
    output: Output.object({ schema: SignalSchema }),
    system: buildSystemPrompt({ allowedCurrencies, currentPositions, portfolioValueUsd, customPrompt }),
    prompt: buildAnalysisPrompt({ news }),
  });

  return result.output!;
}

export function buildSystemPrompt(params: {
  allowedCurrencies: string[];
  currentPositions: Array<{ tokenSymbol: string; balance: number }>;
  portfolioValueUsd: number;
  customPrompt?: string | null;
}): string {
  const { allowedCurrencies, currentPositions, portfolioValueUsd, customPrompt } = params;

  const positionsSummary = currentPositions.length > 0
    ? currentPositions.map(p => `${p.tokenSymbol}: ${p.balance}`).join(', ')
    : 'No positions (100% USDm)';

  return [
    'You are an FX analyst for a stablecoin portfolio on the Celo blockchain.',
    'Your base currency is USDm (Mento Dollar, pegged to USD).',
    `Your trading universe is limited to these currencies: ${allowedCurrencies.join(', ')}.`,
    `Current portfolio value: $${portfolioValueUsd.toFixed(2)}`,
    `Current positions: ${positionsSummary}`,
    '',
    'Generate trading signals based on the provided news articles.',
    'For each signal:',
    '- confidence: 0-100 (only signals >= 60 will be considered)',
    '- reasoning: must cite specific news articles or data points',
    '- direction: buy (acquire the currency with USDm), sell (convert back to USDm), or hold',
    '- timeHorizon: short (hours), medium (days), long (weeks)',
    '',
    'Only generate signals for currencies in your allowed list.',
    'Be conservative — only recommend trades when evidence is strong.',
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
