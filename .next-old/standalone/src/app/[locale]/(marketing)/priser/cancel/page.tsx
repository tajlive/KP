import ClientPriserCancel from "./ClientPriserCancel";
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
    titleKey: "cancel.metadata.title",
    descriptionKey: "cancel.metadata.description",
    pathname: "/priser/cancel",
  });
}

export default async function PriserCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <MarketingPageShell className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <ClientPriserCancel />
    </MarketingPageShell>
  );
}
