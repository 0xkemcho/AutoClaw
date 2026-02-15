import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  ArrowLeftRight,
  Settings,
  HelpCircle,
  Sparkles,
  Bell,
  Search,
} from 'lucide-react';
import { Logo } from '@/components/logo';

export function DashboardMockup() {
  return (
    <section className="relative px-6 pb-24">
      {/* Horizontal glow line */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[1px] w-[80%] max-w-5xl -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <Logo size="sm" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Trading / Dashboard</span>
          </div>
          <div className="text-sm font-medium">Main Dashboard</div>
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Search</span>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-52 shrink-0 border-r border-white/[0.06] p-4 md:block">
            <nav className="space-y-1">
              {[
                { icon: LayoutDashboard, label: 'Dashboard', active: true },
                { icon: Wallet, label: 'Assets', active: false },
                { icon: BarChart3, label: 'Market', badge: 'New', active: false },
                { icon: ArrowLeftRight, label: 'Trade', active: false },
                { icon: Settings, label: 'Settings', active: false },
                { icon: HelpCircle, label: 'Support', active: false },
              ].map(({ icon: Icon, label, active, badge }) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    active
                      ? 'bg-white/[0.06] text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {badge && (
                    <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {badge}
                    </span>
                  )}
                </div>
              ))}
            </nav>
            <div className="mt-8 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">Unlock AutoClaw AI</p>
                  <p className="text-[10px] text-muted-foreground">
                    Your personal FX assistant
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              {/* Balance chart */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="mt-1 text-3xl font-bold">
                      $22,193.05{' '}
                      <span className="text-sm font-normal text-emerald-400">
                        +47.3%
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {['1D', '7D', '1M', '1Y'].map((period, i) => (
                      <button
                        key={period}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          i === 3
                            ? 'bg-white/10 text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Chart placeholder */}
                <div className="mt-6 h-40">
                  <svg
                    viewBox="0 0 500 120"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="chartGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="oklch(0.78 0.16 75)"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.78 0.16 75)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,100 Q50,90 100,80 T200,70 T300,50 T400,40 T500,20"
                      fill="none"
                      stroke="oklch(0.78 0.16 75)"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,100 Q50,90 100,80 T200,70 T300,50 T400,40 T500,20 L500,120 L0,120 Z"
                      fill="url(#chartGrad)"
                    />
                  </svg>
                </div>
              </div>

              {/* Quick swap */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-lg font-semibold">Quick swap</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-mono">0.00181682</span>
                      <span className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400">
                        USDm
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Balance: 500 USDm
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <div className="rounded-full border border-white/[0.06] p-1.5">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-mono">193.4604</span>
                      <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                        EURm
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Balance: 200 EURm
                    </p>
                  </div>
                </div>
                <button className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-white/[0.06] py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.04]">
                  Visualize swap
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom row */}
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
              {/* Assets table */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-lg font-semibold">Assets</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left text-xs text-muted-foreground">
                        <th className="pb-2 font-normal">Name</th>
                        <th className="pb-2 font-normal">Quantity</th>
                        <th className="pb-2 font-normal">Price</th>
                        <th className="pb-2 font-normal">Value</th>
                        <th className="pb-2 font-normal text-right">+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'USDm', qty: '10,000', price: '$1.00', value: '$10,000', change: '+$42.00', up: true },
                        { name: 'EURm', qty: '5,000', price: '$1.08', value: '$5,400', change: '+$135.00', up: true },
                        { name: 'BRLm', qty: '8,000', price: '$0.19', value: '$1,520', change: '-$12.00', up: false },
                      ].map((row) => (
                        <tr
                          key={row.name}
                          className="border-b border-white/[0.04]"
                        >
                          <td className="py-2.5 font-medium">{row.name}</td>
                          <td className="py-2.5 text-muted-foreground">
                            {row.qty}
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {row.price}
                          </td>
                          <td className="py-2.5">{row.value}</td>
                          <td
                            className={`py-2.5 text-right ${
                              row.up ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {row.change}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Repartition donut placeholder */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-lg font-semibold">Repartition</p>
                <div className="mt-4 flex items-center justify-center">
                  <svg
                    viewBox="0 0 120 120"
                    className="h-28 w-28"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="oklch(0.78 0.16 75 / 0.6)"
                      strokeWidth="12"
                      strokeDasharray="180 134"
                      strokeDashoffset="0"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="oklch(0.65 0.18 250 / 0.5)"
                      strokeWidth="12"
                      strokeDasharray="100 214"
                      strokeDashoffset="-180"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="oklch(0.77 0.17 162 / 0.5)"
                      strokeWidth="12"
                      strokeDasharray="34 280"
                      strokeDashoffset="-280"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                </div>
                <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    USDm
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    EURm
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    BRLm
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom tabs */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {['Recent transactions', 'Market', 'Articles'].map((tab) => (
                <div
                  key={tab}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
                >
                  <p className="text-sm font-medium">{tab}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
