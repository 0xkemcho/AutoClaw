'use client';

import { useState } from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for beginners exploring FX trading',
    cta: 'Get started',
    popular: false,
    prefix: 'Included',
    features: [
      'Trade 15+ stablecoin pairs',
      'Standard trading fees (0.8%)',
      'Basic wallet security',
      'Mobile & desktop access',
      'Email support',
      'Market analysis tools',
      'Real-time price alerts',
    ],
  },
  {
    name: 'Pro',
    price: { monthly: 12, yearly: 10 },
    description: 'Advanced tools for serious traders',
    cta: 'Get started',
    popular: true,
    prefix: 'Everything in Free, plus:',
    features: [
      'Reduced fees (0.4% per trade)',
      'Priority transaction processing',
      'Advanced charting & indicators',
      'Portfolio analytics dashboard',
      'Staking rewards (up to 12% APY)',
      'API access for automation',
      'Priority support (2h response)',
    ],
  },
  {
    name: 'Business',
    price: { monthly: 39, yearly: 31 },
    description: 'Built for institutions and high-volume traders',
    cta: 'Get started',
    popular: false,
    prefix: 'Everything in Pro, plus:',
    features: [
      'Ultra-low fees (0.1% per trade)',
      'Dedicated account manager',
      'OTC desk for large orders',
      'White-label solutions',
      'Custom API limits',
      'Multi-user team accounts',
      '24/7 phone support',
    ],
  },
];

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="border-y border-neutral-700 py-24" id="pricing">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Choose Your Plan.
              <br />
              Start Trading Today.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Transparent pricing for every investor. Scale as you grow with no
            hidden fees or surprise charges.
          </p>
        </div>

        {/* Toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
            <span
              className={`text-sm ${!yearly ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative h-6 w-11 rounded-full border transition-colors ${
                yearly
                  ? 'border-primary/40 bg-primary/20'
                  : 'border-white/[0.1] bg-white/[0.06]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-primary transition-transform ${
                  yearly ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
            <span
              className={`text-sm ${yearly ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Yearly
            </span>
            {yearly && (
              <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-xs text-muted-foreground">
                20% OFF
              </span>
            )}
          </div>

          {/* Cards */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="relative overflow-hidden rounded-2xl p-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.popular && (
                    <span className="rounded-full border border-white/[0.1] px-2.5 py-0.5 text-xs text-muted-foreground">
                      Popular
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${yearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>

                {/* CTA */}
                <div className="mt-5">
                  {plan.popular ? (
                    <Button className="w-full rounded-full">
                      {plan.cta}
                      <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full rounded-full">
                      {plan.cta}
                    </Button>
                  )}
                </div>

                {/* Divider + features */}
                <div className="mt-6 border-t border-neutral-700 pt-5">
                  <p className="mb-3 text-xs text-muted-foreground">
                    {plan.prefix}
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
