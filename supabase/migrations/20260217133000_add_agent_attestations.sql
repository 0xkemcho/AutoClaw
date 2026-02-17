-- Mock attestation support for FX + Yield agent runs

CREATE TABLE agent_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('fx', 'yield')),
  run_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  signature TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'HMAC-SHA256',
  is_mock BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_attestations_wallet_agent_created
  ON agent_attestations (wallet_address, agent_type, created_at DESC);

CREATE INDEX idx_agent_attestations_run_id
  ON agent_attestations (run_id)
  WHERE run_id IS NOT NULL;

ALTER TABLE agent_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attestations"
  ON agent_attestations FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

ALTER TABLE fx_agent_timeline
  ADD COLUMN attestation_id UUID REFERENCES agent_attestations(id) ON DELETE SET NULL,
  ADD COLUMN attestation_status TEXT NOT NULL DEFAULT 'missing'
    CHECK (attestation_status IN ('missing', 'mock_verified', 'mock_invalid'));

ALTER TABLE yield_agent_timeline
  ADD COLUMN attestation_id UUID REFERENCES agent_attestations(id) ON DELETE SET NULL,
  ADD COLUMN attestation_status TEXT NOT NULL DEFAULT 'missing'
    CHECK (attestation_status IN ('missing', 'mock_verified', 'mock_invalid'));

CREATE INDEX idx_fx_agent_timeline_attestation_id
  ON fx_agent_timeline (attestation_id)
  WHERE attestation_id IS NOT NULL;

CREATE INDEX idx_yield_agent_timeline_attestation_id
  ON yield_agent_timeline (attestation_id)
  WHERE attestation_id IS NOT NULL;

CREATE INDEX idx_fx_agent_timeline_attestation_status
  ON fx_agent_timeline (wallet_address, attestation_status, created_at DESC);

CREATE INDEX idx_yield_agent_timeline_attestation_status
  ON yield_agent_timeline (wallet_address, attestation_status, created_at DESC);
