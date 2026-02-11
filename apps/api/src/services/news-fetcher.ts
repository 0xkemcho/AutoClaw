import { Parallel } from 'parallel-web';

interface ParallelSearchClient {
  search(params: { query: string; maxResults: number }): Promise<Array<{
    title: string;
    url: string;
    snippet: string;
    publishedAt?: string;
  }>>;
}

const parallel = new Parallel({ apiKey: process.env.PARALLEL_API_KEY! }) as unknown as ParallelSearchClient;

export interface NewsArticle {
  title: string;
  url: string;
  excerpt: string;
  publishedAt?: string;
  source?: string;
}

interface NewsCache {
  articles: NewsArticle[];
  fetchedAt: number;
}

const newsCache = new Map<string, NewsCache>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch FX news for the given currencies using Parallel AI Search API.
 * Results are cached for 1 hour per currency set.
 */
export async function fetchFxNews(currencies: string[]): Promise<NewsArticle[]> {
  const cacheKey = currencies.sort().join(',');
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.articles;
  }

  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();

  const queries = buildSearchQueries(currencies, month, year);

  const allArticles: NewsArticle[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries.slice(0, 5)) {
    try {
      const results = await parallel.search({ query, maxResults: 5 });
      for (const r of results) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          allArticles.push({
            title: r.title,
            url: r.url,
            excerpt: r.snippet,
            publishedAt: r.publishedAt,
            source: new URL(r.url).hostname,
          });
        }
      }
    } catch (err) {
      console.error(`News fetch failed for query "${query}":`, err);
    }
  }

  const sorted = allArticles
    .sort((a, b) => {
      if (a.publishedAt && b.publishedAt) {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return 0;
    })
    .slice(0, 15);

  newsCache.set(cacheKey, { articles: sorted, fetchedAt: Date.now() });
  return sorted;
}

export function buildSearchQueries(currencies: string[], month: string, year: number): string[] {
  const queries: string[] = [];

  const currencyNames: Record<string, string> = {
    EURm: 'EUR Euro', BRLm: 'BRL Brazilian Real', KESm: 'KES Kenyan Shilling',
    PHPm: 'PHP Philippine Peso', COPm: 'COP Colombian Peso', XOFm: 'XOF CFA Franc',
    NGNm: 'NGN Nigerian Naira', JPYm: 'JPY Japanese Yen', CHFm: 'CHF Swiss Franc',
    ZARm: 'ZAR South African Rand', GBPm: 'GBP British Pound', AUDm: 'AUD Australian Dollar',
    CADm: 'CAD Canadian Dollar', GHSm: 'GHS Ghanaian Cedi', XAUT: 'Gold XAU',
  };

  for (const c of currencies.slice(0, 3)) {
    const name = currencyNames[c] || c;
    queries.push(`${name} exchange rate forecast ${month} ${year}`);
  }

  queries.push(`central bank interest rate decision ${month} ${year}`);
  queries.push(`emerging market FX outlook ${month} ${year}`);

  return queries;
}

/** Clear the news cache (useful for testing) */
export function clearNewsCache(): void {
  newsCache.clear();
}
