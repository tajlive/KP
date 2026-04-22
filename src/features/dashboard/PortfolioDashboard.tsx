"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  BookOpen,
  Zap,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Activity,
  Shield,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD, BRAND } from "@/lib/design/tokens";
import { MARKET_DESK } from "@/lib/design/market-desk";
import { formatRelativeTimeShort } from "@/lib/format/relative-time-short";
import { useRealtimePrices } from "@/lib/hooks/useRealtimePrices";
import { useDashboardTradingIntegritySync } from "@/lib/hooks/useDashboardTradingIntegritySync";
import { subscribeToTrades, type Trade as ApiTrade } from "@/lib/trading-api";
import ReverseTrial from "./ReverseTrial";
import { StreakBadge } from "./StreakBadge";
import { winRateFromRealizedTrades } from "@/lib/trading/win-rate-from-trades";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { reportTradingIntegrityManualSync } from "@/lib/sentry";
import PnlBreakdown from "./PnlBreakdown";
import {
  MobilePositionList,
  DesktopPositionList,
} from "./MobilePositionList";

/** Code-split: PremiumSignalRow + framer-motion + signal-fetch */
function MarketDeskSignalSkeleton() {
  return (
    <div
      className="min-h-[120px] rounded-xl animate-pulse bg-slate-800/40 border border-slate-700/40"
      aria-hidden
    />
  );
}

const DashboardSignalPreview = dynamic(
  () =>
    import("@/features/dashboard/DashboardSignalPreview").then((m) => ({
      default: m.DashboardSignalPreview,
    })),
  { loading: () => <MarketDeskSignalSkeleton /> },
);

const FirstTradeCard = dynamic(
  () => import("@/features/dashboard/FirstTradeCard"),
  {
    loading: () => (
      <div
        className="h-24 w-full rounded-xl animate-pulse bg-[#F1F3F9] border border-[#E2E5EC]"
        aria-hidden
      />
    ),
  },
);

const DASHBOARD_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

const COIN_GRADIENTS: { [key: string]: string } = {
  BTCUSDT: "from-[#F7931A] to-[#E8860A]",
  ETHUSDT: "from-[#627EEA] to-[#4A63D2]",
  SOLUSDT: "from-[#9945FF] to-[#14F195]",
  BNBUSDT: "from-[#F3BA2F] to-[#E8A80C]",
};

interface Trade {
  id: string;
  session_id?: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  total_value: number;
  status: string;
  mode: string;
  created_at: string;
  realized_pnl?: number | null;
  amount?: number;
  qty?: number;
  symbol?: string;
  [key: string]: unknown;
}

interface ActiveSession {
  id: string;
  mode: string;
  status: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  total_trades: number;
  winning_trades?: number;
  created_at: string;
  name?: string;
  pnl?: number;
  [key: string]: unknown;
}

interface PortfolioDashboardProps {
  userId: string;
  locale: string;
  paperBalance: number;
  tier: string;
  trades: Trade[];
  activeSession: ActiveSession | null;
  trialEndsAt?: string | null;
}

function normalizeTradeSymbol(trade: Trade): string {
  if (typeof trade.symbol === "string" && trade.symbol.length > 0) {
    return trade.symbol;
  }
  if (typeof trade.trading_pair === "string" && trade.trading_pair.length > 0) {
    return trade.trading_pair.replace("/", "");
  }
  return "";
}

function normalizeTradeQty(trade: Trade): number {
  if (typeof trade.qty === "number") return trade.qty;
  if (typeof trade.quantity === "number") return trade.quantity;
  return 0;
}

function normalizeTradeAmount(trade: Trade): number {
  if (typeof trade.amount === "number") return trade.amount;
  if (typeof trade.total_value === "number") return trade.total_value;
  return 0;
}

function isBuyTrade(trade: Trade): boolean {
  return String(trade.side).toUpperCase() === "BUY";
}

function apiTradeToDashboardTrade(t: ApiTrade): Trade {
  return {
    id: t.id,
    session_id: t.session_id,
    trading_pair: t.symbol,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
    total_value: t.total_value,
    status: t.status,
    mode: t.mode,
    created_at: t.created_at,
    realized_pnl: t.realized_pnl,
  };
}

