"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { SURFACE, BRAND } from "@/lib/design/tokens";
import { aggregateTradeHistoryStats } from "@/lib/trading/trade-history-aggregates";
import { explainStrategySignalJson } from "@/lib/bot-status-helpers";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import type { Json } from "@/types/supabase-generated";

interface Trade {
  id: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  total_value: number;
  realized_pnl: number | null;
  mode: string;
  status: string;
  created_at: string;
  executed_at: string | null;
  strategy_signal: Json | null;
}

interface TradeDecisionRow {
  id: string;
  decision_type: string;
  trading_mode: string;
  symbol: string;
  side: string;
  requested_quantity: number;
  requested_price: number;
  rejection_reason: string | null;
  created_at: string;
}

type ModeFilter = "all" | "paper" | "live";

const POLL_MS = 20_000;

function parseStrategySignal(raw: Json | null): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

export default function ClientHandelshistorikk() {
  const t = useTranslations("tradeHistory");
  const locale = useLocale();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [decisions, setDecisions] = useState<TradeDecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ModeFilter>("all");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

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
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setSignedIn(!!user);

      if (!user) {
        setTrades([]);
        setDecisions([]);
        if (!silent) setLoading(false);
        return;
      }

      const [tradesRes, decisionsRes] = await Promise.all([
        supabase
          .from("trades")
          .select(
            "id, trading_pair, side, quantity, price, total_value, realized_pnl, mode, status, created_at, executed_at, strategy_signal",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("trade_decisions")
          .select(
            "id, decision_type, trading_mode, symbol, side, requested_quantity, requested_price, rejection_reason, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (tradesRes.error) {
        console.error("handelshistorikk fetch error:", tradesRes.error);
        setFetchError(tradesRes.error.message || t("fetchError"));
        setTrades([]);
      } else {
        const rows = (tradesRes.data as Trade[]) ?? [];
        setTrades(rows);
      }

      if (decisionsRes.error) {
        console.warn("trade_decisions fetch:", decisionsRes.error.message);
        setDecisions([]);
      } else {
        setDecisions((decisionsRes.data as TradeDecisionRow[]) ?? []);
      }

      if (!silent) setLoading(false);
    },
    [t],
  );

  useEffect(() => {
    void fetchTrades(false);
  }, [fetchTrades]);

  /** Når JWT hydreres etter første render — ellers ser getUser() ofte tom ut og listen blir blank. */
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        void fetchTrades(true);
      }
      if (event === "SIGNED_OUT") {
        setTrades([]);
        setDecisions([]);
        setSignedIn(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchTrades]);

  /** Nye live/paper-rader uten manuell refresh (Realtime krever JWT; polling er robust på denne siden). */
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fetchTrades(true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchTrades]);

  const filteredTrades = useMemo(
    () =>
      trades.filter((trade) => {
        if (filter === "all") return true;
        return trade.mode === filter;
      }),
    [trades, filter],
  );

  const filteredDecisions = useMemo(
    () =>
      decisions.filter((d) => {
        if (filter === "all") return true;
        return d.trading_mode === filter;
      }),
    [decisions, filter],
  );

  const stats = useMemo(
    () => aggregateTradeHistoryStats(filteredTrades),
    [filteredTrades],
  );

  const formatNOK = (n: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(n);

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
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-[#0A0B0D]">{t("title")}</h1>
          <Button className={BRAND.primary} disabled>
            {t("exportCsv")}
          </Button>
        </div>

        {/* Filter + stats */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(["all", "paper", "live"] as ModeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-white text-[#0A0B0D] shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {f === "all"
                  ? t("filterAll")
                  : f === "paper"
                    ? t("filterPaper")
                    : t("filterLive")}
              </button>
            ))}
          </div>
          {filteredTrades.length > 0 && (
            <div
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1 text-sm text-gray-600"
              data-testid="trade-history-aggregates"
            >
              <span>
                {t("totalTrades")}:{" "}
                <strong className="text-[#0A0B0D]">{stats.rowCount}</strong>
              </span>
              <span>
                {t("wins")}:{" "}
                <strong className="text-green-700">{stats.winCount}</strong>
              </span>
              <span>
                {t("losses")}:{" "}
                <strong className="text-red-700">{stats.lossCount}</strong>
              </span>
              {stats.breakevenCount > 0 ? (
                <span>
                  {t("breakeven")}:{" "}
                  <strong className="text-gray-700">
                    {stats.breakevenCount}
                  </strong>
                </span>
              ) : null}
              {stats.noRealizedPnlCount > 0 ? (
                <span title={t("noRealizedPnlExplainer")}>
                  {t("noRealizedPnl")}:{" "}
                  <strong className="text-gray-500">
                    {stats.noRealizedPnlCount}
                  </strong>
                </span>
              ) : null}
              <span>
                {t("totalRealizedPnl")}:{" "}
                <strong
                  className={
                    stats.totalRealizedPnl >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }
                >
                  {stats.totalRealizedPnl >= 0 ? "+" : ""}
                  {formatNOK(stats.totalRealizedPnl)}
                </strong>
              </span>
              <span title={t("winRateRealizedHint")}>
                {t("winRate")}:{" "}
                <strong className="text-[#0A0B0D]">
                  {stats.winRateRealizedPct != null
                    ? `${stats.winRateRealizedPct}%`
                    : "—"}
                </strong>
              </span>
            </div>
          )}
        </div>

        {signedIn && !loading && !fetchError && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[#0A0B0D]">
                {t("decisionLogTitle")}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t("decisionLogHint")}
              </p>
            </div>
            {filteredDecisions.length === 0 ? (
              <p className="text-sm text-gray-600">{t("decisionsEmpty")}</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
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
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : reject
                      ? "bg-red-50 text-red-800 border-red-200"
                      : "bg-amber-50 text-amber-900 border-amber-200";
                  const pair = (d.symbol ?? "").replace("USDT", "");
                  const rr = formatRejectionReason(d.rejection_reason);
                  return (
                    <li
                      key={d.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-sm"
                    >
                      <div className="text-gray-500 whitespace-nowrap">
                        {formatDate(d.created_at)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${badgeClass}`}
                          >
                            {label}
                          </span>
                          <span className="font-medium text-[#0A0B0D]">
                            {pair}
                          </span>
                          <span className="text-gray-600 uppercase">
                            {d.side}
                          </span>
                          <span className="text-gray-500">
                            {d.trading_mode === "live" ? t("live") : t("paper")}
                          </span>
                        </div>
                        {reject && rr ? (
                          <p className="text-gray-700 break-words">{rr}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-24 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 px-4 space-y-3">
              <p className="text-red-600 text-sm">{fetchError}</p>
              <Button
                className={BRAND.primary}
                onClick={() => void fetchTrades(false)}
              >
                {t("retry")}
              </Button>
            </div>
          ) : signedIn === false ? (
            <div className="text-center py-12 px-4 space-y-3">
              <p className="text-gray-700">{t("notLoggedIn")}</p>
              <Button variant="outline" onClick={() => void fetchTrades(false)}>
                {t("retry")}
              </Button>
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <p className="text-gray-600">{t("noTrades")}</p>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {t("noTradesHint")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                      {t("date")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                      {t("pair")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase max-w-[14rem]">
                      {t("whyColumn")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                      {t("side")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                      {t("quantity")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                      {t("entryPrice")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                      {t("pnl")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                      {t("mode")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
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
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {formatDate(trade.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#0A0B0D]">
                          {pair}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-gray-700 max-w-[14rem]"
                          title={whyText}
                        >
                          <span className="line-clamp-3">{whyText}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              isBuy
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
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
                          {formatNOK(trade.price)}
                        </td>
                        <td className="px-4 py-3">
                          {hasRealized && pnl != null ? (
                            <span
                              className={
                                pnl > 0
                                  ? "text-green-600 font-medium"
                                  : pnl < 0
                                    ? "text-red-600 font-medium"
                                    : "text-gray-600 font-medium"
                              }
                            >
                              {pnl > 0 ? "+" : ""}
                              {formatNOK(pnl)}
                            </span>
                          ) : (
                            <span
                              className="text-gray-400"
                              title={t("noRealizedPnlExplainer")}
                            >
                              {t("noRealizedPnlShort")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">
                            {trade.mode === "live" ? t("live") : t("paper")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
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
      </div>
    </div>
  );
}
