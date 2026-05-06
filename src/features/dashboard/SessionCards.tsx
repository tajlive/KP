"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatNOK } from "@/lib/format/currency";
import { Badge } from "@/shared/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Play,
  Square,
  PauseCircle,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Calendar,
  Filter,
} from "lucide-react";
import { SessionDetailDialog } from "./SessionDetailDialog";

export interface SessionCardData {
  id: string;
  mode: string;
  status: string;
  trading_pair: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  created_at: string;
  stopped_at: string | null;
  open_position: Record<string, unknown> | null;
}

interface SessionCardsProps {
  sessions: SessionCardData[];
  locale: string;
}

function statusConfig(status: string) {
  switch (status) {
    case "active":
      return {
        badge: <Badge className="bg-green-600 text-white text-[10px] hover:bg-green-600">AKTIV</Badge>,
        icon: <Play className="w-4 h-4 text-green-600 dark:text-green-400" />,
        accent: "border-l-green-500",
        dot: "bg-green-500",
      };
    case "stopped":
      return {
        badge: <Badge variant="secondary" className="text-[10px]">STOPPET</Badge>,
        icon: <Square className="w-4 h-4 text-slate-500 dark:text-slate-400" />,
        accent: "border-l-slate-400",
        dot: "bg-slate-400",
      };
    case "crashed":
      return {
        badge: <Badge variant="destructive" className="text-[10px]">KRÆSJET</Badge>,
        icon: <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />,
        accent: "border-l-red-500",
        dot: "bg-red-500",
      };
    case "paused":
      return {
        badge: <Badge variant="outline" className="text-[10px]">PAUSET</Badge>,
        icon: <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        accent: "border-l-amber-500",
        dot: "bg-amber-500",
      };
    default:
      return {
        badge: <Badge variant="outline" className="text-[10px]">{status.toUpperCase()}</Badge>,
        icon: <BarChart3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />,
        accent: "border-l-slate-400",
        dot: "bg-slate-400",
      };
  }
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

type FilterTab = "all" | "active" | "stopped" | "paused";

export function SessionCards({ sessions, locale }: SessionCardsProps) {
  const t = useTranslations("dashboard.sessionCards");
  const [selectedSession, setSelectedSession] = useState<SessionCardData | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return sessions;
    return sessions.filter((s) => s.status === filter);
  }, [sessions, filter]);

  const counts = useMemo(() => ({
    all: sessions.length,
    active: sessions.filter((s) => s.status === "active").length,
    stopped: sessions.filter((s) => s.status === "stopped").length,
    paused: sessions.filter((s) => s.status === "paused").length,
  }), [sessions]);

  if (!sessions || sessions.length === 0) {
    return null;
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `${t("all")} (${counts.all})` },
    { key: "active", label: `${t("active")} (${counts.active})` },
    { key: "stopped", label: `${t("stopped")} (${counts.stopped})` },
    { key: "paused", label: `${t("paused")} (${counts.paused})` },
  ];

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {t("title")}
          </h2>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === tab.key
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-sm bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <Filter className="w-4 h-4 mx-auto mb-1 opacity-50" />
            {t("noFiltered", { status: filter === "active" ? t("activeLC") : filter === "paused" ? t("pausedLC") : t("stoppedLC") })}.
          </div>
        )}

        {filtered.map((session) => {
          const cfg = statusConfig(session.status);
          const pnlAbs = session.current_capital_nok - session.starting_capital_nok;
          const pnlPct =
            session.starting_capital_nok > 0
              ? (pnlAbs / session.starting_capital_nok) * 100
              : 0;
          const isProfitable = pnlPct >= 0;
          const completedTrades = session.winning_trades + session.losing_trades;
          const winRate =
            completedTrades > 0
              ? Math.round((session.winning_trades / completedTrades) * 100)
              : 0;

          return (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className={`w-full text-left rounded-xl border p-4 transition-all group cursor-pointer bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 ${cfg.accent} border-l-4`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: icon + pair + strategy */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        {session.trading_pair}
                      </span>
                      {cfg.badge}
                      {session.mode === "live" && (
                        <Badge className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30 text-[10px]">
                          LIVE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                      {session.strategy_id} ·{" "}
                      <span className="flex items-center gap-1 inline-flex">
                        <Calendar className="w-3 h-3" />
                        {formatShortDate(session.created_at)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Right: capital + PnL */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900 dark:text-white text-lg">
                    {formatNOK(session.current_capital_nok)}
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    {isProfitable ? (
                      <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isProfitable ? "+" : ""}
                      {pnlPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom row: stats */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/40">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {session.total_trades} {t("trades")}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                  {winRate >= 50 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  )}
                  {winRate}% {t("winRate")}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500 ml-auto">
                  <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {t("seeDetails")}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedSession && (
        <SessionDetailDialog
          session={selectedSession}
          locale={locale}
          open={!!selectedSession}
          onOpenChange={(open) => {
            if (!open) setSelectedSession(null);
          }}
        />
      )}
    </>
  );
}
