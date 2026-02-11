import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import type { AgentFrequency } from '@autoclaw/shared';

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

  await logTimeline(walletAddress, 'system', {
    summary: 'Agent cycle started (intelligence layer not yet implemented)',
  });

  // Part 2 will implement:
  // 1. Fetch news (Parallel AI)
  // 2. LLM analysis (AI SDK + Gemini)
  // 3. Rules engine check
  // 4. Execute trade (Mento Broker + Turnkey)
  // 5. Log results to timeline
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
