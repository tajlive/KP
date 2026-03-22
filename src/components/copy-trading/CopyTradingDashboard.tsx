"use client";

/**
 * CopyTradingDashboard — Robinhood-inspired copy trading overview
 * Shows followed traders, active copies, total P&L, and quick config.
 */

import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useRealtime } from "@/hooks/use-realtime";
import { useCopyStore } from "@/store/copy-store";
import { motion } from "framer-motion";
import {
  Clock,
  RefreshCw,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatNokForLocale(locale: string, n: number) {
  const tag = locale === "en" ? "en-GB" : "no-NO";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CopyTradingDashboard() {
  const locale = useLocale();
  const t = useTranslations("copyTrading.dashboard");
  const discoverHref = useMemo(
    () => hrefWithLocale(locale, "/copy-trading/discover"),
    [locale],
  );
  const {
    following,
    activeCopies,
    totalCopyPnl,
    isLoading,
    fetchFollowing,
    fetchActiveCopies,
  } = useCopyStore();

  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const timeLocale = locale === "en" ? "en-GB" : "no-NO";

  useEffect(() => {
    fetchFollowing();
    fetchActiveCopies();
  }, [fetchFollowing, fetchActiveCopies]);

  // Live updates via Supabase Realtime
  useRealtime<Record<string, unknown>>({
    table: "copy_trade_log",
    event: "INSERT",
    onInsert: () => {
      fetchActiveCopies();
    },
  });

  const isPositive = totalCopyPnl >= 0;
  const activeFollowing = following.filter((f) => f.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-linear-to-br from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/20 rounded-2xl">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-gray-900 dark:text-white">
              {t("title")}
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              {t("subtitleActive", { count: activeFollowing.length })}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchFollowing();
            fetchActiveCopies();
          }}
          className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-colors duration-200"
          aria-label={t("refresh")}
        >
          <RefreshCw
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Total P&L card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-3xl
                   bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                   border border-gray-200/50 dark:border-gray-800/50
                   shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t("totalPnlLabel")}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p
              className={`text-[28px] font-bold tabular-nums tracking-tight
                          ${
                            isPositive
                              ? "bg-linear-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent"
                              : "text-rose-500"
                          }`}
            >
              {formatNokForLocale(locale, totalCopyPnl)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
            <span
              className={`text-[15px] font-semibold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}
            >
              {isPositive ? "+" : ""}
              {((totalCopyPnl / 100000) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Followed traders */}
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-3 px-1">
          {t("mineTitle")}
        </h3>

        {isLoading && following.length === 0 ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : following.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-gray-50 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-[15px] text-gray-500 font-medium">
              {t("emptyTitle")}
            </p>
            <p className="text-[13px] text-gray-400 mt-1 max-w-sm mx-auto">
              {t("emptyBody")}
            </p>
            <Link
              href={discoverHref}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t("discoverCta")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map((trader) => (
              <motion.div
                key={trader.id}
                layout
                className="flex items-center gap-3.5 p-4
                           bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                           rounded-2xl border border-gray-200/50 dark:border-gray-800/50
                           shadow-sm"
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full bg-linear-to-br from-indigo-500 to-blue-500
                               flex items-center justify-center text-white font-bold text-[15px] shrink-0"
                >
                  {trader.leaderName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                      {trader.leaderName}
                    </p>
                    {!trader.isActive && (
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                        {t("paused")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[13px] text-gray-500 tabular-nums">
                      {t("maxAlloc", {
                        amount: formatNokForLocale(
                          locale,
                          trader.maxAllocationNok,
                        ),
                      })}
                    </span>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-[13px] text-gray-500">
                      {trader.sizingMode === "proportional"
                        ? t("sizingProportional")
                        : t("sizingFixed")}
                    </span>
                  </div>
                </div>

                {/* P&L + action */}
                <div className="text-right shrink-0">
                  <p
                    className={`text-[15px] font-bold tabular-nums ${trader.pnlNok >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {trader.pnlNok >= 0 ? "+" : ""}
                    {formatNokForLocale(locale, trader.pnlNok)}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSelectedTrader(
                      trader.id === selectedTrader ? null : trader.id,
                    )
                  }
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={t("settingsAria", { name: trader.leaderName })}
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent copy trades */}
      {activeCopies.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-3 px-1">
            {t("recentCopies")}
          </h3>
          <div className="space-y-2">
            {activeCopies.slice(0, 5).map((copy) => (
              <div
                key={copy.id}
                className="flex items-center justify-between p-3.5
                           bg-gray-50 dark:bg-gray-900/60 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center
                                  ${copy.side === "LONG" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}
                  >
                    <Zap
                      className={`w-4 h-4 ${copy.side === "LONG" ? "text-emerald-500" : "text-rose-500"}`}
                    />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
                      {copy.symbol}
                    </p>
                    <p className="text-[11px] text-gray-400 tabular-nums">
                      {copy.latencyMs}ms latency
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(copy.openedAt).toLocaleTimeString(timeLocale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
