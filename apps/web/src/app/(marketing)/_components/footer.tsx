import { Logo } from '@/components/logo';

const navigationLinks = [
  { label: 'Why AutoClaw?', href: '#features' },
  { label: 'Currencies', href: '#cryptos' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

const socialLinks = [
  { label: 'Twitter (X)', href: '#' },
  { label: 'Discord', href: '#' },
  { label: 'LinkedIn', href: '#' },
];

export function Footer() {
  return (
    <footer className="border-t border-neutral-700">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr]">
          {/* Brand */}
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Secure, fast, and seamless FX trading. AutoClaw makes stablecoin
              management effortless.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Navigation</h4>
            <ul className="space-y-3">
              {navigationLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Socials</h4>
            <ul className="space-y-3">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-neutral-700 pt-6">
          <p className="text-xs text-muted-foreground">
            Built on Celo &middot; Powered by Mento Protocol
          </p>
        </div>
      </div>
    </footer>
  );
}
