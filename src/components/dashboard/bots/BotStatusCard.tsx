"use client";

import type { Bot } from "@/store/bot-store";
import {
  MoreVertical,
  Pause,
  Play,
  Square,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> =
  {
    active: {
      bg: "bg-green-50 dark:bg-green-950",
      text: "text-green-700 dark:text-green-400",
      dot: "bg-green-500",
    },
    paused: {
      bg: "bg-amber-50 dark:bg-amber-950",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    stopped: {
      bg: "bg-gray-50 dark:bg-gray-900",
      text: "text-gray-600 dark:text-gray-400",
      dot: "bg-gray-400",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950",
      text: "text-red-700 dark:text-red-400",
      dot: "bg-red-500",
    },
  };

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  paused: "Pauset",
  stopped: "Stoppet",
  error: "Feil",
};

const STRATEGY_ICONS: Record<string, string> = {
  dca: "📊",
  trend: "📈",
  multisignal: "🎯",
  grid: "🔲",
  aicopy: "🤖",
  momentum: "⚡",
};

function formatNOK(value: number): string {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Aldri";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Akkurat nå";
  if (mins < 60) return `${mins}m siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}t siden`;
  const days = Math.floor(hours / 24);
  return `${days}d siden`;
}

interface BotStatusCardProps {
  bot: Bot;
  isSelected: boolean;
  onSelect: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function BotStatusCard({
  bot,
  isSelected,
  onSelect,
  onPause,
  onResume,
  onStop,
}: BotStatusCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const colors = STATUS_COLORS[bot.status] || STATUS_COLORS.stopped;
  const isPositive = bot.pnlNok >= 0;
  const winRate =
    bot.totalTrades > 0
      ? ((bot.winningTrades / bot.totalTrades) * 100).toFixed(0)
      : "0";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`relative bg-white dark:bg-gray-900 rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? "border-blue-500 dark:border-blue-400 shadow-md"
          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {STRATEGY_ICONS[bot.strategyType] ?? "🤖"}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {bot.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${bot.status === "active" ? "animate-pulse" : ""}`}
                />
                {STATUS_LABELS[bot.status]}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {bot.mode === "live" ? "🔴 Live" : "📝 Paper"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Bot-handlinger"
          >
            <MoreVertical className="w-4 h-4" aria-hidden="true" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]"
              onMouseLeave={() => setShowMenu(false)}
            >
              {bot.status === "active" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPause();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              )}
              {bot.status === "paused" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Gjenoppta
                </button>
              )}
              {bot.status !== "stopped" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stopp
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* P&L */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">P&L</p>
          <p
            className={`text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
          >
            {formatNOK(bot.pnlNok)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          <span
            className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
          >
            {formatPercent(bot.pnlPct)}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Trades</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {bot.totalTrades}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Win Rate</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {winRate}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Siste</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {timeAgo(bot.lastTradeAt)}
          </p>
        </div>
      </div>

      {/* Active indicator */}
      {bot.status === "active" && (
        <div className="absolute top-0 right-0 p-1">
          <Zap className="w-3 h-3 text-green-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}
