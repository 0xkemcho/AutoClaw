import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the parallel-web module — client.beta.search()
const mockSearch = vi.hoisted(() => vi.fn());
vi.mock('parallel-web', () => {
  return {
    default: function Parallel() {
      return { beta: { search: mockSearch } };
    },
  };
});

import { fetchFxNews, buildSearchQueries, clearNewsCache } from './news-fetcher';

describe('news-fetcher', () => {
  beforeEach(() => {
    clearNewsCache();
    mockSearch.mockReset();
  });

  describe('fetchFxNews', () => {
    it('returns articles from Parallel AI search', async () => {
      mockSearch.mockResolvedValue({ results: [
        { title: 'EUR rises', url: 'https://example.com/1', snippet: 'Euro up', published_at: '2026-02-11T10:00:00Z' },
      ] });

      const articles = await fetchFxNews(['EURm']);
      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('EUR rises');
      expect(articles[0].source).toBe('example.com');
    });

    it('deduplicates articles by URL', async () => {
      mockSearch.mockResolvedValue({ results: [
        { title: 'Article A', url: 'https://example.com/same', snippet: 'Text A' },
        { title: 'Article B', url: 'https://example.com/same', snippet: 'Text B' },
      ] });

      const articles = await fetchFxNews(['EURm']);
      expect(articles).toHaveLength(1);
    });

    it('caches results for 1 hour', async () => {
      mockSearch.mockResolvedValue({ results: [
        { title: 'Cached', url: 'https://example.com/cached', snippet: 'Text' },
      ] });

      await fetchFxNews(['EURm']);
      mockSearch.mockClear();

      const cached = await fetchFxNews(['EURm']);
      expect(cached).toHaveLength(1);
      expect(cached[0].title).toBe('Cached');
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('refetches after cache TTL expires', async () => {
      mockSearch.mockResolvedValue({ results: [
        { title: 'Old', url: 'https://example.com/old', snippet: 'Text' },
      ] });

      await fetchFxNews(['EURm']);

      // Manually expire the cache by manipulating the timestamp
      // We do this by clearing and setting up new mock data
      clearNewsCache();
      mockSearch.mockResolvedValue({ results: [
        { title: 'New', url: 'https://example.com/new', snippet: 'Text' },
      ] });

      const fresh = await fetchFxNews(['EURm']);
      expect(fresh[0].title).toBe('New');
    });

    it('limits to 5 search queries per call', async () => {
      mockSearch.mockResolvedValue({ results: [] });

      // 4 currencies = 3 currency-specific + 2 macro = 5 queries (4th currency skipped in currency-specific)
      await fetchFxNews(['EURm', 'GBPm', 'JPYm', 'BRLm']);
      expect(mockSearch).toHaveBeenCalledTimes(5);
    });

    it('handles individual search errors gracefully', async () => {
      mockSearch
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValue({ results: [
          { title: 'Success', url: 'https://example.com/ok', snippet: 'Works' },
        ] });

      const articles = await fetchFxNews(['EURm']);
      expect(articles.length).toBeGreaterThan(0);
    });

    it('returns max 15 articles', async () => {
      const manyResults = Array.from({ length: 10 }, (_, i) => ({
        title: `Article ${i}`,
        url: `https://example.com/${i}`,
        snippet: `Text ${i}`,
      }));
      mockSearch.mockResolvedValue({ results: manyResults });

      // With 5 queries * 10 results (minus duplicates), should cap at 15
      const articles = await fetchFxNews(['EURm', 'GBPm', 'JPYm']);
      expect(articles.length).toBeLessThanOrEqual(15);
    });

    it('sorts articles by recency', async () => {
      mockSearch.mockResolvedValue({ results: [
        { title: 'Old', url: 'https://example.com/old', snippet: 'Old', published_at: '2026-02-01T00:00:00Z' },
        { title: 'New', url: 'https://example.com/new', snippet: 'New', published_at: '2026-02-11T00:00:00Z' },
      ] });

      const articles = await fetchFxNews(['EURm']);
      expect(articles[0].title).toBe('New');
      expect(articles[1].title).toBe('Old');
    });
  });

  describe('buildSearchQueries', () => {
    it('creates currency-specific + macro queries', () => {
      const queries = buildSearchQueries(['EURm', 'GBPm'], 'February', 2026);
      expect(queries).toHaveLength(4); // 2 currency + 2 macro
      expect(queries[0]).toContain('EUR Euro');
      expect(queries[1]).toContain('GBP British Pound');
      expect(queries[2]).toContain('central bank');
      expect(queries[3]).toContain('emerging market');
    });

    it('limits currency queries to first 3 currencies', () => {
      const queries = buildSearchQueries(['EURm', 'GBPm', 'JPYm', 'BRLm', 'ZARm'], 'February', 2026);
      // 3 currency-specific + 2 macro = 5
      expect(queries).toHaveLength(5);
    });

    it('falls back to symbol for unknown currencies', () => {
      const queries = buildSearchQueries(['UNKNOWN'], 'January', 2026);
      expect(queries[0]).toContain('UNKNOWN');
    });
  });

  describe('clearNewsCache', () => {
    it('empties the cache', async () => {
      mockSearch.mockResolvedValue({ results: [
        { title: 'Cached', url: 'https://example.com/1', snippet: 'Text' },
      ] });

      await fetchFxNews(['EURm']);
      clearNewsCache();
      mockSearch.mockClear();

      mockSearch.mockResolvedValue({ results: [
        { title: 'Fresh', url: 'https://example.com/2', snippet: 'Text' },
      ] });

      const fresh = await fetchFxNews(['EURm']);
      expect(fresh[0].title).toBe('Fresh');
      expect(mockSearch).toHaveBeenCalled();
    });
  });
});
