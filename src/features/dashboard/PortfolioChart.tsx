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
}

const TIME_PERIODS = [
  { key: "1D", label: "1D", days: 1 },
  { key: "1W", label: "1U", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1Y", label: "1Å", days: 365 },
  { key: "ALL", label: "Alt", days: 0 },
] as const;

export function PortfolioChart({ userId, sessionId }: PortfolioChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("1M");
  const [currentValue, setCurrentValue] = useState(0);
  const [changePercent, setChangePercent] = useState(0);
  const [startingValue, setStartingValue] = useState(100000);

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const period = TIME_PERIODS.find((p) => p.key === selectedPeriod);
      const daysBack = period?.days || 30;

      // Hent trading session
      let sessionQuery = supabase
        .from("trading_sessions")
        .select("id, starting_capital_nok, current_capital_nok, started_at");

      if (sessionId) {
        sessionQuery = sessionQuery.eq("id", sessionId);
      } else if (userId) {
        sessionQuery = sessionQuery
          .eq("user_id", userId)
          .eq("mode", "paper")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1);
      }

      const { data: sessions, error: sessionError } = await sessionQuery;

      if (sessionError || !sessions || sessions.length === 0) {
        // Fallback: generer mock-data
        generateMockData();
        return;
      }

      const session = sessions[0];
      setStartingValue(Number(session.starting_capital_nok) || 100000);
      setCurrentValue(Number(session.current_capital_nok) || 100000);

      // Hent trades for perioden
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("created_at, realized_pnl, side, total_value")
        .eq("session_id", session.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (tradesError) {
        generateMockData();
        return;
      }

      // Bygg porteføljedata
      const chartData = buildPortfolioData(
        trades || [],
        Number(session.starting_capital_nok) || 100000,
        daysBack
      );

      setData(chartData);

      // Beregn endring
      if (chartData.length > 0) {
        const first = chartData[0].value;
        const last = chartData[chartData.length - 1].value;
        const change = ((last - first) / first) * 100;
        setChangePercent(change);
      }
    } catch (error) {
      console.error("PortfolioChart error:", error);
      generateMockData();
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
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    let currentCapital = startCapital;

    // Lag datapunkter for hver dag
    for (let i = 0; i <= daysBack; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Summer trades frem til denne datoen
      const tradesUpToDate = trades.filter(
        (t) => new Date(t.created_at) <= date
      );

      const totalPnl = tradesUpToDate.reduce((sum, t) => {
        return sum + (t.realized_pnl || 0);
      }, 0);

      currentCapital = startCapital + totalPnl;

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

  const generateMockData = () => {
    const mockData: ChartDataPoint[] = [];
    const now = new Date();
    let value = 100000;

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      value = value * (1 + (Math.random() - 0.45) * 0.02);

      mockData.push({
        date: date.toISOString().split("T")[0],
        value: Math.round(value),
        formattedDate: date.toLocaleDateString("nb-NO", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    setData(mockData);
    setCurrentValue(mockData[mockData.length - 1].value);
    const change =
      ((mockData[mockData.length - 1].value - mockData[0].value) /
        mockData[0].value) *
      100;
    setChangePercent(change);
    setLoading(false);
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-xs mb-1">{payload[0].payload.formattedDate}</p>
          <p className="text-white font-bold text-lg">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <motion.div
        className="h-[350px] w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 animate-pulse"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="h-8 w-48 bg-slate-700 rounded mb-4" />
        <div className="h-[250px] bg-slate-800 rounded" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="h-[380px] w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-400 text-sm mb-1">Din portefølje</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-white">
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
          <p className="text-slate-500 text-xs mt-1">
            Startet med {formatCurrency(startingValue)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPortfolioData}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Oppdater"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
          <div className="flex gap-1">
            {TIME_PERIODS.map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === period.key
                    ? "bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
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
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0052FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0052FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              minTickGap={30}
            />
            <YAxis
              hide
              domain={["auto", "auto"]}
            />
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
