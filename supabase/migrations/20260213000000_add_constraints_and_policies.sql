-- Add missing RLS INSERT/UPDATE policies for tables that only had SELECT

-- transactions: INSERT policy
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

-- sip_configs: INSERT and UPDATE policies
CREATE POLICY "Users can insert own sips"
  ON sip_configs FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

CREATE POLICY "Users can update own sips"
  ON sip_configs FOR UPDATE
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

-- portfolio_snapshots: INSERT policy
CREATE POLICY "Users can insert own snapshots"
  ON portfolio_snapshots FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE wallet_address = current_setting('app.wallet_address', true)
  ));

-- messages: INSERT policy
CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN user_profiles u ON c.user_id = u.id
    WHERE u.wallet_address = current_setting('app.wallet_address', true)
  ));

-- Add CHECK constraints on agent_configs numeric fields (M10)
ALTER TABLE agent_configs ADD CONSTRAINT ck_max_trade_size_positive CHECK (max_trade_size_usd > 0);
ALTER TABLE agent_configs ADD CONSTRAINT ck_max_allocation_range CHECK (max_allocation_pct > 0 AND max_allocation_pct <= 100);
ALTER TABLE agent_configs ADD CONSTRAINT ck_stop_loss_range CHECK (stop_loss_pct > 0 AND stop_loss_pct <= 100);
ALTER TABLE agent_configs ADD CONSTRAINT ck_daily_trade_limit_positive CHECK (daily_trade_limit > 0);

-- Add partial index for trade-count queries (M14)
CREATE INDEX idx_timeline_trades ON agent_timeline (wallet_address, created_at DESC)
  WHERE event_type = 'trade';

-- Add index on agent_configs for wallet lookup performance
CREATE INDEX idx_agent_configs_wallet ON agent_configs (wallet_address);

-- Add index on agent_positions for wallet lookup
CREATE INDEX idx_agent_positions_wallet ON agent_positions (wallet_address);
