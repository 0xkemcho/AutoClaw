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
    <section className="border-y border-neutral-700 py-24" id="how-it-works">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              A simple, fast, and secure platform to manage your stablecoins in
              just a few steps.
            </p>
          </div>
          <a
            href="#get-started"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Create account now
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative overflow-hidden"
            >
              {/* Step number */}
              <div className="absolute left-5 top-5 text-lg font-normal text-muted-foreground">
                {step.number}
              </div>

              {/* Mock UI */}
              <div className="px-5 pt-14 pb-5">{step.mock}</div>

              {/* Label */}
              <div className="px-5 py-4">
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
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
