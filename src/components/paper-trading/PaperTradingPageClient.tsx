"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, LayoutDashboard } from "lucide-react";
import { PaperTradingList } from "@/components/paper-trading/PaperTradingList";
import UnifiedTradingDashboard from "@/components/trading/UnifiedTradingDashboard";
import { SURFACE } from "@/lib/design/tokens";
import type { TradingMode } from "@/lib/trading-api";
import { useTranslations } from "next-intl";
import { hrefWithLocale } from "@/i18n/href-with-locale";

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
  contextBannerText: string;
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
  contextBannerText,
}: PaperTradingPageClientProps) {
  const t = useTranslations("paperTrading");
  const searchParams = useSearchParams();
  const view = searchParams?.get("view") ?? "";
  const modeParam = searchParams?.get("mode") ?? "";
  const initialMode: TradingMode = modeParam === "live" ? "live" : "paper";

  const showSessionsList = view === "sessions";

  const bannerVariant = useMemo(() => {
    if (initialMode === "live") return "live";
    return "paper";
  }, [initialMode]);

  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT} dark:bg-slate-950`}>
      {/* Tydelig UX: modus-banner kun på session-liste; dashboard har egen header */}
      {showSessionsList && (
        <div
          className={
            bannerVariant === "live"
              ? "bg-red-500/15 border-b border-red-500/20 dark:border-red-500/30 px-4 py-3 flex items-center justify-center gap-2"
              : "bg-[#0052FF]/10 border-b border-[#0052FF]/20 dark:bg-[#0052FF]/10 dark:border-[#0052FF]/30 px-4 py-3 flex items-center justify-center gap-2"
          }
        >
          <Wallet
            className={
              bannerVariant === "live"
                ? "w-5 h-5 text-red-600 dark:text-red-400 shrink-0"
                : "w-5 h-5 text-[#0052FF] dark:text-[#3d7aff] shrink-0"
            }
            aria-hidden
          />
          <p
            className={
              bannerVariant === "live"
                ? "text-red-800 dark:text-red-200 text-sm font-medium text-center"
                : "text-[#0047E0] dark:text-[#3d7aff] text-sm font-medium text-center"
            }
          >
            {bannerVariant === "live"
              ? "🔴 Live — Ekte penger. Handel med omhu."
              : contextBannerText}
          </p>
        </div>
      )}

      {showSessionsList ? (
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Link
              href={hrefWithLocale(locale, "/paper-trading")}
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
          </div>
          <PaperTradingList
            sessions={sessions}
            balance={balance}
            locale={locale}
            userId={userId}
          />
        </main>
      ) : (
        <>
          <div
            className="border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-[#0052FF]/[0.06] to-transparent dark:from-[#0052FF]/10 px-4 py-4"
            data-testid="paper-trading-workspace-header"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {t("workspaceHeader.title")}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              {t("workspaceHeader.subtitle")}
            </p>
          </div>
          <UnifiedTradingDashboard initialMode={initialMode} />
        </>
      )}
    </div>
  );
}
