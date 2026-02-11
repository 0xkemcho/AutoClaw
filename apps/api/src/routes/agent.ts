import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import type { AgentFrequency } from '@autoclaw/shared';

type AgentConfigRow = Database['public']['Tables']['agent_configs']['Row'];
type AgentTimelineRow = Database['public']['Tables']['agent_timeline']['Row'];
type AgentPositionRow = Database['public']['Tables']['agent_positions']['Row'];

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function agentRoutes(app: FastifyInstance) {
  // GET /api/agent/status
  app.get(
    '/api/agent/status',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;

      const { data, error } = await supabaseAdmin
        .from('agent_configs')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      const config = data as AgentConfigRow | null;

      if (error || !config) {
        return reply.status(404).send({ error: 'Agent not configured' });
      }

      // Count today's trades
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: tradesToday } = await supabaseAdmin
        .from('agent_timeline')
        .select('*', { count: 'exact', head: true })
        .eq('wallet_address', walletAddress)
        .eq('event_type', 'trade' as AgentTimelineRow['event_type'])
        .gte('created_at', todayStart.toISOString());

      // Count positions
      const { count: positionCount } = await supabaseAdmin
        .from('agent_positions')
        .select('*', { count: 'exact', head: true })
        .eq('wallet_address', walletAddress)
        .gt('balance', 0);

      return {
        config: {
          id: config.id,
          active: config.active,
          frequency: config.frequency,
          maxTradeSizeUsd: config.max_trade_size_usd,
          maxAllocationPct: config.max_allocation_pct,
          stopLossPct: config.stop_loss_pct,
          dailyTradeLimit: config.daily_trade_limit,
          allowedCurrencies: config.allowed_currencies,
          blockedCurrencies: config.blocked_currencies,
          customPrompt: config.custom_prompt,
          serverWalletAddress: config.server_wallet_address,
          lastRunAt: config.last_run_at,
          nextRunAt: config.next_run_at,
        },
        tradesToday: tradesToday ?? 0,
        positionCount: positionCount ?? 0,
      };
    },
  );

  // POST /api/agent/toggle
  app.post(
    '/api/agent/toggle',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;

      // Get current state
      const { data: configData, error: fetchError } = await supabaseAdmin
        .from('agent_configs')
        .select('id, active, frequency')
        .eq('wallet_address', walletAddress)
        .single();

      const config = configData as Pick<AgentConfigRow, 'id' | 'active' | 'frequency'> | null;

      if (fetchError || !config) {
        return reply.status(404).send({ error: 'Agent not configured' });
      }

      const newActive = !config.active;
      const updates: Record<string, unknown> = {
        active: newActive,
        updated_at: new Date().toISOString(),
      };

      // When activating, set next_run_at if not set
      if (newActive) {
        const frequencyMs: Record<AgentFrequency, number> = {
          hourly: 60 * 60 * 1000,
          '4h': 4 * 60 * 60 * 1000,
          daily: 24 * 60 * 60 * 1000,
        };
        const freq = (config.frequency || 'daily') as AgentFrequency;
        updates.next_run_at = new Date(Date.now() + frequencyMs[freq]).toISOString();
      }

      const { error } = await supabaseAdmin
        .from('agent_configs')
        .update(updates)
        .eq('id', config.id);

      if (error) {
        return reply.status(500).send({ error: 'Failed to toggle agent' });
      }

      return { active: newActive };
    },
  );

  // GET /api/agent/timeline
  app.get(
    '/api/agent/timeline',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const query = request.query as {
        type?: string;
        limit?: string;
        offset?: string;
      };

      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
      const offset = Math.max(0, parseInt(query.offset || '0', 10));

      let dbQuery = supabaseAdmin
        .from('agent_timeline')
        .select('*', { count: 'exact' })
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (query.type) {
        dbQuery = dbQuery.eq('event_type', query.type as AgentTimelineRow['event_type']);
      }

      const { data, error, count } = await dbQuery;

      if (error) {
        return reply.status(500).send({ error: 'Failed to fetch timeline' });
      }

      return {
        entries: (data ?? []).map(mapTimelineEntry),
        total: count ?? 0,
        hasMore: (offset + limit) < (count ?? 0),
      };
    },
  );

  // GET /api/agent/timeline/:id
  app.get(
    '/api/agent/timeline/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const { id } = request.params as { id: string };

      const { data, error } = await supabaseAdmin
        .from('agent_timeline')
        .select('*')
        .eq('id', id)
        .eq('wallet_address', walletAddress)
        .single();

      if (error || !data) {
        return reply.status(404).send({ error: 'Timeline entry not found' });
      }

      return mapTimelineEntry(data);
    },
  );

  // PUT /api/agent/settings
  app.put(
    '/api/agent/settings',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const body = request.body as {
        frequency?: AgentFrequency;
        maxTradeSizeUsd?: number;
        maxAllocationPct?: number;
        stopLossPct?: number;
        dailyTradeLimit?: number;
        allowedCurrencies?: string[];
        blockedCurrencies?: string[];
        customPrompt?: string;
      };

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (body.frequency) updates.frequency = body.frequency;
      if (body.maxTradeSizeUsd !== undefined) updates.max_trade_size_usd = body.maxTradeSizeUsd;
      if (body.maxAllocationPct !== undefined) updates.max_allocation_pct = body.maxAllocationPct;
      if (body.stopLossPct !== undefined) updates.stop_loss_pct = body.stopLossPct;
      if (body.dailyTradeLimit !== undefined) updates.daily_trade_limit = body.dailyTradeLimit;
      if (body.allowedCurrencies) updates.allowed_currencies = body.allowedCurrencies;
      if (body.blockedCurrencies) updates.blocked_currencies = body.blockedCurrencies;
      if (body.customPrompt !== undefined) updates.custom_prompt = body.customPrompt;

      const { data, error } = await supabaseAdmin
        .from('agent_configs')
        .update(updates)
        .eq('wallet_address', walletAddress)
        .select()
        .single();

      if (error || !data) {
        return reply.status(500).send({ error: 'Failed to update settings' });
      }

      return { success: true };
    },
  );

  // GET /api/agent/positions
  app.get(
    '/api/agent/positions',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;

      const { data: posData, error } = await supabaseAdmin
        .from('agent_positions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .gt('balance', 0)
        .order('balance', { ascending: false });

      if (error) {
        return reply.status(500).send({ error: 'Failed to fetch positions' });
      }

      const positions = (posData ?? []) as AgentPositionRow[];

      return {
        positions: positions.map((p) => ({
          id: p.id,
          tokenSymbol: p.token_symbol,
          tokenAddress: p.token_address,
          balance: p.balance,
          avgEntryRate: p.avg_entry_rate,
          updatedAt: p.updated_at,
        })),
      };
    },
  );

  // GET /api/agent/portfolio
  app.get(
    '/api/agent/portfolio',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;

      // Get positions
      const { data: posRaw, error: posError } = await supabaseAdmin
        .from('agent_positions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .gt('balance', 0);

      if (posError) {
        return reply.status(500).send({ error: 'Failed to fetch portfolio' });
      }

      const positions = (posRaw ?? []) as AgentPositionRow[];

      // Get latest prices for each held token
      const holdings: Array<{
        tokenSymbol: string;
        balance: number;
        priceUsd: number;
        valueUsd: number;
      }> = [];

      let totalValueUsd = 0;

      for (const pos of positions) {
        // Get latest price snapshot
        const { data: priceData } = await supabaseAdmin
          .from('token_price_snapshots')
          .select('price_usd')
          .eq('token_symbol', pos.token_symbol)
          .order('snapshot_at', { ascending: false })
          .limit(1)
          .single();

        const priceUsd = priceData?.price_usd ?? 1; // Default to $1 for stablecoins
        const valueUsd = pos.balance * priceUsd;
        totalValueUsd += valueUsd;

        holdings.push({
          tokenSymbol: pos.token_symbol,
          balance: pos.balance,
          priceUsd,
          valueUsd,
        });
      }

      return {
        totalValueUsd,
        holdings,
      };
    },
  );
}

/** Map a raw DB row to a camelCase timeline entry. */
function mapTimelineEntry(row: Record<string, unknown>) {
  return {
    id: row.id,
    eventType: row.event_type,
    summary: row.summary,
    detail: row.detail,
    citations: row.citations,
    confidencePct: row.confidence_pct,
    currency: row.currency,
    amountUsd: row.amount_usd,
    direction: row.direction,
    txHash: row.tx_hash,
    createdAt: row.created_at,
  };
}
