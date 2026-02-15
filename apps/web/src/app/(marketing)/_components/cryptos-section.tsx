import { ArrowUpRight } from 'lucide-react';

const tokens = [
  { name: 'USDm', price: '$1.0002', change: '+0.02%', up: true, color: 'bg-amber-500' },
  { name: 'EURm', price: '$1.0845', change: '+0.12%', up: true, color: 'bg-blue-500' },
  { name: 'BRLm', price: '$0.1932', change: '-0.45%', up: false, color: 'bg-green-500' },
  { name: 'KESm', price: '$0.0077', change: '+0.31%', up: true, color: 'bg-red-500' },
  { name: 'PHPm', price: '$0.0175', change: '+0.18%', up: true, color: 'bg-purple-500' },
  { name: 'COPm', price: '$0.00024', change: '-0.22%', up: false, color: 'bg-yellow-500' },
  { name: 'XOFm', price: '$0.0016', change: '+0.08%', up: true, color: 'bg-teal-500' },
  { name: 'NGNm', price: '$0.00065', change: '+1.24%', up: true, color: 'bg-orange-500' },
  { name: 'GBPm', price: '$1.2615', change: '+0.15%', up: true, color: 'bg-indigo-500' },
  { name: 'JPYm', price: '$0.0067', change: '-0.33%', up: false, color: 'bg-pink-500' },
];

function TokenPill({ token }: { token: (typeof tokens)[0] }) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-full px-4 py-2">
      <div className={`h-7 w-7 rounded-full ${token.color} flex items-center justify-center text-[10px] font-bold text-white`}>
        {token.name.charAt(0)}
      </div>
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
          <TokenPill key={`${token.name}-${i}`} token={token} />
        ))}
      </div>
      <div
        className={`flex shrink-0 gap-3 ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        }`}
        aria-hidden
      >
        {items.map((token, i) => (
          <TokenPill key={`dup-${token.name}-${i}`} token={token} />
        ))}
      </div>
    </div>
  );
}

export function CryptosSection() {
  return (
    <section
      className="border-y border-neutral-700 py-24"
      id="cryptos"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              All Currencies,
              <br />
              One Platform
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Buy, sell, and convert all major stablecoins on a single platform.
              A seamless experience with no compromises.
            </p>
            <a
              href="#get-started"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Start trading now
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="space-y-3 overflow-hidden">
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
