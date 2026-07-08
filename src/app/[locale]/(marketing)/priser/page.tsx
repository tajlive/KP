export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { PriserContent } from "./PriserContent";
import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";
import { shouldShowVippsForRequest } from "@/lib/geo/vipps-region";

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
  const { locale } = await params;
  const hdrs = await headers();
  const showVipps = shouldShowVippsForRequest(hdrs);

  return (
    <MarketingPageShell>
      <PriserContent locale={locale} showVipps={showVipps} />
    </MarketingPageShell>
  );
}
