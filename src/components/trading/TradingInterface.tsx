"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  ChevronRight,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { SURFACE, BRAND } from "@/lib/design/tokens";
import { useRealtimePrices } from "@/lib/hooks/useRealtimePrices";

const POPULAR_COINS = [
  { symbol: "BTCUSDT", name: "Bitcoin", shortName: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", shortName: "ETH" },
  { symbol: "SOLUSDT", name: "Solana", shortName: "SOL" },
  { symbol: "BNBUSDT", name: "BNB", shortName: "BNB" },
  { symbol: "XRPUSDT", name: "XRP", shortName: "XRP" },
  { symbol: "DOGEUSDT", name: "Dogecoin", shortName: "DOGE" },
];

const TRADE_SYMBOLS = POPULAR_COINS.map((c) => c.symbol);

interface TradingInterfaceProps {
  userId: string;
  locale: string;
  paperBalance: number;
  tier: string;
}

function formatNOK(value: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type DepthRow = { price: number; amount: number; total: number };

export function TradingInterface({
  locale,
  paperBalance,
}: TradingInterfaceProps) {
  const router = useRouter();
  const [selectedCoin, setSelectedCoin] = useState("BTCUSDT");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [balance, setBalance] = useState(paperBalance);
  const [orderbook, setOrderbook] = useState<{
    asks: DepthRow[];
    bids: DepthRow[];
  } | null>(null);
  const [orderbookLoading, setOrderbookLoading] = useState(false);

  const { coins, loading: pricesLoading } = useRealtimePrices(TRADE_SYMBOLS);
  const currentCoin = POPULAR_COINS.find((c) => c.symbol === selectedCoin)!;
  const currentCoinData = coins.find((c) => c.symbol === selectedCoin);
  const currentPrice = currentCoinData?.price ?? 0;
  const change24h = currentCoinData?.change24h ?? 0;
  const amountNum = parseFloat(amount) || 0;
  const estimatedQty = currentPrice > 0 ? amountNum / currentPrice : 0;

  const fetchDepth = useCallback(async (symbol: string) => {
    setOrderbookLoading(true);
    try {
      const res = await fetch(
        `/api/trading/depth?symbol=${encodeURIComponent(symbol)}`,
      );
      const data = await res.json();
      if (data.bids && data.asks) {
        const toRow = (arr: [number, number][]): DepthRow[] =>
          arr.map(([price, amount]) => ({
            price,
            amount,
            total: price * amount,
          }));
        setOrderbook({
          asks: toRow(data.asks.slice(0, 5)),
          bids: toRow(data.bids.slice(0, 5)),
        });
      } else {
        setOrderbook(null);
      }
    } catch {
      setOrderbook(null);
    } finally {
      setOrderbookLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepth(selectedCoin);
  }, [selectedCoin, fetchDepth]);

  const isNo = locale === "no";

  const handleTrade = async () => {
    if (amountNum <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/paper-trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: selectedCoin,
          side: activeTab,
          amount_nok: amountNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(
          data.error ||
            (isNo ? "Kunne ikke utføre handel" : "Could not execute trade"),
        );
        return;
      }
      if (!data.success) {
        toast.error(
          data.error ||
            data.rejectionReason ||
            (isNo ? "Handelen ble avvist" : "Trade was rejected"),
        );
        return;
      }
      setShowConfetti(true);
      if (
        typeof data.new_balance === "number" &&
        Number.isFinite(data.new_balance)
      ) {
        setBalance(data.new_balance);
      } else if (activeTab === "buy") {
        setBalance((b) => b - amountNum);
      } else {
        setBalance((b) => b + amountNum);
      }
      setAmount("");
      setTimeout(() => setShowConfetti(false), 3000);
      router.refresh();
      if (data.session_id) {
        router.push(`/${locale}/paper-trading/${data.session_id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(isNo ? "Noe gikk galt" : "Something went wrong");
    }
    setLoading(false);
  };

  const quickAmounts = [500, 1000, 5000, 10000];

  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT}`}>
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-bounce">
            <PartyPopper className="w-16 h-16 text-[#0052FF]" aria-hidden />
          </div>
        </div>
      )}

      <div className="bg-white border-b border-[#E2E5EC]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0052FF]" aria-hidden />
            <h1 className="text-lg font-semibold text-[#1A1D26]">
              {isNo ? "Handle" : "Trade"}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#5E6478]">
            <Wallet className="w-4 h-4" />
            <span>kr {formatNOK(balance)}</span>
          </div>
        </div>
      </div>

      {/* Coin Selector */}
      <div className="bg-white border-b border-[#E2E5EC]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {POPULAR_COINS.map((coin) => (
              <button
                key={coin.symbol}
                onClick={() => setSelectedCoin(coin.symbol)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCoin === coin.symbol
                    ? `${BRAND.primary}`
                    : "bg-[#F1F3F9] text-[#5E6478] hover:bg-[#E2E5EC]"
                }`}
              >
                {coin.shortName}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-5 lg:gap-6">
          {/* Left: Chart + Order Book */}
          <div className="lg:col-span-3 space-y-4 mb-6 lg:mb-0">
            {/* Price + Chart placeholder */}
            <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-[#1A1D26]">
                    {isNo ? "Prisutvikling" : "Price Chart"}{" "}
                    {currentCoin.shortName}
                  </h2>
                  {pricesLoading && !currentPrice ? (
                    <div className="h-8 w-32 bg-[#F1F3F9] rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-[#1A1D26] mt-1">
                      kr {formatNOK(currentPrice)}
                    </p>
                  )}
                </div>
                {currentPrice > 0 && (
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${change24h >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}
                  >
                    {change24h >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {change24h >= 0 ? "+" : ""}
                    {change24h.toFixed(2)}%
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[#8E95A9] mb-2">
                {isNo
                  ? "Priser fra Binance, oppdatert ca. hvert 10. sekund."
                  : "Prices from Binance, updated approximately every 10 seconds."}
              </p>
              <div
                className={`h-[250px] ${SURFACE.BG_LIGHT} rounded-lg flex items-center justify-center border border-[#E2E5EC]`}
              >
                <p className="text-[#8E95A9] text-sm">
                  {isNo ? "Graf kommer snart" : "Chart coming soon"}
                </p>
              </div>
            </div>

            {/* Order Book (Binance) */}
            <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
              <h3 className="text-sm font-semibold text-[#1A1D26] mb-3">
                {isNo ? "Ordrebok" : "Order Book"}
                {orderbookLoading && (
                  <span className="ml-2 inline-block">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8E95A9]" />
                  </span>
                )}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#8E95A9]">
                      <th className="text-left pb-2 font-medium">
                        {isNo ? "Pris (NOK)" : "Price (NOK)"}
                      </th>
                      <th className="text-right pb-2 font-medium">
                        {isNo ? "Mengde" : "Amount"}
                      </th>
                      <th className="text-right pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderbook ? (
                      <>
                        {[...orderbook.asks].reverse().map((ask, i) => (
                          <tr key={`ask-${i}`} className="text-[#DC2626]">
                            <td className="py-0.5 font-mono">
                              {formatNOK(ask.price)}
                            </td>
                            <td className="py-0.5 text-right font-mono">
                              {ask.amount.toFixed(3)}
                            </td>
                            <td className="py-0.5 text-right font-mono">
                              {formatNOK(ask.total)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-y border-[#E2E5EC]">
                          <td
                            colSpan={3}
                            className="py-2 text-center font-semibold text-[#1A1D26] text-sm"
                          >
                            kr {formatNOK(currentPrice || 0)}
                          </td>
                        </tr>
                        {orderbook.bids.map((bid, i) => (
                          <tr key={`bid-${i}`} className="text-[#16A34A]">
                            <td className="py-0.5 font-mono">
                              {formatNOK(bid.price)}
                            </td>
                            <td className="py-0.5 text-right font-mono">
                              {bid.amount.toFixed(3)}
                            </td>
                            <td className="py-0.5 text-right font-mono">
                              {formatNOK(bid.total)}
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <>
                        <tr className="border-y border-[#E2E5EC]">
                          <td
                            colSpan={3}
                            className="py-4 text-center font-medium text-[#8E95A9] text-sm"
                          >
                            kr {formatNOK(currentPrice || 0)}
                          </td>
                        </tr>
                        {!orderbookLoading && (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-2 text-center text-[#8E95A9] text-xs"
                            >
                              {isNo
                                ? "Kunne ikke laste ordrebok"
                                : "Could not load order book"}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Buy/Sell Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
              {/* Buy/Sell Tabs */}
              <div className="flex border-b border-[#E2E5EC] mb-5">
                <button
                  onClick={() => setActiveTab("buy")}
                  className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${
                    activeTab === "buy"
                      ? "text-[#0052FF]"
                      : "text-[#8E95A9] hover:text-[#5E6478]"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4" />
                    {isNo ? "Kjøp" : "Buy"}
                  </div>
                  {activeTab === "buy" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0052FF]" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("sell")}
                  className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${
                    activeTab === "sell"
                      ? "text-[#0052FF]"
                      : "text-[#8E95A9] hover:text-[#5E6478]"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4" />
                    {isNo ? "Selg" : "Sell"}
                  </div>
                  {activeTab === "sell" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0052FF]" />
                  )}
                </button>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <label
                  htmlFor="amount-input"
                  className="block text-xs font-medium text-[#5E6478]"
                >
                  {isNo ? "Beløp i NOK" : "Amount in NOK"}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E95A9] text-sm">
                    kr
                  </span>
                  <input
                    id="amount-input"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className={`w-full ${SURFACE.BG_LIGHT} border border-[#E2E5EC] rounded-lg pl-10 pr-4 py-3 text-[#1A1D26] placeholder:text-[#8E95A9] focus:ring-2 focus:ring-[#0052FF] focus:border-[#0052FF] outline-none transition-shadow text-right text-lg font-semibold`}
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  {quickAmounts.map((qa) => (
                    <button
                      key={qa}
                      onClick={() => setAmount(String(qa))}
                      className="flex-1 bg-[#F1F3F9] hover:bg-[#E2E5EC] text-[#5E6478] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                    >
                      {formatNOK(qa)}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-[#8E95A9]">
                  {isNo ? "Tilgjengelig" : "Available"}: kr {formatNOK(balance)}
                </p>
              </div>

              {/* Summary */}
              {amountNum > 0 && (
                <div
                  className={`mt-4 p-3 ${SURFACE.BG_LIGHT} rounded-lg border border-[#E2E5EC]`}
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5E6478]">
                      {isNo
                        ? `Du ${activeTab === "buy" ? "kjøper" : "selger"} ca.`
                        : `You ${activeTab === "buy" ? "buy" : "sell"} approx.`}
                    </span>
                    <span className="font-semibold text-[#1A1D26]">
                      {estimatedQty.toFixed(6)} {currentCoin.shortName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#5E6478]">
                      {isNo ? "Pris per enhet" : "Price per unit"}
                    </span>
                    <span className="text-[#5E6478]">
                      kr {formatNOK(currentPrice)}
                    </span>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <button
                onClick={handleTrade}
                disabled={
                  loading ||
                  amountNum <= 0 ||
                  (activeTab === "buy" && amountNum > balance)
                }
                className={`w-full mt-5 py-3.5 rounded-lg text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeTab === "buy"
                    ? "bg-[#16A34A] hover:bg-[#15803d]"
                    : "bg-[#DC2626] hover:bg-[#B91C1C]"
                }`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {activeTab === "buy" ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {activeTab === "buy"
                      ? isNo
                        ? `Kjøp ${currentCoin.name}`
                        : `Buy ${currentCoin.name}`
                      : isNo
                        ? `Selg ${currentCoin.name}`
                        : `Sell ${currentCoin.name}`}
                  </>
                )}
              </button>
            </div>

            {/* Balance Card (visible on mobile below, always visible on desktop) */}
            <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 lg:block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#8E95A9] font-medium mb-1">
                    {isNo ? "Tilgjengelig saldo" : "Available balance"}
                  </p>
                  <p className="text-xl font-bold text-[#1A1D26]">
                    kr {formatNOK(balance)}
                  </p>
                </div>
                <Wallet
                  className="w-8 h-8 text-[#0052FF] opacity-20"
                  aria-hidden
                />
              </div>
              <Link
                href={`/${locale}/dashboard`}
                className={`mt-3 flex items-center gap-1 text-sm font-medium ${BRAND.link}`}
              >
                {isNo ? "Gå til dashbord" : "Go to dashboard"}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
