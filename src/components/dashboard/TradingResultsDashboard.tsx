"use client";

import { ChartWrapper } from "@/components/ui/chart-wrapper";
import { BRAND, RADIUS, SHADOW } from "@/lib/design/tokens";
import {
  PremiumPanel,
  PremiumStatusBanner,
  PremiumTradingHero,
  PremiumTradingShell,
} from "@/components/trading/PremiumTradingLayout";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Download,
  History,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ComponentProps, ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const REFRESH_MS = 45 * 1000;
const MAX_CUMULATIVE_POINTS = 180;

type AnalyticsPayload = {
  ok: true;
  generatedAt: string;
  tradeCount: number;
  aggregates: {
    rowCount: number;
    winCount: number;
    lossCount: number;
    breakevenCount: number;
    noRealizedPnlCount: number;
    totalRealizedPnl: number;
    totalEffectivePnl: number;
    effectiveWinCount: number;
    effectiveLossCount: number;
    effectiveBreakevenCount: number;
    winRateRealizedPct: number | null;
  };
  cumulativePnl: { t: string; label: string; cumulative: number }[];
  dailyPnl: { day: string; pnl: number }[];
  modeSplit: { mode: string; pnl: number; trades: number }[];
  topPairs: { pair: string; pnl: number; trades: number }[];
  winLossSlices: {
    key: "win" | "loss" | "breakeven" | "unknown";
    value: number;
    fill: string;
  }[];
  bestDay: { day: string; pnl: number } | null;
  worstDay: { day: string; pnl: number } | null;
};

function downsampleCumulative(
  points: AnalyticsPayload["cumulativePnl"],
  max: number,
): AnalyticsPayload["cumulativePnl"] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out: AnalyticsPayload["cumulativePnl"] = [];
  for (let i = 0; i < points.length; i += step) {
    out.push(points[i]!);
  }
  const last = points[points.length - 1]!;
  if (out[out.length - 1]?.t !== last.t) out.push(last);
  return out;
}

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
};

