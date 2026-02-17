'use client';

import * as React from 'react';
import type { UIMessage } from 'ai';
import { Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { ChatInterface } from './_components/chat-interface';

interface ApiMessage {
  id: string;
  role: string;
  content: string;
}

function toUIMessages(apiMessages: ApiMessage[]): UIMessage[] {
  return apiMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    parts: [{ type: 'text' as const, text: m.content }],
  }));
}

interface MessagesResponse {
  chat: { enabledTools?: string[] };
  messages: ApiMessage[];
}

export default function AgentChatPage() {
  const [chatId, setChatId] = React.useState<string | null>(null);
  const [initialMessages, setInitialMessages] = React.useState<UIMessage[]>([]);
  const [initialEnabledTools, setInitialEnabledTools] = React.useState<string[] | undefined>();
  const [error, setError] = React.useState<string | null>(null);

  const handleNewChat = React.useCallback(async () => {
    try {
      setError(null);
      const chat = await api.post<{ id: string }>('/api/conversation/chats');
      setChatId(chat.id);
      setInitialMessages([]);
      setInitialEnabledTools(undefined);
    } catch (err) {
      console.error('Failed to create new chat:', err);
      setError('Failed to start new conversation. Please try again.');
    }
  }, []);

  React.useEffect(() => {
    const initChat = async () => {
      try {
        // Preload last chat on refresh; create new only if none exist
        try {
          const latest = await api.get<{ id: string }>('/api/conversation/chats/latest');
          setChatId(latest.id);
          const { chat, messages } = await api.get<MessagesResponse>(
            `/api/conversation/chats/${latest.id}/messages`
          );
          setInitialMessages(toUIMessages(messages ?? []));
          setInitialEnabledTools(chat?.enabledTools);
          return;
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) {
            // No chats yet — create first one
          } else {
            throw e;
          }
        }
        const chat = await api.post<{ id: string }>('/api/conversation/chats');
        setChatId(chat.id);
        setInitialMessages([]);
        setInitialEnabledTools(undefined);
      } catch (err) {
        console.error('Failed to initialize chat:', err);
        setError('Failed to start conversation. Please try again.');
      }
    };

    initChat();
  }, []);

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm text-zinc-400 hover:text-white underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!chatId) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Initializing secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface
      key={chatId}
      chatId={chatId}
      initialMessages={initialMessages}
      initialEnabledTools={initialEnabledTools}
      onNewChat={handleNewChat}
    />
  );
}
