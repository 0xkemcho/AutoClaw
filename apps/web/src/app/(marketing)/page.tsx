'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { HeroSection } from './_components/hero-section';
import { DashboardMockup } from './_components/dashboard-mockup';
import { TaglineBanner } from './_components/tagline-banner';
import { FeaturesSection } from './_components/features-section';
import { CryptosSection } from './_components/cryptos-section';
import { HowItWorks } from './_components/how-it-works';
import { FaqSection } from './_components/faq-section';
import { CtaSection } from './_components/cta-section';

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/overview');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return null;
  if (isAuthenticated) return null;

  return (
    <>
      <HeroSection />
      <DashboardMockup />
      <TaglineBanner />
      <FeaturesSection />
      <CryptosSection />
      <HowItWorks />
      <FaqSection />
      <CtaSection />
    </>
  );
}
