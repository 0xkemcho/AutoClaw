import { UIMessage } from 'ai';
import { User, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewsList } from './tools/news-list';
import { CryptoPriceCard } from './tools/crypto-price-card';
import { SentimentCard } from './tools/sentiment-card';
import { GovernanceCard } from './tools/governance-card';

interface MessageItemProps {
  message: UIMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-4 p-4 md:p-6', isUser ? 'bg-transparent' : 'bg-zinc-900/30')}>
      <div className="shrink-0 flex flex-col items-center">
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm',
          isUser
            ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        )}>
          {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-hidden">
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <div key={index} className="prose prose-invert prose-sm max-w-none leading-relaxed text-zinc-300">
                {part.text.split('\n').map((line, i) => (
                  <p key={i} className="min-h-[1em]">{line}</p>
                ))}
              </div>
            );
          }

          if (part.type.startsWith('tool-')) {
            const toolName = part.type.replace('tool-', '');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toolPart = part as any;
            const { toolCallId, state, output } = toolPart;

            if (state === 'output-available') {
              if (toolName === 'searchNews') {
                return <NewsList key={toolCallId} results={output.results} count={output.count} />;
              }
              if (toolName === 'getCryptoPrices') {
                return <CryptoPriceCard key={toolCallId} prices={output.prices} />;
              }
              if (toolName === 'analyzeSocialSentiment') {
                return <SentimentCard key={toolCallId} result={output} />;
              }
              if (toolName === 'getCeloGovernance') {
                return <GovernanceCard key={toolCallId} data={output} />;
              }
            }

            return (
              <div key={toolCallId || index} className="flex items-center gap-2 text-xs text-zinc-500 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Using tool: {toolName}...</span>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
