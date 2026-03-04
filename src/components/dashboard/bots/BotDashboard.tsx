"use client";

import { useRealtime } from "@/hooks/use-realtime";
import type { BotFilter } from "@/store/bot-store";
import { useBotStore } from "@/store/bot-store";
import { Bot as BotIcon, Filter, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import AggregatePnLWidget from "./AggregatePnLWidget";
import BotDetailPanel from "./BotDetailPanel";
import BotStatusCard from "./BotStatusCard";

const FILTER_OPTIONS: { label: string; value: BotFilter }[] = [
  { label: "Alle", value: "all" },
  { label: "Aktive", value: "active" },
  { label: "Pauset", value: "paused" },
  { label: "Stoppet", value: "stopped" },
];

export default function BotDashboard() {
  const {
    filteredBots,
    selectedBotId,
    selectedBot,
    filter,
    isLoading,
    activeBotCount,
    fetchBots,
    selectBot,
    setFilter,
    pauseBot,
    resumeBot,
    stopBot,
    updateBotFromRealtime,
  } = useBotStore();

  // Fetch bots on mount
  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  // Subscribe to realtime bot status changes
  useRealtime<Record<string, unknown>>({
    table: "user_strategies",
    event: "UPDATE",
    onUpdate: (payload) => {
      updateBotFromRealtime(payload.id as string, {
        status: payload.status as "active" | "paused" | "stopped" | "error",
      });
    },
  });

  // Subscribe to session updates for P&L changes
  useRealtime<Record<string, unknown>>({
    table: "auto_trading_sessions",
    event: "UPDATE",
    onUpdate: (payload) => {
      updateBotFromRealtime(payload.config_id as string, {
        pnlNok: (payload.total_pnl_nok as number) ?? 0,
        pnlPct: (payload.total_pnl_pct as number) ?? 0,
        currentCapitalNok: (payload.current_capital_nok as number) ?? 0,
        totalTrades: (payload.total_trades as number) ?? 0,
        winningTrades: (payload.winning_trades as number) ?? 0,
        losingTrades: (payload.losing_trades as number) ?? 0,
      });
    },
  });

  const bots = filteredBots();
  const selected = selectedBot();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <BotIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mine Boter
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeBotCount()} aktive boter
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchBots()}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Oppdater"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Aggregate P&L */}
      <AggregatePnLWidget />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === opt.value
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bot Grid */}
      {isLoading && bots.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : bots.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <BotIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {filter === "all" ? "Ingen boter ennå" : `Ingen ${filter} boter`}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Opprett en bot under Auto Trade for å komme i gang
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <BotStatusCard
              key={bot.id}
              bot={bot}
              isSelected={bot.id === selectedBotId}
              onSelect={() =>
                selectBot(bot.id === selectedBotId ? null : bot.id)
              }
              onPause={() => pauseBot(bot.id)}
              onResume={() => resumeBot(bot.id)}
              onStop={() => stopBot(bot.id)}
            />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <BotDetailPanel bot={selected} onClose={() => selectBot(null)} />
      )}
    </div>
  );
}
