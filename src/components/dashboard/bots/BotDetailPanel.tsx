"use client";

import type { Bot } from "@/store/bot-store";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Settings,
  X,
} from "lucide-react";

function formatNOK(value: number): string {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface BotDetailPanelProps {
  bot: Bot;
  onClose: () => void;
}

export default function BotDetailPanel({ bot, onClose }: BotDetailPanelProps) {
  const winRate =
    bot.totalTrades > 0
      ? ((bot.winningTrades / bot.totalTrades) * 100).toFixed(1)
      : "0";
  const isPositive = bot.pnlNok >= 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {bot.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {bot.strategyType.toUpperCase()} · {bot.symbol} ·{" "}
              {bot.mode === "live" ? "Live" : "Paper"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Lukk detaljer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-800">
        <StatCell
          label="P&L"
          value={formatNOK(bot.pnlNok)}
          valueColor={isPositive ? "text-green-600" : "text-red-600"}
          icon={
            isPositive ? (
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            )
          }
        />
        <StatCell
          label="Kapital"
          value={formatNOK(bot.currentCapitalNok)}
          subtitle={`Start: ${formatNOK(bot.startingCapitalNok)}`}
        />
        <StatCell
          label="Win Rate"
          value={`${winRate}%`}
          subtitle={`${bot.winningTrades}W / ${bot.losingTrades}L`}
        />
        <StatCell
          label="Max Drawdown"
          value={`-${bot.maxDrawdownPct.toFixed(1)}%`}
          valueColor="text-red-500"
        />
      </div>

      {/* Trade Summary */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Activity className="w-4 h-4" />
          <span className="font-medium">Handelsaktivitet</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Totale trades
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {bot.totalTrades}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Vinnende</span>
            <span className="font-medium text-green-600">
              {bot.winningTrades}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Tapende</span>
            <span className="font-medium text-red-600">{bot.losingTrades}</span>
          </div>
        </div>

        {/* Config Summary */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <Settings className="w-4 h-4" />
            <span className="font-medium">Konfigurasjon</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400 dark:text-gray-500">Strategi</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {bot.strategyType}
              </p>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Symbol</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {bot.symbol}
              </p>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          Opprettet {new Date(bot.createdAt).toLocaleDateString("no-NO")}
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  subtitle,
  valueColor = "text-gray-900 dark:text-white",
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
      </div>
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
}
