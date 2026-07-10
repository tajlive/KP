"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const MAX_TRADES = 3;
const INITIAL_BALANCE = 10_000;
const COINGECKO_BTC = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true";

function formatKr(n: number): string {
  return n.toLocaleString("nb-NO", { maximumFractionDigits: 0 });
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Mini sparkline drawn from 12 simulated price points (real current price ± small variance) */
function MiniSparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((p, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((p - min) / range) * h * 0.8 - h * 0.1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = isUp ? "#10B981" : "#EF4444";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-7 shrink-0" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Coin icon animation — subtle pulse */
function CoinIcon() {
  return (
    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 animate-pulse">
      <span className="text-lg font-black text-white">₿</span>
    </div>
  );
}

export function InteractiveDemo() {
  const t = useTranslations("landing.demoWidget");
  const locale = useLocale();
  const signupHref = hrefWithLocale(locale, "/register");

  const [price, setPrice] = useState<number>(0);
  const [change24h, setChange24h] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [position, setPosition] = useState(0); // BTC amount held
  const [entryPrice, setEntryPrice] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [tradesUsed, setTradesUsed] = useState(0);
  const [flash, setFlash] = useState<"buy" | "sell" | "profit" | "loss" | null>(null);
  const [lastTradePnl, setLastTradePnl] = useState<number | null>(null);
  const [showPromo, setShowPromo] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const priceUp = priceHistory.length >= 2 && priceHistory[priceHistory.length - 1] >= priceHistory[priceHistory.length - 2];

  // Fetch initial price from CoinGecko
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(COINGECKO_BTC, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
        const data = await res.json();
        const p = data.bitcoin?.usd ?? 0;
        const ch = data.bitcoin?.usd_24h_change ?? 0;
        if (p > 0) {
          setPrice(p);
          setChange24h(ch);
          // Generate a mini price history from the last 12 simulated points
          const history: number[] = [];
          for (let i = 0; i < 12; i++) {
            const variance = (Math.random() - 0.5) * p * 0.01; // ±0.5%
            history.push(p + variance);
          }
          history.sort((a, b) => a - b); // trend-like
          if (ch >= 0) history.reverse(); // upward trend
          setPriceHistory(history);
        }
        setHasError(false);
      } catch {
        setHasError(true);
        if (price === 0) {
          const fallback = 95000 + Math.random() * 5000;
          setPrice(fallback);
          setPriceHistory(Array(12).fill(0).map((_, i) => fallback + (i - 6) * 100));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchPrice();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll CoinGecko every 30s for price updates
  const tick = useCallback(async () => {
    try {
      const res = await fetch(COINGECKO_BTC, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return;
      const data = await res.json();
      const p = data.bitcoin?.usd ?? 0;
      if (p > 0) {
        setPrice(p);
        setPriceHistory((prev) => [...prev.slice(-11), p]);
      }
      setHasError(false);
    } catch {
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(tick, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick]);

  // Update unrealized PnL
  useEffect(() => {
    if (position > 0 && price > 0) {
      setPnl((price - entryPrice) * position);
    }
  }, [price, position, entryPrice]);

  function handleBuy() {
    if (position > 0 || price <= 0 || tradesUsed >= MAX_TRADES) return;
    const qty = balance / price;
    setPosition(qty);
    setEntryPrice(price);
    setPnl(0);
    setLastTradePnl(null);
    setFlash("buy");
    setTimeout(() => setFlash(null), 600);
  }

  function handleSell() {
    if (position <= 0) return;
    const realizedPnl = (price - entryPrice) * position;
    const newBalance = balance + realizedPnl;
    setLastTradePnl(realizedPnl);
    setBalance(newBalance);
    setPosition(0);
    setEntryPrice(0);
    setPnl(0);
    setTradesUsed((prev) => prev + 1);

    // Show profit/loss animation
    setFlash(realizedPnl >= 0 ? "profit" : "loss");
    setTimeout(() => {
      setFlash(null);
      setLastTradePnl(null);
    }, 2000);

    // Check if max trades reached
    if (tradesUsed + 1 >= MAX_TRADES) {
      setTimeout(() => setShowPromo(true), 2500);
    }
  }

  const portfolioValue = balance + (position > 0 ? pnl : 0);
  const tradesLeft = MAX_TRADES - tradesUsed;
  const pctChange = balance - INITIAL_BALANCE;

  return (
    <section
      id="interactive-demo"
      data-testid="interactive-demo"
      className="relative scroll-mt-24 overflow-hidden bg-[#0A0B0D] py-16 md:py-24"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8">
        {/* Section header */}
        <div className="mb-8 sm:mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400">
            <Zap className="w-3.5 h-3.5" />
            Prøv JokerTrade — ingen registrering
          </div>
          <h2 className="mb-2 text-2xl sm:text-3xl lg:text-4xl font-black text-[#F9FAFB] tracking-tight">
            Opplev JokerTrade selv
          </h2>
          <p className="mx-auto max-w-lg text-sm sm:text-base text-[#9CA3AF] leading-relaxed">
            Kjøp og selg BTC med 10 000 kr i lekepenger. Se hvordan AI-en
            jobber for deg — uten å risikere en krone.
          </p>
        </div>

        {/* Demo card — dark glassmorphism */}
        <div
          className={`relative rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5 sm:p-7 shadow-xl transition-all duration-500 ${
            flash === "profit"
              ? "border-[#10B981]/50 shadow-[#10B981]/10"
              : flash === "loss"
                ? "border-[#EF4444]/50 shadow-[#EF4444]/10"
                : flash === "buy"
                  ? "border-[#3B82F6]/50"
                  : ""
          }`}
        >
          {/* Header row */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <CoinIcon />
              <div className="min-w-0">
                <div className="text-[#F9FAFB] font-bold text-sm sm:text-base">BTC / USDT</div>
                <div className="flex items-center gap-2">
                  <div className="text-lg sm:text-xl font-black text-[#F9FAFB] tabular-nums tracking-tight">
                    {loading ? (
                      <span className="inline-block w-20 h-5 bg-[#2A2D35] animate-pulse rounded" />
                    ) : (
                      `$${formatUsd(price)}`
                    )}
                  </div>
                  {!loading && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                        change24h >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                      }`}
                    >
                      {change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {change24h >= 0 ? "+" : ""}
                      {change24h.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!loading && priceHistory.length > 0 && (
              <MiniSparkline data={priceHistory} isUp={priceUp} />
            )}
          </div>

          {/* Portfolio value */}
          <div className="mb-5 rounded-xl bg-[#0A0B0D]/60 border border-[#2A2D35] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">
                Porteføljeverdi
              </span>
              <span className="text-xs text-[#6B7280]">
                Trades igjen: {tradesLeft}/{MAX_TRADES}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-black tabular-nums transition-colors duration-300 ${
                  portfolioValue >= INITIAL_BALANCE
                    ? "text-[#10B981]"
                    : "text-[#EF4444]"
                }`}
              >
                {formatKr(portfolioValue)} kr
              </span>
              {pctChange !== 0 && (
                <span
                  className={`text-xs font-semibold ${
                    pctChange >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {pctChange >= 0 ? "+" : ""}
                  {formatKr(pctChange)} kr
                </span>
              )}
            </div>
          </div>

          {/* Position info */}
          {position > 0 && (
            <div className="flex items-center justify-between text-xs sm:text-sm mb-4 px-1">
              <span className="text-[#6B7280]">
                Posisjon: {position.toFixed(5)} BTC @ ${formatUsd(entryPrice)}
              </span>
              <span
                className={`font-bold tabular-nums ${
                  pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                }`}
              >
                {pnl >= 0 ? "+" : ""}
                {formatKr(pnl)} kr
              </span>
            </div>
          )}

          {/* Last trade result animation */}
          {lastTradePnl !== null && (
            <div
              className={`mb-4 text-center py-2 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
                lastTradePnl >= 0
                  ? "bg-[#064E3B]/80 border border-[#10B981]/30 text-[#10B981]"
                  : "bg-[#7F1D1D]/80 border border-[#EF4444]/30 text-[#EF4444]"
              }`}
            >
              {lastTradePnl >= 0 ? "🎉 " : "📉 "}
              {lastTradePnl >= 0 ? "+" : ""}
              {formatKr(lastTradePnl)} kr
              {lastTradePnl >= 0 ? " i profitt!" : " i tap"}
            </div>
          )}

          {/* Trade buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={handleBuy}
              disabled={position > 0 || loading || showPromo}
              aria-label="Kjøp"
              className="py-3.5 rounded-xl font-bold text-white transition-all duration-200
                bg-[#3B82F6] hover:bg-[#2563EB] active:scale-[0.98]
                shadow-lg shadow-blue-500/20
                disabled:opacity-30 disabled:cursor-not-allowed min-h-[48px]"
            >
              Kjøp
            </button>
            <button
              type="button"
              onClick={handleSell}
              disabled={position <= 0 || showPromo}
              aria-label="Selg"
              className="py-3.5 rounded-xl font-bold text-white transition-all duration-200
                bg-[#EF4444] hover:bg-[#DC2626] active:scale-[0.98]
                shadow-lg shadow-red-500/20
                disabled:opacity-30 disabled:cursor-not-allowed min-h-[48px]"
            >
              Selg
            </button>
          </div>

          {/* Error state */}
          {hasError && (
            <p className="text-center text-xs text-[#EF4444] mb-3">
              Kunne ikke hente sanntidspris. Prøv igjen senere.
            </p>
          )}

          {/* Promo CTA — shown after 3 trades */}
          {showPromo && (
            <div className="mt-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 p-5 text-center">
              <Sparkles className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-[#F9FAFB] font-bold text-base sm:text-lg mb-1">
                Likte du dette?
              </p>
              <p className="text-[#9CA3AF] text-xs sm:text-sm mb-4">
                Registrer deg for å fortsette med 100 000 kr i lekepenger og
                ekte AI-drevne handler
              </p>
              <Link
                href={signupHref}
                className="inline-flex items-center gap-2 px-6 py-3
                  bg-[#F59E0B] text-[#0A0B0D] font-bold rounded-xl
                  hover:bg-[#D97706] active:scale-[0.98] transition-all duration-200
                  shadow-lg shadow-amber-500/30 min-h-[48px]"
              >
                Start gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Bottom info */}
          {!showPromo && (
            <p className="text-center text-[#6B7280] text-xs">
              {tradesLeft > 0
                ? `Du har ${tradesLeft} handel${tradesLeft !== 1 ? "er" : ""} igjen — ingen ekte penger`
                : "Alle handler brukt — registrer deg for å fortsette"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
