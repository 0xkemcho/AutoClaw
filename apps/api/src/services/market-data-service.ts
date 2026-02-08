import { createSupabaseAdmin } from '@autoclaw/db';
import {
  MENTO_TOKENS,
  TOKEN_METADATA,
  type TokenInfo,
  type SupportedToken,
} from '@autoclaw/shared';
import { priceCache, PRICE_CACHE_TTL_MS } from '../lib/cache';
import { fetchAllPrices } from './price-service';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALL_SYMBOLS: string[] = [...MENTO_TOKENS, 'XAUT'];

export async function getMarketTokens(): Promise<TokenInfo[]> {
  const cached = priceCache.get<TokenInfo[]>('market_tokens');
  if (cached) return cached;

  const currentPrices = await fetchAllPrices();

  // Fetch 24h-ago snapshots
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dayAgoSnapshots } = await supabaseAdmin
    .from('token_price_snapshots')
    .select('token_symbol, price_usd')
    .in('token_symbol', ALL_SYMBOLS)
    .lte('snapshot_at', oneDayAgo)
    .order('snapshot_at', { ascending: false })
    .limit(ALL_SYMBOLS.length);

  const dayAgoPriceMap = new Map<string, number>();
  if (dayAgoSnapshots) {
    for (const snap of dayAgoSnapshots) {
      if (!dayAgoPriceMap.has(snap.token_symbol)) {
        dayAgoPriceMap.set(snap.token_symbol, snap.price_usd);
      }
    }
  }

  // Fetch 7-day daily samples for sparklines
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: weekSnapshots } = await supabaseAdmin
    .from('token_price_snapshots')
    .select('token_symbol, price_usd, snapshot_at')
    .in('token_symbol', ALL_SYMBOLS)
    .gte('snapshot_at', sevenDaysAgo)
    .order('snapshot_at', { ascending: true });

  const sparklineMap = new Map<string, number[]>();
  if (weekSnapshots) {
    for (const snap of weekSnapshots) {
      const arr = sparklineMap.get(snap.token_symbol) ?? [];
      arr.push(snap.price_usd);
      sparklineMap.set(snap.token_symbol, arr);
    }
  }

  const tokens: TokenInfo[] = ALL_SYMBOLS.map((symbol) => {
    const price = currentPrices.get(symbol) ?? 0;
    const dayAgoPrice = dayAgoPriceMap.get(symbol);
    const change24hPct =
      dayAgoPrice && dayAgoPrice > 0
        ? ((price - dayAgoPrice) / dayAgoPrice) * 100
        : 0;

    const sparkline = sparklineMap.get(symbol) ?? [];
    // Downsample to ~28 points (4 per day) if we have too many
    const sparkline7d =
      sparkline.length > 28
        ? downsample(sparkline, 28)
        : sparkline.length > 0
          ? sparkline
          : [price];

    const meta = TOKEN_METADATA[symbol];

    return {
      symbol: symbol as SupportedToken,
      name: meta?.name ?? symbol,
      priceUsd: price,
      change24hPct: Math.round(change24hPct * 100) / 100,
      sparkline7d,
      flag: meta?.flag,
      decimals: meta?.decimals,
    };
  });

  priceCache.set('market_tokens', tokens, PRICE_CACHE_TTL_MS);
  return tokens;
}

function downsample(arr: number[], targetLen: number): number[] {
  if (arr.length <= targetLen) return arr;
  const result: number[] = [];
  const step = (arr.length - 1) / (targetLen - 1);
  for (let i = 0; i < targetLen; i++) {
    result.push(arr[Math.round(i * step)]);
  }
  return result;
}
