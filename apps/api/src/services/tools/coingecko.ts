/**
 * CoinGecko tool for crypto market data. Used by the Conversation Intelligence Agent.
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export interface CoinGeckoPriceResult {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  sparkline_in_7d?: { price: number[] };
}

const priceCache = new Map<string, { data: CoinGeckoPriceResult[]; expiresAt: number }>();
const PRICE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Fetch simple price for given coin IDs (e.g. 'celo', 'bitcoin', 'ethereum').
 */
export async function getCoinGeckoPrices(
  ids: string[],
  vsCurrencies = ['usd']
): Promise<Record<string, Record<string, number>>> {
  const url = new URL(`${COINGECKO_BASE}/simple/price`);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('vs_currencies', vsCurrencies.join(','));
  url.searchParams.set('include_24hr_change', 'true');

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Record<string, Record<string, number>>;
}

/**
 * Fetch market data with sparkline for given coin IDs.
 */
export async function getCoinGeckoMarketData(
  ids: string[],
  vsCurrency = 'usd'
): Promise<CoinGeckoPriceResult[]> {
  const cacheKey = [...ids].sort().join(',') + ':' + vsCurrency;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const url = new URL(`${COINGECKO_BASE}/coins/markets`);
  url.searchParams.set('vs_currency', vsCurrency);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('sparkline', 'true');
  url.searchParams.set('price_change_percentage', '24h');

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }
  
  // The API returns an array of objects
  const data = await res.json();
  
  // Map the response to our interface
  const result = (data as any[]).map((coin: any) => ({
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    current_price: coin.current_price,
    price_change_24h: coin.price_change_24h,
    price_change_percentage_24h: coin.price_change_percentage_24h,
    market_cap: coin.market_cap,
    sparkline_in_7d: coin.sparkline_in_7d,
  }));
  priceCache.set(cacheKey, { data: result, expiresAt: Date.now() + PRICE_CACHE_TTL_MS });
  return result;
}

/**
 * Search coins by query string.
 */
export async function searchCoinGecko(query: string): Promise<{ id: string; symbol: string; name: string }[]> {
  const url = new URL(`${COINGECKO_BASE}/search`);
  url.searchParams.set('query', query);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`CoinGecko search error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { coins?: Array<{ id: string; symbol: string; name: string }> };
  return data.coins?.slice(0, 10) ?? [];
}
