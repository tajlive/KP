"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_BALANCE = 100_000;
const BTC_START = 68_420;

function generatePriceHistory(base: number, count: number): number[] {
  const points: number[] = [base];
  for (let i = 1; i < count; i++) {
    const drift = (Math.random() - 0.48) * base * 0.008;
    points.push(Math.max(base * 0.9, points[i - 1] + drift));
  }
  return points;
}

function formatKr(n: number): string {
  return n.toLocaleString("nb-NO", { maximumFractionDigits: 0 });
}

export function DemoWidget() {
  const t = useTranslations("landing.demoWidget");
  const locale = useLocale();

  const [prices, setPrices] = useState<number[]>(() => generatePriceHistory(BTC_START, 40));
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [position, setPosition] = useState(0);
  const [entryPrice, setEntryPrice] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [flash, setFlash] = useState<"buy" | "sell" | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPrice = prices[prices.length - 1];

  const tick = useCallback(() => {
    setPrices((prev) => {
      const last = prev[prev.length - 1];
      const drift = (Math.random() - 0.48) * last * 0.006;
      const next = Math.max(last * 0.92, last + drift);
      return [...prev.slice(-39), next];
    });
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick]);

  useEffect(() => {
    if (position !== 0) {
      const unrealized = (currentPrice - entryPrice) * position;
      setPnl(unrealized);
    }
  }, [currentPrice, position, entryPrice]);

  function handleBuy() {
    if (position > 0) return;
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

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const svgPoints = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * 280;
      const y = 80 - ((p - minP) / range) * 70;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath = `M0,80 L${prices.map((p, i) => `${(i / (prices.length - 1)) * 280},${80 - ((p - minP) / range) * 70}`).join(" L")} L280,80 Z`;

  const priceUp = prices.length >= 2 && prices[prices.length - 1] >= prices[prices.length - 2];
  const portfolioValue = balance + (position > 0 ? pnl : 0);

  return (
    <section className="py-16 md:py-24 bg-slate-950">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
            {t("title")}
          </h2>
          <p className="text-slate-400 text-lg">{t("subtitle")}</p>
        </div>

        <div className="relative group">
          <div className={`bg-white/3 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 transition-colors duration-300 ${
            flash === "buy" ? "border-emerald-500/40" : flash === "sell" ? "border-amber-500/40" : ""
          }`}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                  ₿
                </div>
                <div>
                  <div className="text-white font-bold">BTC / USDT</div>
                  <div className={`text-sm font-semibold ${priceUp ? "text-emerald-400" : "text-red-400"}`}>
                    ${formatKr(currentPrice)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase tracking-wider">{t("portfolio")}</div>
                <div className={`text-xl font-black ${portfolioValue >= INITIAL_BALANCE ? "text-emerald-400" : "text-red-400"}`}>
                  {formatKr(portfolioValue)} kr
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white/2 rounded-xl p-4 mb-6 border border-white/5">
              <svg viewBox="0 0 280 90" className="w-full h-32 sm:h-40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="demoGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={priceUp ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={priceUp ? "#10b981" : "#ef4444"} stopOpacity="0" />
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
            </div>

            {/* Position info */}
            {position > 0 && (
              <div className="flex items-center justify-between text-sm mb-4 px-1">
                <span className="text-slate-500">
                  {t("positionLabel")}: {position.toFixed(4)} BTC
                </span>
                <span className={`font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {pnl >= 0 ? "+" : ""}{formatKr(pnl)} kr
                </span>
              </div>
            )}

            {/* Trade buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleBuy}
                disabled={position > 0}
                className="py-3.5 rounded-xl font-bold text-white transition-all duration-200 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t("buy")}
              </button>
              <button
                onClick={handleSell}
                disabled={position <= 0}
                className="py-3.5 rounded-xl font-bold text-white transition-all duration-200 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t("sell")}
              </button>
            </div>
          </div>

          {/* CTA overlay on hover */}
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
            <div className="text-center px-6">
              <p className="text-white font-bold text-xl mb-4">{t("overlay")}</p>
              <Link
                href={`/${locale}/signup`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#0052FF] hover:bg-[#0041CC] text-white font-bold rounded-xl shadow-lg shadow-[#0052FF]/30 transition-all duration-200"
              >
                {t("overlayCta")}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
