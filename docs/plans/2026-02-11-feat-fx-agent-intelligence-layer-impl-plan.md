---
title: "feat: FX Trading Agent Intelligence Layer — Implementation Plan"
type: feat
date: 2026-02-11
part: 2 of 3
series: fx-trading-agent
depends_on: 2026-02-11-feat-fx-agent-backend-foundation-plan.md
parallel_agents: 4
---

# Part 2: FX Trading Agent Intelligence Layer — Implementation Plan

Fill in the `runAgentCycle()` skeleton from Part 1 with: news fetching (Parallel AI), LLM analysis (AI SDK + Gemini CLI provider), trade execution (Mento Broker + Turnkey wallet), and position tracking.

## Prerequisites (Completed in Part 1)

- [x] `agent_configs`, `agent_timeline`, `agent_positions` tables
- [x] `runAgentCycle()` skeleton in `agent-cron.ts`
- [x] `logTimeline()`, `getTradeCountToday()` helpers
- [x] `checkGuardrails()` and `calculateTradeAmount()` in rules engine
- [x] `getAgentWalletClient()` for Turnkey signing
- [x] `celoClient` public client for on-chain reads
- [x] `@autoclaw/contracts` package: `getQuote`, `buildSwapInTxs`, `applySlippage`, `checkAllowance`, `buildApproveTx`
- [x] `@autoclaw/shared` tokens: `getTokenAddress()`, `getTokenDecimals()`, `TOKEN_METADATA`, `ALL_TOKEN_ADDRESSES`
- [x] 98 passing tests across 5 test files

## Phase 0: Install Dependencies

```bash
pnpm add ai ai-sdk-provider-gemini-cli parallel-web zod --filter @autoclaw/api
```

Add to `apps/api/src/test/setup.ts`:
```typescript
process.env.PARALLEL_API_KEY = 'test-parallel-key';
process.env.GEMINI_CLI_AUTH_TYPE = 'oauth-personal';
```

## Parallel Agent Workstreams

### Agent 1: News Fetcher (`news-fetcher.ts`)

**Create:** `apps/api/src/services/news-fetcher.ts`

```typescript
// apps/api/src/services/news-fetcher.ts
import { Parallel } from 'parallel-web';

const parallel = new Parallel({ apiKey: process.env.PARALLEL_API_KEY! });

export interface NewsArticle {
  title: string;
  url: string;
  excerpt: string;
  publishedAt?: string;
  source?: string;
}

interface NewsCache {
  articles: NewsArticle[];
  fetchedAt: number;
}

const newsCache = new Map<string, NewsCache>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch FX news for the given currencies using Parallel AI Search API.
 * Results are cached for 1 hour per currency set.
 */
export async function fetchFxNews(currencies: string[]): Promise<NewsArticle[]> {
  const cacheKey = currencies.sort().join(',');
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.articles;
  }

  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();

  // Build targeted search queries (max 5 to control API costs)
  const queries = buildSearchQueries(currencies, month, year);

  const allArticles: NewsArticle[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries.slice(0, 5)) {
    try {
      const results = await parallel.search({ query, maxResults: 5 });
      for (const r of results) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          allArticles.push({
            title: r.title,
            url: r.url,
            excerpt: r.snippet,
            publishedAt: r.publishedAt,
            source: new URL(r.url).hostname,
          });
        }
      }
    } catch (err) {
      console.error(`News fetch failed for query "${query}":`, err);
    }
  }

  // Sort by recency (if available), take top 15
  const sorted = allArticles
    .sort((a, b) => {
      if (a.publishedAt && b.publishedAt) {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return 0;
    })
    .slice(0, 15);

  newsCache.set(cacheKey, { articles: sorted, fetchedAt: Date.now() });
  return sorted;
}

function buildSearchQueries(currencies: string[], month: string, year: number): string[] {
  const queries: string[] = [];

  // Currency-specific queries (top 3 currencies)
  const currencyNames: Record<string, string> = {
    EURm: 'EUR Euro', BRLm: 'BRL Brazilian Real', KESm: 'KES Kenyan Shilling',
    PHPm: 'PHP Philippine Peso', COPm: 'COP Colombian Peso', XOFm: 'XOF CFA Franc',
    NGNm: 'NGN Nigerian Naira', JPYm: 'JPY Japanese Yen', CHFm: 'CHF Swiss Franc',
    ZARm: 'ZAR South African Rand', GBPm: 'GBP British Pound', AUDm: 'AUD Australian Dollar',
    CADm: 'CAD Canadian Dollar', GHSm: 'GHS Ghanaian Cedi', XAUT: 'Gold XAU',
  };

  for (const c of currencies.slice(0, 3)) {
    const name = currencyNames[c] || c;
    queries.push(`${name} exchange rate forecast ${month} ${year}`);
  }

  // Macro queries
  queries.push(`central bank interest rate decision ${month} ${year}`);
  queries.push(`emerging market FX outlook ${month} ${year}`);

  return queries;
}

/** Clear the news cache (useful for testing) */
export function clearNewsCache(): void {
  newsCache.clear();
}
```

