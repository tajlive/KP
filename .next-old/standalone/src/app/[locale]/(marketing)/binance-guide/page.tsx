import { BinanceGuideContent } from "./BinanceGuideContent";
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
    namespace: "binanceGuide",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "/binance-guide",
  });
}

export default async function BinanceGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <MarketingPageShell>
      <BinanceGuideContent locale={locale} />
    </MarketingPageShell>
  );
}
