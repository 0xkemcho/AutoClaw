'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { AgentStatusBar } from '@/components/dashboard/agent-status-bar';
import { PortfolioCard } from '@/components/dashboard/portfolio-card';
import { TimelineFeed } from '@/components/dashboard/timeline-feed';

function DashboardContent() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <AgentStatusBar />
        <div className="md:hidden mt-4">
          <PortfolioCard />
        </div>
        <div className="mt-6">
          <TimelineFeed />
        </div>
      </div>
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
