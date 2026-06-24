import { HelpClient } from "./HelpClient";
import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

export const dynamic = "force-dynamic"; // Was: revalidate = 86400

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateMarketingMetadata({
    locale,
    namespace: "help",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "/hjelp",
  });
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <MarketingPageShell>
      <HelpClient />
    </MarketingPageShell>
  );
}
