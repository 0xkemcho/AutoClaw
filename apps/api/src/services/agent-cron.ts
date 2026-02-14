import { randomUUID } from 'node:crypto';
import { type Address, erc20Abi, formatUnits } from 'viem';
import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import { frequencyToMs, FREQUENCY_MS, type AgentFrequency, MENTO_TOKENS, ALL_TOKEN_ADDRESSES, TOKEN_METADATA } from '@autoclaw/shared';
import { fetchFxNews } from './news-fetcher';
import { analyzeFxNews } from './llm-analyzer';
import { executeTrade } from './trade-executor';
import { getPositions, calculatePortfolioValue, updatePositionAfterTrade } from './position-tracker';
import { checkGuardrails, calculateTradeAmount } from './rules-engine';
import { emitProgress } from './agent-events';
import { submitTradeFeedback } from './agent-registry';
import { celoClient } from '../lib/celo-client';

type AgentConfigRow = Database['public']['Tables']['agent_configs']['Row'];
type TimelineInsert = Database['public']['Tables']['agent_timeline']['Insert'];

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TICK_INTERVAL_MS = 60_000; // Check every minute

/**
 * Start the agent cron loop. Called once on server boot.
 */
export function startAgentCron(): void {
  console.log('Starting agent cron (tick every 60s)');
  agentTick();
  setInterval(agentTick, TICK_INTERVAL_MS);
}

