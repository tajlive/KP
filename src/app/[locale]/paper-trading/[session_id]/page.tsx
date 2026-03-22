import { requireAuth } from "@/lib/auth-guard";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PaperTradingSessionDetail } from "@/components/paper-trading/PaperTradingSessionDetail";
import type { ComponentProps } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { SURFACE } from "@/lib/design/tokens";

type SessionDetailProps = ComponentProps<typeof PaperTradingSessionDetail>;

export const dynamic = "force-dynamic";

/**
 * Bruk alltid requireAuth().supabase for brukerdata her — ikke createClient() fra
 * @/lib/supabase/server (service role). Service role skjuler RLS-problemer og har
 * tidligere gitt feil der handler ikke syntes for innlogget bruker.
 */

// Fallback UI for når datahenting feiler
function SessionErrorFallback({ locale }: { locale: string }) {
  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT} dark:${SURFACE.BG} p-6`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/50 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Kunne ikke laste trading-session
          </h2>
          <p className="text-red-700 dark:text-red-300/80 mb-4">
            Det oppstod en feil ved lasting av din trading-session. Vennligst
            prøv igjen.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/${locale}/paper-trading`}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Tilbake til lekepenger
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; session_id: string }>;
}): Promise<Metadata> {
  try {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "paperTrading" });

    return {
      title: `${t("title")} - Session`,
    };
  } catch (error) {
    console.error("Session metadata error:", error);
    return {
      title: "Paper Trading Session",
    };
  }
}

export default async function PaperTradingSessionPage({
  params,
}: {
  params: Promise<{ locale: string; session_id: string }>;
}) {
  try {
    const { locale, session_id } = await params;
    const { user, supabase } = await requireAuth(locale);

    // Hent trading session med eiersjekk
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select(
        "id, mode, status, trading_pair, strategy_id, current_capital_nok, starting_capital_nok, total_pnl, winning_trades, total_trades, created_at",
      )
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      console.error("Session not found or access denied:", sessionError);
      notFound();
    }

    // Tier + trial for client-side live-session gate
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier, trial_started_at")
      .eq("id", user.id)
      .maybeSingle();
    const userTier = (profile as { tier?: string } | null)?.tier ?? "student";
    const trialStartedAt =
      (profile as { trial_started_at?: string } | null)?.trial_started_at ??
      null;

    // Hent trades for denne session
    const { data: trades, error: tradesError } = await supabase
      .from("trades")
      .select(
        "id, side, quantity, price, realized_pnl, created_at, total_value, executed_at",
      )
      .eq("session_id", session_id)
      .order("executed_at", { ascending: false })
      .limit(50);

    if (tradesError) {
      console.error("Failed to fetch trades:", tradesError);
    }

    return (
      <div className={`min-h-screen ${SURFACE.BG_LIGHT} dark:${SURFACE.BG}`}>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <PaperTradingSessionDetail
            session={session as SessionDetailProps["session"]}
            trades={(trades ?? []) as unknown as SessionDetailProps["trades"]}
            locale={locale}
            userTier={userTier}
            trialStartedAt={trialStartedAt}
          />
        </main>
      </div>
    );
  } catch (error) {
    console.error("Paper trading session page error:", error);
    const { locale } = await params;
    // Return fallback UI istedenfor å krasje
    return <SessionErrorFallback locale={locale} />;
  }
}
