/**
 * Conversation Intelligence Agent service.
 * Handles chat creation, message persistence, and streaming AI responses with tools.
 */

import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import { resolveModel, type ConversationModelId } from './model-router.js';
import { getActiveToolsFromGroups } from './tool-groups.js';
import { conversationTools, MAX_TOOL_CALLS_PER_TURN } from './tool-orchestrator.js';

type ConversationChatRow = Database['public']['Tables']['conversation_chats']['Row'];
type ConversationMessageRow = Database['public']['Tables']['conversation_messages']['Row'];

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const gemini = createGeminiProvider({
  authType: (process.env.GEMINI_CLI_AUTH_TYPE as 'oauth-personal') || 'oauth-personal',
});

const SYSTEM_PROMPT = `You are a deep-conversation intelligence agent for the AutoClaw platform on Celo. You have access to tools for:
- News and web search (Parallel AI)
- Crypto prices and market data (CoinGecko)
- X/social sentiment analysis (Grok)
- Celo governance info (Mondo - mondo.celo.org/governance)

Use tools when the user asks about news, prices, sentiment, or Celo governance. Be conversational, cite sources when you use tool results, and keep responses focused. For Celo governance, all data comes from https://mondo.celo.org/governance.

TOOL USAGE GUIDELINES:
- For price queries about well-known coins (celo, bitcoin, ethereum, usd-coin, tether, etc.), call getCryptoPrices directly with the coin ID. Do NOT call searchCoins first.
- Only use searchCoins when the user asks about an obscure or unknown token.
- Prefer calling the fewest tools possible. One tool call is better than two.
- When the user asks a general question that doesn't need tools, just answer directly.

Format responses in Markdown. Use bullet points (-) for lists of items. Use **bold** for emphasis. Use \`code\` for technical terms. Use clear headings and structure.`;

export interface CreateChatResult {
  id: string;
  walletAddress: string;
  title: string;
  createdAt: string;
}

export async function createChat(walletAddress: string): Promise<CreateChatResult> {
  const { data, error } = await supabaseAdmin
    .from('conversation_chats')
    .insert({
      wallet_address: walletAddress,
      title: 'New chat',
    })
    .select('id, wallet_address, title, created_at')
    .single();

  if (error) throw new Error(`Failed to create chat: ${error.message}`);
  const row = data as ConversationChatRow;

  return {
    id: row.id,
    walletAddress: row.wallet_address,
    title: row.title ?? 'New chat',
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export async function getLatestChat(walletAddress: string): Promise<ConversationChatRow | null> {
  const { data, error } = await supabaseAdmin
    .from('conversation_chats')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ConversationChatRow;
}

export async function getChat(
  chatId: string,
  walletAddress: string
): Promise<ConversationChatRow | null> {
  const { data, error } = await supabaseAdmin
    .from('conversation_chats')
    .select('*')
    .eq('id', chatId)
    .eq('wallet_address', walletAddress)
    .single();

  if (error || !data) return null;
  return data as ConversationChatRow;
}

export async function updateChatEnabledTools(
  chatId: string,
  walletAddress: string,
  enabledTools: string[]
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('conversation_chats')
    .update({ enabled_tools: enabledTools.length > 0 ? enabledTools : null, updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('wallet_address', walletAddress);

  if (error) throw new Error(`Failed to update chat tools: ${error.message}`);
}

export async function getMessages(
  chatId: string,
  walletAddress: string
): Promise<ConversationMessageRow[]> {
  const { data, error } = await supabaseAdmin
    .from('conversation_messages')
    .select('*')
    .eq('chat_id', chatId)
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data ?? []) as ConversationMessageRow[];
}

function toModelMessages(rows: ConversationMessageRow[]): ModelMessage[] {
  return rows
    .filter((r) => r.role === 'user' || r.role === 'assistant' || r.role === 'system')
    .map((r) => ({
      role: r.role as 'user' | 'assistant' | 'system',
      content: r.content,
    }));
}

export interface SendMessageParams {
  chatId: string;
  walletAddress: string;
  content: string;
  modelId: ConversationModelId;
  /** Tool group IDs to enable. If omitted, uses chat.enabled_tools or all. */
  enabledTools?: string[] | null;
}

export interface SendMessageStreamResult {
  response: Response;
  modelRequested: string;
  modelRouted: string;
  usedFallback: boolean;
}

export async function sendMessageStream(params: SendMessageParams): Promise<SendMessageStreamResult> {
  const { chatId, walletAddress, content, modelId, enabledTools: paramEnabledTools } = params;

  const chat = await getChat(chatId, walletAddress);
  if (!chat) throw new Error('Chat not found');

  const enabledGroups = paramEnabledTools ?? (chat as { enabled_tools?: string[] | null }).enabled_tools ?? null;
  const activeToolNames = getActiveToolsFromGroups(enabledGroups);

  const routing = resolveModel(modelId);
  const model = gemini(routing.routedModelId);

  const existingMessages = await getMessages(chatId, walletAddress);
  const coreMessages = toModelMessages(existingMessages);
  coreMessages.push({ role: 'user', content });

  const userMessage = await supabaseAdmin
    .from('conversation_messages')
    .insert({
      chat_id: chatId,
      wallet_address: walletAddress,
      role: 'user',
      content,
    })
    .select('id')
    .single();

  if (userMessage.error) throw new Error(`Failed to save user message: ${userMessage.error.message}`);

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: coreMessages,
    tools: conversationTools,
    activeTools:
      activeToolNames.length > 0
        ? (activeToolNames as (keyof typeof conversationTools)[])
        : undefined,
    stopWhen: stepCountIs(MAX_TOOL_CALLS_PER_TURN),
    onFinish: async ({ text }) => {
      await supabaseAdmin.from('conversation_messages').insert({
        chat_id: chatId,
        wallet_address: walletAddress,
        role: 'assistant',
        content: text ?? '',
        model_requested: routing.requestedModelId,
        model_routed: routing.routedModelId,
        tool_calls_json: [],
      });
      await supabaseAdmin
        .from('conversation_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId)
        .eq('wallet_address', walletAddress);
    },
  });

  const response = result.toUIMessageStreamResponse({
    headers: {
      'X-Model-Requested': routing.requestedModelId,
      'X-Model-Routed': routing.routedModelId,
      'X-Model-Used-Fallback': routing.usedFallback ? 'true' : 'false',
    },
    onError: (err) => (err instanceof Error ? err.message : 'Unknown error'),
  });

  return {
    response,
    modelRequested: routing.requestedModelId,
    modelRouted: routing.routedModelId,
    usedFallback: routing.usedFallback,
  };
}
