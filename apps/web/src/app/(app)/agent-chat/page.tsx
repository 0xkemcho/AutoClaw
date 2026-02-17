'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { ChatInterface } from './_components/chat-interface';

export default function AgentChatPage() {
  const [chatId, setChatId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const initChat = async () => {
      try {
        const chat = await api.post<{ id: string }>('/api/conversation/chats');
        setChatId(chat.id);
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
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm">Initializing secure session...</p>
        </div>
      </div>
    );
  }

  return <ChatInterface chatId={chatId} />;
}
