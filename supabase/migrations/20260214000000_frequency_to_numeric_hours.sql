-- Migration: Change frequency from enum strings to numeric hours (1-24)
-- Backwards-compatible: old string values are handled in application code

-- Drop the old CHECK constraint
ALTER TABLE agent_configs DROP CONSTRAINT IF EXISTS agent_configs_frequency_check;

-- Convert existing string values to numeric hours
UPDATE agent_configs SET frequency = '1' WHERE frequency = 'hourly';
UPDATE agent_configs SET frequency = '4' WHERE frequency = '4h';
UPDATE agent_configs SET frequency = '24' WHERE frequency = 'daily';

-- Change default to numeric
ALTER TABLE agent_configs ALTER COLUMN frequency SET DEFAULT '4';

-- Add a new CHECK constraint for valid hour range (stored as text representation of number)
ALTER TABLE agent_configs ADD CONSTRAINT agent_configs_frequency_hours_check
  CHECK (frequency::int >= 1 AND frequency::int <= 24);
