"use client";

/**
 * TraderRecommendations — AI-drevne trader-anbefalinger
 * Viser top 3 tradere basert på win-rate, Sharpe-ratio, PnL og drawdown.
 * Horisontal scroll på mobil, grid på desktop.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Sparkles,
  Shield,
  Target,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCopyStore } from "@/store/copy-store";
import type { DiscoverLeaderDto } from "@/lib/copy-trading/discover-types";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import Link from "next/link";

function formatNok(n: number) {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number | null) {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/** Beregner AI-score basert på flere faktorer */
function calculateAiScore(trader: DiscoverLeaderDto): number {
  const wr = (trader.win_rate ?? 50) * 0.35;
  const sr = Math.min(trader.sharpe_ratio ?? 0, 3) * 15 * 0.3;
  const pnl = Math.max(0, trader.pnl_30d ?? 0) * 0.25;
  const dd = Math.max(0, trader.max_drawdown_30d ?? 0) * -0.5 * 0.1;
  return wr + sr + pnl + dd;
}

/** Genererer kort begrunnelse for anbefaling */
function getReason(trader: DiscoverLeaderDto): string {
  const wr = trader.win_rate ?? 0;
  const sr = trader.sharpe_ratio ?? 0;
  const dd = trader.max_drawdown_30d ?? 0;

  if (wr >= 75 && sr >= 1.5) return "Høy win-rate + sterk Sharpe";
  if (wr >= 70) return "Konsistent høy win-rate";
  if (sr >= 2.0) return "Sterk risk-adjusted avkastning";
  if (dd !== null && dd <= 5) return "Svært lav drawdown";
  if ((trader.follower_count ?? 0) >= 50) return "Populær blant brukere";
  return "Balansert risiko/avkastning";
}

function getRiskBadgeColor(tier: string): string {
  switch (tier) {
    case "low":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "medium":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "high":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
  }
}

export default function TraderRecommendations() {
  const locale = useLocale();
  const t = useTranslations("copyTrading.recommendations");
  const discoverHref = useMemo(
    () => hrefWithLocale(locale, "/copy-trading/discover"),
    [locale],
  );

  const [leaders, setLeaders] = useState<DiscoverLeaderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { follow, following } = useCopyStore();
  const followedIds = useMemo(
    () => new Set(following.map((f) => f.leaderId)),
    [following],
  );

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch("/api/copy-trading/discover?timeframe=30d&limit=20");
        if (!res.ok) throw new Error("Kunne ikke hente tradere");
        const data = await res.json();
        const allLeaders: DiscoverLeaderDto[] = data.leaders ?? [];

        // Filtrer ut allerede fulgte, sorter etter AI-score
        const scored = allLeaders
          .filter((l) => !l.is_following && !followedIds.has(l.leaderAuthUserId))
          .map((l) => ({ ...l, __score: calculateAiScore(l) }))
          .sort((a, b) => b.__score - a.__score)
          .slice(0, 3);

        setLeaders(scored);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ukjent feil");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendations();
  }, [followedIds]);

  const handleFollow = async (leaderId: string) => {
    try {
      await follow(leaderId, {
        maxAllocationNok: 5000,
        sizingMode: "proportional",
        maxLeverage: 2,
        autoStopDrawdownPct: 10,
      });
    } catch {
      // Feil håndteres av store
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            {t("title", { defaultValue: "Anbefalte tradere" })}
          </h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="min-w-[280px] h-36 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || leaders.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/50 dark:border-gray-800/50 p-5 text-center">
        <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-[14px] text-gray-500 font-medium">
          {t("emptyTitle", { defaultValue: "Ingen tradere å anbefale akkurat nå" })}
        </p>
        <Link
          href={discoverHref}
          className="mt-3 inline-flex items-center text-[13px] font-medium text-indigo-600 hover:text-indigo-500"
        >
          {t("browseAll", { defaultValue: "Bla gjennom alle tradere" })}
          <TrendingUp className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            {t("title", { defaultValue: "Anbefalte tradere" })}
          </h3>
        </div>
        <Link
          href={discoverHref}
          className="text-[13px] font-medium text-indigo-600 hover:text-indigo-500"
        >
          {t("seeAll", { defaultValue: "Se alle" })}
        </Link>
      </div>

      {/* Horisontal scroll på mobil, grid på desktop */}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {leaders.map((trader, idx) => (
          <motion.div
            key={trader.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="min-w-[280px] sm:min-w-0 flex-1 p-4 rounded-2xl
                       bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                       border border-gray-200/50 dark:border-gray-800/50
                       shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-blue-500
                           flex items-center justify-center text-white font-bold text-sm shrink-0"
              >
                {trader.display_name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                  {trader.display_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getRiskBadgeColor(trader.risk_tier)}`}
                  >
                    {trader.risk_tier}
                  </span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                    <Users className="w-3 h-3" />
                    {trader.follower_count ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                  {t("winRate", { defaultValue: "Win" })}
                </p>
                <p className="text-[14px] font-bold tabular-nums text-gray-900 dark:text-white">
                  {Math.round(trader.win_rate ?? 0)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                  {t("pnl30d", { defaultValue: "30d" })}
                </p>
                <p
                  className={`text-[14px] font-bold tabular-nums ${(trader.pnl_30d ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {formatPct(trader.pnl_30d)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                  {t("sharpe", { defaultValue: "Sharpe" })}
                </p>
                <p className="text-[14px] font-bold tabular-nums text-gray-900 dark:text-white">
                  {(trader.sharpe_ratio ?? 0).toFixed(1)}
                </p>
              </div>
            </div>

            {/* AI reason */}
            <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-indigo-500/5">
              <Shield className="w-3 h-3 text-indigo-500 shrink-0" />
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                {getReason(trader)}
              </p>
            </div>

            {/* Action */}
            <button
              onClick={() => handleFollow(trader.leaderAuthUserId)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold
                         hover:bg-indigo-500 active:scale-[0.98] transition-all duration-200"
            >
              {t("followCta", { defaultValue: "Følg trader" })}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
