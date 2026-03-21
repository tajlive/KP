"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { SURFACE, BRAND } from "@/lib/design/tokens";
import { aggregateTradeHistoryStats } from "@/lib/trading/trade-history-aggregates";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";

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
}

type ModeFilter = "all" | "paper" | "live";

const POLL_MS = 20_000;

export default function ClientHandelshistorikk() {
  const t = useTranslations("tradeHistory");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ModeFilter>("all");

  const fetchTrades = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setTrades([]);
      if (!silent) setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("trades")
      .select(
        "id, trading_pair, side, quantity, price, total_value, realized_pnl, mode, status, created_at, executed_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("handelshistorikk fetch error:", error);
      setTrades([]);
    } else {
      setTrades((data as Trade[]) ?? []);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTrades(false);
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

  const stats = useMemo(
    () => aggregateTradeHistoryStats(filteredTrades),
    [filteredTrades],
  );

  const formatNOK = (n: number) =>
    new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(n);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString("no-NO", {
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

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-24 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredTrades.length === 0 ? (
            <p className="text-center text-gray-500 py-12">{t("noTrades")}</p>
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
                    const isBuy = String(trade.side).toUpperCase() === "BUY";
                    const pair = (trade.trading_pair ?? "").replace("USDT", "");
                    const hasRealized =
                      trade.realized_pnl != null &&
                      Number.isFinite(Number(trade.realized_pnl));
                    const pnl = hasRealized ? Number(trade.realized_pnl) : null;
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
