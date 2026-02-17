-- SelfClaw human-backed agent verification
-- Ed25519 keypair and verification state stored per user

ALTER TABLE user_profiles
  ADD COLUMN selfclaw_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN selfclaw_public_key TEXT,
  ADD COLUMN selfclaw_private_key TEXT,
  ADD COLUMN selfclaw_agent_name TEXT,
  ADD COLUMN selfclaw_human_id TEXT,
  ADD COLUMN selfclaw_session_id TEXT,
  ADD COLUMN selfclaw_verified_at TIMESTAMPTZ;
