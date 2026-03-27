"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useAuth } from "@/components/auth/AuthContext";
import { BRAND } from "@/lib/design/tokens";
import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_BALANCE = 100_000;
const BTC_START = 68_420;

/** Deterministisk kurve — samme på server og ved første klient-render (unngår React hydration #418). */
function buildDeterministicPriceHistory(base: number, count: number): number[] {
  const points: number[] = [base];
  for (let i = 1; i < count; i++) {
    const drift = Math.sin(i * 0.37) * base * 0.0015;
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
  const { user } = useAuth();
  const signupHref = hrefWithLocale(locale, "/signup");
  const paperHref = hrefWithLocale(locale, "/paper-trading");

  const [prices, setPrices] = useState<number[]>(() =>
    buildDeterministicPriceHistory(BTC_START, 40),
  );
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

  const priceUp =
    prices.length >= 2 &&
    prices[prices.length - 1] >= prices[prices.length - 2];
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0052FF]/35 bg-[#0052FF]/10 px-3 py-1.5 text-xs font-semibold text-[#3d7aff]">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
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

        <div className="relative group">
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
                  <div
                    className={`font-semibold tabular-nums text-sm ${priceUp ? "text-emerald-400" : "text-red-400"}`}
                  >
                    ${formatKr(currentPrice)}
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
              </div>
            </div>

            {/* Chart */}
            <div className="mb-6 rounded-xl border border-white/[0.08] bg-black/20 p-4">
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
                disabled={position > 0}
                aria-label={t("buy")}
                data-testid="demo-widget-buy"
                className="py-3.5 rounded-xl font-bold text-white transition-all duration-200 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 disabled:opacity-30 disabled:cursor-not-allowed"
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
          </div>

          {/* CTA overlay on hover — signup for guests; paper trading for logged-in */}
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
            <div className="text-center px-6">
              <p className="text-white font-bold text-xl mb-4">
                {user ? t("overlayLoggedIn") : t("overlay")}
              </p>
              <Link
                href={user ? paperHref : signupHref}
                className={`inline-flex items-center gap-2 px-8 py-4 ${BRAND.primary} font-bold rounded-xl shadow-lg shadow-[#0052FF]/30 transition-all duration-200`}
              >
                {user ? t("overlayLoggedInCta") : t("overlayCta")}
                <svg
                  className="w-5 h-5"
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
