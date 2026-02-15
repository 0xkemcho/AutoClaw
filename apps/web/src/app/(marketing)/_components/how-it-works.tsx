import { ArrowUpRight, Wallet, ArrowDownToLine, ArrowLeftRight } from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Connect your wallet',
    description:
      'Sign in easily and secure your profile in just a few steps.',
    mock: (
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Wallet</p>
          <div className="mt-1 rounded-lg border border-neutral-700 bg-white/[0.04] px-3 py-2.5 text-sm text-muted-foreground">
            0x1a2b...9f0e
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Network</p>
          <div className="mt-1 rounded-lg border border-neutral-700 bg-white/[0.04] px-3 py-2.5 text-sm text-muted-foreground">
            Celo Mainnet
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.06] py-2.5 text-center text-sm text-muted-foreground/60">
          Sign in with Ethereum
        </div>
      </div>
    ),
    icon: Wallet,
  },
  {
    number: 2,
    title: 'Fund your wallet',
    description:
      'Deposit your stablecoins or make a transfer to start trading.',
    mock: (
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Amount to Deposit</p>
          <div className="mt-1 flex items-center justify-between rounded-lg border border-neutral-700 bg-white/[0.04] px-3 py-2.5">
            <span className="text-lg font-mono">500.00</span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              USDm
            </span>
          </div>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Deposit Amount</span>
            <span>500.00 USDm</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Network Fee</span>
            <span>0.001 CELO</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Total Credited</span>
            <span>500.00 USDm</span>
          </div>
        </div>
      </div>
    ),
    icon: ArrowDownToLine,
  },
  {
    number: 3,
    title: 'Buy, sell, or convert',
    description:
      'Enjoy the simplicity of a platform that makes every transaction seamless in real-time.',
    mock: (
      <div className="space-y-2">
        {[
          { name: 'EURm', price: '$1.0845', change: '+0.56%', up: true },
          { name: 'USDm', price: '$1.0002', change: '+0.02%', up: true },
          { name: 'BRLm', price: '$0.1932', change: '-0.12%', up: false },
        ].map((token) => (
          <div
            key={token.name}
            className="flex items-center justify-between rounded-lg border border-neutral-700 bg-white/[0.04] px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.1] text-xs font-bold">
                {token.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted-foreground">{token.price}</p>
              </div>
            </div>
            <span
              className={`text-xs font-medium ${
                token.up ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {token.change}
            </span>
          </div>
        ))}
      </div>
    ),
    icon: ArrowLeftRight,
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-neutral-800" id="how-it-works">
      <div className="mx-auto max-w-7xl border-x border-neutral-800">
        {/* Header Grid */}
        <div className="grid grid-cols-1 border-b border-neutral-800 lg:grid-cols-3">
          <div className="col-span-2 border-b lg:border-b-0 lg:border-r border-neutral-800 p-8 lg:p-12">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              A simple, fast, and secure platform to manage your stablecoins in
              just a few steps.
            </p>
          </div>
          <div className="flex items-center lg:items-end justify-start lg:justify-end p-8 lg:p-12">
            <a
              href="#get-started"
              className="flex items-center gap-1 text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-400"
            >
              AutoClaw for Web
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`group relative flex flex-col p-8 lg:p-12 transition-colors hover:bg-white/[0.02] ${
                index !== 2 ? 'lg:border-r border-neutral-800' : ''
              } border-b lg:border-b-0 border-neutral-800 last:border-b-0`}
            >
              {/* Step number */}
              <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white">
                {step.number}
              </div>

              {/* Mock UI */}
              <div className="mb-8 flex-1 opacity-80 transition-opacity group-hover:opacity-100">
                {step.mock}
              </div>

              {/* Label */}
              <div>
                <h3 className="text-lg font-medium text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
