import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { JokerTradeClient } from "@/features/jokertrade/JokerTradeClient";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "JokerTrade | Klarpakke",
  description:
    "AI-drevet trading med Joker-modus — la Hermes finne de beste trade-signalene",
};

export default async function JokerTradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/jokertrade`} />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = createClient();

  // market_intelligence og trades opprettes via migrasjon —
  // bruker `any`-client til types er regenerert
  const { data: latestInsight } = await db
    .from("market_intelligence")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: profile } = await db
    .from("user_profiles")
    .select("preferred_trading_mode")
    .eq("id", user.id)
    .single();

  const { data: openPositions } = await db
    .from("trades")
    .select(
      "id, symbol, side, quantity, price, current_price, pnl, pnl_percent, stop_loss, take_profit, created_at",
    )
    .eq("user_id", user.id)
    .is("closed_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: tradeHistory } = await db
    .from("trades")
    .select(
      "id, symbol, side, quantity, price, pnl, pnl_percent, closed_at, created_at",
    )
    .eq("user_id", user.id)
    .not("closed_at", "is", null)
    .order("closed_at", { ascending: false })
    .limit(10);

  const initialData = {
    status: "active" as const,
    insight: latestInsight ?? null,
    mode: (profile?.preferred_trading_mode === "live" ? "live" : "paper") as "paper" | "live",
    positions: openPositions ?? [],
    history: tradeHistory ?? [],
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D]">
      <JokerTradeClient initialData={initialData} />
    </div>
  );
}
