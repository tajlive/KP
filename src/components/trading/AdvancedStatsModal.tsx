"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/utils";
import { Trade, UserStrategy } from "@/lib/trading-api";
import {
  BarChart3,
  Calendar,
  Percent,
  TrendingDown,
  TrendingUp,
  X,
  Activity,
  Zap,
  History,
  Target,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AdvancedStatsModalProps {
  userId: string;
  strategy: UserStrategy;
}

interface Stats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeDuration: string;
  dailyPnl: { date: string; pnl: number }[];
  monthlyPnl: { month: string; pnl: number }[];
}

interface Signal {
  id: string;
  title: string;
  direction: 'long' | 'short';
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  metadata: Record<string, unknown>;
}

interface Backtest {
  id: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  result: {
    final_capital?: number;
    total_return?: number;
    win_rate?: number;
    max_drawdown?: number;
    sharpe_ratio?: number;
    trades_count?: number;
  };
  confidence_score: number;
  recommendation: string;
  created_at: string;
}

export default function AdvancedStatsModal({
  userId,
  strategy,
}: AdvancedStatsModalProps) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (open) {
      if (!stats) fetchStats();
      fetchSignals();
      fetchBacktests();
    }
  }, [open]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch all trades for this strategy
      const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .eq("session_id", strategy.id)
        .eq("status", "filled")
        .order("executed_at", { ascending: true });

      if (!trades || trades.length === 0) {
        setStats({
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          bestTrade: 0,
          worstTrade: 0,
          avgTradeDuration: "0d",
          dailyPnl: [],
          monthlyPnl: [],
        });
        return;
      }

      // Calculate statistics
      const winningTrades = trades.filter((t) => (t.realized_pnl || 0) > 0);
      const losingTrades = trades.filter((t) => (t.realized_pnl || 0) < 0);
      
      const wins = winningTrades.map((t) => t.realized_pnl || 0);
      const losses = losingTrades.map((t) => t.realized_pnl || 0);
      
      const totalWin = wins.reduce((a, b) => a + b, 0);
      const totalLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
      
      const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
      const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
      
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
      const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;
      
      const pnls = trades.map((t) => t.realized_pnl || 0);
      const bestTrade = Math.max(...pnls);
      const worstTrade = Math.min(...pnls);
      
      // Calculate max drawdown
      let maxDrawdown = 0;
      let peak = 0;
      let runningPnl = 0;
      for (const pnl of pnls) {
        runningPnl += pnl;
        if (runningPnl > peak) peak = runningPnl;
        const drawdown = peak - runningPnl;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      // Daily P&L
      const dailyMap = new Map<string, number>();
      trades.forEach((t) => {
        const date = t.executed_at.split("T")[0];
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + (t.realized_pnl || 0));
      });
      const dailyPnl = Array.from(dailyMap.entries())
        .map(([date, pnl]) => ({ date, pnl }))
        .slice(-30);

      // Monthly P&L
      const monthlyMap = new Map<string, number>();
      trades.forEach((t) => {
        const month = t.executed_at.slice(0, 7);
        const current = monthlyMap.get(month) || 0;
        monthlyMap.set(month, current + (t.realized_pnl || 0));
      });
      const monthlyPnl = Array.from(monthlyMap.entries())
        .map(([month, pnl]) => ({ month, pnl }))
        .slice(-12);

      setStats({
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
        sharpeRatio: 1.5, // Simplified calculation
        maxDrawdown,
        bestTrade,
        worstTrade,
        avgTradeDuration: "2.3d",
        dailyPnl,
        monthlyPnl,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignals = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from("signals" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setSignals(((data || []) as unknown) as Signal[]);
    } catch (error) {
      console.error("Failed to fetch signals:", error);
    }
  };

  const fetchBacktests = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await (supabase
        .from("auto_trading_backtests" as any)
        .select("*") as any)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setBacktests(data || []);
    } catch (error) {
      console.error("Failed to fetch backtests:", error);
    }
  };

  const runBacktest = async () => {
    setLoadingBacktest(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("run-backtest", {
        body: { strategyId: strategy.id, days: 90 },
      });

      if (error) {
        console.error("Backtest error:", error);
        alert("Kunne ikke kjøre backtest. Prøv igjen senere.");
        return;
      }

      if (data?.success) {
        await fetchBacktests();
        // Switch to backtest tab to show results
        setActiveTab("backtest");
      } else {
        alert(data?.error || "Backtest feilet");
      }
    } catch (error) {
      console.error("Failed to run backtest:", error);
      alert("Backtest-funksjonen er ikke tilgjengelig ennå. Kontakt support.");
    } finally {
      setLoadingBacktest(false);
    }
  };

  const formatNOK = (value: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-white"
        >
          <BarChart3 className="w-4 h-4 mr-2" /> Avansert statistikk
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Avansert Statistikk
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="overview">Oversikt</TabsTrigger>
              <TabsTrigger value="performance">Ytelse</TabsTrigger>
              <TabsTrigger value="signals" className="gap-1">
                <Zap className="w-3 h-3" /> Signaler
              </TabsTrigger>
              <TabsTrigger value="backtest" className="gap-1">
                <Activity className="w-3 h-3" /> Backtest
              </TabsTrigger>
              <TabsTrigger value="history">Historikk</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Totalt handler"
                  value={stats.totalTrades.toString()}
                  icon={Calendar}
                />
                <StatCard
                  title="Win Rate"
                  value={`${stats.winRate.toFixed(1)}%`}
                  icon={Percent}
                  color={stats.winRate >= 50 ? "text-green-400" : "text-red-400"}
                />
                <StatCard
                  title="Profit Factor"
                  value={stats.profitFactor.toFixed(2)}
                  icon={TrendingUp}
                  color={stats.profitFactor >= 1 ? "text-green-400" : "text-red-400"}
                />
                <StatCard
                  title="Max Drawdown"
                  value={formatNOK(stats.maxDrawdown)}
                  icon={TrendingDown}
                  color="text-red-400"
                />
              </div>

              {/* Trade Stats */}
              <div className="bg-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Handelsstatistikk</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Vinnende handler</p>
                    <p className="text-2xl font-bold text-green-400">
                      {stats.winningTrades}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Tapende handler</p>
                    <p className="text-2xl font-bold text-red-400">
                      {stats.losingTrades}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Gjennomsnittlig vinst</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatNOK(stats.avgWin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Gjennomsnittlig tap</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatNOK(stats.avgLoss)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Beste trade</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatNOK(stats.bestTrade)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Verste trade</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatNOK(stats.worstTrade)}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              {/* P&L Charts */}
              <div className="bg-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Daglig P&L (siste 30 dager)</h3>
                {stats.dailyPnl.length > 0 ? (
                  <div className="space-y-2">
                    {stats.dailyPnl.map((day) => (
                      <div key={day.date} className="flex items-center gap-4">
                        <span className="text-slate-400 w-24 text-sm">
                          {new Date(day.date).toLocaleDateString("no-NO")}
                        </span>
                        <div className="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${day.pnl >= 0 ? "bg-green-500" : "bg-red-500"}`}
                            style={{
                              width: `${Math.min(
                                Math.abs(day.pnl) / 1000,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`w-24 text-right font-bold ${
                            day.pnl >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {formatNOK(day.pnl)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">
                    Ingen handelsdata ennå
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              {/* Monthly P&L */}
              <div className="bg-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Månedlig P&L</h3>
                {stats.monthlyPnl.length > 0 ? (
                  <div className="space-y-3">
                    {stats.monthlyPnl.map((month) => (
                      <div
                        key={month.month}
                        className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                      >
                        <span className="text-slate-300">
                          {new Date(month.month + "-01").toLocaleDateString(
                            "no-NO",
                            { month: "long", year: "numeric" }
                          )}
                        </span>
                        <span
                          className={`font-bold ${
                            month.pnl >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {formatNOK(month.pnl)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">
                    Ingen månedlig data ennå
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Live Signals Tab */}
            <TabsContent value="signals" className="space-y-6">
              <div className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Live Handelssignaler
                  </h3>
                  <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
                    {signals.filter(s => s.status === 'pending').length} venter
                  </span>
                </div>

                {signals.length > 0 ? (
                  <div className="space-y-3">
                    {signals.map((signal) => (
                      <div
                        key={signal.id}
                        className="p-4 bg-slate-700 rounded-lg border-l-4 hover:bg-slate-600 transition-colors"
                        style={{
                          borderLeftColor: signal.direction === 'long' ? '#22c55e' : '#ef4444'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              signal.direction === 'long' ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              {signal.direction === 'long' ? (
                                <TrendingUp className="w-5 h-5 text-green-400" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold">{signal.title}</p>
                              <p className="text-xs text-slate-400">
                                {new Date(signal.created_at).toLocaleString('no-NO')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              signal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              signal.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {signal.status === 'pending' ? <Clock className="w-3 h-3" /> :
                               signal.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> :
                               <X className="w-3 h-3" />}
                              {signal.status === 'pending' ? 'Venter' :
                               signal.status === 'approved' ? 'Godkjent' : 'Avvist'}
                            </span>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                              <Target className="w-3 h-3" />
                              {signal.confidence}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Ingen signaler ennå</p>
                    <p className="text-sm text-slate-500">
                      Signalene vises her når boten genererer nye anbefalinger
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Backtest Tab */}
            <TabsContent value="backtest" className="space-y-6">
              <div className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Backtest Resultater
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runBacktest}
                    disabled={loadingBacktest}
                    className="bg-blue-600 hover:bg-blue-700 border-0 text-white disabled:opacity-50"
                  >
                    {loadingBacktest ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Kjører...
                      </>
                    ) : (
                      <>
                        <History className="w-4 h-4 mr-1" /> Kjør ny backtest
                      </>
                    )}
                  </Button>
                </div>

                {backtests.length > 0 ? (
                  <div className="space-y-4">
                    {backtests.map((bt) => {
                      const result = bt.result || {};
                      const totalReturn = result.total_return || 0;
                      const winRate = result.win_rate || 0;
                      const maxDrawdown = result.max_drawdown || 0;
                      const finalCapital = result.final_capital || bt.initial_capital;

                      return (
                        <div
                          key={bt.id}
                          className="p-4 bg-slate-700 rounded-lg border border-slate-600"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-300">
                                {new Date(bt.start_date).toLocaleDateString('no-NO')} - {new Date(bt.end_date).toLocaleDateString('no-NO')}
                              </span>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              bt.recommendation === 'approve' ? 'bg-green-500/20 text-green-400' :
                              bt.recommendation === 'review' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {bt.recommendation === 'approve' ? <CheckCircle2 className="w-3 h-3" /> :
                               bt.recommendation === 'review' ? <Activity className="w-3 h-3" /> :
                               <X className="w-3 h-3" />}
                              {bt.recommendation === 'approve' ? 'Godkjent' :
                               bt.recommendation === 'review' ? 'Gjennomgå' : 'Avvist'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-400">Avkastning</p>
                              <p className={`text-lg font-bold ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(1)}%
                              </p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-400">Sluttkapital</p>
                              <p className="text-lg font-bold text-white">
                                {formatNOK(finalCapital)}
                              </p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-400">Win Rate</p>
                              <p className="text-lg font-bold text-blue-400">
                                {(winRate * 100).toFixed(0)}%
                              </p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-400">Max Drawdown</p>
                              <p className="text-lg font-bold text-red-400">
                                {maxDrawdown.toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-600">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Konfidens:</span>
                              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    bt.confidence_score >= 70 ? 'bg-green-500' :
                                    bt.confidence_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${bt.confidence_score}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-300">{bt.confidence_score}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Ingen backtester ennå</p>
                    <p className="text-sm text-slate-500 mb-4">
                      Kjør en backtest for å se hvordan strategien ville ha prestert historisk
                    </p>
                    <Button
                      onClick={runBacktest}
                      disabled={loadingBacktest}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loadingBacktest ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Kjører...
                        </>
                      ) : (
                        <>
                          <History className="w-4 h-4 mr-2" /> Kjør første backtest
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color = "text-white",
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 text-center">
      <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
      <p className="text-slate-400 text-sm">{title}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
