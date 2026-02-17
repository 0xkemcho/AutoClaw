import Parallel from 'parallel-web';

let _parallel: Parallel | null = null;

function getParallelClient(): Parallel {
  if (!_parallel) {
    if (!process.env.PARALLEL_API_KEY) {
      throw new Error('PARALLEL_API_KEY not set — news fetching disabled');
    }
    _parallel = new Parallel({ apiKey: process.env.PARALLEL_API_KEY });
  }
  return _parallel;
}

const CURRENCY_NAMES: Record<string, string> = {
  EURm: 'EUR Euro',
  BRLm: 'BRL Brazilian Real',
  KESm: 'KES Kenyan Shilling',
  PHPm: 'PHP Philippine Peso',
  COPm: 'COP Colombian Peso',
  XOFm: 'XOF CFA Franc',
  NGNm: 'NGN Nigerian Naira',
  JPYm: 'JPY Japanese Yen',
  CHFm: 'CHF Swiss Franc',
  ZARm: 'ZAR South African Rand',
  GBPm: 'GBP British Pound',
  AUDm: 'AUD Australian Dollar',
  CADm: 'CAD Canadian Dollar',
  GHSm: 'GHS Ghanaian Cedi',
  XAUT: 'Gold XAU',
};

const ONE_LINER_MAX_LEN = 120;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSearchQuery(symbol: string): string {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const name = CURRENCY_NAMES[symbol] ?? symbol;
  if (symbol === 'XAUT') {
    return `${name} price news ${month} ${year}`;
  }
  return `${name} exchange rate news ${month} ${year}`;
}

function extractOneLiner(first: { title?: string | null; excerpts?: string[] | null; snippet?: string | null }): string {
  const title = (first.title ?? '').trim();
  const excerpt = (first.excerpts?.join(' ') ?? '').trim();
  const snippet = (first.snippet ?? '').trim();
  const raw = title || excerpt || snippet;
  const oneLiner = raw.slice(0, ONE_LINER_MAX_LEN);
  return raw.length > ONE_LINER_MAX_LEN ? oneLiner + '...' : oneLiner;
}

async function fetchOneLinerForSymbol(symbol: string): Promise<string> {
  const query = buildSearchQuery(symbol);
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await getParallelClient().beta.search({
        objective: query,
        search_queries: [query],
        max_results: 5,
        max_chars_per_result: 800,
      });
      const first = response?.results?.[0];
      if (!first) {
        lastErr = new Error('No results');
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        return '';
      }
      const oneLiner = extractOneLiner(first);
      if (!oneLiner) {
        lastErr = new Error('Empty content');
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        return '';
      }
      return oneLiner;
    } catch (err) {
      lastErr = err;
      console.warn(`[token-news] Attempt ${attempt}/${MAX_RETRIES} failed for ${symbol}:`, err);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.warn(`[token-news] All retries exhausted for ${symbol}:`, lastErr);
  return '';
}

export type TokenNewsResult = Record<string, string>;

/**
 * Fetch one-liner news for each token in parallel via Parallel AI Search.
 * Returns a map of symbol -> one-liner. Failed fetches return empty string.
 */
export async function fetchNewsForTokens(symbols: string[]): Promise<TokenNewsResult> {
  if (symbols.length === 0) return {};

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const oneLiner = await fetchOneLinerForSymbol(symbol);
      return { symbol, oneLiner };
    }),
  );

  const out: TokenNewsResult = {};
  for (const { symbol, oneLiner } of results) {
    out[symbol] = oneLiner;
  }
  return out;
}
