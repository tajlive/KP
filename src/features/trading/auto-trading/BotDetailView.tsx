"use client";

import { formatNOK } from "@/lib/format/currency";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { BRAND, SURFACE, SHADOW, RADIUS } from "@/lib/design/tokens";
import {
  PremiumPanel,
  PremiumTradingHero,
  PremiumTradingShell,
} from "@/features/trading/PremiumTradingLayout";
import { LivePricePreview } from "@/features/trading/LivePricePreview";

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


function formatDuration(startDate: string) {
  const ms = Date.now() - new Date(startDate).getTime();
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}t`;
  return `${hours}t`;
}

const cardBase = `bg-white dark:bg-slate-900 ${RADIUS.card} border border-[#E2E5EC] dark:border-slate-800 ${SHADOW.card} p-5`;

export function BotDetailView({ session: initialSession, trades, locale }: BotDetailViewProps) {
  const t = useTranslations("trading.botDetail");
  const no = locale === "no";
  const router = useRouter();
  const [session, setSession] = useState<Session>(initialSession);
  const [loading, setLoading] = useState(false);
  // Close-on-stop: selg åpen posisjon ved stopp (default PÅ, avansert toggle)
  const [closeOnStop, setCloseOnStop] = useState<boolean>(
    initialSession.strategy_config?.close_on_stop !== false,
  );

  const handleStatusChange = useCallback(
    async (newStatus: "active" | "paused" | "stopped") => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/trading-sessions/${session.id}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: newStatus,
              ...(newStatus === "stopped"
                ? { close_on_stop: closeOnStop }
                : {}),
            }),
          },
        );
        if (!response.ok) throw new Error("Failed to update status");
        const data = await response.json();
        if (data.session) {
          setSession((prev) => ({ ...prev, ...data.session }));
          window.dispatchEvent(new Event("klarpakke:trader-status-changed"));
        }
        if (newStatus === "stopped") {
          const cos = data?.close_on_stop;
          if (cos?.closed && cos?.explanation) {
            toast.success(cos.explanation, { duration: 20000 });
          } else if (cos?.reason === "disabled_by_config") {
            toast.info(
              no
                ? "Bot stoppet — posisjonen er fortsatt åpen og overvåkes ikke lenger."
                : "Bot stopped — the position remains open and is no longer monitored.",
              { duration: 12000 },
            );
          } else if (cos?.reason === "capital_credit_failed") {
            toast.error(
              no
                ? "Salg bokført, men kapitalen ble ikke kreditert. Posisjonen er bevart — ta kontakt med support."
                : "Sale recorded, but capital was not credited. The position is preserved — please contact support.",
              { duration: 20000 },
            );
          } else if (cos && !cos.closed) {
            // Alle andre feil (reason "error" e.l.): aldri stillhet ved stopp
            // (E2E-funn F5).
            toast.error(
              no
                ? "Boten er stoppet, men posisjonen kunne ikke selges automatisk. Den er fortsatt åpen — selg manuelt eller ta kontakt med support."
                : "The bot was stopped, but the position could not be sold automatically. It is still open — sell manually or contact support.",
              { duration: 20000 },
            );
          }
        }
      } catch (err) {
        console.error("Status change failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [session.id, closeOnStop, no],
  );

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
    <PremiumTradingShell>
      <Link
        href={`/${locale}/dashboard`}
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${BRAND.link}`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </Link>

      <PremiumTradingHero
        eyebrow={t("botDetails")}
        title={session.name ?? t("defaultBotName")}
        subtitle={`${session.mode === "paper" ? (t("paperTrading")) : t("liveTrading")} · ${t("started")} ${new Date(
          session.created_at,
        ).toLocaleDateString(locale === "no" ? "nb-NO" : "en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`}
      />

      {/* Bot Actions */}
      {session.status !== "stopped" && (
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-[#5E6478] dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={closeOnStop}
              onChange={(e) => setCloseOnStop(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            <span>
              {no
                ? "Selg åpen posisjon når boten stoppes (anbefalt)"
                : "Sell open position when the bot stops (recommended)"}
              <span className="block text-xs text-slate-400 dark:text-slate-500">
                {no
                  ? "Posisjonen selges til markedspris og resultatet vises med en læringsforklaring."
                  : "The position is sold at market price and the result is shown with a learning explanation."}
              </span>
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
          {session.status === "active" ? (
            <button
              type="button"
              onClick={() => handleStatusChange("paused")}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E5EC] dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-[#5E6478] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              {no ? "Pause bot" : "Pause bot"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStatusChange("active")}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0052FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0047E0] transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {no ? "Gjenoppta" : "Resume"}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleStatusChange("stopped")}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            <Square className="w-4 h-4" />
            {no ? "Stopp bot" : "Stop bot"}
          </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <LivePricePreview symbol={session.trading_pair ?? session.symbol ?? "BTCUSDT"} />
      </div>

      {session.status === "active" && trades.length === 0 && (
        <PremiumPanel>
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
              {t("openTradeHistory")} →
            </Link>
          </div>
        </PremiumPanel>
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
              {t("trades")}
            </span>
          </div>
          <p
            className="text-2xl lg:text-3xl font-bold text-[#1A1D26] dark:text-white"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {trades.length}
          </p>
          <p className="text-xs text-[#8E95A9] dark:text-slate-500 mt-1">
            {t("total")}
          </p>
        </div>

        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#0052FF]" />
            <span className="text-sm text-[#8E95A9] dark:text-slate-400">
              {t("winRate")}
            </span>
          </div>
          <p
            className="text-2xl lg:text-3xl font-bold text-[#1A1D26] dark:text-white"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {winRate.toFixed(0)}%
          </p>
          <p className="text-xs text-[#8E95A9] dark:text-slate-500 mt-1">
            {winningTrades}/{closedTrades} {t("trades1")}
          </p>
        </div>

        <div className={cardBase}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#0052FF]" />
            <span className="text-sm text-[#8E95A9] dark:text-slate-400">
              {t("runtime")}
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

      <PremiumPanel>
        <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-3">
          {t("equityChart")}
        </h2>
        <div
          className={`h-[200px] rounded-lg ${SURFACE.BG_LIGHT} dark:bg-slate-950 flex items-center justify-center border border-[#E2E5EC] dark:border-slate-800`}
        >
          <div className="text-center px-6">
            <p className="text-sm font-medium text-[#1A1D26] dark:text-slate-200">
              {t("equityPreview")}
            </p>
            <p className="mt-1 text-xs text-[#8E95A9] dark:text-slate-400">
              {no
                ? "Vises automatisk når boten har minst to utførte handler."
                : "Automatically shown when the bot has at least two executed trades."}
            </p>
          </div>
        </div>
      </PremiumPanel>

      <PremiumPanel>
        <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-4">
          {t("tradeHistory")}
        </h2>
        {trades.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#8E95A9] dark:text-slate-400">
              {t("noTradesYet")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#E2E5EC] dark:border-slate-700">
                  <th className="text-left text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-5">
                    {t("time")}
                  </th>
                  <th className="text-left text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-3">
                    {t("pair")}
                  </th>
                  <th className="text-left text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-3">
                    {t("side")}
                  </th>
                  <th className="text-right text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-3">
                    {t("quantity")}
                  </th>
                  <th className="text-right text-xs font-medium text-[#8E95A9] dark:text-slate-400 uppercase tracking-wider pb-3 px-3">
                    {t("price")}
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
                          {buy ? t("buy") : t("sell")}
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
      </PremiumPanel>

      <PremiumPanel>
        <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-4">
          {t("strategyInfo")}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] dark:text-slate-500 uppercase tracking-wider">
              {t("strategy")}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] dark:text-white mt-1">
              {sessionStrategyLabel(session)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] dark:text-slate-500 uppercase tracking-wider">
              {t("riskLevel")}
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
              {t("activePairs")}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] dark:text-white mt-1">
              {sessionPairsLine(session)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#8E95A9] dark:text-slate-500 uppercase tracking-wider">
              {t("started")}
            </dt>
            <dd className="text-sm font-medium text-[#1A1D26] dark:text-white mt-1">
              {new Date(session.created_at).toLocaleDateString(
                locale === "no" ? "nb-NO" : "en-US",
                { day: "numeric", month: "long", year: "numeric" },
              )}
            </dd>
          </div>
        </dl>
      </PremiumPanel>
    </PremiumTradingShell>
  );
}
