-- Rename Turnkey-specific columns to vendor-neutral names
ALTER TABLE agent_configs
  RENAME COLUMN turnkey_wallet_address TO server_wallet_address;

ALTER TABLE agent_configs
  RENAME COLUMN turnkey_wallet_id TO server_wallet_id;
