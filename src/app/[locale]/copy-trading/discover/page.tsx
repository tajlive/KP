import { requireAuth } from "@/lib/auth-guard";
import { CopyTradingDiscoverClient } from "@/components/copy-trading/CopyTradingDiscoverClient";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "copyTrading.discover",
  });
  return {
    title: `${t("title")} | Klarpakke`,
    description: t("subtitle"),
  };
}

export default async function CopyTradingDiscoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale);

  return <CopyTradingDiscoverClient />;
}
