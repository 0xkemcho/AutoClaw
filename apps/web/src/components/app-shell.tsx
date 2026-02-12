'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sliders, Clock, Power } from 'lucide-react';
import { ConnectButton } from 'thirdweb/react';
import { client, wallets, walletTheme, detailsButtonStyle } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';
import { useAgentStatus, useToggleAgent, usePortfolio } from '@/hooks/use-agent';
import { Header } from '@/components/header';
import { SidebarSwap } from '@/components/sidebar-swap';

const NAV_ITEMS = [
  { href: '/home', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Sliders },
  { href: '/history', label: 'History', icon: Clock },
] as const;

function formatTimeUntil(isoDate: string | null | undefined): string {
  if (!isoDate) return '\u2014';
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Soon';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

function SidebarNav() {
  const pathname = usePathname();
  const { data: status } = useAgentStatus();
  const { data: portfolio } = usePortfolio();
  const toggleAgent = useToggleAgent();

  const totalValue = portfolio?.totalValueUsd ?? 0;

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-[280px] h-screen sticky top-0 bg-background-card border-r border-border">
      {/* Logo area */}
      <div className="h-14 flex items-center px-5 border-b border-border">
        <a href="/home" className="flex items-center gap-2">
          <img
            src="https://cdn.prod.website-files.com/64078f74f400a576b871a774/65cfccdcd2a4fdd64f05be09_autopilotAppIcon.png"
            alt="AutoClaw"
            className="w-7 h-7 rounded-lg"
          />
          <span className="font-bold text-foreground text-sm">AutoClaw</span>
        </a>
      </div>

      {/* Portfolio card */}
      <div className="px-4 pt-5 pb-3">
        <div className="rounded-card bg-background-secondary border border-border p-4">
          <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Agent Portfolio</p>
          <p className="text-xl font-bold text-foreground">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {portfolio && portfolio.holdings.length > 0 && (
            <div className="mt-3 space-y-2">
              {portfolio.holdings.map((h) => (
                <div key={h.tokenSymbol} className="flex items-center justify-between text-xs">
                  <span className="text-foreground-secondary">{h.tokenSymbol}</span>
                  <span className="text-foreground font-medium">
                    ${h.valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Swap */}
      <div className="px-4 pb-3">
        <SidebarSwap />
      </div>

      {/* Quick stats */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-card bg-background-secondary border border-border p-3">
            <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Trades Today</p>
            <p className="text-base font-bold text-foreground mt-0.5">{status?.tradesToday ?? 0}</p>
          </div>
          <div className="rounded-card bg-background-secondary border border-border p-3">
            <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Positions</p>
            <p className="text-base font-bold text-foreground mt-0.5">{status?.positionCount ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Next run */}
      {status?.config.active && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between rounded-card bg-background-secondary border border-border p-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-foreground-muted" />
              <span className="text-xs text-foreground-muted">Next run</span>
            </div>
            <span className="text-xs font-medium text-foreground">{formatTimeUntil(status.config.nextRunAt)}</span>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent-text'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-secondary'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Agent toggle + Wallet */}
      <div className="px-4 pb-5 space-y-2">
        <button
          onClick={() => toggleAgent.mutate()}
          disabled={toggleAgent.isPending || !status}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-pill text-sm font-medium transition-colors border ${
            status?.config.active
              ? 'bg-success/10 text-success border-success/30 hover:bg-success/20'
              : 'bg-background-secondary text-foreground-muted border-border hover:text-foreground'
          } disabled:opacity-50`}
        >
          <Power size={14} />
          {status?.config.active ? 'Agent Running' : 'Agent Paused'}
        </button>
        <div className="[&_button]:!w-full">
          <ConnectButton
            client={client}
            wallets={wallets}
            chain={celo}
            theme={walletTheme}
            detailsButton={{ style: { ...detailsButtonStyle, width: '100%' } }}
            onDisconnect={() => {
              localStorage.removeItem('auth_token');
              sessionStorage.removeItem('onboarding_checked');
              window.location.href = '/';
            }}
          />
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-card/95 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[44px] min-h-[44px] justify-center rounded-lg transition-colors ${
                isActive
                  ? 'text-accent-text'
                  : 'text-foreground-muted hover:text-foreground-secondary'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({
  children,
  rightPanel,
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="md:hidden">
        <Header />
      </div>

      <div className="flex md:grid md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr_320px]">
        <SidebarNav />
        <main className="flex-1 min-h-screen overflow-y-auto">
          {children}
        </main>
        {rightPanel && (
          <aside className="hidden lg:block h-screen sticky top-0 border-l border-border overflow-y-auto">
            {rightPanel}
          </aside>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
