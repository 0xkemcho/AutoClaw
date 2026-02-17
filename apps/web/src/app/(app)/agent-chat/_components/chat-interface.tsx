'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getToken } from '@/lib/token-store';
import { MessageItem } from './message-item';
import { ModelSelector } from './model-selector';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
}

export function ChatInterface({ chatId, initialModelId = 'gemini-3-flash' }: ChatInterfaceProps) {
  const [modelId, setModelId] = React.useState(initialModelId);
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const transportRef = React.useRef<InstanceType<typeof DefaultChatTransport> | null>(null);
  if (!transportRef.current) {
    transportRef.current = new DefaultChatTransport({
      api: `${API_BASE}/api/conversation/chats/${chatId}/messages`,
      headers: { Authorization: `Bearer ${getToken()}` },
      prepareSendMessagesRequest: ({ messages, body }) => {
        const content = extractLastUserContent(messages);
        const resolvedModelId = (body?.modelId as string) ?? 'gemini-3-flash';
        if (typeof window !== 'undefined') {
          console.log('[agent-chat] Sending message', { chatId, contentLength: content.length, modelId: resolvedModelId });
        }
        return { body: { content, modelId: resolvedModelId } };
      },
    });
  }
  const transport = transportRef.current;

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onFinish: () => {
      if (typeof window !== 'undefined') console.log('[agent-chat] Stream finished');
    },
  });

  React.useEffect(() => {
    if (error && typeof window !== 'undefined') {
      console.error('[agent-chat] Error:', error.message, error);
    }
  }, [error]);

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

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-zinc-950/30 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ModelSelector value={modelId} onValueChange={setModelId} />
        </div>
        <div className="text-xs text-zinc-500">
          {messages.length} messages
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 rounded-lg bg-rose-950/50 border border-rose-800 px-4 py-2 text-sm text-rose-400">
          {error.message}
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4 pb-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-zinc-500 space-y-4">
              <div className="p-4 rounded-full bg-zinc-900/50 border border-zinc-800">
                <SparklesIcon className="h-8 w-8 text-amber-500/50" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-medium text-zinc-300">Start a new conversation</h3>
                <p className="text-sm max-w-xs mx-auto">
                  Ask about crypto prices, FX news, Celo governance, or check social sentiment.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <MessageItem key={m.id} message={m} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Thinking...</p>
                    <p className="text-xs text-zinc-500">The agent is processing your message</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Celo, crypto prices, or news..."
            className="flex-1 bg-zinc-900/50 border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:border-zinc-600 focus-visible:ring-offset-0"
            autoFocus
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <div className="mt-2 text-[10px] text-center text-zinc-600">
          AI can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
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
