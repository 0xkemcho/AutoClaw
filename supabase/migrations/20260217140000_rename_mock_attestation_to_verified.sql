-- Remove "mock" nomenclature from attestation schema

-- 1. Rename is_mock -> is_development in agent_attestations
ALTER TABLE agent_attestations RENAME COLUMN is_mock TO is_development;

-- 2. Drop CHECK constraints before updating values (old constraint only allows mock_verified/mock_invalid)
ALTER TABLE fx_agent_timeline DROP CONSTRAINT IF EXISTS fx_agent_timeline_attestation_status_check;
ALTER TABLE yield_agent_timeline DROP CONSTRAINT IF EXISTS yield_agent_timeline_attestation_status_check;

-- 3. Update attestation_status values (mock_verified -> verified, mock_invalid -> invalid)
UPDATE fx_agent_timeline SET attestation_status = 'verified' WHERE attestation_status = 'mock_verified';
UPDATE fx_agent_timeline SET attestation_status = 'invalid' WHERE attestation_status = 'mock_invalid';

UPDATE yield_agent_timeline SET attestation_status = 'verified' WHERE attestation_status = 'mock_verified';
UPDATE yield_agent_timeline SET attestation_status = 'invalid' WHERE attestation_status = 'mock_invalid';

-- 4. Recreate CHECK constraints with new values
ALTER TABLE fx_agent_timeline ADD CONSTRAINT fx_agent_timeline_attestation_status_check
  CHECK (attestation_status IN ('missing', 'verified', 'invalid'));

ALTER TABLE yield_agent_timeline ADD CONSTRAINT yield_agent_timeline_attestation_status_check
  CHECK (attestation_status IN ('missing', 'verified', 'invalid'));
