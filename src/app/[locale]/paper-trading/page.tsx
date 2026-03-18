import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaperTradingPageClient } from "@/components/paper-trading/PaperTradingPageClient";
import type { ComponentProps } from "react";
import { AlertCircle, Wallet, TrendingUp } from "lucide-react";
import Link from "next/link";
import { SURFACE, BRAND } from "@/lib/design/tokens";
import { PaperTradingList } from "@/components/paper-trading/PaperTradingList";

type PaperTradingListSession = ComponentProps<
  typeof PaperTradingList
>["sessions"][number];

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
            Det oppstod en feil ved lasting av dine trading-sessions. Vennligst
            prøv igjen.
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

/** Offentlig teaser for uinnloggede — /paper-trading er ubeskyttet */
function PaperTradingPublicTeaser({ locale }: { locale: string }) {
  const isNo = locale === "no";
  return (
    <div
      className={`min-h-screen ${SURFACE.BG_LIGHT} dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-12`}
    >
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 dark:bg-emerald-400/20 flex items-center justify-center mx-auto">
          <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {isNo
            ? "Øv trading med 100 000 kr lekepenger"
            : "Practice trading with 100,000 kr virtual money"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {isNo
            ? "Ingen ekte penger. Full tilgang til BTC, ETH, SOL og mer. Logg inn for å starte."
            : "No real money. Full access to BTC, ETH, SOL and more. Log in to get started."}
        </p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link
            href={`/${locale}/innlogging?next=/${locale}/paper-trading`}
            className={`inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white ${BRAND.primary} transition-opacity hover:opacity-90`}
          >
            {isNo ? "Logg inn" : "Log in"}
          </Link>
          <Link
            href={`/${locale}/signup?redirect=/${locale}/paper-trading`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isNo ? "Opprett konto" : "Create account"}
          </Link>
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
  const t = await getTranslations({ locale, namespace: "paperTrading" });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PaperTradingPublicTeaser locale={locale} />;
  }

  try {
    const { data: sessions, error } = await supabase
      .from("trading_sessions")
      .select(
        "id, mode, status, trading_pair, strategy_id, current_capital_nok, starting_capital_nok, total_pnl, winning_trades, total_trades, created_at",
      )
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch trading sessions:", error);
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("paper_balance")
      .eq("id", user.id)
      .single();

    const balance = profile?.paper_balance ?? 100_000;
    const contextBannerText = t("contextBanner");

    return (
      <PaperTradingPageClient
        sessions={(sessions ?? []) as PaperTradingListSession[]}
        balance={balance}
        locale={locale}
        userId={user.id}
        contextBannerText={contextBannerText}
      />
    );
  } catch (error) {
    console.error("Paper trading page error:", error);
    return <PaperTradingErrorFallback locale={locale} />;
  }
}
