import { requireAuth } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaperTradingList } from "@/components/paper-trading/PaperTradingList";
import type { ComponentProps } from "react";
import { AlertCircle, Wallet } from "lucide-react";
import Link from "next/link";
import { SURFACE, BRAND } from "@/lib/design/tokens";

type PaperTradingListSession = ComponentProps<typeof PaperTradingList>["sessions"][number];

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
    description: t("subtitle", { amount: "100 000" }),
  };
}

// Fallback UI for når datahenting feiler — samme stil som andre feilsider
function PaperTradingErrorFallback({ locale }: { locale: string }) {
  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT} dark:bg-slate-950 p-6`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-xl p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Kunne ikke laste lekepenger
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-6">
            Det oppstod en feil ved lasting av dine trading-sessions. Vennligst prøv igjen.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={`/${locale}/paper-trading`}
              className={`inline-flex items-center justify-center px-5 py-2.5 ${BRAND.primary} rounded-lg font-medium transition-colors`}
            >
              Last inn på nytt
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="inline-flex items-center justify-center px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
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
      .eq("id", user.id)
      .single();

    const balance = profile?.paper_balance ?? 100_000;

    return (
      <div className={`min-h-screen ${SURFACE.BG_LIGHT} dark:bg-slate-950`}>
        <div className="bg-linear-to-r from-emerald-500/15 to-blue-500/15 dark:from-emerald-500/10 dark:to-blue-500/10 border-b border-emerald-500/20 dark:border-emerald-500/30 px-4 py-3 flex items-center justify-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
          <p className="text-emerald-800 dark:text-emerald-200 text-sm font-medium text-center">
            {t("contextBanner")}
          </p>
        </div>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <PaperTradingList
            sessions={(sessions ?? []) as PaperTradingListSession[]}
            balance={balance}
            locale={locale}
            userId={user.id}
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
