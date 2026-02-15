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
    <section className="border-y border-neutral-700 py-24" id="features">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why Choose AutoClaw?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Benefits designed to provide a seamless, secure, and accessible
            experience for all users.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden p-6"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full">
                <feature.icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">{feature.title}</h3>
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
