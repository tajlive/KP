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
  AlertCircle,
  ChevronDown,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import dynamic from "next/dynamic";
import { KpiCardsSection } from "./components/KpiCardsSection";

const TradingResultsCharts = dynamic(
  () => import("./components/TradingResultsCharts").then((m) => m.TradingResultsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-80 lg:col-span-2 animate-pulse rounded-2xl bg-slate-800/40" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-800/40" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-800/40" />
      </div>
    ),
  }
);

const AdvancedAnalyticsSection = dynamic(
  () => import("@/features/dashboard/AdvancedAnalyticsSection").then((m) => ({ default: m.AdvancedAnalyticsSection })),
  { ssr: false }
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
  // FIKS 4: Konto-P/L fra paper_accounts (source of truth)
  const [accountPnl, setAccountPnl] = useState<number | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [chartsExpanded, setChartsExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(5); // Subtle click feedback
      }
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
    }
    // FIKS 4: Parallell fetch for konto-P/L
    try {
      const accountRes = await fetch("/api/portfolio/chart?mode=paper&days=1", {
        credentials: "include",
        cache: "no-store",
      });
      if (accountRes.ok) {
        const accountJson = await accountRes.json();
        if (accountJson.accountBalance != null && accountJson.accountStart != null) {
          setAccountBalance(Number(accountJson.accountBalance));
          setAccountPnl(Number(accountJson.accountBalance) - Number(accountJson.accountStart));
        }
      }
    } catch { /* non-critical */ }
    setLoading(false);
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



  // FIKS 4: KPI "Total P/L" = KONTO-P/L (paper_accounts), IKKE sesjons-sum
  // totalEffectivePnl inkluderer kontantstrøm fra åpne kjøp — misvisende som overskrift.
  const totalPnl = accountPnl ?? data?.aggregates.totalRealizedPnl ?? 0;
  const pnlPositive = totalPnl >= 0;
  const sampleTrades = data?.tradeCount ?? 0;
  const knownPnlCount =
    (data?.aggregates.effectiveWinCount ?? 0) +
    (data?.aggregates.effectiveLossCount ?? 0) +
    (data?.aggregates.effectiveBreakevenCount ?? 0);
  const unknownCount = Math.max(0, sampleTrades - knownPnlCount);

  const exportCsv = useCallback(() => {
    if (!data || data.tradeCount === 0) return;
    
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50); // Stronger feedback for export
    }

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
    <PremiumTradingShell className="relative pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-[#0052FF]/10 blur-3xl opacity-50"
      />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <PremiumTradingHero
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          chips={
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 shadow-sm">
                {t("kpi.trades")}: {sampleTrades}
              </span>
              {unknownCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 shadow-sm">
                  {t("outcome.unknown")}: {unknownCount}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0052FF]/40 bg-[#0052FF]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0047E0] dark:text-[#9CC4FF] shadow-sm">
                {t("intervalHint")}
              </span>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!data || data.tradeCount === 0}
                className={`group inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-[#0052FF]/40 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 ${BRAND.focusRing}`}
              >
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                {t("exportCsv")}
              </button>
              <button
                type="button"
                onClick={() => void load()}
                className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-[#0052FF]/40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 ${BRAND.focusRing}`}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : "transition-transform group-hover:rotate-180 duration-500"}`}
                />
                {t("refresh")}
              </button>
              <Link
                href={hrefWithLocale(locale, "/handelshistorikk")}
                className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-[#0052FF]/40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 ${BRAND.focusRing}`}
              >
                <History className="h-4 w-4" />
                {t("openHistory")}
              </Link>
            </div>
          }
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <PremiumStatusBanner>
          <div
            className="flex flex-wrap items-center gap-4 text-xs font-medium"
            role="status"
            aria-live="polite"
          >
            <Clock className="h-4 w-4 text-[#0052FF]" />
            <span className="text-slate-300">
              {lastFetch
                ? t("lastUpdated", {
                    time: lastFetch.toLocaleString(
                      locale === "no" ? "no-NO" : "en-GB",
                    ),
                  })
                : t("notYetLoaded")}
            </span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span className="text-slate-500 italic">{t("intervalHint")}</span>
          </div>
        </PremiumStatusBanner>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-rose-500/30 bg-rose-950/20 px-4 py-4 text-sm text-rose-200 backdrop-blur-md flex items-start gap-3"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-400">{t("errorTitle")}</p>
              <p className="mt-1 opacity-80">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {loading && !data ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-slate-900/80 border border-slate-800"
              />
            ))}
          </div>
        ) : null}

        {data && data.tradeCount === 0 && !loading ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 px-6 py-20 text-center backdrop-blur-sm"
          >
            <div className="rounded-full bg-slate-900 p-6 border border-slate-800 mb-6">
              <BarChart3 className="h-12 w-12 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {t("empty.noTradesTitle")}
            </h3>
            <p className="mt-3 max-w-sm text-sm text-slate-500 leading-relaxed">
              {t("empty.noTradesDesc")}
            </p>
            <Link
              href={hrefWithLocale(locale, "/handelshistorikk")}
              className={`mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-slate-700 hover:border-slate-600 ${BRAND.focusRing}`}
            >
              <History className="h-4 w-4" />
              {t("openHistory")}
            </Link>
          </motion.div>
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

            {/* Lenke til detaljert handelshistorikk (Kraken-tabellmønster) */}
            <div className="flex items-center gap-4 pt-2">
              <Link
                href={hrefWithLocale(locale, "/dashboard/historikk")}
                className={`inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-[#0052FF]/40 hover:bg-slate-800 ${BRAND.focusRing}`}
              >
                <Table2 className="h-4 w-4" />
                {t("openHistory")}
              </Link>
              <button
                type="button"
                onClick={() => setChartsExpanded(!chartsExpanded)}
                className={`inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-slate-500 ${BRAND.focusRing}`}
              >
                <BarChart3 className="h-4 w-4" />
                {t("charts.title")}
                <ChevronDown className={`h-4 w-4 transition-transform ${chartsExpanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {chartsExpanded && (
              <TradingResultsCharts
                data={data}
                cumChart={cumChart}
                dailyTail={dailyTail}
                pairsChartDesc={pairsChartDesc}
                formatDisplay={formatDisplay}
              />
            )}
          </>
        ) : null}
      </div>

      {/* Avansert analyse (tidl. egen /dashboard/analysis-side — Fase 3 D12) */}
      {data && data.tradeCount > 0 && (
        <AdvancedAnalyticsSection accountBalance={accountBalance ?? undefined} />
      )}
    </PremiumTradingShell>
  );
}


