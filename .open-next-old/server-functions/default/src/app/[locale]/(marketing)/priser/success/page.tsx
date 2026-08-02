import ClientPriserSuccess from "./ClientPriserSuccess";
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
    titleKey: "success.metadata.title",
    descriptionKey: "success.metadata.description",
    pathname: "/priser/success",
  });
}

export default async function PriserSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <MarketingPageShell className="flex min-h-screen items-center justify-center bg-slate-950">
      <ClientPriserSuccess />
    </MarketingPageShell>
  );
}
