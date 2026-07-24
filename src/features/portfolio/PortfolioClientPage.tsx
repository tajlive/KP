"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Coins,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatNOK } from "@/lib/format/currency";
import { PortfolioChart } from "@/features/portfolio/PortfolioChart";
import { useRealtimePrices } from "@/lib/hooks/useRealtimePrices";

interface Summary {
  balance: number | null;
  initialBalance: number | null;
  totalTrades: number;
  closedTrades: number;
  winRate: number | null;
  totalPnl: number;
  positions: Array<{
    symbol: string;
    tradingPair: string;
    qty: number;
    avgBuyPrice: number;
  }>;
}

const CARD =
  "bg-gradient-to-br from-[#1A1D2E] to-[#0F1225] border border-[#2A2D3E] rounded-2xl p-5 sm:p-6";

function normalizePair(pair: string): string {
  const p = pair.replace("/", "").toUpperCase();
  return p.endsWith("USDT") ? p : `${p}USDT`;
}

export default function PortfolioClientPage() {
  const locale = useLocale();
  const t = useTranslations("dashboard.portfolioPage");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [wallets, setWallets] = React.useState<
    Array<{ id: string; currency: string; balance: number }> | null
  >(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const timeout = setTimeout(() => {
          if (!cancelled) {
            setLoading(false);
            setError("Tidsavbrudd — prøv igjen");
          }
        }, 10000);

        const [profileRes, summaryRes] = await Promise.all([
          fetch(`/api/user/profile`),
          fetch(`/api/portfolio/summary`),
        ]);

        if (profileRes.status === 401 || summaryRes.status === 401) {
          clearTimeout(timeout);
          if (!cancelled) {
            setError("auth_required");
            setLoading(false);
          }
          return;
        }

        const profileData = await profileRes.json();
        const summaryData: Summary = await summaryRes.json();

        if (!cancelled) {
          if (profileData.ok && profileData.profile) {
            setUserId(profileData.profile.id);
          }
          if (profileData.wallets) {
            setWallets(profileData.wallets);
          }
          setSummary(summaryData);
        }

        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setLoading(false);
          setError(
            e instanceof Error ? e.message : "Kunne ikke laste portefølje",
          );
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const positionSymbols = React.useMemo(
    () => (summary?.positions ?? []).map((p) => normalizePair(p.tradingPair)),
    [summary],
  );
  const { coins } = useRealtimePrices(positionSymbols.length > 0 ? positionSymbols : undefined);
  const priceBySymbol = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of coins) map.set(c.symbol.toUpperCase(), c.price);
    return map;
  }, [coins]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Laster portefølje...</div>
      </div>
    );
  }

  if (error === "auth_required") {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">
            Logg inn for å se portefølje
          </h2>
          <Link
            href={`/${locale}/login`}
            className="text-[#0066FF] hover:underline"
          >
            Gå til innlogging
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-white">Det oppstod en feil</h2>
        <p className="text-slate-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[#0066FF] text-white rounded-lg font-bold"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  const balance = summary?.balance ?? null;
  const initialBalance = summary?.initialBalance ?? null;
  const changeAbs =
    balance != null && initialBalance != null ? balance - initialBalance : null;
  const changePct =
    changeAbs != null && initialBalance
      ? (changeAbs / initialBalance) * 100
      : null;
  const hasTrades = (summary?.totalTrades ?? 0) > 0;
  const positions = summary?.positions ?? [];

  return (
    <div className="min-h-screen bg-[#0B0F19] p-4 sm:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
        {/* Tittel */}
        <div className="px-1">
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="text-sm text-slate-400">{t("subtitle")}</p>
        </div>

        {/* Hero: saldo + endring siden start */}
        <div className={CARD}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-slate-400">
              {t("balance")}
            </h2>
            <Wallet className="w-5 h-5 text-[#0066FF]" />
          </div>
          <p className="text-4xl font-bold text-white tabular-nums">
            {balance != null ? formatNOK(balance) : "—"}
          </p>
          {changeAbs != null && changePct != null && (
            <div
              className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-sm font-semibold tabular-nums ${
                changeAbs >= 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-rose-500/10 text-rose-400"
              }`}
            >
              {changeAbs >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {changeAbs >= 0 ? "+" : ""}
              {formatNOK(changeAbs)} ({changeAbs >= 0 ? "+" : ""}
              {changePct.toFixed(2)}%)
              <span className="text-slate-500 font-normal text-xs ml-1">
                {t("sinceStart")}
              </span>
            </div>
          )}
          <Link
            href={`/${locale}/trade`}
            className="inline-flex items-center gap-2 mt-4 text-sm text-[#0066FF] hover:underline"
          >
            {t("goToTrade")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Graf */}
        {userId && <PortfolioChart userId={userId} mode="paper" />}

        {/* Nøkkeltall */}
        {hasTrades && (
          <div className="grid grid-cols-3 gap-3">
            <div className={CARD + " !p-4 text-center"}>
              <Activity className="w-5 h-5 text-[#0066FF] mx-auto mb-2" />
              <p className="text-lg font-bold text-white tabular-nums">
                {summary!.totalTrades}
              </p>
              <p className="text-xs text-slate-400">{t("statsTrades")}</p>
            </div>
            <div className={CARD + " !p-4 text-center"}>
              <Target className="w-5 h-5 text-[#0066FF] mx-auto mb-2" />
              <p className="text-lg font-bold text-white tabular-nums">
                {summary!.winRate != null
                  ? `${Math.round(summary!.winRate * 100)}%`
                  : "—"}
              </p>
              <p className="text-xs text-slate-400">{t("statsWinRate")}</p>
            </div>
            <div className={CARD + " !p-4 text-center"}>
              {summary!.totalPnl >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-400 mx-auto mb-2" />
              )}
              <p
                className={`text-lg font-bold tabular-nums ${
                  summary!.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {summary!.totalPnl >= 0 ? "+" : ""}
                {formatNOK(summary!.totalPnl)}
              </p>
              <p className="text-xs text-slate-400">{t("statsPnl")}</p>
            </div>
          </div>
        )}

        {/* Posisjoner */}
        <div className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {t("positionsTitle")}
            </h2>
            <Coins className="w-5 h-5 text-[#0066FF]" />
          </div>
          {positions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-400 mb-1">{t("noAssets.title")}</p>
              <p className="text-sm text-slate-500 mb-4">
                {t("noAssets.description")}
              </p>
              <Link
                href={`/${locale}/trade`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0066FF] text-white rounded-xl font-semibold text-sm"
              >
                {t("noAssets.button")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {positions.map((p) => {
                const pair = normalizePair(p.tradingPair);
                const livePrice = priceBySymbol.get(pair);
                const value = livePrice != null ? p.qty * livePrice : null;
                const pnlPct =
                  livePrice != null && p.avgBuyPrice > 0
                    ? ((livePrice - p.avgBuyPrice) / p.avgBuyPrice) * 100
                    : null;
                return (
                  <div
                    key={pair}
                    className="flex items-center justify-between py-3 border-b border-[#2A2D3E] last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {p.symbol}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {p.qty < 1 ? p.qty.toFixed(6) : p.qty.toFixed(2)}{" "}
                        {t("quantity")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-white tabular-nums">
                        {value != null ? formatNOK(value) : "—"}
                      </p>
                      {pnlPct != null && (
                        <p
                          className={`text-xs font-semibold tabular-nums ${
                            pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {pnlPct >= 0 ? "+" : ""}
                          {pnlPct.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Wallet */}
        {wallets && wallets.length > 0 && (
          <div className={CARD}>
            <h2 className="text-lg font-semibold text-white mb-4">
              {t("walletTitle")}
            </h2>
            <div className="space-y-3">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  className="flex justify-between items-center py-2 border-b border-[#2A2D3E] last:border-0"
                >
                  <span className="text-slate-300">{w.currency}</span>
                  <span className="text-white font-mono tabular-nums">
                    {formatNOK(w.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
