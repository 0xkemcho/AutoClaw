-- Max trade size: migrate from absolute USD to percentage (1-100) of available buying power

-- 1. Add new column
ALTER TABLE agent_configs ADD COLUMN max_trade_size_pct NUMERIC DEFAULT 25;

-- 2. Migrate existing values (approximate: 50->5%, 200->25%, 500->50%)
UPDATE agent_configs
SET max_trade_size_pct = CASE
  WHEN max_trade_size_usd <= 50 THEN 5
  WHEN max_trade_size_usd <= 150 THEN 15
  WHEN max_trade_size_usd <= 250 THEN 25
  WHEN max_trade_size_usd <= 400 THEN 40
  ELSE 50
END
WHERE max_trade_size_usd IS NOT NULL;

-- 3. Add CHECK constraint
ALTER TABLE agent_configs ADD CONSTRAINT ck_max_trade_size_pct_range
  CHECK (max_trade_size_pct >= 1 AND max_trade_size_pct <= 100);

-- 4. Drop old constraint and column
ALTER TABLE agent_configs DROP CONSTRAINT IF EXISTS ck_max_trade_size_positive;
ALTER TABLE agent_configs DROP COLUMN max_trade_size_usd;
