'use client';

export function NetworkIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
      <span
        className="relative flex size-2"
        aria-hidden
      >
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-medium text-foreground">Celo Mainnet</span>
    </div>
  );
}
