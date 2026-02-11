-- Agent configuration (1:1 with user_profiles via wallet_address)
CREATE TABLE agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  turnkey_wallet_address TEXT,
  turnkey_wallet_id TEXT,
  active BOOLEAN DEFAULT FALSE,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', '4h', 'hourly')),
  max_trade_size_usd NUMERIC DEFAULT 100,
  max_allocation_pct NUMERIC DEFAULT 25,
  stop_loss_pct NUMERIC DEFAULT 10,
  daily_trade_limit INT DEFAULT 5,
  allowed_currencies TEXT[] DEFAULT ARRAY['USDm','EURm','GBPm','JPYm','CHFm','AUDm','CADm','BRLm','KESm','PHPm','COPm','XOFm','NGNm','ZARm','GHSm','XAUT'],
  blocked_currencies TEXT[] DEFAULT '{}',
  custom_prompt TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent timeline (event log for all agent activity)
CREATE TABLE agent_timeline (
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_wallet ON agent_timeline (wallet_address, created_at DESC);
CREATE INDEX idx_timeline_type ON agent_timeline (wallet_address, event_type, created_at DESC);

-- Agent positions (current token holdings per user)
CREATE TABLE agent_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  token_symbol TEXT NOT NULL,
  token_address TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  avg_entry_rate NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wallet_address, token_symbol)
);

-- Enable RLS
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_configs
CREATE POLICY "Users can view own agent config"
  ON agent_configs FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can update own agent config"
  ON agent_configs FOR UPDATE
  USING (wallet_address = current_setting('app.wallet_address', true));

-- RLS policies for agent_timeline
CREATE POLICY "Users can view own timeline"
  ON agent_timeline FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

-- RLS policies for agent_positions
CREATE POLICY "Users can view own positions"
  ON agent_positions FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));
