import { requireAuth } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PaperTradingSessionDetail } from "@/components/paper-trading/PaperTradingSessionDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; session_id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "paperTrading" });

  return {
    title: `${t("title")} - Session`,
  };
}

export default async function PaperTradingSessionPage({
  params,
}: {
  params: Promise<{ locale: string; session_id: string }>;
}) {
  const { locale, session_id } = await params;
  const { user } = await requireAuth(locale);

  const supabase = await createClient();

  // Hent trading session med eiersjekk
  const { data: session, error: sessionError } = await supabase
    .from("trading_sessions")
    .select(
      "id, mode, status, trading_pair, strategy_id, current_capital_nok, starting_capital_nok, total_pnl, winning_trades, total_trades, created_at"
    )
    .eq("id", session_id)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    console.error("Session not found or access denied:", sessionError);
    notFound();
  }

  // Hent trades for denne session
  const { data: trades, error: tradesError } = await supabase
    .from("trades")
    .select("id, side, amount, price, profit_loss, created_at")
    .eq("session_id", session_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (tradesError) {
    console.error("Failed to fetch trades:", tradesError);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3">
        <p className="text-blue-600 dark:text-blue-400 text-sm text-center">
          {t("contextBanner")}
        </p>
      </div>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <PaperTradingSessionDetail
          session={session}
          trades={trades || []}
          locale={locale}
        />
      </main>
    </div>
  );
}
