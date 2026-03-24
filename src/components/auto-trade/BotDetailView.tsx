"use client";

import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
} from "lucide-react";
import { BRAND, SURFACE, SHADOW, RADIUS } from "@/lib/design/tokens";

interface Trade {
  id: string;
  trading_pair?: string;
  side: string;
  quantity?: number;
  price: number;
  total_value?: number;
  realized_pnl?: number | null;
  pnl?: number;
  created_at: string;
  amount?: number;
  qty?: number;
  symbol?: string;
  [key: string]: unknown;
}

function tradePairLabel(t: Trade) {
  const raw = t.trading_pair ?? t.symbol ?? "";
  return String(raw).replace(/USDT$/i, "") || "—";
}

function tradeQty(t: Trade) {
  const q = t.quantity ?? t.qty;
  return typeof q === "number" && Number.isFinite(q) ? q : null;
}

function tradePnl(t: Trade) {
  if (t.realized_pnl != null && Number.isFinite(Number(t.realized_pnl))) {
    return Number(t.realized_pnl);
  }
  if (t.pnl != null && Number.isFinite(Number(t.pnl))) {
    return Number(t.pnl);
  }
  return null;
}

function isBuySide(t: Trade) {
  const s = String(t.side ?? "").toUpperCase();
  return s === "BUY" || s === "LONG";
}

interface Session {
  id: string;
  strategy_id: string;
  strategy_config?: Record<string, unknown>;
  status: string;
  mode: string;
  starting_capital_nok: number;
  current_capital_nok: number;
  total_pnl: number;
  total_trades: number;
  created_at: string;
  name?: string;
  strategy_type?: string;
  strategy?: string;
  risk_level?: string;
  pairs?: string[];
  symbol?: string;
  trading_pair?: string;
  [key: string]: unknown;
}

function sessionPairsLine(s: Session) {
  if (Array.isArray(s.pairs) && s.pairs.length > 0) {
    return s.pairs.map((p) => String(p).replace(/USDT$/i, "")).join(", ");
  }
  const sc = s.strategy_config;
  if (
    sc &&
    typeof sc === "object" &&
    !Array.isArray(sc) &&
    Array.isArray((sc as { pairs?: unknown }).pairs)
  ) {
    return (sc as { pairs: string[] }).pairs
      .map((p) => String(p).replace(/USDT$/i, ""))
      .join(", ");
  }
  const tp = s.trading_pair ?? s.symbol;
  return tp ? String(tp).replace(/USDT$/i, "") : "—";
}

function sessionStrategyLabel(s: Session) {
  if (s.strategy_id && String(s.strategy_id).length > 0) {
    return String(s.strategy_id);
  }
  return s.strategy_type ?? s.strategy ?? "—";
}

interface BotDetailViewProps {
  session: Session;
  trades: Trade[];
  locale: string;
}

