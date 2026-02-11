import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import type { AgentFrequency } from '@autoclaw/shared';
import { fetchFxNews } from './news-fetcher';
import { analyzeFxNews } from './llm-analyzer';
import { executeTrade } from './trade-executor';
import { getPositions, calculatePortfolioValue, updatePositionAfterTrade } from './position-tracker';
import { checkGuardrails, calculateTradeAmount } from './rules-engine';

type AgentConfigRow = Database['public']['Tables']['agent_configs']['Row'];
type TimelineInsert = Database['public']['Tables']['agent_timeline']['Insert'];

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TICK_INTERVAL_MS = 60_000; // Check every minute

/** Frequency → milliseconds between runs */
const FREQUENCY_MS: Record<AgentFrequency, number> = {
  hourly: 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

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
      try {
        await runAgentCycle(config);
      } catch (err) {
        console.error(`Agent cycle failed for ${config.wallet_address}:`, err);

        // Log SYSTEM error event
        await logTimeline(config.wallet_address, 'system', {
          summary: `Agent cycle failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }

      // Update next_run_at regardless of success/failure
      const frequency = (config.frequency || 'daily') as AgentFrequency;
      const nextRun = new Date(Date.now() + FREQUENCY_MS[frequency]).toISOString();

      await supabaseAdmin
        .from('agent_configs')
        .update({ last_run_at: new Date().toISOString(), next_run_at: nextRun, updated_at: new Date().toISOString() })
        .eq('id', config.id);
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
          serverWalletId: config.server_wallet_id!,
          serverWalletAddress: config.server_wallet_address!,
          currency: signal.currency,
          direction: signal.direction as 'buy' | 'sell',
          amountUsd: tradeAmountUsd,
        });

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

/**
 * Insert an event into the agent_timeline table.
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
): Promise<void> {
  const row: TimelineInsert = {
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
  const { error } = await supabaseAdmin.from('agent_timeline').insert(row);

  if (error) {
    console.error('Failed to log timeline event:', error);
  }
}

/**
 * Get count of trades made today for a given wallet.
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
    console.error('Failed to count trades today:', error);
    return 0;
  }

  return count ?? 0;
}