function formatNOK(locale: string, n: number) {
  return new Intl.NumberFormat(locale === "no" ? "no-NO" : "en-GB", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

type PnlPeriod = "24h" | "7d" | "30d" | "all";

const PNL_PERIOD_ORDER: PnlPeriod[] = ["24h", "7d", "30d", "all"];

function periodCutoff(period: PnlPeriod): Date | null {
  if (period === "all") return null;
  const ms =
    period === "24h"
      ? 86400000
      : period === "7d"
        ? 7 * 86400000
        : 30 * 86400000;
  return new Date(Date.now() - ms);
}

/** Kort med skygge og 200ms overgang (tokens CARD.hover med p-5) */
const cardBase = `${CARD.hover.replace("p-6", "p-5")}`;

export default function PortfolioDashboard({
  userId,
  locale,
  paperBalance,
  tier,
  trialEndsAt,
  trades,
  activeSession,
}: PortfolioDashboardProps) {
  const no = locale === "no";
  const t = useTranslations("dashboard");
  const {
    coins: liveCoins,
    loading: pricesLoading,
    error: pricesError,
    refresh: refreshPrices,
  } = useRealtimePrices(DASHBOARD_SYMBOLS);

  // Live trades: server snapshot + realtime (JWT via subscribeToTrades — RLS krever setAuth)
  const [liveTrades, setLiveTrades] = useState<Trade[]>(trades);
  useEffect(() => {
    setLiveTrades(trades);
  }, [trades]);
  useEffect(() => {
    if (!userId) return;
    return subscribeToTrades(null, userId, (incoming, _kind) => {
      const row = apiTradeToDashboardTrade(incoming);
      setLiveTrades((prev) => {
        const i = prev.findIndex((x) => x.id === row.id);
        if (i === -1) {
          return [row, ...prev].slice(0, 50);
        }
        const next = [...prev];
        next[i] = row;
        return next;
      });
    });
  }, [userId]);

  const applyTradesSnapshot = useCallback((rows: ApiTrade[]) => {
    setLiveTrades(rows.map(apiTradeToDashboardTrade));
  }, []);

  const { refreshTradesNow, refreshServerProps, tradesPollFailed } =
    useDashboardTradingIntegritySync({
      userId,
      onTradesSnapshot: applyTradesSnapshot,
    });

  const [manualIntegritySync, setManualIntegritySync] = useState(false);
  const runManualIntegritySync = async () => {
    reportTradingIntegrityManualSync();
    setManualIntegritySync(true);
    try {
      await refreshTradesNow();
      refreshServerProps();
    } finally {
      setManualIntegritySync(false);
    }
  };

  const displayTrades = liveTrades;

  const [pnlPeriod, setPnlPeriod] = useState<PnlPeriod>("all");

  const periodTrades = useMemo(() => {
    const cut = periodCutoff(pnlPeriod);
    const filtered = cut
      ? displayTrades.filter(
          (t) => new Date(t.created_at).getTime() >= cut.getTime(),
        )
      : [...displayTrades];
    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [displayTrades, pnlPeriod]);

  const periodFlowPnl = useMemo(
    () =>
      periodTrades.reduce((sum: number, t: Trade) => {
        const tradeAmount = normalizeTradeAmount(t);
        const val = isBuyTrade(t) ? -tradeAmount : tradeAmount;
        return sum + val;
      }, 0),
    [periodTrades],
  );

  const sessionStarting =
    activeSession != null
      ? Number(activeSession.starting_capital_nok ?? paperBalance)
      : paperBalance;
  const sessionCapital =
    activeSession != null
      ? Number(
          activeSession.current_capital_nok ??
            activeSession.starting_capital_nok ??
            paperBalance,
        )
      : null;

  const sessionScopedTrades =
    activeSession != null
      ? displayTrades.filter((t) => t.session_id === activeSession.id)
      : [];
  const cashFlowFromScoped = sessionScopedTrades.reduce(
    (sum: number, t: Trade) => {
      const tradeAmount = normalizeTradeAmount(t);
      const val = isBuyTrade(t) ? -tradeAmount : tradeAmount;
      return sum + val;
    },
    0,
  );
  const derivedSessionBalance =
    activeSession != null && sessionScopedTrades.length > 0
      ? sessionStarting + cashFlowFromScoped
      : null;

  const displayBalance =
    activeSession != null
      ? (derivedSessionBalance ?? sessionCapital ?? sessionStarting)
      : paperBalance;
  const periodPnlDenominator =
    sessionStarting > 0 ? sessionStarting : paperBalance > 0 ? paperBalance : 1;
  const periodPnlPercent = (periodFlowPnl / periodPnlDenominator) * 100;

  const effectiveMode: "paper" | "live" =
    activeSession?.mode === "live" ? "live" : "paper";

  const tradingDeskPath =
    activeSession?.mode === "live"
      ? "/paper-trading?mode=live"
      : "/paper-trading";

  type Position = { symbol: string; qty: number; value: number };
  const positions = displayTrades.reduce(
    (acc: Record<string, Position>, t: Trade) => {
      const sym = normalizeTradeSymbol(t);
      if (!sym) return acc;
      if (!acc[sym]) acc[sym] = { symbol: sym, qty: 0, value: 0 };
      const sign = isBuyTrade(t) ? 1 : -1;
      acc[sym].qty += sign * normalizeTradeQty(t);
      acc[sym].value += sign * normalizeTradeAmount(t);
      return acc;
    },
    {} as Record<string, Position>,
  );
  const positionList = Object.values(positions).filter(
    (p: Position) => p.qty > 0,
  );

  const priceForSymbol = (sym: string) => {
    const key = sym.length <= 4 && !sym.includes("USDT") ? `${sym}USDT` : sym;
    return liveCoins.find((c) => c.symbol === key)?.price ?? 0;
  };
  const gradientForSymbol = (sym: string) => {
    const key = sym.length <= 4 && !sym.includes("USDT") ? `${sym}USDT` : sym;
    return COIN_GRADIENTS[key] ?? "from-gray-400 to-gray-500";
  };

  // P&L Breakdown calculations (must be after positionList and priceForSymbol)
  const pnlBreakdown = useMemo(() => {
    const buys = periodTrades.filter((t) => isBuyTrade(t));
    const sells = periodTrades.filter((t) => !isBuyTrade(t));
    const totalBuyValue = buys.reduce((sum, t) => sum + normalizeTradeAmount(t), 0);
    const totalSellValue = sells.reduce((sum, t) => sum + normalizeTradeAmount(t), 0);
    const totalFees = periodTrades.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);
    const realizedPnl = periodTrades.reduce(
      (sum, t) => sum + (t.realized_pnl != null ? Number(t.realized_pnl) : 0),
      0,
    );
    // Unrealized: current value of open positions minus cost basis
    const unrealizedPnl = positionList.reduce((sum, pos) => {
      const price = priceForSymbol(pos.symbol);
      const currentValue = pos.qty * price;
      return sum + (currentValue - pos.value);
    }, 0);
    return {
      totalBuyValue,
      totalSellValue,
      totalFees,
      realizedPnl,
      unrealizedPnl,
    };
  }, [periodTrades, positionList]);

  const recentTrades = displayTrades.slice(0, 6);
  const hasRecentActivity = recentTrades.some(
    (t) =>
      t.created_at && Date.now() - new Date(t.created_at).getTime() < 3600000,
  );
  const winRateFromSession =
    activeSession &&
    typeof activeSession.winning_trades === "number" &&
    typeof activeSession.total_trades === "number" &&
    activeSession.total_trades > 0
      ? Math.round(
          (activeSession.winning_trades / activeSession.total_trades) * 100,
        )
      : null;
  const winRateFromTrades = winRateFromRealizedTrades(displayTrades);
  const winRateOverall = winRateFromSession ?? winRateFromTrades;
  const winRatePeriod =
    winRateFromRealizedTrades(periodTrades) ??
    (pnlPeriod === "all" ? winRateOverall : null);

  const tradeCountDisplay =
    pnlPeriod === "all"
      ? Math.max(activeSession?.total_trades ?? 0, periodTrades.length)
      : periodTrades.length;

  return (
    <div className="space-y-4" data-testid="dashboard-root">
      <ReverseTrial
        trialEndsAt={trialEndsAt ?? null}
        tier={tier}
        locale={locale}
      />

      <FirstTradeCard
        userId={userId}
        locale={locale}
        hasTrades={liveTrades.length > 0}
      />

      <div
        className="rounded-xl border border-[#E2E5EC] dark:border-slate-700/80 bg-[#F8FAFF] dark:bg-slate-900/40 px-4 py-3"
        data-testid="dashboard-home-overview"
      >
        <p className="text-sm font-semibold text-[#1A1D26] dark:text-slate-100">
          {t("homeOverview.title")}
        </p>
        <p className="text-xs text-[#5E6478] dark:text-slate-400 mt-1">
          {t("homeOverview.subtitle")}
        </p>
      </div>

      <div className="rounded-xl border border-[#E2E5EC] dark:border-slate-700/80 bg-white dark:bg-slate-900/60 px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3 shadow-sm">
        <div className="mt-0.5 p-1.5 rounded-lg bg-[#0052FF]/10 shrink-0">
          <Shield className="w-4 h-4 text-[#0052FF]" aria-hidden />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold text-[#1A1D26] dark:text-slate-100">
            {t("riskNote.title")}
          </p>
          <p className="text-xs text-[#5E6478] dark:text-slate-400 leading-relaxed">
            {t("riskNote.body")}
          </p>
          <Link
            href={hrefWithLocale(locale, "/dashboard/settings")}
            className="text-xs font-medium text-[#0052FF] hover:underline inline-flex"
          >
            {t("riskNote.settingsCta")}
          </Link>
        </div>
      </div>

      {/* Porteføljekort — modus, saldo, P&L per periode */}
      <div
        className={`${BRAND.gradient} rounded-2xl p-6 text-white shadow-[0_8px_32px_rgba(0,82,255,0.15)] animate-fade-in-up stagger-1`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 border",
                effectiveMode === "live"
                  ? "bg-amber-500/20 border-amber-400/40 text-amber-100"
                  : "bg-white/15 border-white/30 text-white",
              )}
            >
              {effectiveMode === "live"
                ? t("modeBar.live")
                : t("modeBar.paper")}
            </span>
            <p className="text-xs text-white/75 max-w-md leading-snug">
              {activeSession == null
                ? t("modeBar.noSessionDesc")
                : effectiveMode === "live"
                  ? t("modeBar.liveDesc")
                  : t("modeBar.paperDesc")}
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-white/70 uppercase tracking-wider">
          {t("portfolioHero.balanceLabel")}
        </p>
        <p
          className="text-3xl sm:text-4xl font-bold mt-1"
          style={{
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
          }}
        >
          {formatNOK(locale, displayBalance)}
        </p>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5">
            {t("portfolioHero.periodLabel")}
          </p>
          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label={t("portfolioHero.periodLabel")}
          >
            {PNL_PERIOD_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={pnlPeriod === p}
                onClick={() => setPnlPeriod(p)}
                className={cn(
                  "text-xs font-medium rounded-full px-3 py-1 border transition-colors",
                  pnlPeriod === p
                    ? "bg-white/20 border-white/50 text-white"
                    : "bg-white/5 border-white/15 text-white/70 hover:bg-white/10",
                )}
              >
                {t(`pnlPeriod.${p}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span
            className={
              periodFlowPnl >= 0
                ? "text-green-300 font-medium"
                : "text-red-300 font-medium"
            }
          >
            {periodFlowPnl >= 0 ? "+" : ""}
            {formatNOK(locale, periodFlowPnl)} ({periodPnlPercent.toFixed(1)}%)
          </span>
          <span className="text-white/50 text-sm">
            {t("portfolioHero.pnlHint")}
          </span>
        </div>
        <p className="text-white/60 text-xs mt-3">
          {t("portfolioHero.footerHint")}
        </p>
      </div>

      {/* Widget 2: Live Prices (Binance, oppdatert ca. hvert 10. sekund) */}
      <div className="animate-fade-in-up stagger-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8E95A9]">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
            </span>
            {t("marketDesk.livePricesHeading")}
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible">
          {pricesLoading && liveCoins.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className={`${cardBase} min-w-[200px] flex-shrink-0 snap-start lg:min-w-0 h-[88px] animate-pulse bg-[#F1F3F9]`}
              />
            ))
          ) : pricesError ? (
            <div
              className={`${cardBase} min-w-[200px] lg:col-span-3 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
            >
              <p className="text-[#8E95A9] text-sm">
                {t("errors.connectionError")}
              </p>
              <button
                type="button"
                onClick={() => void refreshPrices()}
                className="text-sm font-medium text-[#0052FF] hover:underline self-start sm:self-auto"
              >
                {t("errors.retry")}
              </button>
            </div>
          ) : (
            liveCoins.map((coin) => (
              <div
                key={coin.symbol}
                className={`${cardBase} min-w-[200px] flex-shrink-0 snap-start lg:min-w-0`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${COIN_GRADIENTS[coin.symbol] ?? "from-gray-400 to-gray-500"} flex items-center justify-center text-white font-bold text-sm`}
                  >
                    {coin.symbol.replace("USDT", "")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1D26]">
                      {coin.name}
                    </p>
                    <p className="text-xs text-[#8E95A9]">
                      {coin.symbol.replace("USDT", "")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p
                    className="text-base font-semibold text-[#1A1D26]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatNOK(locale, coin.price)}
                  </p>
                  <span
                    className={`text-sm font-medium tabular-nums ${coin.change24h >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}
                  >
                    {coin.change24h >= 0 ? "+" : ""}
                    {coin.change24h.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {(liveCoins.length > 0 || !pricesError) && (
        <p className="text-xs text-[#8E95A9] animate-fade-in-up stagger-2 -mt-1 leading-relaxed">
          {t("dataSource.prices")}{" "}
          <span className="text-[#8E95A9]/80">
            {t("dataSource.pricesEducational")}
          </span>
        </p>
      )}

      {/* Performance Card — som konkurrenter (win rate, handler, P&L) */}
      {(tradeCountDisplay > 0 || liveTrades.length > 0 || activeSession) && (
        <div className={`${cardBase} animate-fade-in-up stagger-2`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#0052FF]" />
            <h3 className="text-lg font-semibold text-[#1A1D26]">
              {no ? "Dine resultater" : "Your performance"}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[#8E95A9] uppercase tracking-wider font-medium">
                {no ? "Handler" : "Trades"}
              </p>
              <p className="text-xl font-bold text-[#1A1D26] tabular-nums">
                {tradeCountDisplay}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#8E95A9] uppercase tracking-wider font-medium">
                {no ? "Win rate" : "Win rate"}
              </p>
              <p
                data-testid="dashboard-win-rate-pct"
                className={`text-xl font-bold tabular-nums ${
                  winRatePeriod != null
                    ? winRatePeriod >= 50
                      ? "text-[#16A34A]"
                      : "text-[#DC2626]"
                    : "text-[#1A1D26]"
                }`}
              >
                {winRatePeriod != null ? `${winRatePeriod}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#8E95A9] uppercase tracking-wider font-medium">
                {no ? "P&L" : "P&L"}
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  periodPnlPercent >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"
                }`}
              >
                {periodPnlPercent >= 0 ? "+" : ""}
                {periodPnlPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* P&L Breakdown: forklar tallene til brukeren */}
      {(tradeCountDisplay > 0 || liveTrades.length > 0) && (
        <div className="animate-fade-in-up stagger-2">
          <PnlBreakdown
            startingCapital={sessionStarting}
            currentCapital={sessionCapital ?? paperBalance}
            paperBalance={paperBalance}
            totalBuyValue={pnlBreakdown.totalBuyValue}
            totalSellValue={pnlBreakdown.totalSellValue}
            totalFees={pnlBreakdown.totalFees}
            realizedPnl={pnlBreakdown.realizedPnl}
            unrealizedPnl={pnlBreakdown.unrealizedPnl}
            tradeCount={tradeCountDisplay}
          />
        </div>
      )}

      {/* CTA: Se full oversikt med grafer og signaler (for brukere med aktivitet) */}
      {(liveTrades.length > 0 || activeSession) && (
        <Link
          href={hrefWithLocale(locale, tradingDeskPath)}
          className={`flex items-center justify-between ${cardBase} group animate-fade-in-up stagger-2 border-2 border-[#0052FF]/20 hover:border-[#0052FF]/40`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center group-hover:bg-[#0052FF]/20 transition-colors">
              <Activity className="w-5 h-5 text-[#0052FF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1D26] group-hover:text-[#0052FF] transition-colors">
                {no
                  ? "Grafer, signaler og full oversikt"
                  : "Charts, signals & full overview"}
              </p>
              <p className="text-xs text-[#8E95A9]">
                {no
                  ? "Se porteføljegraf, live handelsfeed og bot-status"
                  : "View portfolio chart, live trade feed and bot status"}
              </p>
            </div>
          </div>
          <span className="text-[#0052FF] text-sm font-medium group-hover:underline">
            {no ? "Åpne" : "Open"} →
          </span>
        </Link>
      )}

      {/* Live markedsdesk: signaler + posisjoner + handler (samme premium uttrykk) */}
      <div className={`${MARKET_DESK.panel} animate-fade-in-up stagger-2`}>
        <div className={MARKET_DESK.headerBar}>
          <div>
            <p className={`${MARKET_DESK.title} text-slate-200`}>
              {t("marketDesk.title")}
            </p>
            <p className={MARKET_DESK.subtitle}>{t("marketDesk.subtitle")}</p>
          </div>
        </div>
        <div className={MARKET_DESK.section}>
          <DashboardSignalPreview tier={tier} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={MARKET_DESK.innerCard}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-100 tracking-tight">
                  {t("marketDesk.myPositions")}
                </h3>
                <Link
                  href={hrefWithLocale(locale, "/handelshistorikk")}
                  className="text-sm font-medium text-[#3d7aff] hover:text-[#5c8fff] transition-colors"
                >
                  {t("marketDesk.seeAll")}
                </Link>
              </div>
              <MobilePositionList
                positions={positionList}
                priceForSymbol={priceForSymbol}
                gradientForSymbol={gradientForSymbol}
                formatNOK={formatNOK}
                onRefresh={async () => {
                  await Promise.all([
                    refreshPrices(),
                    runManualIntegritySync(),
                  ]);
                }}
              />
              <DesktopPositionList
                positions={positionList}
                priceForSymbol={priceForSymbol}
                gradientForSymbol={gradientForSymbol}
                formatNOK={formatNOK}
              />
            </div>

            <div className={MARKET_DESK.innerCard}>
              {tradesPollFailed && (
                <p
                  className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] leading-snug text-amber-100/90"
                  role="status"
                  data-testid="dashboard-integrity-poll-warning"
                >
                  {t("marketDesk.integrityPollWarning")}
                </p>
              )}
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-100 tracking-tight">
                    {t("marketDesk.recentTrades")}
                  </h3>
                  {hasRecentActivity && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {t("signalPreview.liveBadge")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid="dashboard-integrity-sync"
                    onClick={() => void runManualIntegritySync()}
                    disabled={manualIntegritySync}
                    className={cn(
                      "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-indigo-500/35 hover:bg-indigo-500/10 hover:text-white disabled:opacity-50",
                    )}
                    aria-label={t("marketDesk.integritySyncAria")}
                    title={t("marketDesk.integritySyncAria")}
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4",
                        manualIntegritySync && "animate-spin",
                      )}
                      aria-hidden
                    />
                  </button>
                  <Link
                    href={hrefWithLocale(locale, "/handelshistorikk")}
                    className="text-sm font-medium text-[#3d7aff] hover:text-[#5c8fff] transition-colors"
                  >
                    {t("marketDesk.seeAll")}
                  </Link>
                </div>
              </div>
              {recentTrades.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-slate-500 text-sm">
                    {t("marketDesk.noTrades")}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentTrades.map((trade: Trade, i: number) => (
                    <li
                      key={`${trade.id}-${i}`}
                      className={`${MARKET_DESK.row} flex items-center gap-3`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isBuyTrade(trade)
                            ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                            : "bg-red-500/15 text-red-400 ring-1 ring-red-500/20"
                        }`}
                      >
                        {isBuyTrade(trade) ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : (
                          <ArrowDown className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 flex flex-wrap items-center gap-2">
                          <span>
                            {isBuyTrade(trade)
                              ? no
                                ? "Kjøpte"
                                : "Bought"
                              : no
                                ? "Solgte"
                                : "Sold"}{" "}
                            {normalizeTradeSymbol(trade).replace("USDT", "")}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border shrink-0",
                              String(trade.mode).toLowerCase() === "live"
                                ? "border-amber-500/35 text-amber-300/95 bg-amber-500/10"
                                : "border-slate-500/40 text-slate-400 bg-slate-800/60",
                            )}
                          >
                            {String(trade.mode).toLowerCase() === "live"
                              ? t("positions.live")
                              : t("positions.paper")}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {normalizeTradeQty(trade).toFixed(4)} ·{" "}
                          {formatNOK(locale, normalizeTradeAmount(trade))}
                          {trade.realized_pnl != null &&
                            Number.isFinite(Number(trade.realized_pnl)) && (
                              <span
                                className={
                                  Number(trade.realized_pnl) >= 0
                                    ? " text-emerald-400/90"
                                    : " text-red-400/90"
                                }
                              >
                                {" "}
                                ·{" "}
                                {formatNOK(locale, Number(trade.realized_pnl))}
                              </span>
                            )}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums shrink-0 text-right min-w-[3.5rem]">
                        {trade.created_at
                          ? formatRelativeTimeShort(
                              new Date(trade.created_at),
                              locale,
                            )
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Widget 5: AI Market Brief */}
      <div className={`${cardBase} animate-fade-in-up stagger-4`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-[#0052FF]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-[#1A1D26]">
              {no ? "AI Markedsoversikt" : "AI Market Brief"}
            </h3>
            <p className="text-sm text-[#5E6478] mt-1 leading-relaxed">
              {no
                ? "Markedskommentarer hentes fra AI når tjenesten er tilgjengelig — ingen statiske eksempeltall her."
                : "Market commentary is loaded from the AI service when available — no static demo numbers."}
            </p>
            <p className="text-xs text-[#8E95A9] mt-2">
              {no ? "Oppdateres daglig" : "Updated daily"}
            </p>
          </div>
        </div>
      </div>

      {/* Widget 6 + 7: Lesson & Leaderboard (2-col on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-5">
        {/* Widget 6: Next Lesson */}
        <Link
          href={hrefWithLocale(locale, "/kurs")}
          className={`${cardBase} block group`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-[#0052FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[#1A1D26] group-hover:text-[#0052FF] transition-colors">
                {no ? "Lær videre" : "Continue learning"}
              </h3>
              <p className="text-xs text-[#8E95A9] mt-2">
                {no
                  ? "Fortsett der du slapp i akademiet."
                  : "Pick up where you left off in the academy."}
              </p>
            </div>
          </div>
        </Link>

        <div className="space-y-4">
          <StreakBadge streak={0} locale={locale} />
          <div className={cardBase}>
            <h3 className="text-lg font-semibold text-[#1A1D26] mb-2">
              {no ? "Resultater og ranking" : "Results and ranking"}
            </h3>
            <p className="text-sm text-[#5E6478] mb-4">
              {no
                ? "Se sanntids statistikk og grafer basert på dine faktiske handler."
                : "View live statistics and charts from your real trades."}
            </p>
            <Link
              href={hrefWithLocale(locale, "/dashboard/resultater")}
              className={`inline-flex text-sm font-semibold ${BRAND.link}`}
            >
              {no ? "Åpne resultater" : "Open results"} →
            </Link>
          </div>
        </div>
      </div>

      {/* Widget 8: Bot Status */}
      {activeSession ? (
        <div className={`${cardBase} animate-fade-in-up stagger-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1D26]">
                  {activeSession.name ?? "Trading Bot"}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  {no ? "Aktiv" : "Active"}
                </span>
                {(activeSession.total_trades ?? 0) > 0 && (
                  <p className="text-xs text-[#5E6478] mt-0.5">
                    {activeSession.total_trades ?? 0}{" "}
                    {no ? "handler" : "trades"}
                    {winRateOverall != null &&
                      ` · ${winRateOverall}% ${no ? "win rate" : "win rate"}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-[#1A1D26] tabular-nums">
                  {formatNOK(
                    locale,
                    activeSession.total_pnl ?? activeSession.pnl ?? 0,
                  )}
                </p>
                <p className="text-xs text-[#8E95A9]">
                  {no ? "P&L sesjon" : "Session P&L"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Link
                  href={hrefWithLocale(locale, tradingDeskPath)}
                  className={`text-xs font-medium ${BRAND.link}`}
                >
                  {no ? "Grafer & signaler" : "Charts & signals"}
                </Link>
                <Link
                  href={hrefWithLocale(
                    locale,
                    `/dashboard/bot/${activeSession.id}`,
                  )}
                  className={`text-xs font-medium text-[#5E6478] hover:text-[#0052FF]`}
                >
                  {no ? "Bot-detaljer" : "Bot details"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href={hrefWithLocale(locale, "/dashboard/trade")}
          className="block rounded-xl border-2 border-dashed border-[#E2E5EC] p-5 text-center hover:border-[#0052FF]/40 hover:bg-[#0052FF]/[0.02] transition-all group animate-fade-in-up stagger-6"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0052FF]/10 flex items-center justify-center mx-auto">
            <Bot className="w-5 h-5 text-[#0052FF]" />
          </div>
          <p className="text-sm font-semibold text-[#1A1D26] mt-2 group-hover:text-[#0052FF] transition-colors">
            {no ? "Start en trading-bot" : "Start a trading bot"}
          </p>
          <p className="text-xs text-[#8E95A9] mt-1">
            {no ? "Automatiser strategien din" : "Automate your strategy"}
          </p>
        </Link>
      )}
    </div>
  );
}
