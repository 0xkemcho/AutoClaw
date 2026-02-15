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
    <footer className="border-t border-neutral-800">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          {/* Brand Column */}
          <div className="space-y-4 max-w-xs">
            <Logo size="sm" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Secure, fast, and seamless FX trading. AutoClaw makes stablecoin
              management effortless.
            </p>

            <div className="pt-8 text-xs text-muted-foreground">
              <p>Built on Celo &middot; Powered by Mento Protocol</p>
            </div>
          </div>

          {/* Links Columns */}
          <div className="flex gap-16">
            {/* Navigation */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Navigation</h4>
              <ul className="space-y-3">
                {navigationLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-neutral-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Socials */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Socials</h4>
              <ul className="space-y-3">
                {socialLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-neutral-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Optional: Add a subtle 'Made in...' badge to bottom right if needed,
            but standardizing the 'Built on' to the left matches standard clean layouts.
            The reference design for Cryptix often puts the copyright bottom left. */}
      </div>
    </footer>
  );
}
