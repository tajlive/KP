import OmOssClient from "./OmOssClient";
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
    namespace: "about",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "/om-oss",
  });
}

export default async function OmOssPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <MarketingPageShell>
      <OmOssClient />
    </MarketingPageShell>
  );
}
