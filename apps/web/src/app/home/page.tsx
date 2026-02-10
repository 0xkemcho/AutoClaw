'use client';

import { Header } from '@/components/header';
import { ProtectedRoute } from '@/components/protected-route';

function HomeContent() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center pt-32">
        <p className="text-foreground-muted text-lg">Something new is coming soon.</p>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
