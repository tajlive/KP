import { setRequestLocale } from "next-intl/server";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CTASection from "@/components/landing/CTASection";
import LiveMarketTicker from "@/components/landing/LiveMarketTicker";
import { TradingModesExplainer } from "@/components/landing/TradingModesExplainer";
import { generateMarketingMetadata } from "@/shared/ui/marketing";

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
    <main>
      <HeroSection rightColumn={<LiveMarketTicker />}>
      </HeroSection>
      <FeaturesSection />
      <TradingModesExplainer />
      <CTASection />
    </main>
  );
}
