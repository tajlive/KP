import { requireAuth } from "@/lib/auth-guard";
import { localizedPathname } from "@/middleware/locale-path";
import { AssetDetailView } from "@/components/coinbase/AssetDetailView";

export const dynamic = "force-dynamic";

export default async function DashboardAssetPage({
  params,
}: {
  params: Promise<{ locale: string; symbol: string }>;
}) {
  const { locale, symbol } = await params;
  await requireAuth(
    locale,
    localizedPathname(locale, `/dashboard/asset/${symbol}`),
  );
  return <AssetDetailView symbol={symbol} />;
}
