---
title: "feat: FX Trading Agent Intelligence Layer"
type: feat
date: 2026-02-11
part: 2 of 3
series: fx-trading-agent
depends_on: 2026-02-11-feat-fx-agent-backend-foundation-plan.md
---

# Part 2: FX Trading Agent — Intelligence Layer

LLM analysis via AI SDK + Gemini CLI provider, Parallel AI news fetching, structured signal generation, and the full trade execution loop. This fills in the `runAgentCycle()` skeleton from Part 1.

## Overview

Implement the agent's brain: fetch FX news using Parallel AI Search API, analyze it with an LLM (Gemini via AI SDK), produce structured trading signals, run them through the rules engine, and execute approved trades via the Turnkey wallet on Mento Broker.

## Proposed Solution

### News Fetching (Parallel AI)

**New file:** `apps/api/src/services/news-fetcher.ts`

```typescript
// apps/api/src/services/news-fetcher.ts
import { Parallel } from 'parallel-web';

const parallel = new Parallel({ apiKey: process.env.PARALLEL_API_KEY! });

export interface NewsArticle {
  title: string;
  url: string;
  excerpt: string;
  publishedAt?: string;
}

export async function fetchFxNews(currencies: string[]): Promise<NewsArticle[]> {
  // Search for each currency's FX news
  // Example queries: "EUR USD exchange rate forecast", "Kenya shilling KES outlook"
  // Deduplicate by URL, sort by recency
  // Return top N articles across all currencies
}
```

