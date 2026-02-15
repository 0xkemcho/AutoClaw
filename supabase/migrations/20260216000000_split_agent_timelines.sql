-- Split agent_timeline into fx_agent_timeline and yield_agent_timeline
-- This fixes the bug where FX and Yield agent events were mixing in the same timeline

-- Create FX agent timeline table
CREATE TABLE fx_agent_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('trade', 'analysis', 'funding', 'guardrail', 'system')),
  summary TEXT NOT NULL,
  detail JSONB DEFAULT '{}',
  citations JSONB DEFAULT '[]',
  confidence_pct NUMERIC,
  currency TEXT,
  amount_usd NUMERIC,
  direction TEXT CHECK (direction IN ('buy', 'sell')),
  tx_hash TEXT,
  run_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Yield agent timeline table
CREATE TABLE yield_agent_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('trade', 'analysis', 'funding', 'guardrail', 'system')),
  summary TEXT NOT NULL,
  detail JSONB DEFAULT '{}',
  citations JSONB DEFAULT '[]',
  confidence_pct NUMERIC,
  currency TEXT,
  amount_usd NUMERIC,
  direction TEXT CHECK (direction IN ('buy', 'sell')),
  tx_hash TEXT,
  run_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for FX timeline
CREATE INDEX idx_fx_timeline_wallet ON fx_agent_timeline (wallet_address, created_at DESC);
CREATE INDEX idx_fx_timeline_type ON fx_agent_timeline (wallet_address, event_type, created_at DESC);
CREATE INDEX idx_fx_timeline_run_id ON fx_agent_timeline(run_id) WHERE run_id IS NOT NULL;

-- Create indexes for Yield timeline
CREATE INDEX idx_yield_timeline_wallet ON yield_agent_timeline (wallet_address, created_at DESC);
CREATE INDEX idx_yield_timeline_type ON yield_agent_timeline (wallet_address, event_type, created_at DESC);
CREATE INDEX idx_yield_timeline_run_id ON yield_agent_timeline(run_id) WHERE run_id IS NOT NULL;

-- Enable RLS
ALTER TABLE fx_agent_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE yield_agent_timeline ENABLE ROW LEVEL SECURITY;

-- RLS policies for FX timeline
CREATE POLICY "Users can view own FX timeline"
  ON fx_agent_timeline FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

-- RLS policies for Yield timeline
CREATE POLICY "Users can view own Yield timeline"
  ON yield_agent_timeline FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

-- Note: Keep old agent_timeline table for historical data (deprecated, no longer used)
