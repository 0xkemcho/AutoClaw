import { createSupabaseAdmin } from '@autoclaw/db';
import { getMarketTokens } from './market-data-service.js';
import { fetchYieldOpportunities } from './merkl-client.js';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getCachedTrendingFx(): Promise<{ tokens: Awaited<ReturnType<typeof getMarketTokens>>; updatedAt: string }> {
  const cacheKey = 'trending_fx';
  const oneHourAgo = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data: row } = await supabaseAdmin
    .from('overview_cache')
    .select('payload, cached_at')
    .eq('cache_key', cacheKey)
    .gte('cached_at', oneHourAgo)
    .maybeSingle();

  if (row?.payload) {
    return {
      tokens: row.payload.tokens,
      updatedAt: row.cached_at,
    };
  }

  const tokens = await getMarketTokens();
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('overview_cache')
    .upsert(
      {
        cache_key: cacheKey,
        payload: { tokens },
        cached_at: now,
      },
      { onConflict: 'cache_key' },
    );

  return { tokens, updatedAt: now };
}

export async function getCachedYieldOpportunities(): Promise<{
  opportunities: Awaited<ReturnType<typeof fetchYieldOpportunities>>;
  updatedAt: string;
}> {
  const cacheKey = 'yield_opportunities';
  const oneHourAgo = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data: row } = await supabaseAdmin
    .from('overview_cache')
    .select('payload, cached_at')
    .eq('cache_key', cacheKey)
    .gte('cached_at', oneHourAgo)
    .maybeSingle();

  if (row?.payload) {
    return {
      opportunities: row.payload.opportunities,
      updatedAt: row.cached_at,
    };
  }

  const opportunities = await fetchYieldOpportunities();
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('overview_cache')
    .upsert(
      {
        cache_key: cacheKey,
        payload: { opportunities },
        cached_at: now,
      },
      { onConflict: 'cache_key' },
    );

  return { opportunities, updatedAt: now };
}
