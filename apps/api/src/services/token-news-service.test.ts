import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearch = vi.hoisted(() => vi.fn());
vi.mock('parallel-web', () => ({
  default: function Parallel() {
    return { beta: { search: mockSearch } };
  },
}));

import { fetchNewsForTokens } from './token-news-service';

describe('token-news-service', () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  describe('fetchNewsForTokens', () => {
    it('returns one-liner per symbol from first result title', async () => {
      mockSearch.mockResolvedValue({
        results: [
          { title: 'EUR strengthens as ECB signals hawkish stance', excerpts: ['Excerpt text'] },
        ],
      });

      const out = await fetchNewsForTokens(['EURm']);
      expect(out).toEqual({
        EURm: 'EUR strengthens as ECB signals hawkish stance',
      });
    });

    it('fetches in parallel for multiple symbols', async () => {
      mockSearch
        .mockResolvedValueOnce({ results: [{ title: 'EUR news', excerpts: [] }] })
        .mockResolvedValueOnce({ results: [{ title: 'GBP news', excerpts: [] }] })
        .mockResolvedValueOnce({ results: [{ title: 'JPY news', excerpts: [] }] });

      const out = await fetchNewsForTokens(['EURm', 'GBPm', 'JPYm']);
      expect(out.EURm).toBe('EUR news');
      expect(out.GBPm).toBe('GBP news');
      expect(out.JPYm).toBe('JPY news');
      expect(mockSearch).toHaveBeenCalledTimes(3);
    });

    it('truncates long titles to one-liner max', async () => {
      const long = 'A'.repeat(150);
      mockSearch.mockResolvedValue({ results: [{ title: long, excerpts: [] }] });

      const out = await fetchNewsForTokens(['EURm']);
      expect(out.EURm.length).toBeLessThanOrEqual(124); // 120 + '...'
      expect(out.EURm.endsWith('...')).toBe(true);
    });

    it('uses excerpts when title is empty', async () => {
      mockSearch.mockResolvedValue({
        results: [{ title: '', excerpts: ['First excerpt with content.'] }],
      });

      const out = await fetchNewsForTokens(['JPYm']);
      expect(out.JPYm).toContain('First excerpt');
    });

    it('returns empty string for failed symbol fetch after retries', async () => {
      mockSearch
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({ results: [{ title: 'OK', excerpts: [] }] });

      const out = await fetchNewsForTokens(['FAIL', 'EURm']);
      expect(out.FAIL).toBe('');
      expect(out.EURm).toBe('OK');
    });

    it('returns empty object for empty symbols', async () => {
      const out = await fetchNewsForTokens([]);
      expect(out).toEqual({});
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('returns empty string when no results', async () => {
      mockSearch.mockResolvedValue({ results: [] });

      const out = await fetchNewsForTokens(['EURm']);
      expect(out.EURm).toBe('');
    });
  });
});
