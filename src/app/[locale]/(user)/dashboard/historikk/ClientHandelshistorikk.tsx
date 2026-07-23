"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/shared/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { SURFACE, BRAND } from "@/lib/design/tokens";
import {
  PremiumPanel,
  PremiumStatusBanner,
  PremiumTradingHero,
  PremiumTradingShell,
} from "@/features/trading/PremiumTradingLayout";
import { aggregateTradeHistoryStats } from "@/lib/trading/trade-history-aggregates";
import { explainStrategySignalJson } from "@/lib/bot-status-helpers";
import {
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Clock3,
  ClipboardCopy,
} from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Json } from "@/types/database.types";
import {
  reportTradeHistoryEmptyWhileSignedIn,
  reportTradingIntegrityPollFailure,
} from "@/lib/sentry";
import { tradesPollIntervalAfterFailures } from "@/lib/trading/trading-integrity-sync";
import { trackOnboardingStep } from "@/lib/analytics/onboarding-events";
import { meTradesSuccessSchema } from "@/lib/trading/me-trades-api";
import {
  matchesModeFilter,
  tradeModeBucket,
  type TradeHistoryModeFilter,
} from "@/lib/trading/trade-history-mode";
import { toast } from "sonner";
import {
  type Trade,
  type TradeDecisionRow,
  parseStrategySignal,
} from "./trade-history.types";
import { TradeHistoryStatCard } from "./TradeHistoryStatCard";
import { useCurrency } from "@/hooks/useCurrency";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { TradingMode } from "@/lib/trading-api";

