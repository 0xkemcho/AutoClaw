-- Add agent_type and strategy_params columns to agent_configs
ALTER TABLE agent_configs ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'fx';
ALTER TABLE agent_configs ADD COLUMN strategy_params JSONB DEFAULT '{}';

-- Drop existing unique constraint on wallet_address
ALTER TABLE agent_configs DROP CONSTRAINT agent_configs_wallet_address_key;

-- Add new unique constraint on (wallet_address, agent_type)
ALTER TABLE agent_configs ADD CONSTRAINT agent_configs_wallet_address_type_key UNIQUE (wallet_address, agent_type);

-- Create yield_positions table
CREATE TABLE yield_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  vault_address TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'ichi',
  lp_shares NUMERIC NOT NULL DEFAULT 0,
  deposit_token TEXT NOT NULL,
  deposit_amount_usd NUMERIC NOT NULL DEFAULT 0,
  deposited_at TIMESTAMPTZ,
  current_apr NUMERIC,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wallet_address, vault_address)
);

-- Enable RLS on yield_positions
ALTER TABLE yield_positions ENABLE ROW LEVEL SECURITY;

-- RLS policy for yield_positions
CREATE POLICY "Users can view own yield positions"
  ON yield_positions FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

-- Create indexes for yield_positions
CREATE INDEX idx_yield_positions_wallet ON yield_positions (wallet_address);
CREATE INDEX idx_yield_positions_vault ON yield_positions (vault_address);
