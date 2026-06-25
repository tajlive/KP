import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import nextDynamic from "next/dynamic";

const TradeHub = nextDynamic(() =>
  import("@/features/market/coinbase/TradeHub").then((mod) => mod.TradeHub),
);

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export default async function DashboardTradePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/dashboard/trade`} />;
  }

  const initialMode = query?.mode === "live" ? "live" : "paper";
  return <TradeHub userId={user.id} initialMode={initialMode} />;
}
