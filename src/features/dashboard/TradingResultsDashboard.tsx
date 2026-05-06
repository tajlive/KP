"use client";

import { BRAND } from "@/lib/design/tokens";
import {
  PremiumStatusBanner,
  PremiumTradingHero,
  PremiumTradingShell,
} from "@/features/trading/PremiumTradingLayout";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import {
  Clock,
  Download,
  History,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import dynamic from "next/dynamic";
import { KpiCardsSection } from "./components/KpiCardsSection";

const TradingResultsCharts = dynamic(
  () => import("./components/TradingResultsCharts").then((m) => m.TradingResultsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full animate-pulse rounded-xl bg-muted/50" />
    ),
  }
);

const REFRESH_MS = 45 * 1000;
const MAX_CUMULATIVE_POINTS = 180;

export type AnalyticsPayload = {
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
          className="rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-4 text-sm text-red-200"
          role="alert"
        >
          <p className="font-semibold">{t("errorTitle")}</p>
          <p className="mt-1 opacity-80">{error}</p>
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

      {data && data.tradeCount === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
          <BarChart3 className="h-10 w-10 text-slate-600" />
          <h3 className="mt-4 text-lg font-semibold text-slate-300">
            {t("empty.noTradesTitle")}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {t("empty.noTradesDesc")}
          </p>
          <Link
            href={hrefWithLocale(locale, "/handelshistorikk")}
            className={`mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 ${BRAND.focusRing}`}
          >
            <History className="h-4 w-4" />
            {t("openHistory")}
          </Link>
        </div>
      ) : null}

      {data && data.tradeCount > 0 ? (
        <>
          <KpiCardsSection
            data={data}
            totalPnl={totalPnl}
            pnlPositive={pnlPositive}
            formatDisplay={formatDisplay}
            t={t}
          />

          <TradingResultsCharts
            data={data}
            cumChart={cumChart}
            dailyTail={dailyTail}
            pairsChartDesc={pairsChartDesc}
            formatDisplay={formatDisplay}
          />
        </>
      ) : null}
    </PremiumTradingShell>
  );
}

