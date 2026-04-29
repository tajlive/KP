export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth-guard";
import { localizedPathname } from "@/middleware/locale-path";
import { Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { PositionLotsCard } from "@/features/dashboard/PositionLotsCard";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Fallback UI for når datahenting feiler
function PortfolioErrorFallback({ locale, errorDetail }: { locale: string; errorDetail?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-200 mb-2">
            Kunne ikke laste portefølje
          </h2>
          <p className="text-red-300/80 mb-4">
            Det oppstod en feil ved lasting av din portefølje. Vennligst prøv
            igjen.
          </p>
          {errorDetail && (
            <pre className="text-xs text-red-400/60 bg-red-950/50 rounded p-3 mb-4 overflow-auto max-h-40 text-left">
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
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
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

    // Use requireAuth for proper authentication (redirects to login if not authenticated)
    const { supabase, user } = await requireAuth(
      locale,
      localizedPathname(locale, "/dashboard/portfolio")
    );

    // Fetch wallets, portfolios, trading sessions, AND user profile
    // Each query is wrapped individually so one failure doesn't break everything
    let wallets: { id: string; currency: string; balance: number }[] | null = null;
    let portfolios: { id: string; name: string | null; current_balance: number | null; initial_balance: number | null } | null = null;
    let sessions: { id: string; trading_pair: string; current_capital_nok: number | null }[] | null = null;
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

    // Query 3: Trading sessions
    try {
      const { data, error } = await supabase
        .from("trading_sessions")
        .select("id, trading_pair, current_capital_nok")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) {
        errorLog.push(`Sessions query error: ${error.message} (${error.code})`);
      } else {
        sessions = data;
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

    // Derive display assets: prefer wallets, fallback to portfolio record.
    // CRITICAL FIX: Use user_profiles.paper_balance as the source of truth
    // for portfolio balance. The portfolios table is NOT kept in sync with
    // paper_balance updates, causing displayed sums to differ between
    // /dashboard and /dashboard/portfolio.
    const hasWallets = wallets && wallets.length > 0;
    const paperBalance = Number(profile?.paper_balance ?? 0);
    const displayAssets = hasWallets
      ? wallets!.map((w) => ({ type: "wallet" as const, ...w }))
      : portfolios
        ? [
            {
              type: "portfolio" as const,
              id: portfolios.id,
              currency: portfolios.name || "NOK",
              balance: paperBalance > 0 ? paperBalance : Number(portfolios.current_balance || portfolios.initial_balance || 0),
            },
          ]
        : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{t("title")}</h1>
            <p className="text-slate-400">{t("subtitle")}</p>
          </div>
          <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-600/20">
            <span className="text-blue-400 font-bold text-sm">
              {t("totalAssets", { count: wallets?.length || 0 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {displayAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between hover:border-slate-700 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                  <Wallet className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {asset.currency}
                  </h3>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                    {t("mainHolding")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">
                  {asset.balance.toFixed(asset.type === "portfolio" ? 2 : 6)}
                </p>
                <p className="text-slate-500 text-xs font-medium">
                  {t("balance")}
                </p>
              </div>
            </div>
          ))}

          {displayAssets.length === 0 && (
            <div className="text-center p-20 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {t("noAssets.title")}
              </h3>
              <p className="text-slate-500 max-w-xs mx-auto mb-6">
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