async function agentTick(): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Find agents that are active and due to run
    const { data: rawAgents, error } = await supabaseAdmin
      .from('agent_configs')
      .select('*')
      .eq('active', true)
      .lte('next_run_at', now);

    if (error) {
      console.error('Agent tick: failed to query due agents:', error);
      return;
    }

    const dueAgents = (rawAgents ?? []) as AgentConfigRow[];
    if (dueAgents.length === 0) return;

    console.log(`Agent tick: ${dueAgents.length} agent(s) due to run`);

    for (const config of dueAgents) {
      const rawFreq = config.frequency;
      const freqMs = typeof rawFreq === 'number'
        ? frequencyToMs(rawFreq)
        : (FREQUENCY_MS[String(rawFreq)] ?? frequencyToMs(24));
      try {
        await runAgentCycle(config);

        // Success — schedule next run at normal interval
        const nextRun = new Date(Date.now() + freqMs).toISOString();
        const { error: updateError } = await supabaseAdmin
          .from('agent_configs')
          .update({ last_run_at: new Date().toISOString(), next_run_at: nextRun, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (updateError) {
          console.error(`Failed to update next_run_at for ${config.wallet_address}:`, updateError);
        }
      } catch (err) {
        console.error(`Agent cycle failed for ${config.wallet_address}:`, err);
        await logTimeline(config.wallet_address, 'system', {
          summary: `Agent cycle failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });

        // Failure — retry in 5 minutes instead of full interval
        const retryRun = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from('agent_configs')
          .update({ next_run_at: retryRun, updated_at: new Date().toISOString() })
          .eq('id', config.id);
      }
    }
  } catch (err) {
    console.error('Agent tick error:', err);
  }
}

/**
 * Run a single agent cycle. Part 2 fills in the intelligence.
 * Skeleton: logs a system event indicating the cycle ran.
 */
export async function runAgentCycle(config: AgentConfigRow): Promise<void> {
  const walletAddress = config.wallet_address;
  const runId = randomUUID();

  console.log(`[agent:${walletAddress.slice(0, 8)}] Starting cycle (runId=${runId.slice(0, 8)})`);

  // Validate server wallet exists before executing any trades
  if (!config.server_wallet_id || !config.server_wallet_address) {
    throw new Error('Server wallet not configured — skipping agent cycle');
  }

  try {
    // 1. Log cycle start
    await logTimeline(walletAddress, 'system', { summary: 'Agent cycle started' }, runId);

    // 2. Fetch positions and portfolio value
    console.log(`[agent:${walletAddress.slice(0, 8)}] Fetching positions...`);
    const positions = await getPositions(walletAddress);
    const portfolioValue = await calculatePortfolioValue(positions);
    console.log(`[agent:${walletAddress.slice(0, 8)}] Portfolio: $${portfolioValue.toFixed(2)}, ${positions.length} positions`);

    // 2b. Fetch on-chain wallet balances so the LLM knows what we actually hold
    const walletBalances = await getOnChainBalances(config.server_wallet_address);
    const balanceSummary = walletBalances
      .filter(b => b.balance > 0)
      .map(b => `${b.symbol}: ${b.formatted}`)
      .join(', ') || 'Empty wallet';
    console.log(`[agent:${walletAddress.slice(0, 8)}] On-chain balances: ${balanceSummary}`);

    // 3. Fetch FX news
    const rawAllowed = (config.allowed_currencies ?? []) as string[];
    // "ALL" means all tradeable Mento tokens (exclude USDm — that's the base)
    const allowedCurrencies =
      rawAllowed.length === 0 || rawAllowed.includes('ALL')
        ? MENTO_TOKENS.filter((t) => t !== 'USDm')
        : rawAllowed;
    const currencies = allowedCurrencies.length > 0 ? [...allowedCurrencies] : ['EURm', 'GBPm', 'JPYm'];
    console.log(`[agent:${walletAddress.slice(0, 8)}] Fetching news for: ${currencies.join(', ')}`);
    emitProgress(walletAddress, 'fetching_news', `Fetching FX news for ${currencies.join(', ')}...`);
    const news = await fetchFxNews(currencies);
    console.log(`[agent:${walletAddress.slice(0, 8)}] Fetched ${news.length} articles`);

    // Emit again with article data now that fetch is complete
    emitProgress(walletAddress, 'fetching_news', `Found ${news.length} articles`, {
      articles: news.slice(0, 15).map(a => ({ title: a.title, url: a.url, source: a.source ?? new URL(a.url).hostname })),
      queryCount: currencies.length,
    });

    // 3b. Guard: skip LLM analysis when no news articles were fetched
    if (news.length === 0) {
      await logTimeline(walletAddress, 'system', {
        summary: 'No news articles fetched — skipping analysis',
      }, runId);
      emitProgress(walletAddress, 'complete', 'No news articles found.', {
        signalCount: 0, tradeCount: 0, blockedCount: 0,
      });
      return;
    }

    // 4. Analyze with LLM — pass wallet balances so it can size trades properly
    console.log(`[agent:${walletAddress.slice(0, 8)}] Sending ${news.length} articles to LLM...`);
    emitProgress(walletAddress, 'analyzing', `Analyzing ${news.length} articles with AI...`);
    const signals = await analyzeFxNews({
      news,
      currentPositions: positions.map(p => ({ tokenSymbol: p.token_symbol, balance: p.balance })),
      portfolioValueUsd: portfolioValue,
      allowedCurrencies,
      walletBalances: walletBalances.filter(b => b.balance > 0).map(b => ({
        symbol: b.symbol,
        formatted: b.formatted,
        valueUsd: b.valueUsd,
      })),
      customPrompt: config.custom_prompt,
    });

    // Emit signals data
    console.log(`[agent:${walletAddress.slice(0, 8)}] LLM returned ${signals.signals.length} signals: ${signals.signals.map(s => `${s.currency} ${s.direction} ${s.confidence}% alloc=${s.allocationPct ?? 0}%`).join(', ')}`);
    emitProgress(walletAddress, 'analyzing', `Generated ${signals.signals.length} signals`, {
      signals: signals.signals.map(s => ({
        currency: s.currency,
        direction: s.direction,
        confidence: s.confidence,
        reasoning: s.reasoning,
      })),
      marketSummary: signals.marketSummary,
    });

    // 5. Log analysis event (include ALL signals for transparency)
    const actionableCount = signals.signals.filter(s => s.direction !== 'hold' && s.confidence >= 60).length;
    const signalSummary = signals.signals
      .map(s => `${s.currency} ${s.direction} ${s.confidence}%`)
      .join(', ');

    emitProgress(walletAddress, 'checking_signals',
      signals.signals.length > 0
        ? `${signals.signals.length} signal${signals.signals.length !== 1 ? 's' : ''}: ${signalSummary}`
        : 'No signals generated.',
    );

    await logTimeline(walletAddress, 'analysis', {
      summary: signals.signals.length > 0
        ? `Scanned ${news.length} sources. ${actionableCount} actionable. ${signalSummary}`
        : `Scanned ${news.length} sources. No signals generated.`,
      detail: {
        marketSummary: signals.marketSummary,
        signalCount: signals.signals.length,
        signals: signals.signals,
        sourcesUsed: signals.sourcesUsed,
      },
      citations: news.slice(0, 5).map(n => ({ url: n.url, title: n.title, excerpt: n.excerpt })),
    }, runId);

    // 6. Process signals through rules engine
    const tradesToday = await getTradeCountToday(walletAddress);

    // Build a price map for position tokens (used by guardrail allocation & stop-loss checks)
    const positionPrices: Record<string, number> = {};
    for (const pos of positions) {
      const { data: snapshot } = await supabaseAdmin
        .from('token_price_snapshots')
        .select('price_usd')
        .eq('token_symbol', pos.token_symbol)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      positionPrices[pos.token_symbol] = (snapshot as { price_usd: number } | null)?.price_usd ?? 1;
    }

    // Calculate available buying power from base stables
    const GAS_RESERVE_USD = 0.50; // Reserve for Celo feeCurrency gas costs
    const baseStableSymbols = ['USDC', 'USDT', 'USDm'];
    let availableBuyingPower = walletBalances
      .filter(b => baseStableSymbols.includes(b.symbol) && b.balance > 0n)
      .reduce((sum, b) => sum + b.valueUsd, 0);
    availableBuyingPower = Math.max(0, availableBuyingPower - GAS_RESERVE_USD);

    let tradeCount = 0;
    let blockedCount = 0;
    for (const signal of signals.signals) {
      if (signal.direction === 'hold') continue;
      if (signal.confidence < 60) continue;

      // Use LLM's allocationPct to size the trade, fall back to confidence-based sizing
      const allocPct = signal.allocationPct ?? 0;
      let tradeAmountUsd: number;

      if (signal.direction === 'buy') {
        if (availableBuyingPower <= 0) {
          console.log(`[agent:${walletAddress.slice(0, 8)}] Skipping ${signal.currency} buy — no buying power left`);
          blockedCount++;
          emitProgress(walletAddress, 'checking_signals',
            `Blocked ${signal.currency} buy — no buying power remaining`,
            { currency: signal.currency, direction: 'buy', passed: false, reason: 'No buying power remaining' },
          );
          continue;
        }
        // allocationPct of available buying power, capped by max_trade_size_usd
        tradeAmountUsd = allocPct > 0
          ? Math.min(availableBuyingPower * (allocPct / 100), config.max_trade_size_usd)
          : calculateTradeAmount(signal.confidence, config.max_trade_size_usd);
        // Never exceed what's actually available
        tradeAmountUsd = Math.min(tradeAmountUsd, availableBuyingPower);
      } else {
        // Sell: allocationPct of held position value
        const heldBalance = walletBalances.find(b => b.symbol === signal.currency);
        const heldValueUsd = heldBalance?.valueUsd ?? 0;
        tradeAmountUsd = allocPct > 0 && heldValueUsd > 0
          ? Math.min(heldValueUsd * (allocPct / 100), config.max_trade_size_usd)
          : calculateTradeAmount(signal.confidence, config.max_trade_size_usd);
      }

      if (tradeAmountUsd < 0.01) continue;
      console.log(`[agent:${walletAddress.slice(0, 8)}] ${signal.currency} ${signal.direction}: allocation=${allocPct}%, amount=$${tradeAmountUsd.toFixed(2)}`);

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
        positions: positions.map(p => ({ tokenSymbol: p.token_symbol, balance: p.balance, avgEntryRate: p.avg_entry_rate ?? 0 })),
        portfolioValueUsd: portfolioValue,
        tradesToday,
        tradeAmountUsd,
        positionPrices,
      });

      if (!check.passed) {
        blockedCount++;
        emitProgress(walletAddress, 'checking_signals',
          `Blocked ${signal.currency} ${signal.direction} — ${check.blockedReason}`,
          { currency: signal.currency, direction: signal.direction, passed: false, reason: check.blockedReason, ruleName: check.ruleName },
        );
        await logTimeline(walletAddress, 'guardrail', {
          summary: `Blocked ${signal.currency} ${signal.direction} — ${check.blockedReason}`,
          detail: { rule: check.ruleName, signal },
          currency: signal.currency,
        }, runId);
        continue;
      }

      // Guardrail passed
      console.log(`[agent:${walletAddress.slice(0, 8)}] Guardrail passed: ${signal.currency} ${signal.direction} ($${tradeAmountUsd.toFixed(2)})`);
      emitProgress(walletAddress, 'checking_signals',
        `Passed: ${signal.currency} ${signal.direction}`,
        { currency: signal.currency, direction: signal.direction, passed: true },
      );

      // Execute trade
      try {
        emitProgress(walletAddress, 'executing_trades', `Executing ${signal.direction} ${signal.currency} ($${tradeAmountUsd.toFixed(2)})...`);
        const result = await executeTrade({
          serverWalletId: config.server_wallet_id,
          serverWalletAddress: config.server_wallet_address,
          currency: signal.currency,
          direction: signal.direction as 'buy' | 'sell',
          amountUsd: tradeAmountUsd,
        });

        tradeCount++;
        // Deduct from available buying power so subsequent buys are capped correctly
        if (signal.direction === 'buy') {
          availableBuyingPower = Math.max(0, availableBuyingPower - tradeAmountUsd);
        }
        emitProgress(walletAddress, 'executing_trades',
          `${signal.direction === 'buy' ? 'Bought' : 'Sold'} ${signal.currency} ($${tradeAmountUsd.toFixed(2)})`,
          { currency: signal.currency, direction: signal.direction, amountUsd: tradeAmountUsd, txHash: result.txHash },
        );
        await logTimeline(walletAddress, 'trade', {
          summary: `${signal.direction === 'buy' ? 'Bought' : 'Sold'} ${signal.currency} ($${tradeAmountUsd.toFixed(2)})`,
          detail: { reasoning: signal.reasoning, confidence: signal.confidence, rate: result.rate },
          citations: news.slice(0, 3).map(n => ({ url: n.url, title: n.title })),
          currency: signal.currency,
          amountUsd: tradeAmountUsd,
          direction: signal.direction as 'buy' | 'sell',
          txHash: result.txHash,
          confidencePct: signal.confidence,
        }, runId);

        await updatePositionAfterTrade({
          walletAddress,
          currency: signal.currency,
          direction: signal.direction as 'buy' | 'sell',
          amountUsd: tradeAmountUsd,
          rate: result.rate,
        });

        // Submit ERC-8004 reputation feedback (non-blocking)
        if (config.agent_8004_id) {
          submitTradeFeedback({
            serverWalletId: config.server_wallet_id,
            serverWalletAddress: config.server_wallet_address,
            agentId: BigInt(config.agent_8004_id),
            confidence: signal.confidence,
            currency: signal.currency,
            direction: signal.direction,
            tradeTxHash: result.txHash,
          }).catch(err => console.error('[8004] Failed to submit reputation feedback:', err.message));
        }
      } catch (tradeErr) {
        emitProgress(walletAddress, 'executing_trades',
          `Trade failed for ${signal.currency}: ${tradeErr instanceof Error ? tradeErr.message : 'Unknown error'}`,
          { currency: signal.currency, direction: signal.direction, amountUsd: tradeAmountUsd, error: tradeErr instanceof Error ? tradeErr.message : String(tradeErr) },
        );
        await logTimeline(walletAddress, 'system', {
          summary: `Trade execution failed for ${signal.currency}: ${tradeErr instanceof Error ? tradeErr.message : 'Unknown error'}`,
          detail: { signal, error: tradeErr instanceof Error ? tradeErr.message : String(tradeErr) },
          currency: signal.currency,
        }, runId);
      }
    }

    // Emit completion
    console.log(`[agent:${walletAddress.slice(0, 8)}] Cycle complete: ${signals.signals.length} signals, ${tradeCount} trades, ${blockedCount} blocked`);
    emitProgress(walletAddress, 'complete',
      `Scanned ${news.length} sources. ${actionableCount} actionable. ${tradeCount} trade${tradeCount !== 1 ? 's' : ''} executed.`,
      { signalCount: signals.signals.length, tradeCount, blockedCount },
    );
  } catch (error) {
    console.error(`[agent:${walletAddress.slice(0, 8)}] Cycle FAILED:`, error);
    emitProgress(walletAddress, 'error',
      `Agent cycle failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { step: 'unknown', error: error instanceof Error ? error.message : String(error) },
    );
    await logTimeline(walletAddress, 'system', {
      summary: `Agent cycle failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      detail: { error: error instanceof Error ? error.message : String(error) },
    }, runId);
  }
}

/**
 * Insert an event into the agent_timeline table.
 * Falls back to inserting without run_id if the column doesn't exist yet.
 */
export async function logTimeline(
  walletAddress: string,
  eventType: TimelineInsert['event_type'],
  fields: {
    summary: string;
    detail?: Record<string, unknown>;
    citations?: Array<{ url: string; title: string; excerpt?: string }>;
    confidencePct?: number;
    currency?: string;
    amountUsd?: number;
    direction?: 'buy' | 'sell';
    txHash?: string;
  },
  runId?: string,
): Promise<void> {
  const baseRow: TimelineInsert = {
    wallet_address: walletAddress,
    event_type: eventType,
    summary: fields.summary,
    detail: fields.detail ?? {},
    citations: (fields.citations ?? []) as unknown as Record<string, unknown>[],
    confidence_pct: fields.confidencePct ?? null,
    currency: fields.currency ?? null,
    amount_usd: fields.amountUsd ?? null,
    direction: fields.direction ?? null,
    tx_hash: fields.txHash ?? null,
  };

  // Try with run_id first (requires migration), fall back without it
  if (runId) {
    const rowWithRunId = { ...baseRow, run_id: runId } as TimelineInsert;
    const { error } = await supabaseAdmin.from('agent_timeline').insert(rowWithRunId);

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('run_id')) {
        // run_id column doesn't exist yet — retry without it
        const { error: retryError } = await supabaseAdmin.from('agent_timeline').insert(baseRow);
        if (retryError) {
          console.error('Failed to log timeline event (fallback):', retryError);
        }
      } else {
        console.error('Failed to log timeline event:', error);
      }
    }
  } else {
    const { error } = await supabaseAdmin.from('agent_timeline').insert(baseRow);
    if (error) {
      console.error('Failed to log timeline event:', error);
    }
  }
}

interface WalletBalance {
  symbol: string;
  balance: bigint;
  formatted: string;
  valueUsd: number;
}

/**
 * Read on-chain ERC-20 balances for key tokens (base stables + Mento stables).
 * Used to give the LLM accurate wallet context.
 */
async function getOnChainBalances(serverWalletAddress: string): Promise<WalletBalance[]> {
  const tokensToCheck = Object.entries(ALL_TOKEN_ADDRESSES).filter(
    ([, addr]) => addr !== '0x0000000000000000000000000000000000000000',
  );

  const results: WalletBalance[] = [];
  for (const [symbol, address] of tokensToCheck) {
    try {
      const raw = await celoClient.readContract({
        address: address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [serverWalletAddress as Address],
      });
      const decimals = TOKEN_METADATA[symbol]?.decimals ?? 18;
      const formatted = formatUnits(raw, decimals);
      // Rough USD estimate: stablecoins ≈ $1 each (good enough for LLM context)
      const valueUsd = parseFloat(formatted);
      results.push({ symbol, balance: raw, formatted, valueUsd });
    } catch {
      // Skip tokens that fail (e.g. contract not deployed)
    }
  }
  return results;
}

/**
 * Get count of trades made today for a given wallet.
 * Throws on database error so callers know guardrails can't be checked.
 */
export async function getTradeCountToday(walletAddress: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from('agent_timeline')
    .select('*', { count: 'exact', head: true })
    .eq('wallet_address', walletAddress)
    .eq('event_type', 'trade' as TimelineInsert['event_type'])
    .gte('created_at', todayStart.toISOString());

  if (error) {
    throw new Error(`Failed to count trades today: ${error.message}`);
  }

  return count ?? 0;
}
