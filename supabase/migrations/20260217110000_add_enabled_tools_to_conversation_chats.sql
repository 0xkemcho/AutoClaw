-- Add enabled_tools to conversation_chats for per-chat tool toggles
-- NULL = all tools enabled; array = subset of tool group IDs
ALTER TABLE conversation_chats
  ADD COLUMN enabled_tools TEXT[] DEFAULT NULL;

COMMENT ON COLUMN conversation_chats.enabled_tools IS 'Tool group IDs enabled for this chat. NULL means all enabled. Valid: parallel_ai, coingecko, grok, firecrawl';
