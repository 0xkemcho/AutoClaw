-- AutoClaw Initial Schema
-- All 8 tables from SPEC Section 4, with thirdweb auth (wallet_address-based identity)

-- User profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  auth_method TEXT,
  risk_profile TEXT CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
  risk_answers JSONB,
  preferred_currencies TEXT[],
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT,
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIP configurations (must be created before transactions due to FK)
CREATE TABLE sip_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  source_token TEXT NOT NULL,
  target_token TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INT,
  day_of_month INT,
  is_active BOOLEAN DEFAULT TRUE,
  allowance_tx_hash TEXT,
  next_execution TIMESTAMPTZ,
  total_invested NUMERIC DEFAULT 0,
  total_executions INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction records
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('swap', 'sip')),
  source_token TEXT NOT NULL,
  target_token TEXT NOT NULL,
  source_amount NUMERIC NOT NULL,
  target_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC,
  tx_hash TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')),
  sip_id UUID REFERENCES sip_configs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio snapshots (for P&L charts)
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_value_usd NUMERIC,
  holdings JSONB,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token price snapshots (for 24h change, sparklines)
CREATE TABLE token_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_symbol TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_snapshots_token ON token_price_snapshots (token_symbol, snapshot_at DESC);

-- Yahoo Finance news articles
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT UNIQUE NOT NULL,
  source_name TEXT,
  tickers TEXT[],
  related_tokens TEXT[],
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_tokens ON news_articles USING GIN (related_tokens);
CREATE INDEX idx_news_published ON news_articles (published_at DESC);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sip_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (wallet_address = current_setting('app.wallet_address', true));

-- RLS policies for conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

-- RLS policies for messages
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN user_profiles u ON c.user_id = u.id
    WHERE u.wallet_address = current_setting('app.wallet_address', true)
  ));

-- RLS policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

-- RLS policies for sip_configs
CREATE POLICY "Users can view own sips"
  ON sip_configs FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

-- RLS policies for portfolio_snapshots
CREATE POLICY "Users can view own snapshots"
  ON portfolio_snapshots FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

-- Token prices and news are public read
CREATE POLICY "Anyone can view token prices"
  ON token_price_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view news"
  ON news_articles FOR SELECT
  USING (true);

-- Service role bypass for backend operations
-- (The service_role key bypasses RLS by default in Supabase)
