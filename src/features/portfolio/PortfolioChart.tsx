"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SkeletonBlock } from "@/features/dashboard/loading-skeleton";
import { WidgetErrorBoundary } from "@/shared/ui/WidgetErrorBoundary";

// TODO(data-source-audit): This chart computes its own capital/PnL from trades for
// visualization purposes, which may diverge from getUserDashboardMetrics (the dashboard
// single source of truth). Consider accepting pre-aggregated start/current capital from
// the parent or metrics endpoint to guarantee consistency.

interface ChartDataPoint {
  date: string;
  value: number;
  formattedDate: string;
}

interface PortfolioChartProps {
  userId?: string;
  sessionId?: string;
  mode?: "paper" | "live";
}

const TIME_PERIODS = [
  { key: "1D", label: "1D", days: 1 },
  { key: "1W", label: "1U", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1Y", label: "1Å", days: 365 },
  { key: "ALL", label: "Alt", days: 0 },
] as const;

function SkeletonChart() {
  return (
    <div className="h-[300px] sm:h-[380px] w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-6 overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-24" delay={0.1} />
          <SkeletonBlock className="h-8 w-40" delay={0.2} />
          <SkeletonBlock className="h-3 w-32" delay={0.3} />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-9 rounded-xl" delay={0.4} />
          <SkeletonBlock className="h-9 w-48 rounded-xl" delay={0.5} />
        </div>
      </div>
      <div className="relative h-[200px] mt-8">
        <SkeletonBlock className="absolute inset-0 w-full h-full rounded-xl opacity-30" delay={0.6} />
      </div>
    </div>
  );
}

export function PortfolioChart({ userId, sessionId, mode = "paper" }: PortfolioChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("1M");
  const [currentValue, setCurrentValue] = useState(0);
  const [changePercent, setChangePercent] = useState(0);
  const [startingValue, setStartingValue] = useState(100000);
  const [hasData, setHasData] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const period = TIME_PERIODS.find((p) => p.key === selectedPeriod);
      const daysBack = period?.days || 30;

      let sessionQuery = supabase
        .from("trading_sessions")
        .select("id, starting_capital_nok, current_capital_nok, started_at");

      if (sessionId) {
        sessionQuery = sessionQuery.eq("id", sessionId);
      } else if (userId) {
        sessionQuery = sessionQuery
          .eq("user_id", userId)
          .eq("mode", mode)
          .eq("status", "active")
          .order("updated_at", { ascending: false });
      }

      const { data: sessions, error: sessionError } = await sessionQuery;

      if (sessionError || !sessions || sessions.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      // Aggregate capital across ALL active sessions (matches getUserDashboardMetrics)
      const totalStarting = sessions.reduce(
        (sum, s) => sum + (Number(s.starting_capital_nok) || 0),
        0
      );
      const totalCurrent = sessions.reduce(
        (sum, s) => sum + (Number(s.current_capital_nok) || 0),
        0
      );
      setStartingValue(totalStarting || 100000);
      setCurrentValue(totalCurrent || 100000);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch trades from ALL active sessions (not just the most recent one)
      const sessionIds = sessions.map((s) => s.id);
      const CHUNK_SIZE = 500;
      let allTrades: Array<{
        created_at: string;
        realized_pnl: number | null;
        side: string;
        total_value: number;
      }> = [];

      for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
        const chunk = sessionIds.slice(i, i + CHUNK_SIZE);
        const { data: trades, error: tradesError } = await supabase
          .from("trades")
          .select("created_at, realized_pnl, side, total_value")
          .in("session_id", chunk)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true });

        if (tradesError) {
          console.error("PortfolioChart trades error:", tradesError);
          continue;
        }
        if (trades) {
          allTrades = allTrades.concat(trades);
        }
      }

      if (allTrades.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      setHasData(true);

      const chartData = buildPortfolioData(
        allTrades,
        totalStarting || 100000,
        daysBack
      );

      setData(chartData);

      if (chartData.length > 0) {
        const first = chartData[0].value;
        const last = chartData[chartData.length - 1].value;
        const change = ((last - first) / first) * 100;
        setChangePercent(change);
      }
    } catch (error) {
      console.error("PortfolioChart error:", error);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const buildPortfolioData = (
    trades: Array<{
      created_at: string;
      realized_pnl: number | null;
      side: string;
      total_value: number;
    }>,
    startCapital: number,
    daysBack: number
  ): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    for (let i = 0; i <= daysBack; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const tradesUpToDate = trades.filter(
        (t) => new Date(t.created_at) <= date
      );

      const totalPnl = tradesUpToDate.reduce((sum, t) => {
        return sum + (t.realized_pnl || 0);
      }, 0);

      const currentCapital = startCapital + totalPnl;

      data.push({
        date: date.toISOString().split("T")[0],
        value: currentCapital,
        formattedDate: date.toLocaleDateString("nb-NO", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    return data;
  };

  useEffect(() => {
    fetchPortfolioData();
  }, [selectedPeriod, userId, sessionId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nb-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint; value: number }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-gray-500 dark:text-slate-400 text-xs mb-1">
            {payload[0].payload.formattedDate}
          </p>
          <p className="text-gray-900 dark:text-white font-bold text-lg">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <SkeletonChart />;
  }

  if (!hasData) {
    return (
      <m.div
        className="h-[300px] sm:h-[380px] w-full bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-muted-foreground"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-lg font-medium text-gray-700 dark:text-slate-300">
          Ingen handelshistorikk ennå
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">
          Start din første øvingssesjon for å se grafen
        </p>
      </m.div>
    );
  }

  return (
    <WidgetErrorBoundary
      title="Grafen kunne ikke vises"
      message="Vi kunne ikke laste porteføljegrafen akkurat nå. Prøv på nytt."
      retryLabel="Oppdater"
      onReset={fetchPortfolioData}
      resetKeys={[selectedPeriod, userId, sessionId]}
    >
      <m.div
        className="h-[300px] sm:h-[380px] w-full rounded-2xl border border-gray-200/60 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl p-5 md:p-6 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-1">Din portefølje</p>
            <div className="flex items-center gap-3">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(currentValue)}
              </p>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                  changePercent >= 0
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {changePercent >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {changePercent >= 0 ? "+" : ""}
                {changePercent.toFixed(1)}%
              </div>
            </div>
            <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">
              Startet med {formatCurrency(startingValue)}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={fetchPortfolioData}
              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
              title="Oppdater"
            >
              <RefreshCw className="w-4 h-4 text-gray-400 dark:text-slate-400" />
            </button>
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {TIME_PERIODS.map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    selectedPeriod === period.key
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[250px]">
          {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0052FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0052FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="formattedDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
                minTickGap={30}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0052FF"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-full w-full bg-gray-100/5 dark:bg-white/[0.03] animate-pulse rounded-xl" />
          )}
        </div>
      </m.div>
    </WidgetErrorBoundary>
  );
}

export default PortfolioChart;
