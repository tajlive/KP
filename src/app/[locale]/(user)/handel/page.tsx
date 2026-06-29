import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { PaperTradingPageClient } from "@/features/trading/paper/PaperTradingPageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TODO: Denne ruten overlapper med /dashboard/auto-trade. Vurder å slå sammen eller
// tydeliggjøre skillet mellom handelsarbeidsområdet og auto-trade-oppsettet.

type SessionRow = {
  id: string;
  mode: "paper" | "live";
  status: "active" | "paused" | "stopped" | "crashed";
  trading_pair: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  winning_trades: number;
  total_trades: number;
  created_at: string;
};

export default async function TradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; view?: string }>;
}) {
  const { locale } = await params;
  const { mode = "paper", view = "" } = await searchParams;
  const isLiveMode = mode === "live";

  const { supabase, user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/handel`} />;
  }

  // Hent sessions
  const { data: sessions } = await supabase
    .from("trading_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("mode", isLiveMode ? "live" : "paper")
    .order("created_at", { ascending: false });

  // Hent balance
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("paper_balance")
    .eq("id", user.id)
    .single();

  return (
    <PaperTradingPageClient
      sessions={(sessions || []) as unknown as SessionRow[]}
      balance={profile?.paper_balance ?? 0}
      locale={locale}
      userId={user.id}
      listMode={isLiveMode ? "live" : "paper"}
      view={view}
      mode={mode}
    />
  );
}
