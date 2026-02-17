import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NewsArticle {
  title: string;
  url: string;
  excerpt: string;
  publishedAt?: string;
  source?: string;
}

interface NewsListProps {
  results: NewsArticle[];
  count: number;
}

export function NewsList({ results, count }: NewsListProps) {
  if (!results || results.length === 0) return null;

  return (
    <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-200">
            News Search Results
          </CardTitle>
          <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
            {count} articles
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {results.slice(0, 3).map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
              <h4 className="text-sm font-medium text-zinc-300 group-hover:text-amber-400 transition-colors line-clamp-2">
                {article.title}
              </h4>
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  {article.source || 'Unknown Source'}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                {article.publishedAt && (
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </a>
        ))}
        {results.length > 3 && (
          <div className="text-xs text-center text-zinc-500 pt-1">
            + {results.length - 3} more articles used in analysis
          </div>
        )}
      </CardContent>
    </Card>
  );
}