**Tests:** `apps/api/src/services/news-fetcher.test.ts`

- [ ] `fetchFxNews` returns articles from Parallel AI search
- [ ] Results are deduplicated by URL
- [ ] Results are cached for 1 hour (second call returns cached data)
- [ ] Cache miss after TTL expires
- [ ] Max 5 search queries per call
- [ ] Handles individual search errors gracefully (continues to next query)
- [ ] Returns max 15 articles sorted by recency
- [ ] `buildSearchQueries` creates currency-specific + macro queries
- [ ] `clearNewsCache` empties the cache

---

### Agent 2: LLM Analyzer (`llm-analyzer.ts`)

**Create:** `apps/api/src/services/llm-analyzer.ts`

**CRITICAL:** The AI SDK `generateObject` is deprecated. Use `generateText` with `Output.object()` instead. See `.claude/skills/ai-sdk/references/common-errors.md`.

```typescript
// apps/api/src/services/llm-analyzer.ts
import { generateText, Output } from 'ai';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { z } from 'zod';
import type { NewsArticle } from './news-fetcher';

const gemini = createGeminiProvider({
  authType: (process.env.GEMINI_CLI_AUTH_TYPE as 'oauth-personal') || 'oauth-personal',
});

const SignalSchema = z.object({
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

function buildSystemPrompt(params: {
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

function buildAnalysisPrompt(params: { news: NewsArticle[] }): string {
  if (params.news.length === 0) {
    return 'No news articles available. Return empty signals array and a brief market summary.';
  }

  const articles = params.news.map((n, i) =>
    `[${i + 1}] ${n.title}\n    Source: ${n.source || n.url}\n    ${n.excerpt}`
  ).join('\n\n');

  return `Analyze these ${params.news.length} FX news articles and generate trading signals:\n\n${articles}`;
}
```

**Tests:** `apps/api/src/services/llm-analyzer.test.ts`

- [ ] `analyzeFxNews` calls `generateText` with correct model and Output.object schema
- [ ] System prompt includes allowed currencies
- [ ] System prompt includes portfolio context (value + positions)
- [ ] System prompt includes custom prompt when provided
- [ ] System prompt omits custom prompt section when null
- [ ] Analysis prompt formats news articles with index, title, source, excerpt
- [ ] Analysis prompt handles empty news array
- [ ] Returns structured `TradingSignals` matching schema
- [ ] `buildSystemPrompt` and `buildAnalysisPrompt` are pure (testable without mocking LLM)

---

### Agent 3: Trade Executor (`trade-executor.ts`)

**Create:** `apps/api/src/services/trade-executor.ts`