export default function TradingResultsDashboard() {
  const t = useTranslations("tradingResults");
  const locale = useLocale();
  const { format: formatDisplay } = useCurrency();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/user/trading-analytics", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as
        | AnalyticsPayload
        | { ok: false; error?: string };
      if (!res.ok || !("ok" in json) || json.ok !== true) {
        const msg =
          typeof json === "object" && json && "error" in json
            ? String((json as { error?: string }).error)
            : t("errorLoad");
        throw new Error(msg);
      }
      setData(json);
      setLastFetch(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => void load(), REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const cumChart = useMemo(
    () =>
      downsampleCumulative(data?.cumulativePnl ?? [], MAX_CUMULATIVE_POINTS),
    [data?.cumulativePnl],
  );

  const dailyTail = useMemo(() => {
    const d = data?.dailyPnl ?? [];
    return d.slice(Math.max(0, d.length - 42));
  }, [data?.dailyPnl]);

  const pairsChartDesc = useMemo(
    () => [...(data?.topPairs ?? [])].reverse(),
    [data?.topPairs],
  );

  const modeLabel = useCallback(
    (raw: string) => {
      const m = raw.toLowerCase();
      if (m === "paper") return t("mode.paper");
      if (m === "live") return t("mode.live");
      return t("mode.unknown");
    },
    [t],
  );

  const outcomeLabel = useCallback(
    (key: AnalyticsPayload["winLossSlices"][number]["key"]) => {
      switch (key) {
        case "win":
          return t("outcome.win");
        case "loss":
          return t("outcome.loss");
        case "breakeven":
          return t("outcome.breakeven");
        default:
          return t("outcome.unknown");
      }
    },
    [t],
  );

  const totalPnl = data?.aggregates.totalEffectivePnl ?? 0;
  const pnlPositive = totalPnl >= 0;
  const sampleTrades = data?.tradeCount ?? 0;
  const knownPnlCount =
    (data?.aggregates.effectiveWinCount ?? 0) +
    (data?.aggregates.effectiveLossCount ?? 0) +
    (data?.aggregates.effectiveBreakevenCount ?? 0);

  const exportCsv = useCallback(() => {
    if (!data || data.tradeCount === 0) return;
    const rows = [
      [
        "generated_at",
        "trade_count",
        "total_realized_pnl",
        "total_effective_pnl",
        "win_rate_realized_pct",
      ],
      [
        data.generatedAt,
        String(data.tradeCount),
        String(data.aggregates.totalRealizedPnl),
        String(data.aggregates.totalEffectivePnl),
        data.aggregates.winRateRealizedPct == null
          ? ""
          : String(data.aggregates.winRateRealizedPct),
      ],
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trading-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <PremiumTradingShell className="relative pb-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-[#0052FF]/15 blur-3xl"
      />
      <PremiumTradingHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        chips={
          <>
            <span className="rounded-full border border-slate-300 bg-white/80 px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              {t("kpi.trades")}: {sampleTrades}
            </span>
            <span className="rounded-full border border-slate-300 bg-white/80 px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              {t("outcome.unknown")}:{" "}
              {Math.max(0, sampleTrades - knownPnlCount)}
            </span>
            <span className="rounded-full border border-[#0052FF]/40 bg-[#0052FF]/10 px-2.5 py-1 text-[#0047E0] dark:text-[#9CC4FF]">
              {t("intervalHint")}
            </span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data || data.tradeCount === 0}
              className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#0052FF]/40 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 ${BRAND.focusRing}`}
            >
              <Download className="h-4 w-4" />
              {t("exportCsv")}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#0052FF]/40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 ${BRAND.focusRing}`}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              {t("refresh")}
            </button>
            <Link
              href={hrefWithLocale(locale, "/handelshistorikk")}
              className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#0052FF]/40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 ${BRAND.focusRing}`}
            >
              <History className="h-4 w-4" />
              {t("openHistory")}
            </Link>
          </>
        }
      />

      <PremiumStatusBanner>
        <div
          className="flex flex-wrap items-center gap-4"
          role="status"
          aria-live="polite"
        >
          <Clock className="h-4 w-4 text-[#0052FF]" />
          <span>
            {lastFetch
              ? t("lastUpdated", {
                  time: lastFetch.toLocaleString(
                    locale === "no" ? "no-NO" : "en-GB",
                  ),
                })
              : t("notYetLoaded")}
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="text-slate-500">{t("intervalHint")}</span>
        </div>
      </PremiumStatusBanner>

      {error && (
        <div
          className="rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-slate-800/80"
            />
          ))}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={pnlPositive ? TrendingUp : TrendingDown}
              label={t("kpi.totalPnl")}
              value={formatDisplay(totalPnl)}
              positive={pnlPositive}
            />
            <KpiCard
              icon={BarChart3}
              label={t("kpi.winRate")}
              value={
                data.aggregates.winRateRealizedPct != null
                  ? `${data.aggregates.winRateRealizedPct}%`
                  : "—"
              }
              positive={
                data.aggregates.winRateRealizedPct == null
                  ? true
                  : data.aggregates.winRateRealizedPct >= 50
              }
            />
            <KpiCard
              icon={Activity}
              label={t("kpi.trades")}
              value={String(data.tradeCount)}
              positive
            />
            <KpiCard
              icon={ArrowUpRight}
              label={t("kpi.bestDay")}
              value={
                data.bestDay
                  ? `${data.bestDay.day} · ${formatDisplay(data.bestDay.pnl)}`
                  : "—"
              }
              positive
            />
          </section>

          {data.tradeCount > 0 &&
          data.aggregates.totalRealizedPnl === 0 &&
          data.aggregates.noRealizedPnlCount > 0 ? (
            <p className="text-xs text-slate-500 -mt-4 max-w-3xl">
              {t("kpi.totalPnlHint")}
            </p>
          ) : null}

          <div className="grid min-w-0 gap-6 lg:grid-cols-3">
            <PremiumPanel className="min-w-0 lg:col-span-2 border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-900/60">
              <h2 className="text-lg font-semibold text-white">
                {t("charts.cumulativeTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("charts.cumulativeHint")}
              </p>
              <div className="mt-4 h-[320px]">
                {cumChart.length < 2 ? (
                  <p className="py-20 text-center text-sm text-slate-500">
                    {t("empty.needTrades")}
                  </p>
                ) : (
                  <ChartWrapper height={320} minHeight={280}>
                    <AreaChart data={cumChart}>
                      <defs>
                        <linearGradient id="cumPnl" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#0052FF"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="#0052FF"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        interval="preserveStartEnd"
                        tickFormatter={(v) => String(v).slice(5, 16)}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) => formatDisplay(Number(v))}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: "#94a3b8" }}
                        formatter={
                          ((v: unknown) => [
                            formatDisplay(Number(v)),
                            t("charts.cumulativeSeries"),
                          ]) as unknown as NonNullable<
                            ComponentProps<typeof Tooltip>["formatter"]
                          >
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#0052FF"
                        strokeWidth={2}
                        fill="url(#cumPnl)"
                      />
                    </AreaChart>
                  </ChartWrapper>
                )}
              </div>
            </PremiumPanel>

            <PremiumPanel className="min-w-0 border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-900/60">
              <h2 className="text-lg font-semibold text-white">
                {t("charts.outcomeTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("charts.outcomeHint")}
              </p>
              <div className="mt-4 h-[280px] w-full min-w-0">
                {data.winLossSlices.length === 0 ? (
                  <p className="py-16 text-center text-sm text-slate-500">
                    {t("empty.noOutcomes")}
                  </p>
                ) : (
                  <ChartWrapper height={280} minHeight={260}>
                    <PieChart>
                      <Pie
                        data={data.winLossSlices.map((s) => ({
                          ...s,
                          name: outcomeLabel(s.key),
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {data.winLossSlices.map((s) => (
                          <Cell key={s.key} fill={s.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                      />
                    </PieChart>
                  </ChartWrapper>
                )}
              </div>
            </PremiumPanel>
          </div>

          <div
            className={`border border-slate-800/80 bg-slate-900/60 p-5 ${RADIUS.card} ${SHADOW.cardBrand}`}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-white">
                {t("charts.dailyTitle")}
              </h2>
              {data.worstDay ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
                  {t("worstDay", {
                    day: data.worstDay.day,
                    amount: formatDisplay(data.worstDay.pnl),
                  })}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t("charts.dailyHint")}
            </p>
            <div className="mt-4 h-[300px]">
              {dailyTail.length === 0 ? (
                <p className="py-20 text-center text-sm text-slate-500">
                  {t("empty.needDaily")}
                </p>
              ) : (
                <ChartWrapper height={300} minHeight={260}>
                  <BarChart data={dailyTail}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      angle={-24}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickFormatter={(v) => formatDisplay(Number(v))}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={
                        ((v: unknown) => [
                          formatDisplay(Number(v)),
                          t("charts.dailySeries"),
                        ]) as unknown as NonNullable<
                          ComponentProps<typeof Tooltip>["formatter"]
                        >
                      }
                    />
                    <Bar dataKey="pnl" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {dailyTail.map((e) => (
                        <Cell
                          key={e.day}
                          fill={e.pnl >= 0 ? "#10b981" : "#f43f5e"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartWrapper>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className={`border border-slate-800/80 bg-slate-900/60 p-5 ${RADIUS.card} ${SHADOW.card}`}
            >
              <h2 className="text-lg font-semibold text-white">
                {t("charts.pairsTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("charts.pairsHint")}
              </p>
              <div className="mt-4 h-[320px]">
                {data.topPairs.length === 0 ? (
                  <p className="py-20 text-center text-sm text-slate-500">
                    {t("empty.needPairs")}
                  </p>
                ) : (
                  <ChartWrapper height={320} minHeight={280}>
                    <BarChart
                      layout="vertical"
                      data={pairsChartDesc}
                      margin={{ left: 8, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        type="number"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) => formatDisplay(Number(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="pair"
                        width={88}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={
                          ((v: unknown) => [
                            formatDisplay(Number(v)),
                            t("charts.pairPnl"),
                          ]) as unknown as NonNullable<
                            ComponentProps<typeof Tooltip>["formatter"]
                          >
                        }
                      />
                      <Bar dataKey="pnl" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {pairsChartDesc.map((e) => (
                          <Cell
                            key={e.pair}
                            fill={e.pnl >= 0 ? "#10b981" : "#f43f5e"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartWrapper>
                )}
              </div>
            </div>

            <div
              className={`border border-slate-800/80 bg-slate-900/60 p-5 ${RADIUS.card} ${SHADOW.card}`}
            >
              <h2 className="text-lg font-semibold text-white">
                {t("charts.modeTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("charts.modeHint")}
              </p>
              <ul className="mt-6 space-y-4">
                {data.modeSplit.length === 0 ? (
                  <li className="text-sm text-slate-500">
                    {t("empty.needModes")}
                  </li>
                ) : (
                  data.modeSplit.map((m) => (
                    <li
                      key={m.mode}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-200">
                          {modeLabel(m.mode)}
                        </span>
                        <span
                          className={
                            m.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {formatDisplay(m.pnl)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("modeTrades", { count: m.trades })}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </PremiumTradingShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  positive,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 ${RADIUS.card} ${SHADOW.card}`}
    >
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-0.5 ${positive ? "bg-emerald-400/80" : "bg-rose-400/80"}`}
      />
      <div className="flex items-center gap-2 text-slate-500">
        <Icon
          className={`h-4 w-4 ${positive ? "text-emerald-400/90" : "text-rose-400/90"}`}
        />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={`mt-3 font-mono text-2xl font-bold tracking-tight ${positive ? "text-white" : "text-rose-100"}`}
      >
        {value}
      </p>
    </div>
  );
}
