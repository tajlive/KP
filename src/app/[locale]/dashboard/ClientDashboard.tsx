"use client";

import AIMarketBrief from "@/components/dashboard/AIMarketBrief";
import { CopyTradingCard } from "@/components/dashboard/CopyTradingCard";
import { LiveTradingBanner } from "@/components/dashboard/LiveTradingBanner";
import ReferralDashboard from "@/components/dashboard/ReferralDashboard";
import { TradingModeToggle } from "@/components/dashboard/TradingModeToggle";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import OrderEntry from "@/components/trading/OrderEntry";
import PortfolioStats from "@/components/trading/PortfolioStats";
import PositionsTable from "@/components/trading/PositionsTable";
import TradeHistory from "@/components/trading/TradeHistory";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { marketDataService } from "@/services/marketDataService";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect } from "react";

// KLA-108: Dynamic imports for heavy trading components
const ProfessionalChart = dynamic(
  () => import("@/components/trading/ProfessionalChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full bg-white dark:bg-gray-900 rounded-2xl animate-pulse border-2 border-gray-100 dark:border-gray-800" />
    ),
  },
);

const Leaderboard = dynamic(() => import("@/components/trading/Leaderboard"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-white dark:bg-gray-900 rounded-2xl animate-pulse border-2 border-gray-100 dark:border-gray-800" />
  ),
});

export default function ClientDashboard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { subscription, loading } = useSubscription();

  useEffect(() => {
    // Connect to market data
    marketDataService.connect();
  }, []);

  // Hvis loading — vis skeleton loader
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          {/* Top bar skeleton */}
          <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"
              />
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const tierSlug = subscription?.tier_slug ?? "student";
  const hasLiveTrading = ["master", "phd", "professor"].includes(tierSlug);
  const hasCopyTrading = ["master", "phd", "professor"].includes(tierSlug);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* TOP BAR */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("topBar.myOverview")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tierSlug === "student" &&
                (locale === "no"
                  ? "Paper Trading med 1M NOK virtuell kapital"
                  : "Paper Trading with 1M NOK virtual capital")}
              {tierSlug === "bachelor" &&
                (locale === "no"
                  ? "Bachelor — Paper Trading + AI-Lærer"
                  : "Bachelor — Paper Trading + AI Tutor")}
              {tierSlug === "master" &&
                (locale === "no"
                  ? "Master — Live Trading Aktivert"
                  : "Master — Live Trading Enabled")}
              {tierSlug === "phd" &&
                (locale === "no"
                  ? "PhD — Ubegrenset Autotrading"
                  : "PhD — Unlimited Autotrading")}
              {tierSlug === "professor" &&
                (locale === "no"
                  ? "Professor — VIP Tilgang"
                  : "Professor — VIP Access")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {t("topBar.systemOnline")}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* WELCOME + TRADING MODE */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {t("welcomeBack")}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t("statusDesc")}
              </p>
            </div>
            <TradingModeToggle />
          </div>

          <div className="mb-6">
            <AIMarketBrief />
          </div>

          <div className="mb-6">
            <ReferralDashboard />
          </div>

          {/* UPGRADE BANNER hvis student eller bachelor */}
          {(tierSlug === "student" || tierSlug === "bachelor") && (
            <UpgradeBanner tierSlug={tierSlug} locale={locale} />
          )}

          {/* LIVE TRADING BANNER (kun hvis tier støtter det) */}
          {hasLiveTrading && <LiveTradingBanner />}

          {/* PORTFOLIO STATS */}
          <PortfolioStats />

          {/* CHART + ORDER ENTRY */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProfessionalChart />
            </div>
            <div>
              <OrderEntry />
            </div>
          </div>

          {/* POSITIONS + COPY TRADING + LEADERBOARD */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PositionsTable />
            </div>
            <div className="space-y-6">
              {hasCopyTrading && <CopyTradingCard />}
              <Leaderboard />
            </div>
          </div>

          {/* TRADE HISTORY */}
          <TradeHistory />
        </div>
      </div>
    </div>
  );
}
