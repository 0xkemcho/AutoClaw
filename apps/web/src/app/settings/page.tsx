'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { useAgentStatus } from '@/hooks/use-agent';
import { Spinner } from '@/components/ui/spinner';
import { SettingsForm } from '@/components/settings/settings-form';
import { AlertTriangle } from 'lucide-react';

function SettingsContent() {
  const { data, isLoading, isError } = useAgentStatus();

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (isError || !data?.config) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <AlertTriangle size={40} className="text-foreground-muted" />
          <h2 className="text-lg font-semibold text-foreground">
            Agent not configured
          </h2>
          <p className="text-foreground-muted text-sm text-center max-w-sm">
            Your trading agent has not been set up yet. Please complete
            onboarding first.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>
        <SettingsForm config={data.config} />
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
