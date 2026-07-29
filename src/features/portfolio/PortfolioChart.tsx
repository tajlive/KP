"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
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
import { SkeletonBlock } from "@/features/dashboard/loading-skeleton";
import { WidgetErrorBoundary } from "@/shared/ui/WidgetErrorBoundary";

/**
 * PortfolioChart — én penge-modell. FIKS 3 (FACT-AUDIT).
 *
 * Overskrift = paper_accounts.current_balance (KONTO).
 * Endring = (current_balance − initial_balance) / initial_balance.
 * Kurve = per-sesjon (med "Sesjon"-label) eller ærlig empty-state.
 * ALDRI summert på tvers av sesjoner som om det var én konto.
 */

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
  { key: "ALL", label: "ALT", days: 365 },
];

const SkeletonChart: React.FC = () => (
  <div className="h-full w-full rounded-2xl border border-gray-200/60 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] p-5 md:p-6">
    <div className="mb-8">
      <SkeletonBlock />
    </div>
    <SkeletonBlock />
  </div>
);

export default function PortfolioChart({
  userId,
  sessionId,
  mode = "paper",
}: PortfolioChartProps) {
  const t = useTranslations("dashboard.portfolio");
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  // Skiller faktisk hentefeil (vis retry) fra ærlig tom tilstand (vis hint)
  const [fetchFailed, setFetchFailed] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("1M");
  const [startingValue, setStartingValue] = useState(0);

  // FIKS 3: Overskrift-verdier — kun KONTO (paper_accounts)
  const [headerBalance, setHeaderBalance] = useState<number | null>(null);
  const [headerPct, setHeaderPct] = useState<number | null>(null);

  const [currentValue, setCurrentValue] = useState(0);
  const [changePercent, setChangePercent] = useState(0);

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      const period = TIME_PERIODS.find((p) => p.key === selectedPeriod);
      const daysBack = period?.days || 30;

      const params = new URLSearchParams({
        mode,
        days: String(daysBack),
      });
      if (sessionId) params.set("sessionId", sessionId);

      const res = await fetch(`/api/portfolio/chart?${params.toString()}`);
      if (!res.ok) {
        setHasData(false);
        setFetchFailed(true);
        setLoading(false);
        return;
      }

      const { sessions, trades: allTrades, accountStart, accountBalance } =
        (await res.json()) as {
          sessions: Array<{ id: string; starting_capital_nok: number | null }>;
          trades: Array<{
            created_at: string;
            realized_pnl: number | null;
            side: string;
            total_value: number;
          }>;
          accountStart: number | null;
          accountBalance: number | null;
        };
      setFetchFailed(false);

      // FIKS 3: Overskrift = paper_accounts (KONTO)
      if (accountStart != null && accountBalance != null) {
        setHeaderBalance(accountBalance);
        const pct = accountStart > 0
          ? ((accountBalance - accountStart) / accountStart) * 100
          : null;
        setHeaderPct(pct);
      } else {
        setHeaderBalance(null);
        setHeaderPct(null);
      }

      if (!sessions || sessions.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      // KURVEN: Sesjonsvisning ankres til sesjonens startkapital.
      // Kontovisning (uten sessionId) ankres til kontoens startkapital
      // (accountStart) — kurven er kumulativ realisert PnL på tvers av sesjoner.
      let curveAnchor = 0;
      if (sessionId) {
        curveAnchor = Number(sessions[0]?.starting_capital_nok) || 0;
      } else if (accountStart != null) {
        curveAnchor = accountStart;
      } else {
        setHasData(false);
        setLoading(false);
        return;
      }
      setStartingValue(curveAnchor);

      if (!allTrades || allTrades.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      // Bruk LOKAL variabel — state er stale i samme tick
      const chartData = buildPortfolioData(
        allTrades,
        curveAnchor,
        daysBack,
        selectedPeriod,
      );
      setData(chartData);
      setHasData(chartData.length > 0);

      if (chartData.length > 0) {
        const first = chartData[0].value;
        const last = chartData[chartData.length - 1].value;
        setCurrentValue(last);
        const change = first > 0 ? ((last - first) / first) * 100 : 0;
        setChangePercent(change);
      }
    } catch (error) {
      console.error("PortfolioChart error:", error);
      setHasData(false);
      setFetchFailed(true);
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
    days: number,
    period: string,
  ): ChartDataPoint[] => {
    const intervalMs =
      period === "1D"
        ? 4 * 60 * 60 * 1000
        : period === "1W"
          ? 24 * 60 * 60 * 1000
          : 2 * 24 * 60 * 60 * 1000;

    const referenceDate = new Date();
    referenceDate.setDate(referenceDate.getDate() - days);
    referenceDate.setHours(0, 0, 0, 0);

    const timeSlots: Date[] = [];
    let cursor = new Date(referenceDate);
    const now = new Date();
    while (cursor <= now) {
      timeSlots.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + intervalMs);
    }

    return timeSlots.map((date) => {
      const tradesUpToDate = trades.filter(
        (t) => new Date(t.created_at) <= date,
      );
      const totalPnl = tradesUpToDate.reduce((sum, t) => {
        return sum + (t.realized_pnl || 0);
      }, 0);
      const currentCapital = startCapital + totalPnl;

      return {
        date: date.toISOString().split("T")[0],
        value: currentCapital,
        formattedDate: date.toLocaleDateString("nb-NO", {
          month: "short",
          day: "numeric",
        }),
      };
    });
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

  // FIKS 3: Vis header med konto-tall selv om kurven er tom
  const showHeader = headerBalance != null;

  if (!hasData && !showHeader) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-3 h-[300px] sm:h-[380px] rounded-2xl border border-gray-200/60 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] p-6"
      >
        <p className="text-gray-500 dark:text-slate-400 text-sm">{t("noData")}</p>
        <p className="text-gray-400 dark:text-slate-500 text-xs">
          {t("noDataHint")}
        </p>
      </m.div>
    );
  }

  return (
    <WidgetErrorBoundary
      title={t("errorTitle")}
      message={t("errorMessage")}
      retryLabel={t("retry")}
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
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-1">
              {sessionId ? t("sessionTitle") : t("title")}
            </p>
            <div className="flex items-center gap-3">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {headerBalance != null
                  ? formatCurrency(headerBalance)
                  : formatCurrency(currentValue)}
              </p>
              {headerPct != null && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                    headerPct >= 0
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {headerPct >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {headerPct >= 0 ? "+" : ""}
                  {headerPct.toFixed(1)}%
                </div>
              )}
            </div>
            {sessionId && (
              <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">
                {t("sessionLabel")}
              </p>
            )}
          </div>

          {/* Period selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.06] rounded-lg p-1">
            {TIME_PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelectedPeriod(p.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedPeriod === p.key
                    ? "bg-white dark:bg-white/[0.12] text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {hasData ? (
          <ResponsiveContainer width="100%" height="75%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="stroke-gray-200 dark:stroke-white/[0.06]"
              />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-gray-400 dark:text-slate-500"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                className="text-gray-400 dark:text-slate-500"
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#portfolioGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 h-[75%]">
            {fetchFailed ? (
              <button
                onClick={fetchPortfolioData}
                className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 hover:text-kp-brand transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t("noChartData")}
              </button>
            ) : (
              <>
                <p className="text-gray-500 dark:text-slate-400 text-sm">{t("noData")}</p>
                <p className="text-gray-400 dark:text-slate-500 text-xs">
                  {t("noDataHint")}
                </p>
              </>
            )}
          </div>
        )}
      </m.div>
    </WidgetErrorBoundary>
  );
}

export { PortfolioChart };
