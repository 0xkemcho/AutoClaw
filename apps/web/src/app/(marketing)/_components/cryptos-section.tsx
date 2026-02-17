import { ArrowUpRight } from 'lucide-react';
import { TokenLogo } from '@/components/token-logo';
import { TOKEN_METADATA } from '@autoclaw/shared';

const tokens = Object.entries(TOKEN_METADATA).map(([symbol, meta]) => ({
  symbol,
  name: meta.name,
  // Mock data for price/change since we don't have it in metadata yet
  price: '$1.00',
  change: '+0.00%',
  up: true,
  color: 'bg-neutral-800'
}));

function TokenPill({ token }: { token: typeof tokens[0] }) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-full border border-white/5 bg-white/5 px-4 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-sm">
      <TokenLogo symbol={token.symbol} size={28} className="rounded-full" />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{token.name}</span>
        <span className="text-xs text-muted-foreground">{token.price}</span>
      </div>
      <span
        className={`text-xs font-medium ${
          token.up ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {token.change}
      </span>
    </div>
  );
}

function MarqueeRow({ reverse = false }: { reverse?: boolean }) {
  const items = [...tokens, ...tokens, ...tokens];
  return (
    <div className="flex overflow-hidden">
      <div
        className={`flex shrink-0 gap-3 ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        }`}
      >
        {items.map((token, i) => (
          <TokenPill key={`${token.symbol}-${i}`} token={token} />
        ))}
      </div>
      <div
        className={`flex shrink-0 gap-3 ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        }`}
        aria-hidden
      >
        {items.map((token, i) => (
          <TokenPill key={`dup-${token.symbol}-${i}`} token={token} />
        ))}
      </div>
    </div>
  );
}

export function CryptosSection() {
  return (
    <section
      className="border-b border-neutral-800"
      id="cryptos"
    >
      <div className="mx-auto max-w-7xl border-x border-neutral-800">
        <div className="grid items-stretch lg:grid-cols-2">
          <div className="flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-neutral-800 p-8 lg:p-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              15+ global currencies.
              <br />
              One agent runtime.
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              USDm, EURm, BRLm, KESm, NGNm, JPYm and more — plus USDC, USDT,
              and yield positions across Uniswap and ICHI vaults. Your agents
              trade and farm across all of it, automatically.
            </p>
            <a
              href="#get-started"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-400"
            >
              AutoClaw for Web
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex flex-col justify-center space-y-3 overflow-hidden p-8 lg:p-16">
            <MarqueeRow />
            <MarqueeRow reverse />
            <MarqueeRow />
            <MarqueeRow reverse />
          </div>
        </div>
      </div>
    </section>
  );
}
