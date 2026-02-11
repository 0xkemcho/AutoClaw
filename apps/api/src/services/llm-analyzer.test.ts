import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateText = vi.hoisted(() => vi.fn());
vi.mock('ai', () => ({
  generateText: mockGenerateText,
  Output: {
    object: vi.fn().mockImplementation(({ schema }) => ({ type: 'object', schema })),
  },
}));

vi.mock('ai-sdk-provider-gemini-cli', () => ({
  createGeminiProvider: vi.fn().mockReturnValue(
    vi.fn().mockReturnValue({ modelId: 'gemini-2.5-flash' })
  ),
}));

import { analyzeFxNews, buildSystemPrompt, buildAnalysisPrompt, type TradingSignals } from './llm-analyzer';
import type { NewsArticle } from './news-fetcher';

const mockNews: NewsArticle[] = [
  { title: 'EUR hits high', url: 'https://example.com/1', excerpt: 'Euro rises against dollar', source: 'example.com' },
  { title: 'Fed rate decision', url: 'https://example.com/2', excerpt: 'Fed holds rates steady', source: 'reuters.com' },
];

const mockSignals: TradingSignals = {
  signals: [
    { currency: 'EURm', direction: 'buy', confidence: 75, reasoning: 'EUR strengthening based on article [1]', timeHorizon: 'medium' },
  ],
  marketSummary: 'Euro strengthening on positive economic data',
  sourcesUsed: 2,
};

describe('llm-analyzer', () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  describe('analyzeFxNews', () => {
    it('calls generateText with correct model and Output.object schema', async () => {
      mockGenerateText.mockResolvedValue({ output: mockSignals });

      await analyzeFxNews({
        news: mockNews,
        currentPositions: [],
        portfolioValueUsd: 1000,
        allowedCurrencies: ['EURm', 'GBPm'],
      });

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.model).toBeDefined();
      expect(callArgs.output).toBeDefined();
      expect(callArgs.system).toContain('EURm, GBPm');
      expect(callArgs.prompt).toContain('EUR hits high');
    });

    it('returns structured TradingSignals matching schema', async () => {
      mockGenerateText.mockResolvedValue({ output: mockSignals });

      const result = await analyzeFxNews({
        news: mockNews,
        currentPositions: [],
        portfolioValueUsd: 1000,
        allowedCurrencies: ['EURm'],
      });

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].currency).toBe('EURm');
      expect(result.signals[0].direction).toBe('buy');
      expect(result.signals[0].confidence).toBe(75);
      expect(result.marketSummary).toBeTruthy();
      expect(result.sourcesUsed).toBe(2);
    });
  });

  describe('buildSystemPrompt', () => {
    it('includes allowed currencies', () => {
      const prompt = buildSystemPrompt({
        allowedCurrencies: ['EURm', 'GBPm', 'JPYm'],
        currentPositions: [],
        portfolioValueUsd: 500,
      });

      expect(prompt).toContain('EURm, GBPm, JPYm');
    });

    it('includes portfolio context', () => {
      const prompt = buildSystemPrompt({
        allowedCurrencies: ['EURm'],
        currentPositions: [{ tokenSymbol: 'EURm', balance: 100 }],
        portfolioValueUsd: 1000,
      });

      expect(prompt).toContain('$1000.00');
      expect(prompt).toContain('EURm: 100');
    });

    it('shows default positions when empty', () => {
      const prompt = buildSystemPrompt({
        allowedCurrencies: ['EURm'],
        currentPositions: [],
        portfolioValueUsd: 500,
      });

      expect(prompt).toContain('No positions (100% USDm)');
    });

    it('includes custom prompt when provided', () => {
      const prompt = buildSystemPrompt({
        allowedCurrencies: ['EURm'],
        currentPositions: [],
        portfolioValueUsd: 500,
        customPrompt: 'Focus on European markets only',
      });

      expect(prompt).toContain('User instructions: Focus on European markets only');
    });

    it('omits custom prompt section when null', () => {
      const prompt = buildSystemPrompt({
        allowedCurrencies: ['EURm'],
        currentPositions: [],
        portfolioValueUsd: 500,
        customPrompt: null,
      });

      expect(prompt).not.toContain('User instructions');
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('formats news articles with index, title, source, excerpt', () => {
      const prompt = buildAnalysisPrompt({ news: mockNews });

      expect(prompt).toContain('[1] EUR hits high');
      expect(prompt).toContain('Source: example.com');
      expect(prompt).toContain('Euro rises against dollar');
      expect(prompt).toContain('[2] Fed rate decision');
      expect(prompt).toContain('2 FX news articles');
    });

    it('handles empty news array', () => {
      const prompt = buildAnalysisPrompt({ news: [] });

      expect(prompt).toContain('No news articles available');
      expect(prompt).toContain('empty signals array');
    });

    it('uses url as fallback when source is missing', () => {
      const prompt = buildAnalysisPrompt({
        news: [{ title: 'Test', url: 'https://fallback.com/article', excerpt: 'Text' }],
      });

      expect(prompt).toContain('Source: https://fallback.com/article');
    });
  });
});
