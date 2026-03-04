"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/utils";
import { Portfolio, Trade, UserStrategy } from "@/lib/trading-api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  History,
  LayoutDashboard,
  Pause,
  Play,
  Settings2,
  ShoppingBag,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AdvancedStatsModal from "./AdvancedStatsModal";

interface BotStatusDashboardProps {
  portfolio: Portfolio | null;
  activeStrategies: UserStrategy[];
  recentTrades: Trade[];
  onAction: (action: string) => void;
  formatNOK: (v: number) => string;
  userId?: string;
}

const STRATEGY_ICONS: Record<string, string> = {
  dca_trygg: "🛡️",
  trend_balansert: "📈",
  multisignal_aktiv: "⚡",
  grid_bot: "🔲",
  ai_copy: "🤖",
};

interface RealtimeUpdate {
  lastAnalysisDetails: Record<string, unknown> | null;
  nextExpectedActionAt: string | null;
  lastStatusMessage: string | null;
}

export default function BotStatusDashboard({
  portfolio,
  activeStrategies,
  recentTrades,
  onAction,
  formatNOK,
  userId,
}: BotStatusDashboardProps) {
  const { locale } = useParams();
  const isBotActive = activeStrategies.length > 0;
  const mainStrategy = activeStrategies[0];
  const lastTrade = recentTrades[0];

  const [realtimeData, setRealtimeData] = useState<RealtimeUpdate | null>(null);
  const [nextCheckTime, setNextCheckTime] = useState<string>("Om 12 minutter");
  const [isLoading, setIsLoading] = useState(true);

  // KLA-100: Fetch initial bot status from API
  useEffect(() => {
    const fetchBotStatus = async () => {
      try {
        const response = await fetch("/api/dashboard/bot-status");
        if (response.ok) {
          const data = await response.json();
          if (data.activeStrategy?.nextActionAt) {
            const nextAction = new Date(data.activeStrategy.nextActionAt);
            const now = new Date();
            const diffMinutes = Math.ceil(
              (nextAction.getTime() - now.getTime()) / (1000 * 60),
            );
            if (diffMinutes > 0) {
              setNextCheckTime(`Om ${diffMinutes} minutt${diffMinutes > 1 ? "er" : ""}`);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch bot status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBotStatus();
  }, []);

  // KLA-100: Supabase Realtime subscription for live updates
  useEffect(() => {
    if (!userId || !mainStrategy) return;

    const supabase = createClient();

    // Subscribe to user_strategies changes for this user
    const channel = supabase
      .channel(`bot-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_strategies",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newData = payload.new as RealtimeUpdate;
          setRealtimeData(newData);

          // Update next check time
          if (newData.nextExpectedActionAt) {
            const nextAction = new Date(newData.nextExpectedActionAt);
            const now = new Date();
            const diffMinutes = Math.ceil(
              (nextAction.getTime() - now.getTime()) / (1000 * 60),
            );
            if (diffMinutes > 0) {
              setNextCheckTime(`Om ${diffMinutes} minutt${diffMinutes > 1 ? "er" : ""}`);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mainStrategy?.id]);

  // Calculate P&L from real data
  const pnlToday = portfolio?.total_pnl || 0;
  const pnlWeek = portfolio?.total_pnl || 0;
  const pnlMonth = portfolio?.total_pnl || 0;

  // Determine risk level
  const getRiskLevel = (strategyId: string): { label: string; color: string } => {
    if (strategyId.includes("dca") || strategyId.includes("trygg")) {
      return { label: "Lav", color: "text-green-400" };
    }
    if (strategyId.includes("trend") || strategyId.includes("balansert")) {
      return { label: "Balansert", color: "text-blue-400" };
    }
    if (strategyId.includes("multi") || strategyId.includes("aktiv")) {
      return { label: "Høy", color: "text-orange-400" };
    }
    return { label: "Balansert", color: "text-yellow-400" };
  };

  const risk = mainStrategy ? getRiskLevel(mainStrategy.strategy_id) : { label: "-", color: "text-slate-400" };

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 bg-slate-950 min-h-screen text-slate-200 pb-24">
        <div className="flex-1 space-y-6">
          <Skeleton className="h-64 w-full bg-slate-800" />
          <Skeleton className="h-48 w-full bg-slate-800" />
        </div>
        <div className="w-full lg:w-80 space-y-6">
          <Skeleton className="h-96 w-full bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 bg-slate-950 min-h-screen text-slate-200 pb-24">
      {/* Navigation Layer */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-2xl border border-slate-800 p-2 rounded-2xl flex items-center gap-1 shadow-2xl scale-90 md:scale-100">
        <Link
          href={`/${locale}/dashboard`}
          className="p-3 px-6 bg-blue-600 text-white rounded-xl font-black text-sm flex items-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" /> Bot Status
        </Link>
        <Link
          href={`/${locale}/copy-trading`}
          className="p-3 px-6 text-slate-400 hover:text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <BarChart3 className="w-4 h-4" /> Ledertavle
        </Link>
        <Link
          href={`/${locale}/marketplace`}
          className="p-3 px-6 text-slate-400 hover:text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" /> Marked
        </Link>
        <div className="w-[1px] h-6 bg-slate-800 mx-1" />
        <button
          onClick={() => onAction("switch_advanced")}
          className="p-3 px-6 text-slate-400 hover:text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <Settings2 className="w-4 h-4" /> Avansert
        </button>
      </div>

      {/* Main Narrative Area */}
      <div className="flex-1 space-y-6">
        {/* Hero Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700 p-8 shadow-2xl"
        >
          {/* Decorative radial gradient */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative z-10">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    isBotActive
                      ? "bg-green-500 animate-pulse"
                      : "bg-yellow-500",
                  )}
                />
                <h1 className="text-3xl lg:text-4xl font-black text-white">
                  {isBotActive ? "Boten jobber" : "Venter på deg"}
                </h1>
              </div>

              <p className="text-lg text-slate-400 max-w-lg text-center md:text-left leading-relaxed">
                {isBotActive && mainStrategy
                  ? `Ditt bot kjører ${STRATEGY_ICONS[mainStrategy.strategy_id] || "🤖"} ${mainStrategy.strategy_id.replace("_", " ")} på ${mainStrategy.trading_pair}.`
                  : "Du har ingen aktive strategier akkurat nå. Start en strategi for å begynne automatisert handel."}
              </p>

              <div className="flex flex-wrap gap-3 mt-2">
                {isBotActive && (
                  <>
                    <Badge
                      variant="outline"
                      className="bg-slate-800/50 border-slate-700 text-slate-300 py-1.5 px-3"
                    >
                      <Clock className="w-3.5 h-3.5 mr-2 text-blue-400" />
                      {nextCheckTime}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-slate-800/50 border-slate-700 text-slate-300 py-1.5 px-3"
                    >
                      <Zap className={`w-3.5 h-3.5 mr-2 ${risk.color}`} />
                      Risiko: {risk.label}
                    </Badge>
                    {realtimeData?.lastStatusMessage && (
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 border-blue-500/30 text-blue-300 py-1.5 px-3"
                      >
                        <Activity className="w-3.5 h-3.5 mr-2 text-blue-400" />
                        {realtimeData.lastStatusMessage}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              {isBotActive ? (
                <>
                  <Button
                    onClick={() => onAction("pause")}
                    variant="outline"
                    className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-white min-w-[160px]"
                  >
                    <Pause className="w-4 h-4 mr-2" /> Pause Bot
                  </Button>
                  <Button
                    onClick={() => onAction("view_stats")}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px]"
                  >
                    <Activity className="w-4 h-4 mr-2" /> Se detaljer
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => onAction("start_new")}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-6 px-8 rounded-2xl text-lg font-bold shadow-lg shadow-blue-500/20"
                >
                  <Play className="w-5 h-5 mr-2 fill-current" /> Begynn nå
                </Button>
              )}
            </div>
          </div>

          {/* Live Action Tracker */}
          {isBotActive && lastTrade && (
            <div className="mt-10 pt-8 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  Siste Fullførte Handling
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className={cn(
                        "font-bold text-sm px-2 py-0.5 rounded mr-2",
                        lastTrade.side === "buy"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400",
                      )}
                    >
                      {lastTrade.side === "buy" ? "KJØPT" : "SOLGT"}
                    </span>
                    <span className="text-white font-medium">
                      {(lastTrade as unknown as { trading_pair?: string }).trading_pair || lastTrade.symbol}
                    </span>
                  </div>
                  <span className="text-slate-400 text-sm">
                    {formatNOK(lastTrade.total_value)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  Gjeldende Status
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">
                    {realtimeData?.lastStatusMessage || "Overvåker prisbevegelser"}
                  </span>
                  <span className="text-blue-400 text-sm font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                    LIVE
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Active Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="text-xl font-bold text-white col-span-full mb-2">
            Mine Strategier
          </h2>
          {activeStrategies.length === 0 ? (
            <div className="col-span-full bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 p-8 text-center">
              <p className="text-slate-500">
                Du har ingen aktive strategier akkurat nå.
              </p>
            </div>
          ) : (
            activeStrategies.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl bg-slate-800 w-12 h-12 rounded-xl flex items-center justify-center">
                    {STRATEGY_ICONS[s.strategy_id] || "🔥"}
                  </div>
                  <div>
                    <h4 className="font-bold text-white capitalize">
                      {s.strategy_id.replace("_", " ")}
                    </h4>
                    <p className="text-xs text-slate-500 tracking-wide uppercase">
                      {s.trading_pair} • {s.mode === "paper" ? "PAPIR" : "LIVE"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "font-bold text-lg",
                      s.total_pnl >= 0 ? "text-green-400" : "text-red-400",
                    )}
                  >
                    {s.total_pnl >= 0 ? "+" : ""}
                    {formatNOK(s.total_pnl)}
                  </div>
                  <div className="text-xs text-slate-500">P&L Totalt</div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Recent Trades Table */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              <h3 className="font-bold text-white text-lg">Siste Handler</h3>
            </div>
            <Button
              variant="ghost"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 h-8"
            >
              Se alle <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                  <th className="px-6 py-4">Handling</th>
                  <th className="px-6 py-4">Symbol</th>
                  <th className="px-6 py-4 text-right">Pris</th>
                  <th className="px-6 py-4 text-right">Verdi</th>
                  <th className="px-6 py-4 text-right">P&L</th>
                  <th className="px-6 py-4 text-right">Tid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentTrades.slice(0, 5).map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                          t.side === "buy"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400",
                        )}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {(t as unknown as { trading_pair?: string }).trading_pair || t.symbol}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">
                      {formatNOK(t.price)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">
                      {formatNOK(t.total_value)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.realized_pnl ? (
                        <span
                          className={
                            t.realized_pnl >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {t.realized_pnl >= 0 ? "+" : ""}
                          {formatNOK(t.realized_pnl)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                      {new Date(t.executed_at).toLocaleTimeString("no-NO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
                {recentTrades.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      Ingen handler ennå. Boten vil handle når signalene er
                      rette.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sidebar - P&L and Sparklines */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Quick P&L Overview */}
        <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="bg-slate-950/50 border-b border-slate-800 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-blue-400" /> Oversikt
            </CardTitle>
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[10px]">
              TOTALT
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">
                Portefølje Verdi
              </p>
              <div className="text-3xl font-black text-white">
                {formatNOK(portfolio?.total_value || 0)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  label: "Daglig Resultat",
                  value: pnlToday,
                  percent: `${pnlToday >= 0 ? "+" : ""}${((pnlToday / (portfolio?.total_value || 1)) * 100).toFixed(2)}%`,
                  up: pnlToday >= 0,
                },
                {
                  label: "Ukentlig Resultat",
                  value: pnlWeek,
                  percent: `${pnlWeek >= 0 ? "+" : ""}${((pnlWeek / (portfolio?.total_value || 1)) * 100).toFixed(2)}%`,
                  up: pnlWeek >= 0,
                },
                {
                  label: "Månedlig Resultat",
                  value: pnlMonth,
                  percent: `${pnlMonth >= 0 ? "+" : ""}${((pnlMonth / (portfolio?.total_value || 1)) * 100).toFixed(2)}%`,
                  up: pnlMonth >= 0,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50"
                >
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {stat.label}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {formatNOK(stat.value)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex items-center text-xs font-black",
                      stat.up ? "text-green-400" : "text-red-400",
                    )}
                  >
                    {stat.up ? (
                      <BarChart3 className="w-3 h-3 mr-1" />
                    ) : (
                      <BarChart3 className="w-3 h-3 mr-1 rotate-180" />
                    )}
                    {stat.percent}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-4">
              <p className="text-xs text-slate-500">Gjennomsnittlig Win Rate</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${portfolio?.win_rate || 65}%` }}
                  />
                </div>
                <span className="text-lg font-black text-white">
                  {portfolio?.win_rate?.toFixed(1) || "65.0"}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="py-4 px-6 border-b border-slate-800">
            <CardTitle className="text-white text-sm">
              Hurtighandlinger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <Button
              onClick={() => onAction("new_strategy")}
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-xl py-6 group"
            >
              <Zap className="w-5 h-5 mr-3 text-yellow-500 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="font-bold text-sm">Ny Strategi</div>
                <div className="text-[10px] text-slate-500">
                  Utforsk markedsplassen
                </div>
              </div>
            </Button>
            <Button
              onClick={() => onAction("stop_all")}
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:bg-red-500/10 hover:text-red-400 rounded-xl py-6 group"
            >
              <Pause className="w-5 h-5 mr-3 text-red-500 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="font-bold text-sm">Stopp Alt</div>
                <div className="text-[10px] text-slate-500">Emergency stop</div>
              </div>
            </Button>
            <Link href={`/${locale}/copy-trading`}>
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-xl py-6 group mt-2"
              >
                <BarChart3 className="w-5 h-5 mr-3 text-blue-500 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="font-bold text-sm">Kopier Trading</div>
                  <div className="text-[10px] text-slate-500">
                    Følg suksessfulle tradere
                  </div>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
