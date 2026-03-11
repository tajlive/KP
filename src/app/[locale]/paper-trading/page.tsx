import { requireAuth } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaperTradingList } from "@/components/paper-trading/PaperTradingList";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "paperTrading" });

  return {
    title: t("title"),
    description: t("subtitle", { amount: "1 000 000" }),
  };
}

export default async function PaperTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "paperTrading" });
  const { user } = await requireAuth(locale);

  const supabase = await createClient();

  // Hent alle paper trading sessions for brukeren
  const { data: sessions, error } = await supabase
    .from("trading_sessions")
    .select(
      "id, mode, status, trading_pair, strategy_id, current_capital_nok, starting_capital_nok, total_pnl, winning_trades, total_trades, created_at"
    )
    .eq("user_id", user.id)
    .eq("mode", "paper")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch trading sessions:", error);
  }

  // Hent user_profiles for saldo
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("paper_balance")
    .eq("user_id", user.id)
    .single();

  const balance = profile?.paper_balance || 10000;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3">
        <p className="text-blue-600 dark:text-blue-400 text-sm text-center">
          {t("contextBanner")}
        </p>
      </div>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <PaperTradingList 
          sessions={sessions || []} 
          balance={balance}
          locale={locale}
        />
      </main>
    </div>
  );
}
