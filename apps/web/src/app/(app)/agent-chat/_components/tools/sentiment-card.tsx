import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SentimentResult {
  sentiment: string;
  summary: string;
  positivePct?: number;
  neutralPct?: number;
  negativePct?: number;
}

export function SentimentCard({ result }: { result: SentimentResult }) {
  if (!result) return null;

  const getSentimentColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'positive': return 'text-emerald-400';
      case 'negative': return 'text-rose-400';
      case 'neutral': return 'text-zinc-400';
      default: return 'text-amber-400';
    }
  };

  const getSentimentIcon = (s: string) => {
    switch (s.toLowerCase()) {
      case 'positive': return <ThumbsUp className="h-4 w-4" />;
      case 'negative': return <ThumbsDown className="h-4 w-4" />;
      case 'neutral': return <Minus className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <span className="text-blue-400">𝕏</span> Social Sentiment
          </CardTitle>
          <div className={`flex items-center gap-1.5 text-sm font-bold capitalize ${getSentimentColor(result.sentiment)}`}>
            {getSentimentIcon(result.sentiment)}
            {result.sentiment}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm text-zinc-400 leading-relaxed">
          {result.summary}
        </p>

        {result.positivePct !== undefined && (
          <div className="space-y-2">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-emerald-500/80"
                style={{ width: `${result.positivePct}%` }}
              />
              <div
                className="h-full bg-zinc-500/50"
                style={{ width: `${result.neutralPct}%` }}
              />
              <div
                className="h-full bg-rose-500/80"
                style={{ width: `${result.negativePct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span className="text-emerald-400">{result.positivePct}% Positive</span>
              <span className="text-zinc-400">{result.neutralPct}% Neutral</span>
              <span className="text-rose-400">{result.negativePct}% Negative</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
