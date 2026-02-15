import { Shield, Zap, ArrowDownUp, Monitor } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Maximum Security',
    description:
      'Your assets are protected with cutting-edge security protocols.',
  },
  {
    icon: Zap,
    title: 'Instant Transactions',
    description:
      'Execute your transactions in real-time, without delays.',
  },
  {
    icon: ArrowDownUp,
    title: 'Optimized Fees',
    description:
      'Benefit from some of the lowest fees on the market.',
  },
  {
    icon: Monitor,
    title: 'Premium Interface',
    description:
      'An intuitive design that\'s easy to use, even for beginners.',
  },
];

export function FeaturesSection() {
  return (
    <section className="border-b border-neutral-800" id="features">
      <div className="mx-auto max-w-7xl border-x border-neutral-800">
        <div className="border-b border-neutral-800 py-16 px-6 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              Why Choose AutoClaw?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Benefits designed to provide a seamless, secure, and accessible
              experience for all users.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group relative flex flex-col p-8 transition-colors hover:bg-white/[0.02] border-b lg:border-b-0 border-neutral-800 ${
                index < 3 ? 'lg:border-r' : ''
              } ${index % 2 === 0 ? 'sm:border-r' : ''}`}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-medium text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
