import ClientKalkulator from "./ClientKalkulator";
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
    namespace: "calculator",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "/kalkulator",
  });
}

export default async function KalkulatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <MarketingPageShell>
      <ClientKalkulator />
    </MarketingPageShell>
  );
}
