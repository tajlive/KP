export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { localizedPathname } from "@/middleware/locale-path";
import { Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { PositionLotsCard } from "@/features/dashboard/PositionLotsCard";
import { SessionCards } from "@/features/dashboard/SessionCards";
import type { SessionCardData } from "@/features/dashboard/SessionCards";
import { RestartTradingButton } from "@/features/dashboard/RestartTradingButton";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { formatNOK } from "@/lib/format/currency";

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Fallback UI for når datahenting feiler
function PortfolioErrorFallback({ locale, errorDetail }: { locale: string; errorDetail?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Kunne ikke laste portefølje
          </h2>
          <p className="text-red-600 dark:text-red-300/80 mb-4">
            Det oppstod en feil ved lasting av din portefølje. Vennligst prøv
            igjen.
          </p>
          {errorDetail && (
            <pre className="text-xs text-red-500 dark:text-red-400/60 bg-red-100 dark:bg-red-950/50 rounded p-3 mb-4 overflow-auto max-h-40 text-left">
              {errorDetail}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <Link
              href={`/${locale}/dashboard/portfolio`}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Last inn på nytt
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg transition-colors"
            >
              Tilbake til dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PortfolioPage({ params }: PageProps) {
  const errorLog: string[] = [];
  let locale = "no";

  try {
    const { locale: l } = await params;
    locale = l;
    const t = await getTranslations("dashboard.portfolioPage");

    const { supabase, user } = await requireAuth(locale);
    if (!user) {
      return <LoginRequired next={`/${locale}/dashboard/portfolio`} />;
    }

    // Fetch wallets, portfolios, trading sessions, AND user profile
    // Each query is wrapped individually so one failure doesn't break everything
    let wallets: { id: string; currency: string; balance: number }[] | null = null;
    let portfolios: { id: string; name: string | null; current_balance: number | null; initial_balance: number | null } | null = null;
    let sessions: SessionCardData[] | null = null;
    let profile: { paper_balance: number | null } | null = null;

    // Query 1: Wallets
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("id, currency, balance")
        .eq("user_id", user.id)
        .gt("balance", 0);
      if (error) {
        errorLog.push(`Wallets query error: ${error.message} (${error.code})`);
      } else {
        wallets = data;
      }
    } catch (e) {
      errorLog.push(`Wallets query exception: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Query 2: Portfolios (latest only)
    try {
      const { data, error } = await supabase
        .from("portfolios")
        .select("id, name, current_balance, initial_balance")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        errorLog.push(`Portfolios query error: ${error.message} (${error.code})`);
      } else {
        portfolios = data;
      }
    } catch (e) {
      errorLog.push(`Portfolios query exception: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Query 3: Trading sessions (active + stopped for capital calc)
    try {
      const { data, error } = await supabase
        .from("trading_sessions")
        .select(
          "id, trading_pair, current_capital_nok, starting_capital_nok, status, mode, strategy_id, total_trades, winning_trades, losing_trades, total_pnl, created_at, stopped_at, open_position",
        )
        .eq("user_id", user.id)
        .is("archived", false)
        .in("status", ["active", "stopped", "crashed"])
        .order("started_at", { ascending: false });
      if (error) {
        errorLog.push(`Sessions query error: ${error.message} (${error.code})`);
      } else {
        sessions = (data || []).map((s) => ({
          ...s,
          current_capital_nok: Number(s.current_capital_nok ?? 0),
          starting_capital_nok: Number(s.starting_capital_nok ?? 0),
          total_pnl: Number(s.current_capital_nok ?? 0) - Number(s.starting_capital_nok ?? 0),
          total_trades: Number(s.total_trades ?? 0),
          winning_trades: Number(s.winning_trades ?? 0),
          losing_trades: Number(s.losing_trades ?? 0),
          open_position: s.open_position as Record<string, unknown> | null,
        }));
      }
    } catch (e) {
      errorLog.push(`Sessions query exception: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Query 4: User profile (paper_balance)
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("paper_balance")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        errorLog.push(`Profile query error: ${error.message} (${error.code})`);
      } else {
        profile = data;
      }
    } catch (e) {
      errorLog.push(`Profile query exception: ${e instanceof Error ? e.message : String(e)}`);
    }

    // If ALL queries failed, show error
    if (errorLog.length >= 4) {
      console.error("[portfolio] All queries failed:", errorLog.join("\n"));
      return (
        <PortfolioErrorFallback
          locale={locale}
          errorDetail={["All queries failed:", ...errorLog].join("\n")}
        />
      );
    }

    // Calculate total capital from trading sessions (SAME as dashboard)
    const totalCapital = (sessions ?? []).reduce(
      (sum, s) => sum + Number(s.current_capital_nok ?? 0),
      0,
    );
    const totalStarting = (sessions ?? []).reduce(
      (sum, s) => sum + Number(s.starting_capital_nok ?? 0),
      0,
    );
    const totalReturn = totalStarting > 0
      ? ((totalCapital - totalStarting) / totalStarting) * 100
      : 0;

    // Session breakdown for restart button
    const activeSessions = (sessions ?? []).filter((s) => s.status === "active");
    const stoppedSessions = (sessions ?? []).filter((s) => s.status === "stopped");
    const crashedSessions = (sessions ?? []).filter((s) => s.status === "crashed");

    // Derive display assets.
    // PRIMARY: Total capital from all trading sessions (matches /dashboard)
    // SECONDARY: Wallet balance as "available cash" (tilgjengelig)
    const hasSessions = sessions && sessions.length > 0;
    const hasWallets = wallets && wallets.length > 0;
    const walletBalance = hasWallets ? Number(wallets![0].balance ?? 0) : 0;

    const displayAssets: Array<{
      id: string;
      currency: string;
      balance: number;
      type: "total" | "wallet" | "portfolio";
      label?: string;
    }> = [];

    if (hasSessions && totalCapital > 0) {
      displayAssets.push({
        type: "total",
        id: "total-capital",
        currency: t("totalPortfolio"),
        balance: totalCapital,
        label: totalReturn >= 0 ? `+${totalReturn.toFixed(2)}%` : `${totalReturn.toFixed(2)}%`,
      });
    }

    if (hasWallets && walletBalance > 0) {
      displayAssets.push({
        type: "wallet",
        id: wallets![0].id,
        currency: wallets![0].currency,
        balance: walletBalance,
        label: t("available"),
      });
    }

    if (displayAssets.length === 0 && portfolios) {
      const paperBalance = Number(profile?.paper_balance ?? 0);
      displayAssets.push({
        type: "portfolio",
        id: portfolios.id,
        currency: portfolios.name || "NOK",
        balance: paperBalance > 0 ? paperBalance : Number(portfolios.current_balance || portfolios.initial_balance || 0),
      });
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t("title")}</h1>
            <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-600/10 rounded-xl border border-blue-200 dark:border-blue-600/20">
            <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">
              {t("totalAssets", { count: wallets?.length || 0 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {displayAssets.map((asset) => (
            <div
              key={asset.id}
              className={`rounded-2xl p-6 flex items-center justify-between transition-all group ${
                asset.type === "total"
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 hover:border-blue-300 dark:hover:border-blue-600/40"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  asset.type === "total"
                    ? "bg-blue-100 dark:bg-blue-800/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-600/30"
                    : "bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-600/20"
                }`}>
                  <Wallet className={`w-6 h-6 ${
                    asset.type === "total" ? "text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-500"
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {asset.currency}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">
                    {asset.label || t("mainHolding")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatNOK(asset.balance, { fractionDigits: 2 })}
                </p>
                <p className="text-slate-500 dark:text-slate-500 text-xs font-medium">
                  {asset.type === "total" ? t("totalValue") : t("balance")}
                </p>
              </div>
            </div>
          ))}

          {displayAssets.length === 0 && (
            <div className="text-center p-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-slate-500 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t("noAssets.title")}
              </h3>
              <p className="text-slate-500 dark:text-slate-500 max-w-xs mx-auto mb-6">
                {t("noAssets.description")}
              </p>
              <a
                href={`/${locale}/paper-trading?mode=live`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
              >
                {t("noAssets.button")}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Restart button if all sessions are stopped/crashed */}
        {stoppedSessions.length + crashedSessions.length > 0 && activeSessions.length === 0 && (
          <RestartTradingButton
            locale={locale}
            stoppedCount={stoppedSessions.length}
            crashedCount={crashedSessions.length}
          />
        )}

        {sessions && sessions.length > 0 && (
          <SessionCards sessions={sessions} locale={locale} />
        )}

        <PositionLotsCard locale={locale} />
      </div>
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    console.error("[portfolio] CRITICAL PAGE ERROR:", errMsg, errStack);
    return (
      <PortfolioErrorFallback
        locale={locale}
        errorDetail={`${errMsg}\n\n${errStack || ""}`}
      />
    );
  }
}

// Re-export for TypeScript compatibility
export type { PageProps };
// Cache-bust: 1777815014
// force-rebuild: 1778063752
