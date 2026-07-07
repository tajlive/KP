import ClientKontakt from "./ClientKontakt";
import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateMarketingMetadata({
    locale,
    namespace: "contact",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "/kontakt",
  });
}

export default async function KontaktPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <MarketingPageShell>
      <ClientKontakt />
    </MarketingPageShell>
  );
}