```typescript
// apps/api/src/services/trade-executor.ts
import { type Address, parseUnits, formatUnits } from 'viem';
import {
  getQuote,
  buildSwapInTxs,
  applySlippage,
  checkAllowance,
  buildApproveTx,
  BROKER_ADDRESS,
  USDM_ADDRESS,
} from '@autoclaw/contracts';
import { getTokenAddress, getTokenDecimals } from '@autoclaw/shared';
import { celoClient } from '../lib/celo-client';
import { getAgentWalletClient } from '../lib/turnkey-wallet';

const DEFAULT_SLIPPAGE_PCT = 0.5;
const approvedTokens = new Set<string>(); // Track approvals (in-memory, clears on restart)

export interface TradeResult {
  txHash: string;
  amountIn: bigint;
  amountOut: bigint;
  rate: number;
}

/**
 * Execute a trade on the Mento Broker via the Turnkey wallet.
 *
 * Flow: resolve tokens → get quote → check/set approval → build swap txs → send via Turnkey
 */
export async function executeTrade(params: {
  turnkeyAddress: string;
  currency: string;
  direction: 'buy' | 'sell';
  amountUsd: number;
}): Promise<TradeResult> {
  const { turnkeyAddress, currency, direction, amountUsd } = params;

  // Resolve token addresses
  const tokenIn = direction === 'buy' ? USDM_ADDRESS : getTokenAddress(currency) as Address;
  const tokenOut = direction === 'buy' ? getTokenAddress(currency) as Address : USDM_ADDRESS;

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unknown token address for currency: ${currency}`);
  }

  const tokenInDecimals = direction === 'buy' ? 18 : getTokenDecimals(currency);
  const tokenOutDecimals = direction === 'buy' ? getTokenDecimals(currency) : 18;

  // Parse amount in the input token's decimals
  const amountIn = parseUnits(amountUsd.toString(), tokenInDecimals);

  // 1. Get quote from Mento Broker
  const quote = await getQuote({
    tokenIn,
    tokenOut,
    amountIn,
    tokenInDecimals,
    tokenOutDecimals,
    celoClient,
  });

  // 2. Apply slippage
  const amountOutMin = applySlippage(quote.amountOut, DEFAULT_SLIPPAGE_PCT);

  // 3. Get Turnkey wallet client
  const walletClient = await getAgentWalletClient(turnkeyAddress);

  // 4. Check and set token approval if needed
  const approvalKey = `${tokenIn}-${turnkeyAddress}`;
  if (!approvedTokens.has(approvalKey)) {
    const allowance = await checkAllowance({
      token: tokenIn,
      owner: turnkeyAddress as Address,
      spender: BROKER_ADDRESS,
      celoClient,
    });

    if (allowance < amountIn) {
      const approveTx = buildApproveTx({ token: tokenIn, spender: BROKER_ADDRESS });
      const approveHash = await walletClient.sendTransaction({
        to: approveTx.to,
        data: approveTx.data,
        chain: walletClient.chain,
      });
      await celoClient.waitForTransactionReceipt({ hash: approveHash });
    }
    approvedTokens.add(approvalKey);
  }

  // 5. Build swap transaction(s)
  const txs = buildSwapInTxs({
    route: quote.route,
    amountIn,
    amountOutMin,
  });

  // 6. Execute each hop sequentially
  let lastHash: `0x${string}` = '0x';
  for (const tx of txs) {
    lastHash = await walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      chain: walletClient.chain,
    });
    await celoClient.waitForTransactionReceipt({ hash: lastHash });
  }

  return {
    txHash: lastHash,
    amountIn,
    amountOut: quote.amountOut,
    rate: quote.rate,
  };
}

/** Clear the approval cache (useful for testing) */
export function clearApprovalCache(): void {
  approvedTokens.clear();
}
```

**Tests:** `apps/api/src/services/trade-executor.test.ts`

- [ ] `executeTrade` resolves token addresses for buy direction (USDm → currency)
- [ ] `executeTrade` resolves token addresses for sell direction (currency → USDm)
- [ ] Gets quote with correct params from Mento Broker
- [ ] Applies 0.5% slippage to amountOutMin
- [ ] Checks allowance before first trade for a token
- [ ] Sends approve tx when allowance is insufficient
- [ ] Skips approve when allowance is sufficient
- [ ] Skips allowance check on second trade (approval cached)
- [ ] Builds swap txs from quote route
- [ ] Sends each hop tx via walletClient and waits for receipt
- [ ] Returns txHash, amountIn, amountOut, rate
- [ ] Throws on unknown currency
- [ ] `clearApprovalCache` resets tracked approvals

---

### Agent 4: Full Agent Cycle + Position Tracking (`agent-cron.ts` update + `position-tracker.ts`)

**Create:** `apps/api/src/services/position-tracker.ts`

```typescript
// apps/api/src/services/position-tracker.ts
import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import { formatUnits, type Address } from 'viem';
import { celoClient } from '../lib/celo-client';
import { getTokenAddress, getTokenDecimals, ALL_TOKEN_ADDRESSES } from '@autoclaw/shared';
import { erc20Abi } from '@autoclaw/contracts';

