import { ExternalLink, Vote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GovernanceData {
  markdown: string;
  url: string;
  scrapedAt: string;
  error?: string;
}

export function GovernanceCard({ data }: { data: GovernanceData }) {
  if (!data) return null;

  if (data.error) {
    return (
      <Card className="w-full max-w-md bg-rose-950/20 border-rose-900/50">
        <CardContent className="pt-4 text-sm text-rose-400">
          Failed to fetch governance data: {data.error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
          <Vote className="h-4 w-4 text-amber-400" />
          Celo Governance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="text-sm text-zinc-400">
          Successfully retrieved latest governance proposals and voting data from Mondo.
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Synced: {new Date(data.scrapedAt).toLocaleTimeString()}</span>
          <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-700" asChild>
            <a href={data.url} target="_blank" rel="noopener noreferrer">
              View on Mondo <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
