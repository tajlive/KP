import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaperTradingPageClient } from "@/features/paper-trading/PaperTradingPageClient";

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

export const dynamic = "force-dynamic";

export default async function PaperTradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; view?: string }>;
}) {
  const { locale } = await params;
  const { mode = "paper", view } = await searchParams;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/paper-trading`);
  }
  
  // Hent sessions
  const { data: sessions } = await supabase
    .from("trading_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("mode", mode === "live" ? "live" : "paper")
    .order("created_at", { ascending: false });
  
  // Hent balance
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("paper_balance")
    .eq("id", user.id)
    .single();
  
  return (
    <PaperTradingPageClient
      sessions={(sessions || []) as any as SessionRow[]}
      balance={profile?.paper_balance || 100000}
      locale={locale}
      userId={user.id}
      listMode={mode === "live" ? "live" : "paper"}
      contextBannerText={mode === "live" ? "Live Trading" : "Paper Trading"}
    />
  );
}
