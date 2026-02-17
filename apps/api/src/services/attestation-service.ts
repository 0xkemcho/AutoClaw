import { createHash, createHmac } from 'node:crypto';
import { createSupabaseAdmin } from '@autoclaw/db';

export type AgentType = 'fx' | 'yield';
export type AttestationStatus = 'missing' | 'verified' | 'invalid';

interface AttestationPayload {
  schema: 'autoclaw/attestation-v1';
  walletAddress: string;
  agentType: AgentType;
  runId: string;
  eventCount: number;
  tradeCount: number;
  txHashes: string[];
  eventsHash: string;
  generatedAt: string;
}

interface AttestationRow {
  id: string;
  wallet_address: string;
  agent_type: AgentType;
  run_id: string | null;
  payload: AttestationPayload;
  signature: string;
  algorithm: string;
  is_mock?: boolean;
  is_development?: boolean;
  created_at: string;
}

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getTimelineTable(agentType: AgentType): 'fx_agent_timeline' | 'yield_agent_timeline' {
  return agentType === 'yield' ? 'yield_agent_timeline' : 'fx_agent_timeline';
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function getAttestationSecret(): string {
  return (
    process.env.ATTESTATION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'autoclaw-dev-attestation-secret'
  );
}

function signPayload(payload: AttestationPayload): string {
  const canonical = stableStringify(payload);
  return createHmac('sha256', getAttestationSecret()).update(canonical).digest('hex');
}

function hashEvents(events: Array<{ event_type: string; summary: string; tx_hash: string | null; created_at: string }>): string {
  return createHash('sha256')
    .update(
      events
        .map((event) => `${event.created_at}|${event.event_type}|${event.summary}|${event.tx_hash ?? ''}`)
        .join('\n'),
    )
    .digest('hex');
}

function mapAttestationRow(row: Record<string, unknown>) {
  const rawPayload = (row.payload as Record<string, unknown>) ?? {};
  const payload = { ...rawPayload };
  if (typeof payload.schema === 'string' && payload.schema.includes('mock')) {
    payload.schema = (payload.schema as string).replace('mock-attestation', 'attestation');
  }
  return {
    id: row.id as string,
    walletAddress: row.wallet_address as string,
    agentType: row.agent_type as AgentType,
    runId: (row.run_id as string | null) ?? null,
    payload,
    signature: row.signature as string,
    algorithm: row.algorithm as string,
    isDevelopment: Boolean(row.is_development ?? row.is_mock),
    createdAt: row.created_at as string,
  };
}

export async function createAndAttachRunAttestation(params: {
  walletAddress: string;
  agentType: AgentType;
  runId: string;
}): Promise<{ attestationId: string } | null> {
  const { walletAddress, agentType, runId } = params;
  const tableName = getTimelineTable(agentType);

  const { data: events, error: eventsError } = await supabaseAdmin
    .from(tableName)
    .select('event_type,summary,tx_hash,created_at')
    .eq('wallet_address', walletAddress)
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (eventsError) {
    throw new Error(`Failed to load timeline events for attestation: ${eventsError.message}`);
  }

  const timelineEvents = (events ?? []) as Array<{
    event_type: string;
    summary: string;
    tx_hash: string | null;
    created_at: string;
  }>;

  if (timelineEvents.length === 0) return null;

  const txHashes = Array.from(
    new Set(
      timelineEvents
        .map((event) => event.tx_hash)
        .filter((hash): hash is string => Boolean(hash)),
    ),
  );

  const payload: AttestationPayload = {
    schema: 'autoclaw/attestation-v1',
    walletAddress,
    agentType,
    runId,
    eventCount: timelineEvents.length,
    tradeCount: timelineEvents.filter((event) => event.event_type === 'trade').length,
    txHashes,
    eventsHash: hashEvents(timelineEvents),
    generatedAt: new Date().toISOString(),
  };

  const signature = signPayload(payload);

  const { data: created, error: createError } = await supabaseAdmin
    .from('agent_attestations' as any)
    .insert({
      wallet_address: walletAddress,
      agent_type: agentType,
      run_id: runId,
      payload,
      signature,
      algorithm: 'HMAC-SHA256',
      is_development: true,
    })
    .select('*')
    .single();

  if (createError || !created) {
    throw new Error(`Failed to create attestation: ${createError?.message ?? 'Unknown error'}`);
  }

  const attestation = created as unknown as AttestationRow;
  const isVerified = attestation.signature === signature;

  const { error: updateError } = await supabaseAdmin
    .from(tableName)
    .update({
      attestation_id: attestation.id,
      attestation_status: isVerified ? 'verified' : 'invalid',
    } as any)
    .eq('wallet_address', walletAddress)
    .eq('run_id', runId);

  if (updateError) {
    throw new Error(`Failed to attach attestation to timeline rows: ${updateError.message}`);
  }

  return { attestationId: attestation.id };
}

export async function listAttestations(params: {
  walletAddress: string;
  agentType: AgentType;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = Math.max(0, params.offset ?? 0);

  const { data, error, count } = await supabaseAdmin
    .from('agent_attestations' as any)
    .select('*', { count: 'exact' })
    .eq('wallet_address', params.walletAddress)
    .eq('agent_type', params.agentType)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch attestations: ${error.message}`);
  }

  return {
    entries: (data ?? []).map((row) =>
      mapAttestationRow(row as unknown as Record<string, unknown>),
    ),
    total: count ?? 0,
    hasMore: offset + limit < (count ?? 0),
  };
}

export async function getAttestationById(params: {
  walletAddress: string;
  agentType: AgentType;
  id: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('agent_attestations' as any)
    .select('*')
    .eq('id', params.id)
    .eq('wallet_address', params.walletAddress)
    .eq('agent_type', params.agentType)
    .single();

  if (error || !data) return null;
  return mapAttestationRow(data as unknown as Record<string, unknown>);
}

export async function getLatestAttestationSummary(params: {
  walletAddress: string;
  agentType: AgentType;
}): Promise<{
  status: 'active' | 'none';
  latestAttestationAt: string | null;
}> {
  const { data, error } = await supabaseAdmin
    .from('agent_attestations' as any)
    .select('id,created_at')
    .eq('wallet_address', params.walletAddress)
    .eq('agent_type', params.agentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { status: 'none', latestAttestationAt: null };
  }

  return {
    status: 'active',
    latestAttestationAt: (data as unknown as { created_at: string }).created_at,
  };
}

export async function backfillRunAttestations(params: {
  agentType: AgentType | 'all';
  limit: number;
  dryRun: boolean;
}) {
  const agentTypes: AgentType[] = params.agentType === 'all' ? ['fx', 'yield'] : [params.agentType];
  const results: Array<{ walletAddress: string; agentType: AgentType; runId: string; created: boolean; skipped: boolean; error?: string }> = [];

  for (const agentType of agentTypes) {
    const tableName = getTimelineTable(agentType);
    const { data, error } = await (supabaseAdmin as any)
      .from(tableName)
      .select('wallet_address,run_id,attestation_id')
      .not('run_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(params.limit);

    if (error) {
      throw new Error(`Failed to read ${tableName} for backfill: ${error.message}`);
    }

    const uniqueRuns = new Map<string, { walletAddress: string; runId: string; hasAttestation: boolean }>();
    for (const row of (data ?? []) as Array<{
      wallet_address: string;
      run_id: string | null;
      attestation_id: string | null;
    }>) {
      if (!row.run_id) continue;
      const key = `${row.wallet_address}:${row.run_id}`;
      const existing = uniqueRuns.get(key);
      if (!existing) {
        uniqueRuns.set(key, {
          walletAddress: row.wallet_address,
          runId: row.run_id,
          hasAttestation: Boolean(row.attestation_id),
        });
      } else if (row.attestation_id) {
        existing.hasAttestation = true;
      }
    }

    for (const run of uniqueRuns.values()) {
      if (run.hasAttestation) {
        results.push({
          walletAddress: run.walletAddress,
          agentType,
          runId: run.runId,
          created: false,
          skipped: true,
        });
        continue;
      }

      if (params.dryRun) {
        results.push({
          walletAddress: run.walletAddress,
          agentType,
          runId: run.runId,
          created: false,
          skipped: false,
        });
        continue;
      }

      try {
        const created = await createAndAttachRunAttestation({
          walletAddress: run.walletAddress,
          agentType,
          runId: run.runId,
        });
        results.push({
          walletAddress: run.walletAddress,
          agentType,
          runId: run.runId,
          created: Boolean(created),
          skipped: created == null,
        });
      } catch (error) {
        results.push({
          walletAddress: run.walletAddress,
          agentType,
          runId: run.runId,
          created: false,
          skipped: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return {
    total: results.length,
    created: results.filter((r) => r.created).length,
    skipped: results.filter((r) => r.skipped).length,
    errors: results.filter((r) => r.error).length,
    results,
  };
}
