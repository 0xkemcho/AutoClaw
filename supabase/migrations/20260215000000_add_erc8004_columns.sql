-- Migration: Add ERC-8004 agent identity columns
-- Adds agent_8004_id and agent_8004_tx_hash to track ERC-8004 agent registration

ALTER TABLE agent_configs ADD COLUMN agent_8004_id bigint DEFAULT NULL;
ALTER TABLE agent_configs ADD COLUMN agent_8004_tx_hash text DEFAULT NULL;
