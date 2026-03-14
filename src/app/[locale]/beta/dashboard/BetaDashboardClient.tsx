"use client";

import { getAppUrl } from "@/lib/auth/config";
import { createClient } from "@/lib/utils";
import { Profile, Trade } from "@/types/database";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BetaStats {
  todayTrades: number;
  todayProfit: number;
  todayLoss: number;
  winRate: number;
}

export default function BetaDashboardClient({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations("beta");
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<BetaStats>({
    todayTrades: 0,
    todayProfit: 0,
    todayLoss: 0,
    winRate: 0,
  });
  const [exchangeConnected, setExchangeConnected] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Retry logic for race condition after OAuth redirect
      let user = null;
      let retries = 0;
      const maxRetries = 3;

      while (!user && retries < maxRetries) {
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        user = u;

        if (!user) {
          retries++;
          if (retries < maxRetries) {
            console.info(
              `[BetaDashboard] No user, retrying... (${retries}/${maxRetries})`,
            );
            await new Promise((r) => setTimeout(r, 500)); // Wait 500ms
          }
        }
      }

      if (!user) {
        console.info(
          "[BetaDashboard] No user after retries, redirecting to login",
        );
        const locale = (pathname ?? "/no").split("/")[1] || "no";
        const supportedLocales = ["no", "en", "th", "zh"];
        const safeLocale = supportedLocales.includes(locale) ? locale : "no";
        router.push(
          `/${safeLocale}/innlogging?next=${encodeURIComponent(pathname ?? "/")}`,
        );
        return;
      }

      console.info("[BetaDashboard] User found:", user.email);

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileData) {
        router.push(`/${params.locale}/beta/apply`);
        return;
      }

      setProfile({
        ...(profileData as Record<string, unknown>),
        id: profileData.id,
        email: (profileData as { email: string | null }).email ?? "",
      } as Profile);

      const { data: betaApplication } = await supabase
        .from("beta_applications")
        .select("application_status")
        .eq("user_id", user.id)
        .single();

      if (!betaApplication || betaApplication.application_status !== "approved") {
        router.push(`/${params.locale}/beta/apply`);
        return;
      }

      const { data: apiKeys } = await supabase
        .from("trading_api_keys")
        .select("id")
        .eq("user_id", user.id)
        .eq("exchange", "binance")
        .single();

      setExchangeConnected(!!apiKeys);

      const today = new Date().toISOString().split("T")[0];
      const { data: trades } = await supabase
        .from("auto_trades")
        .select("*")
        .eq("user_id", user.id)
        .gte("executed_at", today);

      if (trades) {
        const profit = trades
          .filter((t: Trade) => (t.pnl_nok || 0) > 0)
          .reduce((sum: number, t: Trade) => sum + (t.pnl_nok || 0), 0);

        const loss = trades
          .filter((t: Trade) => (t.pnl_nok || 0) < 0)
          .reduce((sum: number, t: Trade) => sum + Math.abs(t.pnl_nok || 0), 0);

        const wins = trades.filter((t: Trade) => (t.pnl_nok || 0) > 0).length;
        const total = trades.length;

        setStats({
          todayTrades: total,
          todayProfit: profit,
          todayLoss: loss,
          winRate: total > 0 ? (wins / total) * 100 : 0,
        });
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("betaDashboard")}
          </h1>
          <p className="text-gray-600">
            {profile?.full_name || profile?.email}
          </p>
        </div>

        {/* Exchange Connection Warning */}
        {!exchangeConnected && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-yellow-900 mb-2">
                  {t("noExchangeConnected")}
                </h2>
                <p className="text-yellow-800 mb-4">
                  {t("exchangeConnectDesc")}
                </p>
                <Link
                  href={`/${params.locale}/beta/connect-exchange`}
                  className="inline-block px-6 py-3 bg-yellow-600 text-white font-semibold rounded-full hover:bg-yellow-700 transition-colors"
                >
                  {t("connectBinance")}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-2">{t("trades")}</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.todayTrades}
            </div>
            <div className="text-xs text-gray-500 mt-1">{t("todayStats")}</div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-2">{t("profit")}</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.todayProfit.toFixed(2)} kr
            </div>
            <div className="text-xs text-gray-500 mt-1">{t("todayStats")}</div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-2">{t("loss")}</div>
            <div className="text-3xl font-bold text-red-600">
              {stats.todayLoss.toFixed(2)} kr
            </div>
            <div className="text-xs text-gray-500 mt-1">{t("todayStats")}</div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-2">{t("winRate")}</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.winRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">{t("todayStats")}</div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href={`/${params.locale}/beta/live-trading`}
            className={`bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-8 hover:shadow-xl transition-all ${!exchangeConnected && "opacity-50 pointer-events-none"}`}
          >
            <div className="text-5xl mb-4">💰</div>
            <h2 className="text-2xl font-bold mb-2">{t("liveTrading")}</h2>
            <p className="text-blue-100">
              {t("liveTradingDesc")}
            </p>
          </Link>

          <Link
            href={`/${params.locale}/paper-trading`}
            className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl p-8 hover:shadow-xl transition-all"
          >
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-2">{t("paperTrading")}</h2>
            <p className="text-green-100">{t("paperTradingDesc")}</p>
          </Link>

          <Link
            href={`/${params.locale}/beta/ai-copilot`}
            className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-8 hover:shadow-xl transition-all"
          >
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold mb-2">{t("aiCopilot")}</h2>
            <p className="text-emerald-100">
              {t("aiCopilotDesc")}
            </p>
          </Link>

          <Link
            href={`/${params.locale}/beta/auto-trade`}
            className={`bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-2xl p-8 hover:shadow-xl transition-all ${!exchangeConnected && "opacity-50 pointer-events-none"}`}
          >
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold mb-2">{t("autoTrade")}</h2>
            <p className="text-orange-100">{t("autoTradeDesc")}</p>
          </Link>

          <Link
            href={`/${params.locale}/beta/konkurranse`}
            className="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white rounded-2xl p-8 hover:shadow-xl transition-all md:col-span-2 lg:col-span-1"
          >
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold mb-2">{t("competition")}</h2>
            <p className="text-yellow-100">
              {t("competitionDesc")}
            </p>
          </Link>
        </div>

        {/* Referral Program */}
        <div className="bg-gradient-to-r from-indigo-500 via-emerald-500 to-pink-500 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-3">
                <span className="text-yellow-300">★</span>
                {t("referralTitle")}
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {t("referralCta")}
              </h2>
              <p className="text-indigo-100 max-w-xl text-lg">
                {t("referralDesc")}
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  const url = `${getAppUrl()}/${params.locale}/beta/apply?ref=${profile?.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success(t("linkCopied"));
                }}
                className="bg-white text-indigo-600 font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:bg-indigo-50 transition-all flex items-center gap-2"
              >
                <span>🔗</span>
                {t("copyLink")}
              </button>
            </div>
          </div>
        </div>

        {/* Trading Limits */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("tradingLimits")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {t("maxTradeSize")}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {profile?.beta_limits?.max_trade_size_nok || 1000} kr
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {t("maxDailyTrades")}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {profile?.beta_limits?.max_daily_trades || 10}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {t("maxDailyLoss")}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {profile?.beta_limits?.max_daily_loss_nok || 1000} kr
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
