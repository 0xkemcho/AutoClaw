'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { AgentStatusBar } from '@/components/dashboard/agent-status-bar';
import { TimelineFeed } from '@/components/dashboard/timeline-feed';
import { ActivitiesPanel } from '@/components/activities-panel';

function DashboardContent() {
  return (
    <AppShell rightPanel={<ActivitiesPanel />}>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <AgentStatusBar />
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
