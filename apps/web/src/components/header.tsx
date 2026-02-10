'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { TrendingUp, ArrowLeftRight } from 'lucide-react';
import { client, wallets, walletTheme, connectButtonStyle, shortenAddress } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';

const navLinks = [
  { href: '/markets', label: 'Markets', icon: TrendingUp },
  { href: '/swap', label: 'Swap', icon: ArrowLeftRight },
];

function AccountButton() {
  const account = useActiveAccount();
  return (
    <button className="h-9 px-4 text-sm font-medium text-foreground bg-background-secondary border border-border rounded-full hover:bg-background-card transition-colors">
      {account ? shortenAddress(account.address) : ''}
    </button>
  );
}

export function Header() {
  const account = useActiveAccount();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background-card/95 border-b border-border">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href={account ? '/home' : '/'} className="flex items-center gap-2">
          <img
            src="https://cdn.prod.website-files.com/64078f74f400a576b871a774/65cfccdcd2a4fdd64f05be09_autopilotAppIcon.png"
            alt="AutoClaw"
            className="w-7 h-7 rounded-lg"
          />
          <span className="font-bold text-foreground text-sm">AutoClaw</span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-accent-text'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <ConnectButton
            client={client}
            wallets={wallets}
            chain={celo}
            theme={walletTheme}
            connectButton={{ label: 'Connect', style: connectButtonStyle }}
            connectModal={{ size: 'compact' }}
            detailsButton={{
              render: () => <AccountButton />,
            }}
          />
        </div>
      </div>
    </header>
  );
}
