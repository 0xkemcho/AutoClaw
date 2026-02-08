'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithAuth } from '@/lib/api';
import type { RiskProfile } from '@autoclaw/shared';
import { Spinner } from '@/components/ui/spinner';

const PROFILE_INFO: Record<
  RiskProfile,
  { badge: string; name: string; description: string }
> = {
  conservative: {
    badge: '🛡️',
    name: 'Conservative',
    description:
      'Stability-first approach — major currencies (USDm, EURm, CHFm) with a XAUT hedge.',
  },
  moderate: {
    badge: '⚖️',
    name: 'Moderate',
    description:
      'Balanced growth — diversified mix across currencies with moderate XAUT allocation.',
  },
  aggressive: {
    badge: '🚀',
    name: 'Aggressive',
    description:
      'Growth-oriented — broader exposure including emerging market stablecoins.',
  },
};

function SettingsContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    display_name: string | null;
    risk_profile: RiskProfile | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchWithAuth('/api/user/risk-profile', token)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex items-center justify-center pt-32">
        <Spinner size="lg" />
      </main>
    );
  }

  const info = profile?.risk_profile ? PROFILE_INFO[profile.risk_profile] : null;

  return (
    <main className="px-6 pt-10 pb-8">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>

        {profile?.display_name && (
          <p className="text-foreground-secondary">
            Welcome, {profile.display_name}
          </p>
        )}

        {info ? (
          <Card className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{info.badge}</span>
              <div>
                <h2 className="text-lg font-bold">{info.name}</h2>
                <p className="text-sm text-foreground-secondary">
                  {info.description}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="space-y-3">
            <p className="text-foreground-secondary">No risk profile yet.</p>
          </Card>
        )}

        <Button
          variant="secondary"
          onClick={() => router.push('/onboarding')}
        >
          {info ? 'Retake Risk Assessment' : 'Start Risk Assessment'}
        </Button>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <SettingsContent />
      </div>
    </ProtectedRoute>
  );
}
