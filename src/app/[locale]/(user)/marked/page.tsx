import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { MarketView } from "@/features/market/MarketView";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// P2 (2026-08-10): tittelen var statisk "Marked" på alle språk.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "navigation" });
  return {
    title: t("market"),
    description: "Oversikt over markeder og watchlist",
  };
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);

  if (!user) {
    return <LoginRequired next={`/${locale}/marked`} />;
  }

  return <MarketView userId={user.id} />;
}
