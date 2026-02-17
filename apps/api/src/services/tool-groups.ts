/**
 * Tool group mapping for the Conversation Intelligence Agent.
 * UI shows 4 cards; backend has 5 tools. Each group maps to one or more tools.
 */

export const TOOL_GROUPS = [
  { id: 'parallel_ai', name: 'Parallel AI', description: 'News & Web Search', tools: ['searchNews'] },
  { id: 'coingecko', name: 'CoinGecko', description: 'Crypto Market Data', tools: ['getCryptoPrices', 'searchCoins'] },
  { id: 'grok', name: 'Grok (xAI)', description: 'Social Sentiment', tools: ['analyzeSocialSentiment'] },
  { id: 'firecrawl', name: 'Firecrawl', description: 'Governance Scraping', tools: ['getCeloGovernance'] },
] as const;

export const ALL_TOOL_GROUP_IDS = TOOL_GROUPS.map((g) => g.id);
export const VALID_TOOL_GROUP_IDS: Set<string> = new Set(ALL_TOOL_GROUP_IDS);

type ToolGroupId = (typeof TOOL_GROUPS)[number]['id'];
type ToolName = (typeof TOOL_GROUPS)[number]['tools'][number];

const GROUP_TO_TOOLS = new Map<ToolGroupId, ToolName[]>(
  TOOL_GROUPS.map((g) => [g.id, [...g.tools]])
);

/**
 * Returns the backend tool names that should be active for the given enabled group IDs.
 * If enabledGroups is null/undefined/empty, returns all tool names.
 */
export function getActiveToolsFromGroups(
  enabledGroups: string[] | null | undefined
): ToolName[] {
  if (!enabledGroups || enabledGroups.length === 0) {
    return TOOL_GROUPS.flatMap((g) => g.tools);
  }
  const validGroups = enabledGroups.filter((id): id is ToolGroupId =>
    VALID_TOOL_GROUP_IDS.has(id)
  );
  const toolNames = new Set<ToolName>();
  for (const groupId of validGroups) {
    const tools = GROUP_TO_TOOLS.get(groupId);
    if (tools) tools.forEach((t) => toolNames.add(t));
  }
  return [...toolNames];
}
