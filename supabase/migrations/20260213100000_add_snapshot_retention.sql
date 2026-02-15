-- Portfolio snapshot retention: keep 90 days of snapshots.
-- Run this periodically via cron or pg_cron.
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
  DELETE FROM portfolio_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
  DELETE FROM token_price_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Name the unnamed unique constraint on agent_positions for easier debugging
ALTER TABLE agent_positions DROP CONSTRAINT IF EXISTS agent_positions_wallet_address_token_symbol_key;
ALTER TABLE agent_positions ADD CONSTRAINT uq_agent_positions_wallet_token UNIQUE (wallet_address, token_symbol);
