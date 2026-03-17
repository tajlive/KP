"use client";

import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
} from "lucide-react";

interface Trade {
  id: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  total_value: number;
  pnl?: number;
  created_at: string;
  amount?: number;
  qty?: number;
  symbol?: string;
  [key: string]: unknown;
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
  [key: string]: unknown;
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

const cardBase =
  "bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5";

export function BotDetailView({ session, trades, locale }: BotDetailViewProps) {
  const no = locale === "no";

  const totalPnl = trades.reduce((sum: number, t: Trade) => {
    return sum + (t.pnl ?? 0);
  }, 0);

  const totalVolume = trades.reduce((sum: number, t: Trade) => {
    return sum + (t.amount ?? 0);
  }, 0);

  const winningTrades = trades.filter((t: Trade) => (t.pnl ?? 0) > 0).length;
  const closedTrades = trades.filter((t: Trade) => t.pnl != null).length;
  const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

  const pnlPercent =
    totalVolume > 0 ? (totalPnl / totalVolume) * 100 : 0;

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/dashboard`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0052FF] hover:text-[#0047E0] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {no ? "Tilbake" : "Back"}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#1A1D26]">
          {session.name ?? "Trading Bot"}
        </h1>
        <p className="text-sm text-[#8E95A9] mt-1">
          {session.mode === "paper"
            ? no
              ? "Paper trading"
              : "Paper trading"
            : no
              ? "Live trading"
              : "Live trading"}
          {" · "}
          {no ? "Startet" : "Started"}{" "}
          {new Date(session.created_at).toLocaleDateString(
            locale === "no" ? "nb-NO" : "en-US",
            { day: "numeric", month: "short", year: "numeric" }
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            {totalPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#16A34A]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#DC2626]" />
            )}
            <span className="text-sm text-[#8E95A9]">Total P&L</span>
          </div>
          <p
            className={`text-2xl lg:text-3xl font-bold ${totalPnl >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {totalPnl >= 0 ? "+" : ""}
            {formatNOK(totalPnl)}
          </p>
          <p className="text-xs text-[#8E95A9] mt-1">
            {pnlPercent >= 0 ? "+" : ""}
            {pnlPercent.toFixed(1)}%
          </p>
        </div>

        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#0052FF]" />
            <span className="text-sm text-[#8E95A9]">
              {no ? "Handler" : "Trades"}
            </span>
          </div>
          <p
            className="text-2xl lg:text-3xl font-bold text-[#1A1D26]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {trades.length}
          </p>
          <p className="text-xs text-[#8E95A9] mt-1">
            {no ? "Totalt" : "Total"}
          </p>
        </div>

        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#0052FF]" />
            <span className="text-sm text-[#8E95A9]">Win rate</span>
          </div>
          <p
            className="text-2xl lg:text-3xl font-bold text-[#1A1D26]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {winRate.toFixed(0)}%
          </p>
          <p className="text-xs text-[#8E95A9] mt-1">
            {winningTrades}/{closedTrades} {no ? "handler" : "trades"}
          </p>
        </div>

        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#0052FF]" />
            <span className="text-sm text-[#8E95A9]">
              {no ? "Kjøretid" : "Runtime"}
            </span>
          </div>
          <p
            className="text-2xl lg:text-3xl font-bold text-[#1A1D26]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatDuration(session.created_at)}
          </p>
          <p className="text-xs text-[#8E95A9] mt-1">
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
        <h2 className="text-lg font-semibold text-[#1A1D26] mb-3">
          {no ? "Equity graf" : "Equity chart"}
        </h2>
        <div className="h-[200px] rounded-lg bg-[#F7F8FA] flex items-center justify-center">
          <p className="text-sm text-[#8E95A9]">
            {no ? "Graf kommer snart" : "Chart coming soon"}
          </p>
        </div>
      </div>

      <div className={cardBase}>
        <h2 className="text-lg font-semibold text-[#1A1D26] mb-4">
          {no ? "Handelshistorikk" : "Trade history"}
        </h2>
        {trades.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#8E95A9]">
              {no ? "Ingen handler ennå" : "No trades yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#E2E5EC]">
                  <th className="text-left text-xs font-medium text-[#8E95A9] uppercase tracking-wider pb-3 px-5">
                    {no ? "Tid" : "Time"}
                  </th>
                  <th className="text-left text-xs font-medium text-[#8E95A9] uppercase tracking-wider pb-3 px-3">
                    {no ? "Par" : "Pair"}
                  </th>
                  <th className="text-left text-xs font-medium text-[#8E95A9] uppercase tracking-wider pb-3 px-3">
                    {no ? "Side" : "Side"}
                  </th>
                  <th className="text-right text-xs font-medium text-[#8E95A9] uppercase tracking-wider pb-3 px-3">
                    {no ? "Mengde" : "Quantity"}
                  </th>
                  <th className="text-right text-xs font-medium text-[#8E95A9] uppercase tracking-wider pb-3 px-3">
                    {no ? "Pris" : "Price"}
                  </th>
                  <th className="text-right text-xs font-medium text-[#8E95A9] uppercase tracking-wider pb-3 px-5">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E5EC]">
                {trades.map((trade: Trade, i: number) => (
                  <tr key={trade.id ?? i} className="hover:bg-[#F7F8FA]/60 transition-colors">
                    <td className="py-3 px-5 text-sm text-[#5E6478]" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {trade.created_at
                        ? new Date(trade.created_at).toLocaleString(
                            locale === "no" ? "nb-NO" : "en-US",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-sm font-medium text-[#1A1D26]">
                      {trade.symbol ?? "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-sm font-medium ${
                          trade.side === "BUY"
                            ? "text-[#16A34A]"
                            : "text-[#DC2626]"
                        }`}
                      >
                        {trade.side === "BUY"
                          ? no
                            ? "Kjøp"
                            : "Buy"
                          : no
                            ? "Selg"
                            : "Sell"}
                      </span>
                    </td>
                    <td
                      className="py-3 px-3 text-sm text-[#1A1D26] text-right"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {trade.qty?.toFixed(6) ?? "—"}
                    </td>
                    <td
                      className="py-3 px-3 text-sm text-[#1A1D26] text-right"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {trade.price ? formatNOK(trade.price) : "—"}
                    </td>
                    <td
                      className={`py-3 px-5 text-sm font-medium text-right ${
                        (trade.pnl ?? 0) >= 0
                          ? "text-[#16A34A]"
                          : "text-[#DC2626]"
                      }`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {trade.pnl != null
                        ? `${trade.pnl >= 0 ? "+" : ""}${formatNOK(trade.pnl)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cardBase}>
        <h2 className="text-lg font-semibold text-[#1A1D26] mb-4">
          {no ? "Strategiinfo" : "Strategy info"}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] uppercase tracking-wider">
              {no ? "Strategi" : "Strategy"}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] mt-1">
              {session.strategy_type ?? session.strategy ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] uppercase tracking-wider">
              {no ? "Risikonivå" : "Risk level"}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] mt-1">
              {session.risk_level ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] uppercase tracking-wider">
              {no ? "Aktive par" : "Active pairs"}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] mt-1">
              {Array.isArray(session.pairs)
                ? session.pairs.join(", ")
                : session.symbol ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] uppercase tracking-wider">
              {no ? "Startet" : "Started"}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] mt-1">
              {new Date(session.created_at).toLocaleDateString(
                locale === "no" ? "nb-NO" : "en-US",
                { day: "numeric", month: "long", year: "numeric" }
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
