'use client';

import { ExternalLink } from 'lucide-react';

interface CitationChipProps {
  url: string;
  title: string;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function CitationChip({ url, title }: CitationChipProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="inline-flex items-center gap-1.5 text-xs bg-background-secondary border border-border rounded-pill px-2.5 py-1 text-foreground-muted hover:text-accent-text hover:border-accent transition-colors"
    >
      <ExternalLink size={12} className="shrink-0" />
      <span className="truncate max-w-[140px]">{extractHostname(url)}</span>
    </a>
  );
}
