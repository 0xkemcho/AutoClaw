-- Add run_id to group timeline events by agent cycle
ALTER TABLE agent_timeline ADD COLUMN run_id UUID;

CREATE INDEX idx_timeline_run_id ON agent_timeline(run_id) WHERE run_id IS NOT NULL;
