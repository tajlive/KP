"use client";

import { OrderHistory } from "@/components/trading/OrderHistory";
import { useRealtimePrices } from "@/lib/hooks/useRealtimePrices";
import { createClient } from "@/lib/utils";
import { Profile } from "@/types/database";
import {
  Loader2,
  Lock as LockIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const TradingViewWidget = dynamic(
  () => import("@/components/trading/TradingViewWidget"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-slate-900 animate-pulse rounded-xl" />
    ),
  },
);

interface TradeConfirmation {
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
}

interface TradeMessage {
  type: "success" | "error";
  text: string;
}

export default function LiveTradingClient({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations("liveTrading");
  const supabase = createClient();

  const { coins, loading, error, refresh } = useRealtimePrices([
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "AVAXUSDT",
    "TRXUSDT",
    "DOTUSDT",
  ]);
  const [tradeAmounts, setTradeAmounts] = useState<Record<string, string>>({});
  const [tradeConfirmation, setTradeConfirmation] =
    useState<TradeConfirmation | null>(null);
  const [executingTrade, setExecutingTrade] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<TradeMessage | null>(null);

  // Crash Persistence - Load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("klarpakke_trade_amounts");
      if (saved) {
        try {
          setTradeAmounts(JSON.parse(saved));
        } catch (_) {
          console.warn("Failed to load saved trade amounts");
        }
      }
    }
  }, []);

  // Crash Persistence - Save
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "klarpakke_trade_amounts",
        JSON.stringify(tradeAmounts),
      );
    }
  }, [tradeAmounts]);

  const handleAmountChange = (symbol: string, value: string) => {
    setTradeAmounts((prev) => ({ ...prev, [symbol]: value }));
  };

  const handleTradeClick = (symbol: string, side: "buy" | "sell") => {
    const amount = parseFloat(tradeAmounts[symbol] || "0");
    const coin = coins.find((c) => c.symbol === symbol);

    if (!amount || amount <= 0) {
      setTradeMessage({ type: "error", text: t("errors.enterAmount") });
      return;
    }

    if (!coin) {
      setTradeMessage({ type: "error", text: t("errors.priceData") });
      return;
    }

    setTradeConfirmation({
      symbol,
      side,
      amount,
      price: coin.price,
    });
  };

  const executeTrade = async () => {
    if (!tradeConfirmation) return;

    setExecutingTrade(true);
    setTradeMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTradeMessage({ type: "error", text: t("errors.loginRequired") });
        setExecutingTrade(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();

      // Kall place-binance-order edge function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const response = await fetch(
        `${supabaseUrl}/functions/v1/place-binance-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token || ''}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: tradeConfirmation.symbol,
            side: tradeConfirmation.side.toUpperCase(),
            quantity: tradeConfirmation.amount / tradeConfirmation.price,
            order_type: "MARKET",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("errors.tradeFailed"));
      }

      const result = await response.json();

      setTradeMessage({
        type: "success",
        text: `${tradeConfirmation.side === "buy" ? t("confirm.bought") : t("confirm.sold")} ${tradeConfirmation.symbol.replace("USDT", "")} ${tradeConfirmation.amount.toFixed(2)} kr (Order ID: ${result.order?.orderId || "N/A"})`,
      });

      // Nullstill input
      setTradeAmounts((prev) => ({ ...prev, [tradeConfirmation.symbol]: "" }));
      setTradeConfirmation(null);

      // Oppdater priser
      refresh();
    } catch (error: unknown) {
      console.error("Trade error:", error);
      let errorMessage = t("errors.checkBinance");
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setTradeMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setExecutingTrade(false);
    }
  };

  // Fetch user balance for the selected coin
  // Trigger balance fetch when coin is selected or trade finishes
  const [balances, setBalances] = useState<Record<string, number>>({});

  const fetchAllBalances = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("wallets")
      .select("currency, balance")
      .eq("user_id", user.id);
    if (data) {
      const balMap: Record<string, number> = {};
      data.forEach((w: { currency: string; balance: number }) => {
        balMap[w.currency] = w.balance;
      });
      setBalances(balMap);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAllBalances();
  }, [fetchAllBalances]);

  // re-fetch after trade
  useEffect(() => {
    if (tradeMessage?.type === "success") {
      fetchAllBalances();
    }
  }, [tradeMessage, fetchAllBalances]);

  // Fetch user profile and check for Master status
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setProfileLoading(false);
          return;
        }

        const { data, error: _ } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) setProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [supabase]);

  const isMaster =
    profile?.subscription_tier === "master" ||
    profile?.subscription_tier === "phd" ||
    profile?.subscription_tier === "professor" ||
    profile?.role === "admin";

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error && coins.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-400">
              <strong>⚠️ {t("warning")}:</strong> {t("warningText")}
            </p>
          </div>

          {tradeMessage && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                tradeMessage.type === "success"
                  ? "bg-green-500/20 border border-green-500/30 text-green-400"
                  : "bg-red-500/20 border border-red-500/30 text-red-400"
              }`}
            >
              {tradeMessage.text}
            </div>
          )}
        </div>

        {/* Featured Chart (Default to BTCUSDT or allows selection in future) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TradingViewWidget symbol="BTCUSDT" height={500} />
          </div>
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">
              {t("marketOverview")}
            </h3>
            <div className="space-y-3">
              {coins.map((c) => (
                <div
                  key={c.symbol}
                  className="flex justify-between items-center p-2 hover:bg-slate-800 rounded cursor-pointer"
                >
                  <span className="text-slate-300">{c.name}</span>
                  <span
                    className={
                      c.change24h >= 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {c.price.toLocaleString()} kr
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trading Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {coins.map((coin) => {
            const coinSymbol = coin.symbol.replace("USDT", "");
            const userBalance = balances[coinSymbol] || 0;

            return (
              <div
                key={coin.symbol}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden"
              >
                {!isMaster && (
                  <div className="absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mb-4">
                      <LockIcon className="w-6 h-6 text-blue-500" />
                    </div>
                    <h4 className="text-white font-bold mb-2">
                      {t("masterOnly")}
                    </h4>
                    <p className="text-xs text-slate-400 mb-6">
                      {t("masterOnlyDesc")}
                    </p>
                    <Link
                      href={`/${params.locale}/priser`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      {t("upgradeBtn")}
                    </Link>
                  </div>
                )}

                {/* Coin Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {coin.name}
                    </h3>
                    <p className="text-sm text-slate-400">{coin.symbol}</p>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${
                      coin.change24h >= 0
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {coin.change24h >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {coin.change24h >= 0 ? "+" : ""}
                    {coin.change24h.toFixed(2)}%
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-3xl font-bold text-white">
                    {coin.price.toLocaleString(
                      params.locale === "no"
                        ? "nb-NO"
                        : params.locale === "th"
                          ? "th-TH"
                          : "en-US",
                    )}{" "}
                    kr
                  </div>
                </div>

                {/* Balance Context */}
                <div className="mb-2 flex justify-between text-xs text-slate-400">
                  <span>{t("balance")}</span>
                  <span className="text-white font-medium">
                    {userBalance.toFixed(6)} {coinSymbol}
                  </span>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <input
                    type="number"
                    value={tradeAmounts[coin.symbol] || ""}
                    onChange={(e) =>
                      handleAmountChange(coin.symbol, e.target.value)
                    }
                    placeholder={t("amountPlaceholder")}
                    min="100"
                    step="100"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />

                  {/* Buy/Sell Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleTradeClick(coin.symbol, "buy")}
                      disabled={!tradeAmounts[coin.symbol] || executingTrade}
                      className="px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {t("buy")}
                    </button>
                    <button
                      onClick={() => handleTradeClick(coin.symbol, "sell")}
                      disabled={!tradeAmounts[coin.symbol] || executingTrade}
                      className="px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {t("sell")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order History */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            {t("recentOrders")}
          </h3>
          <OrderHistory />
        </div>

        {/* Info & Sikkerhet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="p-1 bg-blue-500/20 rounded">🛡️</span>
              {t("security.title")}
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>
                  <strong>{t("security.noWithdrawal")}:</strong>{" "}
                  {t("security.noWithdrawalDesc")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>
                  <strong>{t("security.fullControl")}:</strong>{" "}
                  {t("security.fullControlDesc")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>
                  <strong>{t("security.transparency")}:</strong>{" "}
                  {t("security.transparencyDesc")}
                </span>
              </li>
            </ul>
          </div>

          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="p-1 bg-yellow-500/20 rounded">💰</span>
              {t("info.title")}
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>
                  <strong>{t("info.usdtRequirement")}:</strong>{" "}
                  {t("info.usdtRequirementDesc")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>
                  <strong>{t("info.realtimeData")}:</strong>{" "}
                  {t("info.realtimeDataDesc")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>
                  <strong>{t("info.minimumAmount")}:</strong>{" "}
                  {t("info.minimumAmountDesc")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Trade Confirmation Modal */}
        {tradeConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">
                {t("confirm.title")}
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t("confirm.action")}</span>
                  <span
                    className={
                      tradeConfirmation.side === "buy"
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {tradeConfirmation.side === "buy" ? t("buy") : t("sell")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t("confirm.symbol")}</span>
                  <span className="text-white">{tradeConfirmation.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t("confirm.amount")}</span>
                  <span className="text-white">
                    {tradeConfirmation.amount.toLocaleString(
                      params.locale === "no"
                        ? "nb-NO"
                        : params.locale === "th"
                          ? "th-TH"
                          : "en-US",
                    )}{" "}
                    kr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t("confirm.price")}</span>
                  <span className="text-white">
                    {tradeConfirmation.price.toLocaleString(
                      params.locale === "no"
                        ? "nb-NO"
                        : params.locale === "th"
                          ? "th-TH"
                          : "en-US",
                    )}{" "}
                    kr
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-3">
                  <span className="text-slate-400">
                    {t("confirm.quantity")}
                  </span>
                  <span className="text-white">
                    {(
                      tradeConfirmation.amount / tradeConfirmation.price
                    ).toFixed(6)}{" "}
                    {tradeConfirmation.symbol.replace("USDT", "")}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTradeConfirmation(null)}
                  disabled={executingTrade}
                  className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
                >
                  {t("confirm.cancel")}
                </button>
                <button
                  onClick={executeTrade}
                  disabled={executingTrade}
                  className={`flex-1 px-4 py-3 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                    tradeConfirmation.side === "buy"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {executingTrade && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {t("confirm.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
