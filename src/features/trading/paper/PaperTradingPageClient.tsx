"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, LayoutDashboard, History } from "lucide-react";
import { PaperTradingList } from "@/features/trading/paper/PaperTradingList";
import UnifiedTradingDashboard from "@/features/trading/UnifiedTradingDashboard";
import { SURFACE } from "@/lib/design/tokens";
import {
  PremiumStatusBanner,
  PremiumTradingHero,
} from "@/features/trading/PremiumTradingLayout";
import type { TradingMode } from "@/lib/trading-api";
import { useTranslations } from "next-intl";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { TradingModeProvider } from "@/context/TradingModeContext";
import { ToastProvider } from "@/providers/ToastProvider";

type SessionRow = {
  id: string;
  mode: "paper" | "live";
  status: "active" | "paused" | "stopped" | "crashed";
  trading_pair: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  winning_trades: number;
  total_trades: number;
  created_at: string;
};

interface PaperTradingPageClientProps {
  sessions: SessionRow[];
  balance: number;
  locale: string;
  userId: string;
  /** Server-liste filtrert på denne modusen (paper | live) */
  listMode: "paper" | "live";
  /** view fra searchParams (?view=sessions) */
  view?: string;
  /** mode fra searchParams (?mode=live) */
  mode?: string;
}

function ModeBanner({
  variant,
  children,
}: {
  variant: "paper" | "live";
  children: ReactNode;
}) {
  const isLive = variant === "live";
  return (
    <div
      className={
        isLive
          ? "bg-red-500/15 border-b border-red-500/20 dark:border-red-500/30 px-4 py-3 flex items-center justify-center gap-2"
          : "bg-blue-500/10 border-b border-blue-500/20 dark:bg-blue-500/10 dark:border-blue-500/30 px-4 py-3 flex items-center justify-center gap-2"
      }
    >
      <Wallet
        className={
          isLive
            ? "w-5 h-5 text-red-600 dark:text-red-400 shrink-0"
            : "w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0"
        }
        aria-hidden
      />
      <p
        className={
          isLive
            ? "text-red-800 dark:text-red-200 text-sm font-medium text-center"
            : "text-blue-800 dark:text-blue-200 text-sm font-medium text-center"
        }
      >
        {children}
      </p>
    </div>
  );
}

/**
 * Én trading-side (alt 1): Velger oversikt (dashboard) eller mine sesjoner (liste)
 * basert på ?view=sessions. Modus (paper/live) fra ?mode=live.
 */
export function PaperTradingPageClient({
  sessions,
  balance,
  locale,
  userId,
  listMode,
  view = "",
  mode = "",
}: PaperTradingPageClientProps) {
  const t = useTranslations("paperTrading");
  const tt = useTranslations("trading.paperTrading");
  const initialMode: TradingMode = mode === "live" ? "live" : "paper";

  const showSessionsList = view === "sessions";

  const bannerVariant = useMemo(() => {
    if (initialMode === "live") return "live";
    return "paper";
  }, [initialMode]);

  return (
    <ToastProvider>
      <TradingModeProvider>
        <div className={`min-h-screen ${SURFACE.BG_LIGHT} dark:bg-slate-950`}>
          {/* Tydelig modus-banner på begge visninger: paper = blå/info, live = rød/advarsel */}
          <ModeBanner variant={bannerVariant}>
            {bannerVariant === "live"
              ? t("modeBanner.live")
              : t("modeBanner.paper")}
          </ModeBanner>

          {showSessionsList ? (
            <main className="container mx-auto px-4 py-8 pb-16 max-w-4xl space-y-6">
              <PremiumTradingHero
                eyebrow={t(
                  initialMode === "live"
                    ? "workspaceHeader.eyebrowLive"
                    : "workspaceHeader.eyebrowPaper",
                )}
                title={t("mySessions")}
                subtitle={t("workspaceHeader.subtitle")}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={hrefWithLocale(
                    locale,
                    initialMode === "live" ? "/handel?mode=live" : "/handel",
                  )}
                  className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium"
                  data-testid="back-to-overview"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("backToOverview")}
                </Link>
                <Link
                  href={hrefWithLocale(locale, "/dashboard")}
                  className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium"
                  data-testid="back-to-dashboard"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {t("backToDashboard")}
                </Link>
                <Link
                  href={hrefWithLocale(locale, "/dashboard/historikk")}
                  className="inline-flex items-center gap-2 text-[#0052FF] hover:text-[#0047E0] dark:text-[#3d7aff] dark:hover:text-[#5c94ff] text-sm font-medium"
                  data-testid="trade-history-link"
                >
                  <History className="w-4 h-4" />
                  {tt("tradeHistory")}
                </Link>
              </div>
              <PaperTradingList
                sessions={sessions}
                balance={balance}
                locale={locale}
                userId={userId}
                sessionMode={listMode}
              />
            </main>
          ) : (
            <div className="space-y-6 pb-16">
              <div
                className="px-4 py-5 md:py-6"
                data-testid="paper-trading-workspace-header"
              >
                <PremiumStatusBanner>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#0052FF]">
                    {t("workspaceHeader.badge")}
                  </p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                    {t("workspaceHeader.title")}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                    {t("workspaceHeader.subtitle")}
                  </p>
                </PremiumStatusBanner>
              </div>
              <UnifiedTradingDashboard initialMode={initialMode} />
            </div>
          )}
        </div>
      </TradingModeProvider>
    </ToastProvider>
  );
}
