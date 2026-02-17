import { HeroSection } from './_components/hero-section';
import { DashboardMockup } from './_components/dashboard-mockup';
import { TaglineBanner } from './_components/tagline-banner';
import { FeaturesSection } from './_components/features-section';
import { CryptosSection } from './_components/cryptos-section';
import { HowItWorks } from './_components/how-it-works';
import { Testimonials } from './_components/testimonials';
import { FaqSection } from './_components/faq-section';
import { CtaSection } from './_components/cta-section';
import { LandingPageClient } from './_components/landing-page-client';

export const dynamic = 'force-static';

export default function LandingPage() {
  return (
    <LandingPageClient>
      <HeroSection />
      <DashboardMockup />
      <TaglineBanner />
      <FeaturesSection />
      <CryptosSection />
      <HowItWorks />
      <Testimonials />
      <FaqSection />
      <CtaSection />
    </LandingPageClient>
  );
}
