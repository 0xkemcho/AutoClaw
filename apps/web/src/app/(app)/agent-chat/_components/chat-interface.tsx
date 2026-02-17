import * as React from 'react';
import type { UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Loader2, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/token-store';
import { MessageItem } from './message-item';
import { ModelSelector } from './model-selector';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const TOOL_GROUPS = [
  { id: 'parallel_ai', name: 'Parallel AI', description: 'News & Web Search' },
  { id: 'coingecko', name: 'CoinGecko', description: 'Crypto Market Data' },
  { id: 'grok', name: 'Grok (xAI)', description: 'Social Sentiment' },
  { id: 'firecrawl', name: 'Firecrawl', description: 'Governance Scraping' },
] as const;
const ALL_TOOL_GROUP_IDS = TOOL_GROUPS.map((g) => g.id);

function extractLastUserContent(messages: { role: string; parts?: Array<{ type: string; text?: string }> }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    const parts = m.parts ?? [];
    for (const p of parts) {
      if (p.type === 'text' && typeof p.text === 'string') return p.text;
    }
  }
  return '';
}

interface ChatInterfaceProps {
  chatId: string;
  initialModelId?: string;
  initialMessages?: UIMessage[];
  initialEnabledTools?: string[];
  onNewChat?: () => void;
}

export function ChatInterface({
  chatId,
  initialModelId = 'gemini-3-flash',
  initialMessages = [],
  initialEnabledTools,
  onNewChat,
}: ChatInterfaceProps) {
  const [modelId, setModelId] = React.useState(initialModelId);
  const [input, setInput] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('chat');
  const [enabledTools, setEnabledTools] = React.useState<string[]>(
    initialEnabledTools ?? ALL_TOOL_GROUP_IDS
  );
  const enabledToolsRef = React.useRef(enabledTools);
  enabledToolsRef.current = enabledTools;

  React.useEffect(() => {
    setEnabledTools(initialEnabledTools ?? ALL_TOOL_GROUP_IDS);
  }, [chatId, initialEnabledTools]);

  const transportRef = React.useRef<InstanceType<typeof DefaultChatTransport> | null>(null);
  if (!transportRef.current) {
    transportRef.current = new DefaultChatTransport({
      api: `${API_BASE}/api/conversation/chats/${chatId}/messages`,
      headers: { Authorization: `Bearer ${getToken()}` },
      prepareSendMessagesRequest: ({ messages, body }) => {
        const content = extractLastUserContent(messages);
        const resolvedModelId = (body?.modelId as string) ?? 'gemini-3-flash';
        const tools = enabledToolsRef.current;
        if (typeof window !== 'undefined') {
          console.log('[agent-chat] Sending message', {
            chatId,
            contentLength: content.length,
            modelId: resolvedModelId,
            enabledTools: tools.length,
          });
        }
        return { body: { content, modelId: resolvedModelId, enabledTools: tools } };
      },
    });
  }
  const transport = transportRef.current;

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages,
    onFinish: () => {
      if (typeof window !== 'undefined') console.log('[agent-chat] Stream finished');
    },
  });

  React.useEffect(() => {
    if (error && typeof window !== 'undefined') {
      console.error('[agent-chat] Error:', error.message, error);
    }
  }, [error]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (messages.length > 0) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const text = input;
    setInput('');
    try {
      await sendMessage({ text }, { body: { modelId } });
    } catch (err) {
      console.error('[agent-chat] sendMessage failed:', err);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-[calc(100vh-8rem)] relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40 pb-2 mb-4">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <ModelSelector value={modelId} onValueChange={setModelId} />
            <TabsList>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="tools">Connected Tools</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground hidden sm:block">
              {messages.length} messages
            </div>
            {onNewChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNewChat}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              >
                <MessageSquarePlus className="h-4 w-4 mr-1.5" />
                New Chat
              </Button>
            )}
          </div>
        </div>
        {error && (
          <div className="mx-4 mt-2 rounded-lg bg-rose-950/50 border border-rose-800 px-4 py-2 text-sm text-rose-400">
            {error.message}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 px-4 pb-24">
        <TabsContent value="chat" className="mt-0">
          <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {messages.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500 space-y-4">
                <div className="p-4 rounded-full bg-zinc-900/50 border border-zinc-800">
                  <SparklesIcon className="h-8 w-8 text-primary/50" />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="font-medium text-zinc-300">Start a new conversation</h3>
                  <p className="text-sm max-w-xs mx-auto text-zinc-500">
                    Try one of these prompts to see custom tool cards:
                  </p>
                  <ul className="text-xs text-zinc-500 space-y-1.5 text-left max-w-sm mx-auto">
                    <li>• What is the current price of CELO?</li>
                    <li>• Show me the latest news about Celo</li>
                    <li>• What&apos;s the sentiment on X about Celo?</li>
                    <li>• Summarize the latest Celo governance proposals</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageItem key={m.id} message={m} isStreaming={isLoading} />
                ))}
                {isLoading && (
                  <div className="flex gap-4 p-4 md:p-6 bg-zinc-900/30 rounded-lg">
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="text-sm">Thinking…</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="tools" className="mt-0">
          <div className="max-w-3xl mx-auto">
            <div className="p-6 border rounded-lg bg-card text-card-foreground">
              <h3 className="font-semibold mb-4 text-lg">Connected Tools</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Toggle tools on or off. At least one tool must stay enabled.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {TOOL_GROUPS.map((group) => (
                  <ToolToggleCard
                    key={group.id}
                    id={group.id}
                    name={group.name}
                    description={group.description}
                    enabled={enabledTools.includes(group.id)}
                    disabled={enabledTools.length <= 1 && enabledTools.includes(group.id)}
                    onToggle={async (checked) => {
                      const next = checked
                        ? [...enabledTools, group.id]
                        : enabledTools.filter((id) => id !== group.id);
                      if (next.length === 0) return;
                      setEnabledTools(next);
                      try {
                        await api.patch(`/api/conversation/chats/${chatId}`, { enabledTools: next });
                      } catch (err) {
                        console.error('Failed to update tools:', err);
                        setEnabledTools(enabledTools);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </div>

      {/* Sticky Input */}
      <div className="sticky bottom-0 z-10 p-4 bg-background/80 backdrop-blur-md border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Celo, crypto prices, or news..."
              className="flex-1 pr-12 bg-background/50 h-12 text-base"
              autoFocus
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-1.5 top-1.5 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <div className="mt-2 text-[10px] text-center text-muted-foreground">
            AI can make mistakes. Check important info.
          </div>
        </div>
      </div>
    </Tabs>
  );
}

function ToolToggleCard({
  id,
  name,
  description,
  enabled,
  disabled,
  onToggle,
}: {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: (checked: boolean) => void | Promise<void>;
}) {
  return (
    <div className="p-4 rounded-md border bg-zinc-900/30 flex items-center justify-between">
      <div>
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{enabled ? 'On' : 'Off'}</span>
        <Switch
          id={`tool-${id}`}
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M9 3v4" />
      <path d="M3 5h4" />
      <path d="M3 9h4" />
    </svg>
  );
}
