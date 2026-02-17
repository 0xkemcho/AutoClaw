import { ExternalLink, Newspaper } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="space-y-4 w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-medium text-zinc-200">Related News</h3>
        </div>
        <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-800">
          {count} articles
        </Badge>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {results.slice(0, 4).map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group h-full"
          >
            <Card className="h-full bg-zinc-900/40 border-zinc-800 hover:border-amber-500/30 hover:bg-zinc-900/60 transition-all duration-200">
              <CardContent className="p-4 flex flex-col h-full justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400 truncate max-w-[120px]">
                      {article.source || 'Unknown'}
                    </span>
                    {article.publishedAt && (
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                    {article.title}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-zinc-500 group-hover:text-amber-500/80 transition-colors pt-2 border-t border-zinc-800/50">
                  <span>Read article</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
      
      {results.length > 4 && (
        <div className="text-xs text-center text-zinc-500">
          + {results.length - 4} more sources analyzed
        </div>
      )}
    </div>
  );
}
