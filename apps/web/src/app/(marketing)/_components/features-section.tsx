import { TrendingUp, Sprout, RefreshCcw, Newspaper, Shield, Zap } from 'lucide-react';

const agents = [
  {
    icon: TrendingUp,
    title: 'FX Trading Agent',
    description:
      'Reads macro news and FX headlines with AI, generates buy/sell/hold signals, and executes stablecoin swaps across 15+ currencies via Mento. Your personal quant, minus the ego.',
  },
  {
    icon: Sprout,
    title: 'Yield Agent',
    description:
      'Scans for the best on-chain yield opportunities across ICHI vaults, Uniswap, CarbonFi, and Merkl. Deploys idle stables, auto-compounds rewards, and exits when the math stops working.',
  },
  {
    icon: RefreshCcw,
    title: 'Rebalancing Agent',
    description:
      'Set your target portfolio weights. The agent monitors drift and rebalances automatically — across stablecoins, yield positions, and DeFi protocols. No more "I should really sort that out" energy.',
  },
  {
    icon: Newspaper,
    title: 'News Sentinel',
    description:
      'Monitors FX news, X/Twitter sentiment, Celo governance, and macro signals 24/7. Surfaces what matters before you\'d have seen it on CT. Connected to Parallel AI, Grok, and Firecrawl.',
  },
];

const pillars = [
  {
    icon: Shield,
    title: 'Non-custodial. Always.',
    description:
      'Your keys, your coins. Agents execute on your behalf via server wallets — your private keys never leave your hands. Every agent registers on-chain via ERC-8004 for a transparent, verifiable track record.',
  },
  {
    icon: Zap,
    title: 'Gasless by default.',
    description:
      'Every transaction is gasless via EIP-7702, fully sponsored. Set your guardrails — max trade size, daily limits, stop-loss thresholds — and let agents handle the rest.',
  },
];

export function FeaturesSection() {
  return (
    <section className="border-b border-neutral-800" id="features">
      <div className="mx-auto max-w-7xl border-x border-neutral-800">
        {/* Header */}
        <div className="border-b border-neutral-800 py-16 px-6 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              One platform. Many agents. Zero excuses.
            </h2>
            <p className="mt-4 text-muted-foreground">
              AutoClaw is an autonomous agent runtime — not just a swap widget.
              Each agent has its own brain, its own guardrails, and its own mission.
              You set the rules. They do the work.
            </p>
          </div>
        </div>

        {/* Agent cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-neutral-800">
          {agents.map((agent, index) => (
            <div
              key={agent.title}
              className={`group relative flex flex-col p-8 transition-colors hover:bg-white/[0.02] border-b lg:border-b-0 border-neutral-800 ${
                index < 3 ? 'lg:border-r' : ''
              } ${index % 2 === 0 ? 'sm:border-r' : ''}`}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <agent.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-white">{agent.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {agent.description}
              </p>
            </div>
          ))}
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className={`group relative flex flex-col p-8 transition-colors hover:bg-white/[0.02] ${
                index === 0 ? 'sm:border-r border-b sm:border-b-0 border-neutral-800' : ''
              }`}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <pillar.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-medium text-white">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
