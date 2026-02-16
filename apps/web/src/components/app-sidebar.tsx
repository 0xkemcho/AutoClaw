'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TrendingUp, Sprout, ArrowLeftRight, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { SidebarPortfolio } from '@/components/sidebar-portfolio';

const WalletConnect = dynamic(
  () => import('@/components/wallet-connect').then((m) => m.WalletConnect),
  { ssr: false },
);

// Menu items.
const items = [
  {
    title: 'Overview',
    url: '/overview',
    icon: LayoutDashboard,
  },
  {
    title: 'FX Agent',
    url: '/fx-agent',
    icon: TrendingUp,
  },
  {
    title: 'Yield Agent',
    url: '/yield-agent',
    icon: Sprout,
  },
  {
    title: 'Swap',
    url: '/swap',
    icon: ArrowLeftRight,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Link href="/overview" aria-label="AutoClaw home">
            <div className="group-data-[collapsible=icon]:hidden">
              <Logo size="sm" showWordmark={true} className="text-white" />
            </div>
            <div className="hidden group-data-[collapsible=icon]:block">
              <Logo size="sm" showWordmark={false} className="text-white" />
            </div>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarPortfolio />
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                    tooltip={item.title}
                    size="lg"
                    className="h-12"
                  >
                    <Link
                      href={item.url}
                      onClick={() => setOpenMobile(false)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 py-2">
        <div className="w-full [&>button]:w-full [&>button]:px-3">
          <WalletConnect />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