**Search strategy:**
- Build targeted queries per currency: `"{currency} exchange rate outlook {current_month} {year}"`
- Also search macro terms: `"central bank interest rate decision"`, `"emerging market FX"`, `"gold price forecast"`
- Max 3-5 Parallel AI searches per agent cycle (to control API costs)
- Cache results for 1 hour (same news doesn't need re-fetching)

### LLM Analysis (AI SDK + Gemini CLI)

**New file:** `apps/api/src/services/llm-analyzer.ts`

```typescript
// apps/api/src/services/llm-analyzer.ts
import { generateObject } from 'ai';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { z } from 'zod';

const gemini = createGeminiProvider({ authType: 'oauth-personal' });

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

export async function analyzeFxNews(params: {
  news: NewsArticle[];
  currentPositions: AgentPosition[];
  portfolioValueUsd: number;
  allowedCurrencies: string[];
  customPrompt?: string;
}): Promise<TradingSignals> {
  const { object } = await generateObject({
    model: gemini('gemini-2.5-pro'),
    schema: SignalSchema,
    system: buildSystemPrompt(params),
    prompt: buildAnalysisPrompt(params),
  });
  return object;
}
```

**System prompt design:**
- Role: FX analyst for Mento stablecoin portfolio on Celo
- Context: Base currency is USDm, universe is 15 Mento stables + XAUT
- Constraints: Only generate signals for `allowedCurrencies`
- Output: Structured signals with confidence 0-100, reasoning must cite specific news
- User's `customPrompt` appended at the end (e.g., "Be conservative with emerging market currencies")

**Key principle:** The LLM generates signals with confidence scores and reasoning. It does NOT decide to trade. The rules engine (Part 1) makes the final decision.

### Install Dependencies

```bash
pnpm add ai ai-sdk-provider-gemini-cli parallel-web zod --filter @autoclaw/api
```

Also ensure Gemini CLI is globally installed: `npm install -g @google/gemini-cli`

### Trade Execution

**New file:** `apps/api/src/services/trade-executor.ts`

```typescript
// apps/api/src/services/trade-executor.ts
import { getQuote, buildSwapInTxs, applySlippage } from '@autoclaw/contracts';
import { getAgentWalletClient } from '../lib/turnkey-wallet';

export async function executeTrade(params: {
  turnkeyAddress: string;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  tokenInDecimals: number;
  tokenOutDecimals: number;
}): Promise<{ txHash: string; amountOut: bigint }> {
  // 1. Get quote from Mento Broker
  const quote = await getQuote({ ...params, celoClient });

  // 2. Apply slippage (0.5%)
  const amountOutMin = applySlippage(quote.amountOut, 0.5);

  // 3. Check token approval (approve Broker if needed)
  // 4. Build swap transaction(s)
  const txs = buildSwapInTxs({
    route: quote.route,
    amountIn: params.amountIn,
    amountOutMin,
  });

  // 5. Get Turnkey wallet client and send each tx
  const walletClient = await getAgentWalletClient(params.turnkeyAddress);
  let lastHash: string;
  for (const tx of txs) {
    lastHash = await walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      feeCurrency: USDM_ADDRESS, // Pay gas in USDm
    });
    // Wait for confirmation before next hop
    await celoClient.waitForTransactionReceipt({ hash: lastHash });
  }

  return { txHash: lastHash, amountOut: quote.amountOut };
}
```

### Full Agent Cycle

**Update:** `apps/api/src/services/agent-cron.ts` (fill in `runAgentCycle`)

```typescript
export async function runAgentCycle(config: AgentConfig): Promise<void> {
  const walletAddress = config.wallet_address;

  try {
    // 1. Log SYSTEM event: cycle started
    await logTimeline(walletAddress, 'system', { summary: 'Agent cycle started' });

    // 2. Fetch current positions and portfolio value
    const positions = await getPositions(walletAddress);
    const portfolioValue = await calculatePortfolioValue(positions);

    // 3. Fetch FX news via Parallel AI
    const news = await fetchFxNews(config.allowed_currencies);

    // 4. Analyze with LLM
    const signals = await analyzeFxNews({
      news,
      currentPositions: positions,
      portfolioValueUsd: portfolioValue,
      allowedCurrencies: config.allowed_currencies,
      customPrompt: config.custom_prompt,
    });

    // 5. Log ANALYSIS event
    await logTimeline(walletAddress, 'analysis', {
      summary: `Scanned ${news.length} sources. ${signals.signals.filter(s => s.direction !== 'hold').length} actionable signals.`,
      detail: { marketSummary: signals.marketSummary, signalCount: signals.signals.length },
      citations: news.map(n => ({ url: n.url, title: n.title, excerpt: n.excerpt })),
    });

    // 6. Process each signal through rules engine
    const tradesToday = await getTradeCountToday(walletAddress);

    for (const signal of signals.signals) {
      if (signal.direction === 'hold') continue;
      if (signal.confidence < 60) continue; // Minimum confidence threshold

      const check = checkGuardrails({
        signal,
        config,
        positions,
        portfolioValueUsd: portfolioValue,
        tradesToday,
      });

      if (!check.passed) {
        // 7a. Log GUARDRAIL event
        await logTimeline(walletAddress, 'guardrail', {
          summary: `Blocked ${signal.currency} ${signal.direction} — ${check.blocked_reason}`,
          detail: { rule: check.rule_name, signal },
          currency: signal.currency,
        });
        continue;
      }

      // 7b. Calculate trade amount based on confidence and max_trade_size
      const tradeAmountUsd = calculateTradeAmount(signal.confidence, config.max_trade_size_usd);

      // 8. Execute trade
      const result = await executeTrade({
        turnkeyAddress: config.turnkey_wallet_address,
        tokenIn: resolveTokenAddress(signal.direction === 'buy' ? 'USDm' : signal.currency),
        tokenOut: resolveTokenAddress(signal.direction === 'buy' ? signal.currency : 'USDm'),
        amountIn: parseUnits(tradeAmountUsd.toString(), getTokenDecimals(/*...*/)),
        tokenInDecimals: /*...*/,
        tokenOutDecimals: /*...*/,
      });

      // 9. Log TRADE event
      await logTimeline(walletAddress, 'trade', {
        summary: `${signal.direction === 'buy' ? 'Bought' : 'Sold'} ${signal.currency} ($${tradeAmountUsd})`,
        detail: { reasoning: signal.reasoning, confidence: signal.confidence },
        citations: news.slice(0, 3).map(n => ({ url: n.url, title: n.title })),
        currency: signal.currency,
        amount_usd: tradeAmountUsd,
        direction: signal.direction,
        tx_hash: result.txHash,
        confidence_pct: signal.confidence,
      });

      // 10. Update positions
      await updatePositions(walletAddress, signal.currency, result);
    }

  } catch (error) {
    // Log SYSTEM error event
    await logTimeline(walletAddress, 'system', {
      summary: `Agent cycle failed: ${error.message}`,
      detail: { error: error.message },
    });
  }
}
```

### Trade Amount Calculation

Scale trade size by confidence:
- 60-70% confidence → 25% of max_trade_size
- 70-80% confidence → 50% of max_trade_size
- 80-90% confidence → 75% of max_trade_size
- 90-100% confidence → 100% of max_trade_size

### Token Approval Strategy

Before the first trade, the agent needs to approve the Mento Broker to spend tokens. Strategy:
- On first trade for a token pair, approve `MAX_UINT256` (infinite approval) for the Broker address
- Track approvals in a simple in-memory set (cleared on restart, re-approves are cheap)
- Use `packages/contracts/src/allowance.ts` for approval logic

## Acceptance Criteria

- [ ] `pnpm add ai ai-sdk-provider-gemini-cli parallel-web zod` in apps/api
- [ ] Gemini CLI OAuth working with Google AI Pro subscription
- [ ] `fetchFxNews()` returns relevant articles for specified currencies
- [ ] News results cached for 1 hour to reduce API calls
- [ ] `analyzeFxNews()` returns structured `TradingSignals` via `generateObject`
- [ ] System prompt includes portfolio context, allowed currencies, and user's custom prompt
- [ ] Minimum confidence threshold (60%) filters out weak signals
- [ ] Trade amount scales with confidence score
- [ ] `executeTrade()` handles single-hop and multi-hop Mento routes
- [ ] Trades use `feeCurrency: USDm` — no CELO needed
- [ ] Token approvals handled automatically before first trade
- [ ] Full `runAgentCycle()` orchestrates: news → LLM → rules → trade → log
- [ ] All 5 event types logged correctly to `agent_timeline`
- [ ] Errors caught and logged as SYSTEM events (agent doesn't crash)

## Technical Considerations

- **LLM cost control:** Use `gemini-2.5-flash` for routine analysis, `gemini-2.5-pro` for high-conviction signals only
- **Parallel AI rate limits:** Max 5 searches per cycle, respect quotas
- **Transaction ordering:** Multi-hop swaps must be sequential (wait for receipt between hops)
- **Gas estimation:** viem handles gas estimation automatically on Celo
- **Idempotency:** If a cycle crashes mid-execution, the next cycle should detect partial state and recover

## Dependencies & Risks

- **Depends on Part 1** — needs `agent_configs`, `agent_timeline`, `agent_positions` tables and rules engine
- **Gemini CLI auth** — OAuth flow must be completed on the server running the API
- **Parallel AI API key** — needed before development
- **On-chain failures** — swaps can fail (insufficient liquidity, slippage exceeded); need retry/skip logic

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `apps/api/src/services/news-fetcher.ts` |
| Create | `apps/api/src/services/llm-analyzer.ts` |
| Create | `apps/api/src/services/trade-executor.ts` |
| Modify | `apps/api/src/services/agent-cron.ts` (fill in runAgentCycle) |
| Modify | `apps/api/package.json` (add ai, ai-sdk-provider-gemini-cli, parallel-web, zod) |
| Modify | `apps/api/.env.example` (add PARALLEL_API_KEY) |

## References

- Brainstorm: `docs/brainstorms/2026-02-10-fx-trading-agent-pivot-brainstorm.md`
- Part 1 plan: `docs/plans/2026-02-11-feat-fx-agent-backend-foundation-plan.md`
- AI SDK skill: `.claude/skills/ai-sdk/SKILL.md`
- Gemini CLI reference: `.claude/skills/ai-sdk/references/gemini-cli-provider.md`
- Parallel AI skill: `.claude/skills/parallel-ai/SKILL.md`
- Mento swap: `packages/contracts/src/swap.ts`
- Mento quote: `packages/contracts/src/quote.ts`
- Mento routing: `packages/contracts/src/exchanges.ts`
