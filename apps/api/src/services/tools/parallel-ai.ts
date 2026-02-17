/**
 * Parallel AI tool for news/search. Used by the Conversation Intelligence Agent.
 */

import Parallel from 'parallel-web';

let _parallel: Parallel | null = null;

function getParallelClient(): Parallel {
  if (!_parallel) {
    const key = process.env.PARALLEL_API_KEY;
    if (!key) {
      throw new Error('PARALLEL_API_KEY not set — Parallel AI tool disabled');
    }
    _parallel = new Parallel({ apiKey: key });
  }
  return _parallel;
}

export interface ParallelSearchResult {
  title: string;
  url: string;
  excerpt: string;
  publishedAt?: string;
  source?: string;
}

const newsCache = new Map<string, { data: ParallelSearchResult[]; expiresAt: number }>();
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Search for news and web content via Parallel AI.
 */
export async function searchParallelAI(query: string, maxResults = 10): Promise<ParallelSearchResult[]> {
  const cacheKey = query.toLowerCase().trim() + ':' + maxResults;
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const client = getParallelClient();
  const response = await client.beta.search({
    objective: query,
    search_queries: [query],
    max_results: Math.min(maxResults, 20),
    max_chars_per_result: 2000,
  });

  const results: ParallelSearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const r of response.results ?? []) {
    const url = r.url ?? '';
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      results.push({
        title: r.title ?? query,
        url,
        excerpt: r.excerpts?.join(' ').slice(0, 500) ?? '',
        publishedAt: r.publish_date ?? undefined,
        source: url ? new URL(url).hostname : undefined,
      });
    }
  }

  newsCache.set(cacheKey, { data: results, expiresAt: Date.now() + NEWS_CACHE_TTL_MS });
  return results;
}
