/**
 * Model catalog and routing for the Conversation Intelligence Agent.
 * Non-Gemini models are routed to Gemini fallback with explicit metadata.
 */

export const CONVERSATION_MODEL_IDS = [
  'gemini-3-pro',
  'gemini-3-flash',
  'opus-4.6',
  'sonnet-4.5',
  'chatgpt-5.3',
] as const;

export type ConversationModelId = (typeof CONVERSATION_MODEL_IDS)[number];

const GEMINI_MODELS = new Set<ConversationModelId>(['gemini-3-pro', 'gemini-3-flash']);

/** Maps our catalog IDs to actual Gemini model IDs (gemini-cli provider). */
const GEMINI_MODEL_MAP: Record<ConversationModelId, string> = {
  'gemini-3-pro': 'gemini-2.5-pro',
  'gemini-3-flash': 'gemini-2.5-flash',
  'opus-4.6': 'gemini-2.5-flash',
  'sonnet-4.5': 'gemini-2.5-flash',
  'chatgpt-5.3': 'gemini-2.5-flash',
};

export function isConversationModelId(id: string): id is ConversationModelId {
  return CONVERSATION_MODEL_IDS.includes(id as ConversationModelId);
}

export interface ModelRoutingResult {
  /** Actual model ID passed to the provider */
  routedModelId: string;
  /** Whether the requested model was routed to a fallback */
  usedFallback: boolean;
  /** Original model ID requested by the client */
  requestedModelId: string;
}

/**
 * Resolve requested model ID to the model we actually call.
 * Non-Gemini models route to Gemini 2.5 Flash with metadata.
 */
export function resolveModel(requestedModelId: string): ModelRoutingResult {
  const normalized = requestedModelId?.toLowerCase().trim() || 'gemini-3-flash';
  const id = isConversationModelId(normalized) ? normalized : 'gemini-3-flash';
  const routedModelId = GEMINI_MODEL_MAP[id];
  const usedFallback = !GEMINI_MODELS.has(id);

  return {
    routedModelId,
    usedFallback,
    requestedModelId: id,
  };
}
