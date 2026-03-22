"use client";

/**
 * Bot Status Dashboard - KLA-100
 * Hybrid dashboard med narrativ "boten jobber for deg" + avansert fane
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/utils";
import { Portfolio, Trade, UserStrategy } from "@/lib/trading-api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  sumEffectivePnlSince,
  winRateEffective,
  effectiveDeltaForApiTrade,
} from "@/lib/trading/trade-effective-pnl";
import {
  generateBotStatusMessage,
  formatTimeUntil,
  BotStatusMessage,
} from "@/lib/bot-status-helpers";
import { getStrategyIconComponent } from "@/lib/trading/strategy-icons";
import AdvancedStatsModal from "./AdvancedStatsModal";
import AIDecisionPanel from "@/components/ai/AIDecisionPanel";
import { TABLE } from "@/lib/design/tokens";
import { RobotThinkingStrip } from "@/components/trading/RobotThinkingStrip";

interface BotStatusDashboardProps {
  portfolio: Portfolio | null;
  activeStrategies: UserStrategy[];
  recentTrades: Trade[];
  onAction: (action: string) => void;
  formatNOK: (v: number) => string;
  userId?: string;
}

interface RealtimeUpdate {
  lastAnalysisDetails: Record<string, unknown> | null;
  nextExpectedActionAt: string | null;
  lastStatusMessage: string | null;
}

function mapUserStrategiesPayload(
  raw: Record<string, unknown>,
): RealtimeUpdate {
  const lastAnalysis = raw.last_analysis_details ?? raw.lastAnalysisDetails;
  const nextAt = raw.next_expected_action_at ?? raw.nextExpectedActionAt;
  const lastMsg = raw.last_status_message ?? raw.lastStatusMessage;
  return {
    lastAnalysisDetails:
      lastAnalysis !== undefined && lastAnalysis !== null
        ? (lastAnalysis as Record<string, unknown>)
        : null,
    nextExpectedActionAt:
      typeof nextAt === "string"
        ? nextAt
        : nextAt != null
          ? String(nextAt)
          : null,
    lastStatusMessage:
      typeof lastMsg === "string"
        ? lastMsg
        : lastMsg != null
          ? String(lastMsg)
          : null,
  };
}

// TESTPLAN KLA-100: Tab-fane for å bytte mellom narrativ, avansert og AI visning
type DashboardView = "narrative" | "advanced" | "ai";

export default function BotStatusDashboard({
  portfolio,
  activeStrategies,
  recentTrades,
  onAction,
  formatNOK,
  userId,
}: BotStatusDashboardProps) {
  const { locale } = useParams();
  const lang = (locale as string) || "no";
  const isBotActive = activeStrategies.length > 0;
  const mainStrategy = activeStrategies[0];
  const lastTrade = recentTrades[0];

  const [realtimeData, setRealtimeData] = useState<RealtimeUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<DashboardView>("narrative");
  const [botStatus, setBotStatus] = useState<BotStatusMessage | null>(null);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);

  // KLA-100: Generer bot-status melding med hjelpefunksjoner
  useEffect(() => {
    const status = generateBotStatusMessage(
      lastTrade,
      mainStrategy || null,
      lang,
    );
    setBotStatus(status);
  }, [lastTrade, mainStrategy, lang]);

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
              // Oppdater botStatus med API-data
              setBotStatus((prev) =>
                prev
                  ? {
                      ...prev,
                      nextActionTime: nextAction,
                    }
                  : null,
              );
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
          const newData = mapUserStrategiesPayload(
            payload.new as Record<string, unknown>,
          );
          setRealtimeData(newData);

          // Update next check time
          if (newData.nextExpectedActionAt) {
            const nextAction = new Date(newData.nextExpectedActionAt);
            setBotStatus((prev) =>
              prev
                ? {
                    ...prev,
                    nextActionTime: nextAction,
                  }
                : null,
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mainStrategy]);

  const pnlToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return sumEffectivePnlSince(recentTrades, start.getTime());
  }, [recentTrades]);

  const pnlWeek = useMemo(
    () => sumEffectivePnlSince(recentTrades, Date.now() - 7 * 86400000),
    [recentTrades],
  );

  const pnlMonth = useMemo(
    () => sumEffectivePnlSince(recentTrades, Date.now() - 30 * 86400000),
    [recentTrades],
  );

  const totalValue = portfolio?.total_value || 0;
  const winRateEffectiveVal = useMemo(
    () => winRateEffective(recentTrades),
    [recentTrades],
  );
  const winRate =
    winRateEffectiveVal ??
    (portfolio?.win_rate != null ? portfolio.win_rate : null);

  /** Krever daglige avkastningsserier — ikke vis falske tall. */
  const sharpeRatio: number | null = null;
  const maxDrawdown: number | null = null;

  // Determine risk level
  const getRiskLevel = (
    strategyId: string,
  ): { label: string; color: string } => {
    if (strategyId.includes("dca") || strategyId.includes("trygg")) {
      return { label: lang === "en" ? "Low" : "Lav", color: "text-green-400" };
    }
    if (strategyId.includes("trend") || strategyId.includes("balansert")) {
      return {
        label: lang === "en" ? "Balanced" : "Balansert",
        color: "text-blue-400",
      };
    }
    if (strategyId.includes("multi") || strategyId.includes("aktiv")) {
      return {
        label: lang === "en" ? "High" : "Høy",
        color: "text-orange-400",
      };
    }
    return {
      label: lang === "en" ? "Balanced" : "Balansert",
      color: "text-yellow-400",
    };
  };

  const risk = mainStrategy
    ? getRiskLevel(mainStrategy.strategy_id)
    : { label: "-", color: "text-slate-400" };

  // Formater tid til neste sjekk
  const nextCheckFormatted = botStatus?.nextActionTime
    ? formatTimeUntil(botStatus.nextActionTime, lang)
    : lang === "en"
      ? "Soon"
      : "Snart";

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
          <BarChart3 className="w-4 h-4" />{" "}
          {lang === "en" ? "Leaderboard" : "Ledertavle"}
        </Link>
        <Link
          href={`/${locale}/marketplace`}
          className="p-3 px-6 text-slate-400 hover:text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />{" "}
          {lang === "en" ? "Market" : "Marked"}
        </Link>
        <div className="w-px h-6 bg-slate-800 mx-1" />
        {/* KLA-100: Tab-basert navigasjon: Narrativ, Avansert, AI */}
        <button
          onClick={() => setCurrentView("narrative")}
          className={cn(
            "p-3 px-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors",
            currentView === "narrative"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white",
          )}
        >
          <LayoutDashboard className="w-4 h-4" />{" "}
          {lang === "en" ? "Overview" : "Oversikt"}
        </button>
        <button
          onClick={() => setCurrentView("advanced")}
          className={cn(
            "p-3 px-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors",
            currentView === "advanced"
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:text-white",
          )}
        >
          <Settings2 className="w-4 h-4" />{" "}
          {lang === "en" ? "Advanced" : "Avansert"}
        </button>
        <button
          onClick={() => setCurrentView("ai")}
          className={cn(
            "p-3 px-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors",
            currentView === "ai"
              ? "bg-[#0052FF] text-white"
              : "text-slate-400 hover:text-white",
          )}
        >
          <Brain className="w-4 h-4" /> AI
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        <AnimatePresence mode="wait">
          {currentView === "narrative" && (
            <NarrativeView
              key="narrative"
              isBotActive={isBotActive}
              mainStrategy={mainStrategy}
              botStatus={botStatus}
              lastTrade={lastTrade}
              risk={risk}
              nextCheckFormatted={nextCheckFormatted}
              realtimeData={realtimeData}
              onAction={onAction}
              formatNOK={formatNOK}
              lang={lang}
            />
          )}
          {currentView === "advanced" && (
            <AdvancedView
              key="advanced"
              portfolio={portfolio}
              activeStrategies={activeStrategies}
              recentTrades={recentTrades}
              pnlToday={pnlToday}
              pnlWeek={pnlWeek}
              pnlMonth={pnlMonth}
              sharpeRatio={sharpeRatio}
              maxDrawdown={maxDrawdown}
              winRate={winRate}
              formatNOK={formatNOK}
              lang={lang}
            />
          )}
          {currentView === "ai" && userId && mainStrategy && (
            <AIView
              key="ai"
              userId={userId}
              strategyId={mainStrategy.strategy_id}
              lang={lang}
            />
          )}
        </AnimatePresence>

        {/* Active Strategies Grid - vises i begge visninger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="text-xl font-bold text-white col-span-full mb-2">
            {lang === "en" ? "My Strategies" : "Mine Strategier"}
          </h2>
          {activeStrategies.length === 0 ? (
            <div className="col-span-full bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 p-8 text-center">
              <p className="text-slate-500">
                {lang === "en"
                  ? "You have no active strategies right now."
                  : "Du har ingen aktive strategier akkurat nå."}
              </p>
            </div>
          ) : (
            activeStrategies.map((s, idx) => {
              const StrategyIcon = getStrategyIconComponent(s.strategy_id);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between group hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-800 w-12 h-12 rounded-xl flex items-center justify-center">
                      <StrategyIcon
                        className="h-6 w-6 text-[#0052FF]"
                        aria-hidden
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-white capitalize">
                        {s.strategy_id.replace("_", " ")}
                      </h4>
                      <p className="text-xs text-slate-500 tracking-wide uppercase">
                        {s.trading_pair} •{" "}
                        {s.mode === "paper" ? "PAPER" : "LIVE"}
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
                    <div className="text-xs text-slate-500">
                      {lang === "en" ? "P&L Total" : "P&L Totalt"}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Recent Trades Table */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              <h3 className="font-bold text-white text-lg">
                {lang === "en" ? "Recent Trades" : "Siste Handler"}
              </h3>
            </div>
            <Button
              variant="ghost"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 h-8"
            >
              {lang === "en" ? "See all" : "Se alle"}{" "}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                  <th className="px-6 py-4">
                    {lang === "en" ? "Action" : "Handling"}
                  </th>
                  <th className="px-6 py-4">
                    {lang === "en" ? "Symbol" : "Symbol"}
                  </th>
                  <th className="px-6 py-4 text-right">
                    {lang === "en" ? "Price" : "Pris"}
                  </th>
                  <th className="px-6 py-4 text-right">
                    {lang === "en" ? "Value" : "Verdi"}
                  </th>
                  <th className="px-6 py-4 text-right">P&L</th>
                  <th className="px-6 py-4 text-right">
                    {lang === "en" ? "Time" : "Tid"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentTrades.slice(0, 15).map((t) => (
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
                      {(t as unknown as { trading_pair?: string })
                        .trading_pair || t.symbol}
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
                      {new Date(
                        t.executed_at || t.created_at,
                      ).toLocaleTimeString(lang === "en" ? "en-US" : "no-NO", {
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
                      {lang === "en"
                        ? "No trades yet. The bot will trade when signals are right."
                        : "Ingen handler ennå. Boten vil handle når signalene er rette."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sidebar - P&L and Quick Actions */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Quick P&L Overview */}
        <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="bg-slate-950/50 border-b border-slate-800 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-blue-400" />{" "}
              {lang === "en" ? "Overview" : "Oversikt"}
            </CardTitle>
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[10px]">
              TOTAL
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">
                {lang === "en" ? "Portfolio Value" : "Portefølje Verdi"}
              </p>
              <div className="text-3xl font-black text-white">
                {formatNOK(portfolio?.total_value || 0)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  label: lang === "en" ? "Daily Result" : "Daglig Resultat",
                  value: pnlToday,
                  percent: `${pnlToday >= 0 ? "+" : ""}${((pnlToday / (portfolio?.total_value || 1)) * 100).toFixed(2)}%`,
                  up: pnlToday >= 0,
                },
                {
                  label: lang === "en" ? "Weekly Result" : "Ukentlig Resultat",
                  value: pnlWeek,
                  percent: `${pnlWeek >= 0 ? "+" : ""}${((pnlWeek / (portfolio?.total_value || 1)) * 100).toFixed(2)}%`,
                  up: pnlWeek >= 0,
                },
                {
                  label: lang === "en" ? "Monthly Result" : "Månedlig Resultat",
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
              <p className="text-xs text-slate-500">
                {lang === "en"
                  ? "Average Win Rate"
                  : "Gjennomsnittlig Win Rate"}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${winRate != null ? Math.min(100, Math.max(0, winRate)) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-lg font-black text-white">
                  {winRate == null ? "—" : `${winRate.toFixed(1)}%`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="py-4 px-6 border-b border-slate-800">
            <CardTitle className="text-white text-sm">
              {lang === "en" ? "Quick Actions" : "Hurtighandlinger"}
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
                <div className="font-bold text-sm">
                  {lang === "en" ? "New Strategy" : "Ny Strategi"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {lang === "en"
                    ? "Explore marketplace"
                    : "Utforsk markedsplassen"}
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
                <div className="font-bold text-sm">
                  {lang === "en" ? "Stop All" : "Stopp Alt"}
                </div>
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
                  <div className="font-bold text-sm">
                    {lang === "en" ? "Copy Trading" : "Kopier Trading"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {lang === "en"
                      ? "Follow successful traders"
                      : "Følg suksessfulle tradere"}
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

// KLA-100: Narrativ visning - "boten jobber for deg"
function NarrativeView({
  isBotActive,
  mainStrategy,
  botStatus,
  lastTrade,
  risk,
  nextCheckFormatted,
  realtimeData,
  onAction,
  formatNOK,
  lang,
}: {
  isBotActive: boolean;
  mainStrategy: UserStrategy | undefined;
  botStatus: BotStatusMessage | null;
  lastTrade: Trade | null;
  risk: { label: string; color: string };
  nextCheckFormatted: string;
  realtimeData: RealtimeUpdate | null;
  onAction: (action: string) => void;
  formatNOK: (v: number) => string;
  lang: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700 p-8 shadow-2xl"
    >
      {/* Decorative radial gradient */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {isBotActive && (
        <div className="relative z-10 mb-6">
          <RobotThinkingStrip compact />
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative z-10">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                isBotActive ? "bg-green-500 animate-pulse" : "bg-yellow-500",
              )}
            />
            <h1 className="text-3xl lg:text-4xl font-black text-white">
              {isBotActive
                ? lang === "en"
                  ? "Bot is working"
                  : "Boten jobber"
                : lang === "en"
                  ? "Waiting for you"
                  : "Venter på deg"}
            </h1>
          </div>

          <p className="text-lg text-slate-400 max-w-lg text-center md:text-left leading-relaxed">
            {isBotActive && mainStrategy
              ? `${lang === "en" ? "Your bot is running" : "Ditt bot kjører"} ${mainStrategy.strategy_id.replace(/_/g, " ")} ${lang === "en" ? "on" : "på"} ${mainStrategy.trading_pair}.`
              : lang === "en"
                ? "You have no active strategies right now. Start a strategy to begin automated trading."
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
                  {nextCheckFormatted}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-slate-800/50 border-slate-700 text-slate-300 py-1.5 px-3"
                >
                  <Zap className={`w-3.5 h-3.5 mr-2 ${risk.color}`} />
                  {lang === "en" ? "Risk" : "Risiko"}: {risk.label}
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
                <Pause className="w-4 h-4 mr-2" />{" "}
                {lang === "en" ? "Pause Bot" : "Pause Bot"}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onAction("start_new")}
              className="bg-blue-600 hover:bg-blue-700 text-white py-6 px-8 rounded-2xl text-lg font-bold shadow-lg shadow-blue-500/20"
            >
              <Play className="w-5 h-5 mr-2 fill-current" />{" "}
              {lang === "en" ? "Start Now" : "Begynn nå"}
            </Button>
          )}
        </div>
      </div>

      {/* Live Action Tracker - KLA-100: Siste handling + Neste handling */}
      {isBotActive && (
        <div className="mt-10 pt-8 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Siste handling */}
          <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              {lang === "en"
                ? "Last Completed Action"
                : "Siste Fullførte Handling"}
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium text-lg">
                {botStatus?.lastActionText ||
                  (lang === "en" ? "No trades yet" : "Ingen handler ennå")}
              </p>
              {botStatus?.statusExplanation && (
                <p className="text-sm text-slate-400">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 rounded text-xs">
                    <Brain className="w-3 h-3" />
                    {botStatus.statusExplanation}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Neste handling */}
          <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              {lang === "en" ? "Current Status" : "Gjeldende Status"}
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium text-lg">
                {botStatus?.nextActionText ||
                  (lang === "en"
                    ? "Scanning market..."
                    : "Scanner markedet...")}
              </p>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                {botStatus?.statusExplanation ||
                  (lang === "en"
                    ? "Monitoring price movements"
                    : "Overvåker prisbevegelser")}
              </p>
              {botStatus?.nextActionTime && (
                <p className="text-xs text-blue-400 mt-1">
                  {lang === "en" ? "Next check" : "Neste sjekk"}:{" "}
                  {nextCheckFormatted}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// KLA-100: Avansert visning - P&L, Sharpe, Drawdown, osv.
function AdvancedView({
  portfolio,
  activeStrategies,
  recentTrades,
  pnlToday,
  pnlWeek,
  pnlMonth,
  sharpeRatio,
  maxDrawdown,
  winRate,
  formatNOK,
  lang,
}: {
  portfolio: Portfolio | null;
  activeStrategies: UserStrategy[];
  recentTrades: Trade[];
  pnlToday: number;
  pnlWeek: number;
  pnlMonth: number;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  winRate: number | null;
  formatNOK: (v: number) => string;
  lang: string;
}) {
  const totalTrades = activeStrategies.reduce(
    (sum, s) => sum + s.total_trades,
    0,
  );
  const totalPnl = activeStrategies.reduce((sum, s) => sum + s.total_pnl, 0);

  // Beregn gjennomsnittlig trade størrelse
  const avgTradeValue =
    recentTrades.length > 0
      ? recentTrades.reduce((sum, t) => sum + t.total_value, 0) /
        recentTrades.length
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700 p-8 shadow-2xl"
    >
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              {lang === "en" ? "Advanced Statistics" : "Avansert Statistikk"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {lang === "en"
                ? "Detailed performance metrics"
                : "Detaljerte ytelsesmålinger"}
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Sharpe Ratio */}
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold mb-2">
              <TrendingUp className="w-4 h-4" />
              Sharpe Ratio
            </div>
            <div
              className={cn(
                "text-2xl font-black",
                sharpeRatio == null
                  ? "text-slate-500"
                  : sharpeRatio >= 1
                    ? "text-green-400"
                    : sharpeRatio >= 0
                      ? "text-yellow-400"
                      : "text-red-400",
              )}
            >
              {sharpeRatio == null ? "—" : sharpeRatio.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {sharpeRatio == null
                ? lang === "en"
                  ? "Needs daily return series"
                  : "Krever daglig avkastningsserie"
                : sharpeRatio >= 1
                  ? lang === "en"
                    ? "Good risk-adjusted returns"
                    : "God risikojustert avkastning"
                  : lang === "en"
                    ? "Below optimal"
                    : "Under optimalt"}
            </p>
          </div>

          {/* Max Drawdown */}
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold mb-2">
              <TrendingDown className="w-4 h-4" />
              {lang === "en" ? "Max Drawdown" : "Maks Drawdown"}
            </div>
            <div
              className={cn(
                "text-2xl font-black",
                maxDrawdown == null
                  ? "text-slate-500"
                  : maxDrawdown > -10
                    ? "text-green-400"
                    : maxDrawdown > -20
                      ? "text-yellow-400"
                      : "text-red-400",
              )}
            >
              {maxDrawdown == null ? "—" : `${maxDrawdown.toFixed(1)}%`}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {maxDrawdown == null
                ? lang === "en"
                  ? "Needs equity curve"
                  : "Krever egenkapitalkurve"
                : maxDrawdown > -10
                  ? lang === "en"
                    ? "Low risk"
                    : "Lav risiko"
                  : lang === "en"
                    ? "Higher risk"
                    : "Høyere risiko"}
            </p>
          </div>

          {/* Win Rate */}
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold mb-2">
              <CheckCircle2 className="w-4 h-4" />
              {lang === "en" ? "Win Rate" : "Win Rate"}
            </div>
            <div
              className={cn(
                "text-2xl font-black",
                winRate == null
                  ? "text-slate-500"
                  : winRate >= 60
                    ? "text-green-400"
                    : winRate >= 50
                      ? "text-yellow-400"
                      : "text-red-400",
              )}
            >
              {winRate == null ? "—" : `${winRate.toFixed(1)}%`}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {totalTrades} {lang === "en" ? "trades" : "handler"}
            </p>
          </div>

          {/* Avg Trade Size */}
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold mb-2">
              <Activity className="w-4 h-4" />
              {lang === "en" ? "Avg Trade" : "Gj.snitt Trade"}
            </div>
            <div className="text-2xl font-black text-white">
              {formatNOK(avgTradeValue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === "en" ? "Position size" : "Posisjonsstørrelse"}
            </p>
          </div>
        </div>

        {/* P&L Breakdown */}
        <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30">
          <h3 className="text-lg font-bold text-white mb-4">
            {lang === "en" ? "Profit & Loss Breakdown" : "Resultat-oppdeling"}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: lang === "en" ? "Today" : "I dag", value: pnlToday },
              {
                label: lang === "en" ? "This Week" : "Denne uken",
                value: pnlWeek,
              },
              {
                label: lang === "en" ? "This Month" : "Denne måneden",
                value: pnlMonth,
              },
              {
                label: lang === "en" ? "Total P&L" : "Totalt P&L",
                value: totalPnl,
              },
              {
                label: lang === "en" ? "Best Trade" : "Beste Trade",
                value:
                  recentTrades.length > 0
                    ? Math.max(
                        ...recentTrades.map((t) =>
                          effectiveDeltaForApiTrade(t),
                        ),
                      )
                    : 0,
              },
              {
                label: lang === "en" ? "Worst Trade" : "Verste Trade",
                value:
                  recentTrades.length > 0
                    ? Math.min(
                        ...recentTrades.map((t) =>
                          effectiveDeltaForApiTrade(t),
                        ),
                      )
                    : 0,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="text-center p-3 rounded-xl bg-slate-800/50"
              >
                <p className="text-xs text-slate-500 uppercase mb-1">
                  {item.label}
                </p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    item.value >= 0 ? "text-green-400" : "text-red-400",
                  )}
                >
                  {item.value >= 0 ? "+" : ""}
                  {formatNOK(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// AI Professor View - KLA-119
interface AIViewProps {
  userId: string;
  strategyId: string;
  lang: string;
}

function AIView({ userId, strategyId, lang }: AIViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* AI Professor Header */}
      <div className="bg-linear-to-r from-[#0052FF]/10 to-blue-900/20 border border-[#0052FF]/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#0052FF]/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-[#0052FF]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {lang === "en" ? "Krypto Professor" : "Krypto Professor"}
            </h2>
            <p className="text-slate-400 text-sm">
              {lang === "en"
                ? "Smart trading insights and market analysis"
                : "Smarte tradinginnsikter og markedsanalyse"}
            </p>
          </div>
        </div>
      </div>

      {/* AI Decision Panel */}
      <AIDecisionPanel userId={userId} strategyId={strategyId} locale={lang} />
    </motion.div>
  );
}
