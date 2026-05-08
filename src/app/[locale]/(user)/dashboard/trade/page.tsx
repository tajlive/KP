import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { TradeHub } from "@/features/coinbase/TradeHub";

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