type PositionRow = Database['public']['Tables']['agent_positions']['Row'];

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Get current positions for a wallet from the DB.
 */
export async function getPositions(walletAddress: string): Promise<PositionRow[]> {
  const { data, error } = await supabaseAdmin
    .from('agent_positions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .gt('balance', 0);

  if (error) {
    console.error('Failed to fetch positions:', error);
    return [];
  }

  return (data ?? []) as PositionRow[];
}

/**
 * Calculate the total portfolio value in USD.
 * For Mento stables pegged to fiat, uses 1:1 with USD as approximation.
 * For tokens with price snapshots, uses the latest snapshot.
 */
export async function calculatePortfolioValue(
  positions: PositionRow[],
): Promise<number> {
  let total = 0;
  for (const pos of positions) {
    // Look up price from token_price_snapshots
    const { data: snapshot } = await supabaseAdmin
      .from('token_price_snapshots')
      .select('price_usd')
      .eq('token_symbol', pos.token_symbol)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const priceUsd = (snapshot as { price_usd: number } | null)?.price_usd ?? 1;
    total += pos.balance * priceUsd;
  }
  return total;
}

/**
 * Update positions after a trade.
 * Upserts the position for the traded currency.
 */
export async function updatePositionAfterTrade(params: {
  walletAddress: string;
  currency: string;
  direction: 'buy' | 'sell';
  amountUsd: number;
  rate: number;
}): Promise<void> {
  const { walletAddress, currency, direction, amountUsd, rate } = params;
  const tokenAddress = getTokenAddress(currency) || '';

  // Fetch existing position
  const { data: existing } = await supabaseAdmin
    .from('agent_positions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .eq('token_symbol', currency)
    .maybeSingle();

  const existingPos = existing as PositionRow | null;
  const currentBalance = existingPos?.balance ?? 0;
  const currentAvgRate = existingPos?.avg_entry_rate ?? 0;

  let newBalance: number;
  let newAvgRate: number;

  if (direction === 'buy') {
    const tokensAcquired = amountUsd * rate; // approximate tokens at rate
    newBalance = currentBalance + tokensAcquired;
    // Weighted average entry rate
    if (newBalance > 0) {
      newAvgRate = ((currentBalance * currentAvgRate) + (tokensAcquired * (1 / rate))) / newBalance;
    } else {
      newAvgRate = 1 / rate;
    }
  } else {
    // Sell: reduce balance
    const tokensReduced = amountUsd * rate;
    newBalance = Math.max(0, currentBalance - tokensReduced);
    newAvgRate = currentAvgRate; // avg rate doesn't change on sell
  }

  await supabaseAdmin
    .from('agent_positions')
    .upsert({
      wallet_address: walletAddress,
      token_symbol: currency,
      token_address: tokenAddress,
      balance: newBalance,
      avg_entry_rate: newAvgRate,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wallet_address,token_symbol' });
}
```

**Modify:** `apps/api/src/services/agent-cron.ts` — fill in `runAgentCycle()`

```typescript
// Replace the skeleton runAgentCycle with the full implementation:
export async function runAgentCycle(config: AgentConfigRow): Promise<void> {
  const walletAddress = config.wallet_address;

  try {
    // 1. Log cycle start
    await logTimeline(walletAddress, 'system', { summary: 'Agent cycle started' });

    // 2. Fetch positions and portfolio value
    const positions = await getPositions(walletAddress);
    const portfolioValue = await calculatePortfolioValue(positions);

    // 3. Fetch FX news
    const allowedCurrencies = (config.allowed_currencies ?? []) as string[];
    const news = await fetchFxNews(allowedCurrencies.length > 0 ? allowedCurrencies : ['EURm', 'GBPm', 'JPYm']);

    // 4. Analyze with LLM
    const signals = await analyzeFxNews({
      news,
      currentPositions: positions.map(p => ({ tokenSymbol: p.token_symbol, balance: p.balance })),
      portfolioValueUsd: portfolioValue,
      allowedCurrencies,
      customPrompt: config.custom_prompt,
    });

    // 5. Log analysis event
    await logTimeline(walletAddress, 'analysis', {
      summary: `Scanned ${news.length} sources. ${signals.signals.filter(s => s.direction !== 'hold').length} actionable signals.`,
      detail: { marketSummary: signals.marketSummary, signalCount: signals.signals.length },
      citations: news.slice(0, 5).map(n => ({ url: n.url, title: n.title, excerpt: n.excerpt })),
    });

    // 6. Process signals through rules engine
    const tradesToday = await getTradeCountToday(walletAddress);

    for (const signal of signals.signals) {
      if (signal.direction === 'hold') continue;
      if (signal.confidence < 60) continue;

      const tradeAmountUsd = calculateTradeAmount(signal.confidence, config.max_trade_size_usd);
      if (tradeAmountUsd === 0) continue;

      const check = checkGuardrails({
        signal: { currency: signal.currency, direction: signal.direction, confidence: signal.confidence, reasoning: signal.reasoning },
        config: {
          maxTradeSizeUsd: config.max_trade_size_usd,
          maxAllocationPct: config.max_allocation_pct,
          stopLossPct: config.stop_loss_pct,
          dailyTradeLimit: config.daily_trade_limit,
          allowedCurrencies,
          blockedCurrencies: (config.blocked_currencies ?? []) as string[],
        },
        positions: positions.map(p => ({ tokenSymbol: p.token_symbol, balance: p.balance })),
        portfolioValueUsd: portfolioValue,
        tradesToday,
        tradeAmountUsd,
      });

      if (!check.passed) {
        await logTimeline(walletAddress, 'guardrail', {
          summary: `Blocked ${signal.currency} ${signal.direction} — ${check.blockedReason}`,
          detail: { rule: check.ruleName, signal },
          currency: signal.currency,
        });
        continue;
      }

      // Execute trade
      try {
        const result = await executeTrade({
          turnkeyAddress: config.turnkey_wallet_address!,
          currency: signal.currency,
          direction: signal.direction as 'buy' | 'sell',
          amountUsd: tradeAmountUsd,
        });

        // Log trade event
        await logTimeline(walletAddress, 'trade', {
          summary: `${signal.direction === 'buy' ? 'Bought' : 'Sold'} ${signal.currency} ($${tradeAmountUsd.toFixed(2)})`,
          detail: { reasoning: signal.reasoning, confidence: signal.confidence, rate: result.rate },
          citations: news.slice(0, 3).map(n => ({ url: n.url, title: n.title })),
          currency: signal.currency,
          amountUsd: tradeAmountUsd,
          direction: signal.direction as 'buy' | 'sell',
          txHash: result.txHash,
          confidencePct: signal.confidence,
        });

        // Update positions
        await updatePositionAfterTrade({
          walletAddress,
          currency: signal.currency,
          direction: signal.direction as 'buy' | 'sell',
          amountUsd: tradeAmountUsd,
          rate: result.rate,
        });
      } catch (tradeErr) {
        await logTimeline(walletAddress, 'system', {
          summary: `Trade execution failed for ${signal.currency}: ${tradeErr instanceof Error ? tradeErr.message : 'Unknown error'}`,
          detail: { signal, error: tradeErr instanceof Error ? tradeErr.message : String(tradeErr) },
          currency: signal.currency,
        });
      }
    }
  } catch (error) {
    await logTimeline(walletAddress, 'system', {
      summary: `Agent cycle failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}
```

**Tests for Agent 4:**

`apps/api/src/services/position-tracker.test.ts`:
- [ ] `getPositions` returns positions with balance > 0
- [ ] `getPositions` returns empty array on error
- [ ] `calculatePortfolioValue` sums positions * price from snapshots
- [ ] `calculatePortfolioValue` defaults price to $1 when no snapshot
- [ ] `updatePositionAfterTrade` inserts new position on buy
- [ ] `updatePositionAfterTrade` updates existing position balance on buy
- [ ] `updatePositionAfterTrade` calculates weighted avg entry rate
- [ ] `updatePositionAfterTrade` reduces balance on sell (min 0)
- [ ] `updatePositionAfterTrade` preserves avg rate on sell

`apps/api/src/services/agent-cron.test.ts` (update existing):
- [ ] Full `runAgentCycle` orchestrates: positions → news → LLM → rules → trade → log
- [ ] Logs 'system' event at start
- [ ] Logs 'analysis' event with news count and signal count
- [ ] Skips signals with direction 'hold'
- [ ] Skips signals with confidence < 60
- [ ] Logs 'guardrail' event when rules engine blocks
- [ ] Logs 'trade' event on successful execution
- [ ] Updates positions after successful trade
- [ ] Catches individual trade errors without stopping the loop
- [ ] Catches top-level errors and logs 'system' error event

## Files Summary

| Action | File | Agent |
|--------|------|-------|
| Create | `apps/api/src/services/news-fetcher.ts` | Agent 1 |
| Create | `apps/api/src/services/news-fetcher.test.ts` | Agent 1 |
| Create | `apps/api/src/services/llm-analyzer.ts` | Agent 2 |
| Create | `apps/api/src/services/llm-analyzer.test.ts` | Agent 2 |
| Create | `apps/api/src/services/trade-executor.ts` | Agent 3 |
| Create | `apps/api/src/services/trade-executor.test.ts` | Agent 3 |
| Create | `apps/api/src/services/position-tracker.ts` | Agent 4 |
| Create | `apps/api/src/services/position-tracker.test.ts` | Agent 4 |
| Modify | `apps/api/src/services/agent-cron.ts` | Agent 4 |
| Modify | `apps/api/src/services/agent-cron.test.ts` | Agent 4 |
| Modify | `apps/api/package.json` (add deps) | Phase 0 |
| Modify | `apps/api/src/test/setup.ts` (add env vars) | Phase 0 |

## Acceptance Criteria

- [x] `pnpm add ai ai-sdk-provider-gemini-cli parallel-web zod` in apps/api
- [x] `fetchFxNews()` returns deduplicated, cached articles
- [x] `analyzeFxNews()` returns structured `TradingSignals` via `generateText` + `Output.object()`
- [x] System prompt includes portfolio context, allowed currencies, user custom prompt
- [x] `executeTrade()` handles quote → approve → swap → receipt flow
- [x] Multi-hop Mento routes executed sequentially
- [x] Token approvals cached in-memory
- [x] `getPositions()` and `calculatePortfolioValue()` read from DB
- [x] `updatePositionAfterTrade()` upserts positions after trades
- [x] Full `runAgentCycle()` orchestrates all steps with proper error handling
- [x] All 5 event types logged correctly to `agent_timeline`
- [x] All tests pass (`pnpm test`) — 125 tests across 9 files
- [x] Type check passes (only pre-existing trade.ts errors remain)

## Key Technical Notes

1. **AI SDK API change:** `generateObject` is deprecated → use `generateText` with `Output.object({ schema })`. Access result via `result.output`.
2. **Gemini CLI provider:** Use `createGeminiProvider({ authType: 'oauth-personal' })` per skill docs.
3. **Token decimals:** Mento tokens use 18 decimals, USDC/USDT use 6. Always use `getTokenDecimals()`.
4. **Approval strategy:** Infinite approval (`MAX_UINT256`) on first trade per token, cached in-memory Set.
5. **Error isolation:** Each trade in the signal loop has its own try/catch — one failure doesn't stop other signals.
6. **News caching:** 1-hour TTL per currency set to control Parallel AI API costs.

## References

- Part 1: `docs/plans/2026-02-11-feat-fx-agent-backend-foundation-plan.md`
- AI SDK skill: `.claude/skills/ai-sdk/SKILL.md`
- AI SDK common errors: `.claude/skills/ai-sdk/references/common-errors.md`
- Gemini CLI provider: `.claude/skills/ai-sdk/references/gemini-cli-provider.md`
- Parallel AI skill: `.claude/skills/parallel-ai/SKILL.md`
- Mento protocol skill: `.claude/skills/mento-protocol/SKILL.md`
- Contracts package: `packages/contracts/src/` (quote.ts, swap.ts, allowance.ts)
- Shared tokens: `packages/shared/src/types/tokens.ts`
- Turnkey wallet: `apps/api/src/lib/turnkey-wallet.ts`
- Celo client: `apps/api/src/lib/celo-client.ts`