function formatNOK(n: number) {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDuration(startDate: string) {
  const ms = Date.now() - new Date(startDate).getTime();
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}t`;
  return `${hours}t`;
}

const cardBase = `bg-white dark:bg-slate-900 ${RADIUS.card} border border-[#E2E5EC] dark:border-slate-800 ${SHADOW.card} p-5`;

export function BotDetailView({ session, trades, locale }: BotDetailViewProps) {
  const no = locale === "no";

  const totalPnl = trades.reduce((sum: number, t: Trade) => {
    const p = tradePnl(t);
    return sum + (p ?? 0);
  }, 0);

  const totalVolume = trades.reduce((sum: number, t: Trade) => {
    const tv = t.total_value;
    if (typeof tv === "number" && Number.isFinite(tv)) return sum + tv;
    const q = tradeQty(t);
    const p = typeof t.price === "number" ? t.price : 0;
    if (q != null && p) return sum + q * p;
    return sum + (typeof t.amount === "number" ? t.amount : 0);
  }, 0);

  const winningTrades = trades.filter((t: Trade) => {
    const p = tradePnl(t);
    return p != null && p > 0;
  }).length;
  const closedTrades = trades.filter((t: Trade) => tradePnl(t) != null).length;
  const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

  const pnlPercent = totalVolume > 0 ? (totalPnl / totalVolume) * 100 : 0;

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/dashboard`}
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${BRAND.link}`}
      >
        <ArrowLeft className="w-4 h-4" />
        {no ? "Tilbake" : "Back"}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#1A1D26] dark:text-white">
          {session.name ?? "Trading Bot"}
        </h1>
        <p className="text-sm text-[#8E95A9] dark:text-slate-400 mt-1">
          {session.mode === "paper"
            ? no
              ? "Lekepenger"
              : "Paper trading"
            : no
              ? "Live trading"
              : "Live trading"}
          {" · "}
          {no ? "Startet" : "Started"}{" "}
          {new Date(session.created_at).toLocaleDateString(
            locale === "no" ? "nb-NO" : "en-US",
            { day: "numeric", month: "short", year: "numeric" },
          )}
        </p>
      </div>

      {session.status === "active" && trades.length === 0 && (
        <div className={cardBase}>
          <p className="text-sm font-semibold text-[#1A1D26] dark:text-white">
            {no
              ? "Boten er aktiv, men venter på signal"
              : "Bot is active, waiting for a signal"}
          </p>
          <p className="mt-1 text-sm text-[#5E6478] dark:text-slate-400">
            {no
              ? "Dette er normalt. Ingen ordre er utført ennå. Når første ordre kjøres, vises den automatisk i handelshistorikken."
              : "This is normal. No order has been executed yet. When the first order is executed, it will appear automatically in trade history."}
          </p>
          <div className="mt-3">
            <Link
              href={`/${locale}/handelshistorikk`}
              className={`inline-flex text-sm font-medium ${BRAND.link}`}
            >
              {no ? "Åpne handelshistorikk" : "Open trade history"} →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            {totalPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#16A34A]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#DC2626]" />
            )}
            <span className="text-sm text-[#8E95A9] dark:text-slate-400">
              Total P&L
            </span>
          </div>
          <p
            className={`text-2xl lg:text-3xl font-bold ${totalPnl >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {totalPnl >= 0 ? "+" : ""}
            {formatNOK(totalPnl)}
          </p>
          <p className="text-xs text-[#8E95A9] dark:text-slate-500 mt-1">
            {pnlPercent >= 0 ? "+" : ""}
            {pnlPercent.toFixed(1)}%
          </p>
        </div>

        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#0052FF]" />
            <span className="text-sm text-[#8E95A9] dark:text-slate-400">
              {no ? "Handler" : "Trades"}
            </span>
          </div>
          <p
            className="text-2xl lg:text-3xl font-bold text-[#1A1D26] dark:text-white"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {trades.length}
          </p>
          <p className="text-xs text-[#8E95A9] dark:text-slate-500 mt-1">
            {no ? "Totalt" : "Total"}
          </p>
        </div>

        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#0052FF]" />
            <span className="text-sm text-[#8E95A9] dark:text-slate-400">
              Win rate
            </span>
          </div>
          <p
            className="text-2xl lg:text-3xl font-bold text-[#1A1D26] dark:text-white"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {winRate.toFixed(0)}%
          </p>
          <p className="text-xs text-[#8E95A9] dark:text-slate-500 mt-1">
            {winningTrades}/{closedTrades} {no ? "handler" : "trades"}
          </p>
        </div>

        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#0052FF]" />
            <span className="text-sm text-[#8E95A9] dark:text-slate-400">
              {no ? "Kjøretid" : "Runtime"}
            </span>
          </div>
          <p
            className="text-2xl lg:text-3xl font-bold text-[#1A1D26] dark:text-white"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatDuration(session.created_at)}
          </p>
          <p className="text-xs text-[#8E95A9] dark:text-slate-500 mt-1">
            {session.status === "active"
              ? no
                ? "Kjører nå"
                : "Running"
              : no
                ? "Stoppet"
                : "Stopped"}
          </p>
        </div>
      </div>

      <div className={cardBase}>
        <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-3">
          {no ? "Equity graf" : "Equity chart"}
        </h2>
        <div
          className={`h-[200px] rounded-lg ${SURFACE.BG_LIGHT} dark:bg-slate-950 flex items-center justify-center border border-[#E2E5EC] dark:border-slate-800`}
        >
          <p className="text-sm text-[#8E95A9] dark:text-slate-400">
            {no ? "Graf kommer snart" : "Chart coming soon"}
          </p>
        </div>
      </div>

      <div className={cardBase}>
        <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-4">
          {no ? "Handelshistorikk" : "Trade history"}
        </h2>
        {trades.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#8E95A9] dark:text-slate-400">
              {no ? "Ingen handler ennå" : "No trades yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#E2E5EC] dark:border-slate-700">
                  <th className="text-left text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-5">
                    {no ? "Tid" : "Time"}
                  </th>
                  <th className="text-left text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-3">
                    {no ? "Par" : "Pair"}
                  </th>
                  <th className="text-left text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-3">
                    {no ? "Side" : "Side"}
                  </th>
                  <th className="text-right text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-3">
                    {no ? "Mengde" : "Quantity"}
                  </th>
                  <th className="text-right text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-3">
                    {no ? "Pris" : "Price"}
                  </th>
                  <th className="text-right text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-5">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E5EC] dark:divide-slate-700">
                {trades.map((trade: Trade, i: number) => {
                  const buy = isBuySide(trade);
                  const qty = tradeQty(trade);
                  const pnl = tradePnl(trade);
                  return (
                    <tr
                      key={trade.id ?? i}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                    >
                      <td
                        className="py-3 px-5 text-sm text-[#5E6478] dark:text-slate-400"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {trade.created_at
                          ? new Date(trade.created_at).toLocaleString(
                              locale === "no" ? "nb-NO" : "en-US",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-sm font-medium text-[#1A1D26] dark:text-white">
                        {tradePairLabel(trade)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-sm font-medium ${
                            buy ? "text-[#16A34A]" : "text-[#DC2626]"
                          }`}
                        >
                          {buy ? (no ? "Kjøp" : "Buy") : no ? "Selg" : "Sell"}
                        </span>
                      </td>
                      <td
                        className="py-3 px-3 text-sm text-[#1A1D26] dark:text-white text-right"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {qty != null ? qty.toFixed(6) : "—"}
                      </td>
                      <td
                        className="py-3 px-3 text-sm text-[#1A1D26] dark:text-white text-right"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {trade.price ? formatNOK(trade.price) : "—"}
                      </td>
                      <td
                        className={`py-3 px-5 text-sm font-medium text-right ${
                          pnl != null && pnl >= 0
                            ? "text-[#16A34A]"
                            : pnl != null
                              ? "text-[#DC2626]"
                              : "text-[#8E95A9] dark:text-slate-500"
                        }`}
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {pnl != null
                          ? `${pnl >= 0 ? "+" : ""}${formatNOK(pnl)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cardBase}>
        <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-4">
          {no ? "Strategiinfo" : "Strategy info"}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] dark:text-slate-500 uppercase tracking-wider">
              {no ? "Strategi" : "Strategy"}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] dark:text-white mt-1">
              {sessionStrategyLabel(session)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] dark:text-slate-500 uppercase tracking-wider">
              {no ? "Risikonivå" : "Risk level"}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] dark:text-white mt-1">
              {(() => {
                const fromSession = session.risk_level;
                if (fromSession) return fromSession;
                const sc = session.strategy_config;
                if (sc && typeof sc === "object" && !Array.isArray(sc)) {
                  const rl = (sc as { risk_level?: string }).risk_level;
                  if (rl) return rl;
                }
                return "—";
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] dark:text-slate-500 uppercase tracking-wider">
              {no ? "Aktive par" : "Active pairs"}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] dark:text-white mt-1">
              {sessionPairsLine(session)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] dark:text-slate-500 uppercase tracking-wider">
              {no ? "Startet" : "Started"}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] dark:text-white mt-1">
              {new Date(session.created_at).toLocaleDateString(
                locale === "no" ? "nb-NO" : "en-US",
                { day: "numeric", month: "long", year: "numeric" },
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
