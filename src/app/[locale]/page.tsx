import { setRequestLocale } from "next-intl/server";
import { SURFACE } from "@/lib/design/tokens";
import SanityHeroSection from "@/features/landing/SanityHeroSection";
import { LiveMarketStrip } from "@/features/landing/LiveMarketStrip";
import { DemoWidget } from "@/features/landing/DemoWidget";
import { TrustStrip } from "@/features/landing/TrustStrip";
import { FeaturesBentoGrid } from "@/features/landing/FeaturesBentoGrid";
import { ThreeSteps } from "@/features/landing/ThreeSteps";
import SanityFAQSection from "@/features/landing/SanityFAQSection";
import { StickyCTA } from "@/features/landing/StickyCTA";

import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateMarketingMetadata({
    locale,
    namespace: "landing",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "",
  });
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingPageShell className={SURFACE.BG_LIGHT}>
      <SanityHeroSection />
      <LiveMarketStrip />
      <DemoWidget />
      <TrustStrip />
      <FeaturesBentoGrid />
      <ThreeSteps />
      <SanityFAQSection />
      <StickyCTA />
    </MarketingPageShell>
  );
}
