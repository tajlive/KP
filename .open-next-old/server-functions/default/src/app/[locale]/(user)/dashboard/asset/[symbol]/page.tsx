import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import nextDynamic from "next/dynamic";

const AssetDetailView = nextDynamic(() =>
  import("@/features/market/coinbase/AssetDetailView").then((mod) => mod.AssetDetailView),
);

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export default async function DashboardAssetPage({
  params,
}: {
  params: Promise<{ locale: string; symbol: string }>;
}) {
  const { locale, symbol } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/dashboard/asset/${symbol}`} />;
  }
  return <AssetDetailView symbol={symbol} />;
}
