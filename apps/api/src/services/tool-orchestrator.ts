/**
 * Tool orchestrator for the Conversation Intelligence Agent.
 * Registers tools with the AI SDK and provides bounded execution.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { searchParallelAI } from './tools/parallel-ai.js';
import { getCoinGeckoMarketData, searchCoinGecko } from './tools/coingecko.js';
import { analyzeGrokSentiment } from './tools/grok.js';
import { scrapeCeloGovernance } from './tools/celo-governance-firecrawl.js';

const MAX_TOOL_CALLS_PER_TURN = 5;
const TOOL_TIMEOUT_MS = 30_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Tool timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

export const conversationTools = {
  searchNews: tool({
    description:
      'Search for news and web content. Use for FX news, crypto news, market updates, or general research.',
    inputSchema: z.object({
      query: z.string().describe('Search query (e.g. "EUR/USD forecast", "Celo stablecoin news")'),
      maxResults: z.number().min(1).max(20).optional().default(10),
    }),
    execute: async ({ query, maxResults }) => {
      try {
        const results = await withTimeout(searchParallelAI(query, maxResults), TOOL_TIMEOUT_MS);
        const xDomains = ['x.com', 'twitter.com'];
        const sorted = [...results].sort((a, b) => {
          const aSource = a.source?.toLowerCase() ?? '';
          const bSource = b.source?.toLowerCase() ?? '';
          const aIsX = xDomains.some((d) => aSource.includes(d));
          const bIsX = xDomains.some((d) => bSource.includes(d));
          if (aIsX && !bIsX) return -1;
          if (!aIsX && bIsX) return 1;
          return 0;
        });
        return { results: sorted, count: sorted.length };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Search failed', results: [] };
      }
    },
  }),

  getCryptoPrices: tool({
    description:
      'Get current cryptocurrency prices from CoinGecko. Use coin IDs like "celo", "bitcoin", "ethereum", "usd-coin".',
    inputSchema: z.object({
      ids: z.array(z.string()).describe('Coin IDs (e.g. ["celo", "bitcoin"])'),
    }),
    execute: async ({ ids }) => {
      try {
        const prices = await withTimeout(getCoinGeckoMarketData(ids.slice(0, 10)), TOOL_TIMEOUT_MS);
        return { prices };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Price fetch failed', prices: [] };
      }
    },
  }),

  searchCoins: tool({
    description: 'Search for cryptocurrency by name or symbol. Returns matching coin IDs for use with getCryptoPrices.',
    inputSchema: z.object({
      query: z.string().describe('Search query (e.g. "Celo", "USDm")'),
    }),
    execute: async ({ query }) => {
      try {
        const coins = await withTimeout(searchCoinGecko(query), TOOL_TIMEOUT_MS);
        return { coins };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Search failed', coins: [] };
      }
    },
  }),

  analyzeSocialSentiment: tool({
    description:
      'Analyze current X (Twitter) and social media sentiment about a topic. Use for crypto, Celo, or market sentiment.',
    inputSchema: z.object({
      topic: z.string().describe('Topic to analyze (e.g. "Celo blockchain", "Mento stablecoins")'),
    }),
    execute: async ({ topic }) => {
      try {
        const xDomains = ['x.com', 'twitter.com'];
        const [grokResult, xSearchResults] = await Promise.all([
          withTimeout(analyzeGrokSentiment(topic), TOOL_TIMEOUT_MS),
          withTimeout(
            searchParallelAI(`${topic} site:x.com OR site:twitter.com`, 5).catch(() => []),
            TOOL_TIMEOUT_MS
          ),
        ]);
        const postUrls = xSearchResults
          .filter((r) => {
            const src = r.source?.toLowerCase() ?? '';
            return xDomains.some((d) => src.includes(d));
          })
          .map((r) => r.url)
          .slice(0, 5);
        return { ...grokResult, postUrls: postUrls.length > 0 ? postUrls : undefined };
      } catch (err) {
        return {
          sentiment: 'error',
          summary: err instanceof Error ? err.message : 'Sentiment analysis failed',
        };
      }
    },
  }),

  getCeloGovernance: tool({
    description:
      'Fetch current Celo governance information from Mondo (mondo.celo.org). Use for proposals, voting, staking, or governance questions.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const data = await withTimeout(scrapeCeloGovernance(), TOOL_TIMEOUT_MS);
        return data;
      } catch (err) {
        return {
          markdown: '',
          url: 'https://mondo.celo.org/governance',
          error: err instanceof Error ? err.message : 'Governance scrape failed',
        };
      }
    },
  }),
};

export { MAX_TOOL_CALLS_PER_TURN };
