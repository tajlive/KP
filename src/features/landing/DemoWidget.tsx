"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { BRAND } from "@/lib/design/tokens";
import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_BALANCE = 100_000;

interface BinanceTicker {
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
}

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

function formatKr(n: number): string {
  return n.toLocaleString("nb-NO", { maximumFractionDigits: 0 });
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function DemoWidget() {
  const t = useTranslations("landing.demoWidget");
  const locale = useLocale();
  const { user } = useAuth();
  const signupHref = hrefWithLocale(locale, "/register");
  const paperHref = hrefWithLocale(locale, "/handel");

  const [prices, setPrices] = useState<number[]>([]);
  const [ticker, setTicker] = useState<BinanceTicker | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [position, setPosition] = useState(0);
  const [entryPrice, setEntryPrice] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [flash, setFlash] = useState<"buy" | "sell" | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

  // Fetch live 24h price history from Binance
  useEffect(() => {
    async function fetchHistory() {
      try {
        const [tickerRes, klinesRes] = await Promise.all([
          fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
          fetch(
            "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24",
          ),
        ]);

        if (!tickerRes.ok || !klinesRes.ok)
          throw new Error("Binance API error");

        const tickerData = (await tickerRes.json()) as BinanceTicker;
        const klinesData = (await klinesRes.json()) as Array<unknown[]>;

        setTicker(tickerData);
        // Map kline close prices to number array
        const closePrices = klinesData.map((k) => parseFloat(k[4] as string));
        setPrices(closePrices);
        setLoading(false);
      } catch (err) {
        console.error("[DemoWidget] Failed to fetch Binance data:", err);
        // Fallback: start with a reasonable BTC price if API fails
        setPrices(Array(24).fill(95_000));
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  // Poll current price every 10 seconds
  const tick = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      );
      if (!res.ok) return;
      const data = (await res.json()) as { price: string };
      const price = parseFloat(data.price);
      setPrices((prev) => [...prev.slice(-23), price]);
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(tick, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick]);

  useEffect(() => {
    if (position !== 0 && currentPrice > 0) {
      const unrealized = (currentPrice - entryPrice) * position;
      setPnl(unrealized);
    }
  }, [currentPrice, position, entryPrice]);

  function handleBuy() {
    if (position > 0 || currentPrice <= 0) return;
    const qty = +(balance / currentPrice).toFixed(6);
    setPosition(qty);
    setEntryPrice(currentPrice);
    setPnl(0);
    setFlash("buy");
    setTimeout(() => setFlash(null), 600);
  }

  function handleSell() {
    if (position <= 0) return;
    setBalance((prev) => prev + pnl);
    setPosition(0);
    setEntryPrice(0);
    setPnl(0);
    setFlash("sell");
    setTimeout(() => setFlash(null), 600);
  }

  const minP = prices.length > 0 ? Math.min(...prices) : 0;
  const maxP = prices.length > 0 ? Math.max(...prices) : 1;
  const range = maxP - minP || 1;

  const svgPoints = prices
    .map((p, i) => {
      const x = prices.length > 1 ? (i / (prices.length - 1)) * 280 : 140;
      const y = 80 - ((p - minP) / range) * 70;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath =
    prices.length > 0
      ? `M0,80 L${prices
          .map((p, i) => {
            const x = prices.length > 1 ? (i / (prices.length - 1)) * 280 : 140;
            const y = 80 - ((p - minP) / range) * 70;
            return `${x},${y}`;
          })
          .join(" L")} L280,80 Z`
      : "";

  const priceUp =
    prices.length >= 2 &&
    prices[prices.length - 1] >= prices[prices.length - 2];

  const priceChangePercent = ticker ? parseFloat(ticker.priceChangePercent) : 0;
  const portfolioValue = balance + (position > 0 ? pnl : 0);

  return (
    <section
      id="land-demo"
      data-testid="demo-widget"
      className="relative scroll-mt-24 overflow-x-hidden bg-slate-950 py-16 md:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,82,255,0.18),transparent)]"
        aria-hidden
      />
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {t("liveBadge")}
          </div>
          <h2 className="mb-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-xl text-lg text-slate-200/90 leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="relative">
          <div
            className={`rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_60px_-20px_rgba(0,82,255,0.35)] backdrop-blur-md transition-colors duration-300 sm:p-8 ${
              flash === "buy"
                ? "border-emerald-500/45"
                : flash === "sell"
                  ? "border-amber-500/45"
                  : "hover:border-[#0052FF]/25"
            }`}
          >
            {/* Header row */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-orange-400 to-orange-600 text-lg font-bold text-white">
                  ₿
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white">BTC / USDT</div>
                  <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    {t("livePrice")}
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`font-semibold tabular-nums text-sm ${priceUp ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {loading ? (
                        <span className="inline-block w-16 h-4 bg-slate-700 animate-pulse rounded" />
                      ) : (
                        `$${formatUsd(currentPrice)}`
                      )}
                    </div>
                    {!loading && ticker && (
                      <span
                        className={`text-xs font-medium ${priceChangePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {priceChangePercent >= 0 ? "+" : ""}
                        {priceChangePercent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {t("portfolio")}
                </div>
                <div
                  className={`text-xl font-black tabular-nums ${portfolioValue >= INITIAL_BALANCE ? "text-emerald-400" : "text-red-400"}`}
                >
                  {formatKr(portfolioValue)} kr
                </div>
                {!loading && ticker && (
                  <div className="text-xs text-slate-500">
                    Vol: {(parseFloat(ticker.volume) / 1e9).toFixed(1)}B USDT
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="mb-6 rounded-xl border border-white/[0.08] bg-black/20 p-4">
              {loading ? (
                <div className="w-full h-32 sm:h-40 flex items-center justify-center">
                  <div className="w-full h-8 bg-slate-800 animate-pulse rounded" />
                </div>
              ) : prices.length > 0 ? (
                <svg
                  viewBox="0 0 280 90"
                  className="w-full h-32 sm:h-40"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="demoGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={priceUp ? "#10b981" : "#ef4444"}
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor={priceUp ? "#10b981" : "#ef4444"}
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#demoGrad)" />
                  <polyline
                    points={svgPoints}
                    fill="none"
                    stroke={priceUp ? "#10b981" : "#ef4444"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </div>

            {/* Position info */}
            {position > 0 && (
              <div className="flex items-center justify-between text-sm mb-4 px-1">
                <span className="text-slate-500">
                  {t("positionLabel")}: {position.toFixed(4)} BTC
                </span>
                <span
                  className={`font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {formatKr(pnl)} kr
                </span>
              </div>
            )}

            {/* Trade buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleBuy}
                disabled={position > 0 || loading}
                aria-label={t("buy")}
                data-testid="demo-widget-buy"
                className="py-3.5 rounded-xl font-bold text-white transition-all duration-200 bg-emerald-700 hover:bg-emerald-600 shadow-lg shadow-emerald-700/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t("buy")}
              </button>
              <button
                type="button"
                onClick={handleSell}
                disabled={position <= 0}
                aria-label={t("sell")}
                data-testid="demo-widget-sell"
                className="py-3.5 rounded-xl font-bold text-white transition-all duration-200 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t("sell")}
              </button>
            </div>

            {/* Inline CTA banner — always visible on mobile and desktop */}
            <div className="mt-5 rounded-xl border border-kp-border bg-kp-bg-secondary/80 p-4 text-center">
              <p className="text-kp-text-primary font-semibold text-sm mb-3">
                {user ? t("overlayLoggedIn") : t("overlay")}
              </p>
              <Link
                href={user ? paperHref : signupHref}
                className={`inline-flex items-center gap-2 px-6 py-3 ${BRAND.primary} font-bold rounded-lg shadow-lg shadow-[#0052FF]/30 transition-all duration-200 text-sm`}
              >
                {user ? t("overlayLoggedInCta") : t("overlayCta")}
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
