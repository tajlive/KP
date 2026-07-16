import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { createClient } from "@/lib/supabase/server";
import { JokerTradeLanding } from "@/features/jokertrade/JokerTradeLanding";
import { JokerTradeClient } from "@/features/jokertrade/JokerTradeClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "JokerTrade™ | AI-drevet trading ",
  description:
    "Din personlige AI-trader som jobber mens du sover. Automatisk analyse, intelligente signaler — null stress. Start gratis med 100 000 kr i lekepenger.",
};

export default async function JokerTradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let user=null
try:{const a=await requireAuth(locale);user=a.user}catch{}

  // Hvis ikke innlogget: vis kun landing-siden (hero + marketing)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0B0D]">
        <JokerTradeLanding />
      </div>
    );
  }

  // Hvis innlogget: vis landing + trading dashboard
  let initialData: unknown;

  try {
    const db: unknown = createClient();

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
      .maybeSingle();

    const { data: openPositions } = await db
      .from("trades")
      .select("id, trading_pair, side, quantity, price, realized_pnl, executed_at")
      .eq("user_id", user.id)
      .is("binance_order_id", null)
      .order("executed_at", { ascending: false })
      .limit(3);

    const { data: tradeHistory } = await db
      .from("trades")
      .select("id, trading_pair, side, quantity, price, realized_pnl, executed_at")
      .eq("user_id", user.id)
      .not("binance_order_id", "is", null)
      .order("executed_at", { ascending: false })
      .limit(10);

    const positions = (openPositions ?? []).map((t: unknown) => ({
      ...t,
      symbol: t.trading_pair,
      pnl: t.realized_pnl ?? 0,
      pnl_percent: 0,
      current_price: t.price,
      created_at: t.executed_at,
      stop_loss: null,
      take_profit: null,
    }));

    const history = (tradeHistory ?? []).map((t: unknown) => ({
      ...t,
      symbol: t.trading_pair,
      pnl: t.realized_pnl ?? 0,
      pnl_percent: 0,
      closed_at: t.executed_at,
      created_at: t.executed_at,
    }));

    initialData = {
      status: "active" as const,
      insight: latestInsight ?? null,
      mode: (profile?.preferred_trading_mode === "live" ? "live" : "paper") as "paper" | "live",
      positions,
      history,
    };
  } catch (error) {
    console.error("[JokerTrade] SSR-feil:", error);
    initialData = {
      status: "active",
      insight: null,
      mode: "paper",
      positions: [],
      history: [],
    };
  }

  return (
    <div className="min-h-screen bg-[#0A0B0D]">
      <JokerTradeLanding />
      {/* Trading dashboard for innloggede brukere */}
      <div className="border-t border-[#2A2D35]">
        <JokerTradeClient initialData={initialData} />
      </div>
    </div>
  );
}
