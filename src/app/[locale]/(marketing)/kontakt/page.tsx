import ClientKontakt from "./ClientKontakt";
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
    namespace: "metadata",
    titleKey: "contact.title",
    descriptionKey: "contact.description",
    pathname: "/kontakt",
  });
}

export default async function KontaktPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <MarketingPageShell
      locale={locale}
      namespace="metadata"
      titleKey="contact.title"
      descriptionKey="contact.description"
    >
      <ClientKontakt />
    </MarketingPageShell>
  );
}
