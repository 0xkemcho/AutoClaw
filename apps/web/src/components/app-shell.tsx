'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Sliders, Clock, Power, LogOut } from 'lucide-react';
import { useDisconnect, useActiveWallet } from 'thirdweb/react';
import { useAgentStatus, useToggleAgent, usePortfolio } from '@/hooks/use-agent';
import { Header } from '@/components/header';

const NAV_ITEMS = [
  { href: '/home', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Sliders },
  { href: '/history', label: 'History', icon: Clock },
] as const;

function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: status } = useAgentStatus();
  const { data: portfolio } = usePortfolio();
  const toggleAgent = useToggleAgent();
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();

  const totalValue = portfolio?.totalValueUsd ?? 0;

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    if (wallet) disconnect(wallet);
    router.push('/');
  };

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 bg-background-card border-r border-border">
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
          <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Portfolio</p>
          <p className="text-xl font-bold text-foreground">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {portfolio && portfolio.holdings.length > 0 && (
            <p className="text-xs text-foreground-muted mt-1">
              {portfolio.holdings.length} position{portfolio.holdings.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

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

      {/* Agent toggle + Logout */}
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
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-pill text-sm font-medium text-foreground-muted hover:text-error transition-colors"
        >
          <LogOut size={14} />
          Log out
        </button>
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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="md:hidden">
        <Header />
      </div>

      <div className="flex">
        <SidebarNav />
        <main className="flex-1 min-h-screen md:overflow-y-auto">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
