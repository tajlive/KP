import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { CopyTradingDiscoverClient } from "@/features/copy-trading/CopyTradingDiscoverClient";
import { getTranslations } from "next-intl/server";

export const runtime = 'edge';

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
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/copy-trading/discover`} />;
  }

  return <CopyTradingDiscoverClient />;
}
