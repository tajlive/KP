import PriserClient from "./PriserClient";
import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateMarketingMetadata({
    locale,
    namespace: "pricing",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "/priser",
  });
}

export default async function PriserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <MarketingPageShell>
      <PriserClient />
    </MarketingPageShell>
  );
}
