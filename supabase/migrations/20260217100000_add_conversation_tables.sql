-- Conversation Intelligence Agent: chat and message persistence
-- Wallet-scoped, per-chat memory only (no cross-chat memory in v1)

CREATE TABLE conversation_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  title TEXT DEFAULT 'New chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES conversation_chats(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  model_requested TEXT,
  model_routed TEXT,
  tool_calls_json JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for wallet-scoped lookups and chat ordering
CREATE INDEX idx_conversation_chats_wallet ON conversation_chats (wallet_address, updated_at DESC);
CREATE INDEX idx_conversation_messages_chat ON conversation_messages (chat_id, created_at ASC);
CREATE INDEX idx_conversation_messages_wallet ON conversation_messages (wallet_address, chat_id, created_at ASC);

-- Enable RLS
ALTER TABLE conversation_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access their own chats
CREATE POLICY "Users can view own conversation chats"
  ON conversation_chats FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own conversation chats"
  ON conversation_chats FOR INSERT
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can update own conversation chats"
  ON conversation_chats FOR UPDATE
  USING (wallet_address = current_setting('app.wallet_address', true));

-- RLS: users can only access messages in their own chats
CREATE POLICY "Users can view own conversation messages"
  ON conversation_messages FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own conversation messages"
  ON conversation_messages FOR INSERT
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));
