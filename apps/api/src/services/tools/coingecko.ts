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
}

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
