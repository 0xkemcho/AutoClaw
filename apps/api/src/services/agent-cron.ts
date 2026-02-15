import { randomUUID } from 'node:crypto';
import { type Address, erc20Abi, formatUnits } from 'viem';
import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import { frequencyToMs, FREQUENCY_MS, type AgentFrequency, type ProgressStep, ALL_TOKEN_ADDRESSES, TOKEN_METADATA } from '@autoclaw/shared';
import { getPositions, calculatePortfolioValue, updatePositionAfterTrade } from './position-tracker';
import { calculateTradeAmount } from './rules-engine';
import { emitProgress } from './agent-events';
import { submitTradeFeedback } from './agent-registry';
import { getStrategy } from './strategies';
import type { WalletBalance } from './strategies/types';
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
 * Run a single agent cycle. Dispatches to the correct strategy based on agent_type.
 */
export async function runAgentCycle(config: AgentConfigRow): Promise<void> {
  const walletAddress = config.wallet_address;
  const agentType = (config as any).agent_type ?? 'fx';
  const runId = randomUUID();

  console.log(`[agent:${walletAddress.slice(0, 8)}:${agentType}] Starting cycle (runId=${runId.slice(0, 8)})`);

  // Validate server wallet exists before executing any trades
  if (!config.server_wallet_id || !config.server_wallet_address) {
    throw new Error('Server wallet not configured — skipping agent cycle');
  }

  // Load the strategy for this agent type
  const strategy = getStrategy(agentType);
  const progressSteps = strategy.getProgressSteps() as ProgressStep[];

  try {
    // 1. Log cycle start
    await logTimeline(walletAddress, 'system', { summary: `${agentType.toUpperCase()} agent cycle started` }, runId);

    // 2. Fetch positions and portfolio value
    console.log(`[agent:${walletAddress.slice(0, 8)}:${agentType}] Fetching positions...`);
    const positions = await getPositions(walletAddress);
    const portfolioValue = await calculatePortfolioValue(positions);
    console.log(`[agent:${walletAddress.slice(0, 8)}:${agentType}] Portfolio: $${portfolioValue.toFixed(2)}, ${positions.length} positions`);

    // 2b. Fetch on-chain wallet balances
    const walletBalances = await getOnChainBalances(config.server_wallet_address);
    const balanceSummary = walletBalances
      .filter(b => b.balance > 0)
      .map(b => `${b.symbol}: ${b.formatted}`)
      .join(', ') || 'Empty wallet';
    console.log(`[agent:${walletAddress.slice(0, 8)}:${agentType}] On-chain balances: ${balanceSummary}`);

    // Build shared strategy context
    const strategyContext = {
      positions,
      portfolioValueUsd: portfolioValue,
      walletBalances,
      runId,
    };

    // 3. STRATEGY: Fetch data (news for FX, vault opportunities for yield)
    const fetchStep = progressSteps[0] ?? ('fetching_news' as ProgressStep);
    console.log(`[agent:${walletAddress.slice(0, 8)}:${agentType}] Fetching data...`);
    emitProgress(walletAddress, fetchStep, `Fetching data for ${agentType} agent...`);
    const data = await strategy.fetchData(config, strategyContext);

    // 4. STRATEGY: Analyze with LLM
    const analyzeStep = progressSteps[1] ?? ('analyzing' as ProgressStep);
    console.log(`[agent:${walletAddress.slice(0, 8)}:${agentType}] Running analysis...`);
    emitProgress(walletAddress, analyzeStep, `Analyzing with AI...`);
    const analysisResult = await strategy.analyze(data, config, strategyContext);

    const { signals, summary, sourcesUsed } = analysisResult;

    if (signals.length === 0) {
      await logTimeline(walletAddress, 'analysis', {
        summary: `${agentType.toUpperCase()}: No signals generated. ${summary}`,
        detail: { summary, sourcesUsed },
      }, runId);
      emitProgress(walletAddress, 'complete', summary || 'No actionable signals.', {
        signalCount: 0, tradeCount: 0, blockedCount: 0,
      });
      return;
    }

    // Log analysis
    await logTimeline(walletAddress, 'analysis', {
      summary: `${agentType.toUpperCase()}: ${signals.length} signals. ${summary}`,
      detail: { summary, signalCount: signals.length, signals, sourcesUsed },
    }, runId);

    // 5. STRATEGY: Check guardrails and execute each signal
    const guardrailStep = progressSteps[2] ?? ('checking_signals' as ProgressStep);
    const executeStep = progressSteps[3] ?? ('executing_trades' as ProgressStep);
    const tradesToday = await getTradeCountToday(walletAddress);

    // Build price map for guardrails
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

    const guardrailContext = {
      positions,
      portfolioValueUsd: portfolioValue,
      dailyTradeCount: tradesToday,
      positionPrices,
    };

    const wallet = {
      serverWalletId: config.server_wallet_id,
      serverWalletAddress: config.server_wallet_address,
    };

    let tradeCount = 0;
    let blockedCount = 0;

    for (const signal of signals) {
      const s = signal as any;
      const signalLabel = s.currency ?? s.vaultName ?? s.vaultAddress?.slice(0, 10) ?? 'unknown';
      const signalAction = s.direction ?? s.action ?? 'unknown';

      // Skip hold signals
      if (signalAction === 'hold') continue;

      // Skip low confidence
      if ((s.confidence ?? 0) < 60 && agentType === 'fx') continue;

      // Check guardrails
      emitProgress(walletAddress, guardrailStep, `Checking guardrails for ${signalLabel}...`);
      const check = strategy.checkGuardrails(signal, config, guardrailContext);

      if (!check.passed) {
        blockedCount++;
        emitProgress(walletAddress, guardrailStep,
          `Blocked ${signalLabel} ${signalAction} — ${check.blockedReason}`,
        );
        await logTimeline(walletAddress, 'guardrail', {
          summary: `Blocked ${signalLabel} ${signalAction} — ${check.blockedReason}`,
          detail: { rule: check.ruleName, signal },
        }, runId);
        continue;
      }

      // Execute signal
      try {
        emitProgress(walletAddress, executeStep, `Executing ${signalAction} ${signalLabel}...`);
        const result = await strategy.executeSignal(signal, wallet, config);

        if (result.success) {
          tradeCount++;
          emitProgress(walletAddress, executeStep,
            `Executed ${signalAction} ${signalLabel}${result.amountUsd ? ` ($${result.amountUsd.toFixed(2)})` : ''}`,
          );
          await logTimeline(walletAddress, 'trade', {
            summary: `${signalAction} ${signalLabel}${result.amountUsd ? ` ($${result.amountUsd.toFixed(2)})` : ''}`,
            detail: { signal, result },
            txHash: result.txHash,
            amountUsd: result.amountUsd,
          }, runId);

          // Submit ERC-8004 reputation feedback (non-blocking)
          if (config.agent_8004_id && result.txHash) {
            submitTradeFeedback({
              serverWalletId: config.server_wallet_id,
              serverWalletAddress: config.server_wallet_address,
              agentId: BigInt(config.agent_8004_id),
              reasoning: s.reasoning ?? '',
              currency: s.currency ?? signalLabel,
              direction: signalAction,
              tradeTxHash: result.txHash,
            }).catch(err => console.error('[8004] Failed to submit reputation feedback:', err.message));
          }
        } else {
          emitProgress(walletAddress, executeStep,
            `Failed ${signalAction} ${signalLabel}: ${result.error}`,
          );
          await logTimeline(walletAddress, 'system', {
            summary: `Execution failed for ${signalLabel}: ${result.error}`,
            detail: { signal, error: result.error },
          }, runId);
        }
      } catch (execErr) {
        emitProgress(walletAddress, executeStep,
          `Error executing ${signalLabel}: ${execErr instanceof Error ? execErr.message : 'Unknown error'}`,
        );
        await logTimeline(walletAddress, 'system', {
          summary: `Execution error for ${signalLabel}: ${execErr instanceof Error ? execErr.message : 'Unknown error'}`,
          detail: { signal, error: execErr instanceof Error ? execErr.message : String(execErr) },
        }, runId);
      }
    }

    // Emit completion
    console.log(`[agent:${walletAddress.slice(0, 8)}:${agentType}] Cycle complete: ${signals.length} signals, ${tradeCount} executed, ${blockedCount} blocked`);
    emitProgress(walletAddress, 'complete',
      `${agentType.toUpperCase()}: ${signals.length} signals, ${tradeCount} executed, ${blockedCount} blocked.`,
      { signalCount: signals.length, tradeCount, blockedCount },
    );
  } catch (error) {
    console.error(`[agent:${walletAddress.slice(0, 8)}:${agentType}] Cycle FAILED:`, error);
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
