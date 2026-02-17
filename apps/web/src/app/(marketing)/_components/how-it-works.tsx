import { ArrowUpRight, Wallet, ArrowDownToLine, ArrowLeftRight } from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Connect',
    description:
      'Sign in with your wallet or social login (Google, Apple, and more). No KYC. No email. No forms. Just your address.',
    mock: (
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Wallet</p>
          <div className="mt-1 rounded-lg border border-neutral-700 bg-white/[0.04] px-3 py-2.5 text-sm text-muted-foreground">
            0x1a2b...9f0e
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Or sign in with</p>
          <div className="mt-1 flex gap-2">
            {['Google', 'Apple', 'X'].map((s) => (
              <div key={s} className="flex-1 rounded-lg border border-neutral-700 bg-white/[0.04] py-2.5 text-center text-xs text-muted-foreground">
                {s}
              </div>
            ))}
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
    title: 'Configure your agents',
    description:
      'Pick your risk profile, choose which agents to activate, and set your guardrails — max trade size, allocation limits, allowed assets. Takes 2 minutes.',
    mock: (
      <div className="space-y-3">
        <div className="space-y-2">
          {['Conservative', 'Moderate', 'Aggressive'].map((profile, i) => (
            <div
              key={profile}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
                i === 1
                  ? 'border-primary/50 bg-primary/10 text-white'
                  : 'border-neutral-700 bg-white/[0.04] text-muted-foreground'
              }`}
            >
              <span>{profile}</span>
              {i === 1 && <span className="text-xs text-primary">Selected</span>}
            </div>
          ))}
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Max trade size</span>
            <span>$200</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Daily trade limit</span>
            <span>5 trades</span>
          </div>
        </div>
      </div>
    ),
    icon: ArrowDownToLine,
  },
  {
    number: 3,
    title: 'Touch grass',
    description:
      'Agents run on schedule. Watch the live progress stream in your dashboard — or don\'t. That\'s the whole point.',
    mock: (
      <div className="space-y-2">
        {[
          { label: 'Fetching FX news', status: 'done', color: 'text-emerald-400' },
          { label: 'Analyzing signals', status: 'done', color: 'text-emerald-400' },
          { label: 'Executing swap: EURm', status: 'live', color: 'text-primary' },
          { label: 'Claiming yield rewards', status: 'queued', color: 'text-muted-foreground' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-neutral-700 bg-white/[0.04] px-3 py-2.5"
          >
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className={`text-xs font-medium ${item.color}`}>{item.status}</span>
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
              Three steps. Then you go touch grass.
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
