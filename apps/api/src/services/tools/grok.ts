/**
 * Grok (xAI) tool for X/social sentiment analysis. Used by the Conversation Intelligence Agent.
 */

const XAI_BASE = 'https://api.x.ai/v1';

export interface GrokSentimentResult {
  sentiment: string;
  summary: string;
  positivePct?: number;
  neutralPct?: number;
  negativePct?: number;
}

/**
 * Analyze sentiment about a topic using Grok (has real-time X/social context).
 */
export async function analyzeGrokSentiment(topic: string): Promise<GrokSentimentResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not set — Grok sentiment tool disabled');
  }

  const systemPrompt = `You are a social sentiment analyst. Analyze the current sentiment on X (Twitter) and social media about the given topic. Return a JSON object with: sentiment (overall: "positive"|"neutral"|"negative"|"mixed"), summary (2-3 sentence summary), positivePct, neutralPct, negativePct (0-100 numbers that sum to 100). Be concise.`;

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-3-fast',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze current X/social sentiment about: ${topic}` },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Grok API error: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content) as GrokSentimentResult;
    return {
      sentiment: parsed.sentiment ?? 'unknown',
      summary: parsed.summary ?? content,
      positivePct: parsed.positivePct,
      neutralPct: parsed.neutralPct,
      negativePct: parsed.negativePct,
    };
  } catch {
    return {
      sentiment: 'unknown',
      summary: content,
    };
  }
}
