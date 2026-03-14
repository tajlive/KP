import { requireAuth } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaperTradingList } from "@/components/paper-trading/PaperTradingList";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

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

// Fallback UI for når datahenting feiler
function PaperTradingErrorFallback({ locale }: { locale: string }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Kunne ikke laste paper trading
          </h2>
          <p className="text-red-700 dark:text-red-300/80 mb-4">
            Det oppstod en feil ved lasting av dine trading-sessions. Vennligst prøv igjen.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/${locale}/paper-trading`}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Last inn på nytt
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Tilbake til dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PaperTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  try {
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
      .eq("user_id" as unknown, user.id)
      .single() as unknown;

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
            sessions={(sessions as unknown) || []} 
            balance={balance}
            locale={locale}
          />
        </main>
      </div>
    );
  } catch (error) {
    console.error('Paper trading page error:', error);
    // Return fallback UI istedenfor å krasje
    return <PaperTradingErrorFallback locale={locale} />;
  }
}
