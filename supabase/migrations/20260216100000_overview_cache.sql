-- Overview cache for Trending FX and Yield Opportunities (1h TTL, global data)
CREATE TABLE overview_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS: data is global, not user-specific
