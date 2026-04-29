"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
    <div className="h-[300px] sm:h-[380px] w-full bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-gray-200 dark:border-slate-700">
      {/* Header skeleton */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-300 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-8 w-40 bg-gray-300 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-32 bg-gray-300 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-300 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-8 w-48 bg-gray-300 dark:bg-slate-700 rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Chart area skeleton */}
      <div className="h-[250px] flex items-end gap-2 px-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-300/50 dark:bg-slate-700/50 rounded-t animate-pulse"
            style={{
              height: `${20 + Math.random() * 60}%`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
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
          .order("updated_at", { ascending: false })
          .limit(1);
      }

      const { data: sessions, error: sessionError } = await sessionQuery;

      if (sessionError || !sessions || sessions.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      const session = sessions[0];
      setStartingValue(Number(session.starting_capital_nok) || 100000);
      setCurrentValue(Number(session.current_capital_nok) || 100000);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("created_at, realized_pnl, side, total_value")
        .eq("session_id", session.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (tradesError) {
        setHasData(false);
        setLoading(false);
        return;
      }

      if (!trades || trades.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      setHasData(true);

      const chartData = buildPortfolioData(
        trades || [],
        Number(session.starting_capital_nok) || 100000,
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
      <motion.div
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
      </motion.div>
    );
  }

  return (
    <motion.div
      className="h-[300px] sm:h-[380px] w-full bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-gray-200 dark:border-slate-700"
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
      </div>
    </motion.div>
  );
}

export default PortfolioChart;