// Legacy local type — now imported from trade-history.types.ts
export default function ClientHandelshistorikk() {
  const t = useTranslations("tradeHistory");
  const locale = useLocale();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [decisions, setDecisions] = useState<TradeDecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TradeHistoryModeFilter>("all");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [integrityPollWarning, setIntegrityPollWarning] = useState(false);
  const [pollCycleFailures, setPollCycleFailures] = useState(0);
  const pollIntervalMs = useMemo(
    () => tradesPollIntervalAfterFailures(pollCycleFailures),
    [pollCycleFailures],
  );
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  // OnboardingChecklist-punkt 3: marker at brukeren har sett historikken.
  // Flagg leses av useOnboardingState på dashboard.
  useEffect(() => {
    window.localStorage.setItem("kp_history_viewed", "1");
    trackOnboardingStep("history_viewed");
  }, []);

  const formatRejectionReason = useCallback(
    (code: string | null | undefined): string | null => {
      if (!code) return null;
      switch (code) {
        case "NO_RISK_PROFILE":
          return t("rejectReason.NO_RISK_PROFILE");
        case "BOT_NOT_HEALTHY":
          return t("rejectReason.BOT_NOT_HEALTHY");
        case "LIVE_NOT_ALLOWED":
          return t("rejectReason.LIVE_NOT_ALLOWED");
        case "POSITION_LIMIT_EXCEEDED":
          return t("rejectReason.POSITION_LIMIT_EXCEEDED");
        case "EXPOSURE_LIMIT_EXCEEDED":
          return t("rejectReason.EXPOSURE_LIMIT_EXCEEDED");
        case "DAILY_LOSS_LIMIT_EXCEEDED":
          return t("rejectReason.DAILY_LOSS_LIMIT_EXCEEDED");
        case "DAILY_LOSS_CHECK_FAILED":
          return t("rejectReason.DAILY_LOSS_CHECK_FAILED");
        case "PAIR_NOT_ALLOWED":
          return t("rejectReason.PAIR_NOT_ALLOWED");
        case "LEVERAGE_NOT_ALLOWED":
          return t("rejectReason.LEVERAGE_NOT_ALLOWED");
        case "INSUFFICIENT_BALANCE":
          return t("rejectReason.INSUFFICIENT_BALANCE");
        case "SESSION_NOT_ACTIVE":
          return t("rejectReason.SESSION_NOT_ACTIVE");
        case "INVALID_TRADING_MODE":
          return t("rejectReason.INVALID_TRADING_MODE");
        default:
          return code;
      }
    },
    [t],
  );

  const fetchTrades = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setFetchError(null);

      try {
        const res = await fetch("/api/user/trades?limit=200", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        const json: unknown = await res.json();

        if (res.status === 401) {
          setSignedIn(false);
          if (silent) {
            setIntegrityPollWarning(true);
            setPollCycleFailures((f) => f + 1);
            reportTradingIntegrityPollFailure({
              surface: "trade_history",
              source: "me_trades_api",
              status: 401,
            });
          } else {
            setFetchError(t("notLoggedIn"));
          }
          setTrades([]);
        } else if (!res.ok) {
          setSignedIn(true);
          const msg =
            typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error?: string }).error === "string"
              ? (json as { error: string }).error
              : t("fetchError");
          if (silent) {
            setIntegrityPollWarning(true);
            setPollCycleFailures((f) => f + 1);
            reportTradingIntegrityPollFailure({
              surface: "trade_history",
              source: "me_trades_api",
              status: res.status,
            });
          } else {
            setFetchError(msg);
          }
          setTrades([]);
        } else {
          setSignedIn(true);
          const parsed = meTradesSuccessSchema.safeParse(json);
          if (!parsed.success) {
            if (silent) {
              setIntegrityPollWarning(true);
              setPollCycleFailures((f) => f + 1);
              reportTradingIntegrityPollFailure({
                surface: "trade_history",
                source: "me_trades_schema",
              });
            } else {
              setFetchError(t("fetchError"));
            }
            setTrades([]);
          } else {
            const rows: Trade[] = parsed.data.trades.map((row) => ({
              ...row,
              strategy_signal: row.strategy_signal as Json | null,
            }));
            setTrades(rows);
            setIntegrityPollWarning(false);
            setPollCycleFailures(0);
            if (rows.length === 0) {
              reportTradeHistoryEmptyWhileSignedIn({
                diagnostic_id: parsed.data.diagnostic_id,
                surface: "trade_history",
              });
            }
          }
        }
      } catch (e) {
        console.error("handelshistorikk /api/user/trades:", e);
        if (silent) {
          setIntegrityPollWarning(true);
          setPollCycleFailures((f) => f + 1);
          reportTradingIntegrityPollFailure({ surface: "trade_history" });
        } else {
          setFetchError(t("fetchError"));
        }
        setTrades([]);
      }

      // Fetch decisions from API instead of direct supabase
      try {
        const decisionsRes = await fetch(
          "/api/user/trade-decisions?limit=50",
          {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          },
        );
        const decisionsJson: unknown = await decisionsRes.json();
        if (
          decisionsRes.ok &&
          typeof decisionsJson === "object" &&
          decisionsJson !== null &&
          "ok" in decisionsJson &&
          (decisionsJson as Record<string, unknown>).ok === true &&
          "decisions" in decisionsJson
        ) {
          setDecisions(
            (decisionsJson as Record<string, unknown>)
              .decisions as TradeDecisionRow[],
          );
        } else {
          setDecisions([]);
        }
      } catch {
        console.warn("handelshistorikk /api/user/trade-decisions failed");
        setDecisions([]);
      }

      if (!silent) setLoading(false);
    },
    [t],
  );

  const copyDiagnostics = useCallback(async () => {
    try {
      const res = await fetch("/api/user/trading-diagnostics", {
        credentials: "same-origin",
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        toast.error(t("diagnosticsCopyFailed"));
        return;
      }
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      toast.success(t("diagnosticsCopied"));
    } catch {
      toast.error(t("diagnosticsCopyFailed"));
    }
  }, [t]);

  useEffect(() => {
    void fetchTrades(false);
  }, [fetchTrades]);

  /** Nye live/paper-rader uten manuell refresh (Realtime krever JWT; polling er robust på denne siden). */
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fetchTrades(true);
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchTrades, pollIntervalMs]);

  const filteredTrades = useMemo(
    () => trades.filter((trade) => matchesModeFilter(trade.mode, filter)),
    [trades, filter],
  );

  const filteredDecisions = useMemo(
    () => decisions.filter((d) => matchesModeFilter(d.trading_mode, filter)),
    [decisions, filter],
  );

  const stats = useMemo(
    () => aggregateTradeHistoryStats(filteredTrades),
    [filteredTrades],
  );

  const { formatByMode } = useCurrency();

  const formatCurrencyValue = (n: number, mode: TradeHistoryModeFilter | "paper" | "live" | "all") => {
    const activeMode: TradingMode = mode === "all" ? "paper" : (mode as TradingMode);
    return formatByMode(n, activeMode);
  };

  const dateLocale = locale === "en" ? "en-GB" : "no-NO";

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString(dateLocale, {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT} p-4 sm:p-8`}>
      <PremiumTradingShell className="max-w-7xl mx-auto">
        <PremiumTradingHero
          eyebrow={locale === "no" ? "Oversikt" : "Overview"}
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void copyDiagnostics()}
                disabled={signedIn !== true}
                data-testid="trade-history-copy-diagnostics"
              >
                <ClipboardCopy className="h-4 w-4" />
                {t("copyDiagnostics")}
              </Button>
              <Button className={BRAND.primary} disabled size="sm">
                {t("exportCsv")}
              </Button>
            </div>
          }
        />

        <PremiumStatusBanner>
          <div className="flex flex-wrap items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#0052FF]" />
            <span>
              {locale === "no"
                ? "Data oppdateres automatisk i bakgrunnen."
                : "Data refreshes automatically in the background."}
            </span>
          </div>
        </PremiumStatusBanner>

        {/* Filter + stats */}
        <PremiumPanel className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950/70">
              {(["all", "paper", "live"] as TradeHistoryModeFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      filter === f
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {f === "all"
                      ? t("filterAll")
                      : f === "paper"
                        ? t("filterPaper")
                        : t("filterLive")}
                  </button>
                ),
              )}
            </div>
          </div>

          {filteredTrades.length > 0 && (
            <div
              className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              data-testid="trade-history-aggregates"
            >
              <TradeHistoryStatCard
                label={t("totalTrades")}
                value={String(stats.rowCount)}
                tone="neutral"
              />
              <TradeHistoryStatCard
                label={t("wins")}
                value={String(stats.winCount)}
                tone="positive"
              />
              <TradeHistoryStatCard
                label={t("losses")}
                value={String(stats.lossCount)}
                tone="negative"
              />
              <TradeHistoryStatCard
                label={t("totalRealizedPnl")}
                value={`${stats.totalRealizedPnl >= 0 ? "+" : ""}${formatCurrencyValue(stats.totalRealizedPnl, filter)}`}
                tone={stats.totalRealizedPnl >= 0 ? "positive" : "negative"}
              />
            </div>
          )}
        </PremiumPanel>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("decisionLogTitle")}
          </h2>
        </div>

        {signedIn && integrityPollWarning && !fetchError && (
          <p
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-600/30 dark:bg-amber-900/30 dark:text-amber-200"
            role="status"
            data-testid="trade-history-integrity-poll-warning"
          >
            {t("integrityPollWarning")}
          </p>
        )}

        {signedIn && !loading && !fetchError && (
          <PremiumPanel className="space-y-3 p-4 sm:p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("decisionLogHint")}
            </p>
            {filteredDecisions.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("decisionsEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {filteredDecisions.map((d) => {
                  const allow = d.decision_type === "allow";
                  const reject = d.decision_type === "reject";
                  const modify = d.decision_type === "modify";
                  const label = allow
                    ? t("decisionAllow")
                    : reject
                      ? t("decisionReject")
                      : modify
                        ? t("decisionModify")
                        : d.decision_type;
                  const badgeClass = allow
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-700/40"
                    : reject
                      ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/25 dark:text-red-200 dark:border-red-700/40"
                      : "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-700/40";
                  const pair = (d.symbol ?? "").replace("USDT", "");
                  const rr = formatRejectionReason(d.rejection_reason);
                  return (
                    <li
                      key={d.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-sm"
                    >
                      <div className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(d.created_at)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${badgeClass}`}
                          >
                            {label}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {pair}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 uppercase">
                            {d.side}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {tradeModeBucket(d.trading_mode) === "live"
                              ? t("live")
                              : t("paper")}
                          </span>
                        </div>
                        {reject && rr ? (
                          <p className="text-slate-700 dark:text-slate-300 break-words">
                            {rr}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </PremiumPanel>
        )}

        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden dark:border-slate-800/80 dark:bg-slate-900/60 shadow-sm">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton variant="card" height="56px" />
              <Skeleton variant="card" height="56px" />
              <Skeleton variant="card" height="56px" />
              <Skeleton variant="card" height="56px" />
              <Skeleton variant="card" height="56px" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t("errorTitle")}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  {fetchError}
                </p>
              </div>
              <Button
                className={BRAND.primary}
                onClick={() => void fetchTrades(false)}
              >
                {t("retry")}
              </Button>
            </div>
          ) : signedIn === false ? (
            <div className="text-center py-12 px-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                {t("notLoggedIn")}
              </p>
              <Button variant="outline" onClick={() => void fetchTrades(false)}>
                {t("retry")}
              </Button>
            </div>
          ) : trades.length > 0 && filteredTrades.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <p className="text-slate-600 dark:text-slate-300">
                {t("noTradesFiltered")}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {t("noTradesFilteredHint")}
              </p>
            </div>
          ) : filteredTrades.length === 0 ? (
            <EmptyState
              variant="chart"
              title={t("noTrades")}
              description={t("noTradesHint")}
              action={{ label: t("emptyCta"), href: `/${locale}/trade?first=1` }}
            />
          ) : (
            <div className="overflow-x-auto" data-testid="trade-history-table">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {t("date")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {t("pair")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase max-w-[14rem]">
                      {t("whyColumn")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {t("side")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {t("quantity")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {t("entryPrice")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {t("pnl")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {t("mode")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {t("status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => {
                    const isBuy =
                      String(trade.side).toLowerCase() === "buy" ||
                      String(trade.side).toUpperCase() === "LONG";
                    const pair = (trade.trading_pair ?? "").replace("USDT", "");
                    const hasRealized =
                      trade.realized_pnl != null &&
                      Number.isFinite(Number(trade.realized_pnl));
                    const pnl = hasRealized ? Number(trade.realized_pnl) : null;
                    const sig = parseStrategySignal(trade.strategy_signal);
                    const whyText = sig
                      ? explainStrategySignalJson(sig, locale)
                      : t("whyMissing");
                    return (
                      <tr
                        key={trade.id}
                        data-testid="trade-history-row"
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(trade.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {pair}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[14rem]"
                          title={whyText}
                        >
                          <span className="line-clamp-3">{whyText}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              isBuy
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            {isBuy ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )}
                            {isBuy ? t("buy") : t("sell")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums">
                          {Number(trade.quantity).toFixed(4)}
                        </td>
                         <td className="px-4 py-3 text-sm tabular-nums">
                          {formatByMode(trade.price, trade.mode as TradingMode)}
                        </td>
                        <td className="px-4 py-3">
                          {hasRealized && pnl != null ? (
                             <span
                              className={
                                pnl > 0
                                  ? "text-green-600 dark:text-green-400 font-medium"
                                  : pnl < 0
                                    ? "text-red-600 dark:text-red-400 font-medium"
                                    : "text-slate-600 dark:text-slate-400 font-medium"
                              }
                            >
                              {pnl > 0 ? "+" : ""}
                              {formatByMode(Math.abs(pnl), trade.mode as TradingMode)}
                            </span>
                          ) : (
                            <span
                              className="text-slate-400 dark:text-slate-500"
                              title={t("noRealizedPnlExplainer")}
                            >
                              {t("noRealizedPnlShort")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {tradeModeBucket(trade.mode) === "live"
                              ? t("live")
                              : t("paper")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {trade.status ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PremiumTradingShell>
    </div>
  );
}
