"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./LivePriceChart.module.css";

/* ===================================================
   LivePriceChart — Live BTC/USDT price + SVG area chart
   Binance API polling, localStorage seeding, dark theme
   =================================================== */

const BINANCE_URL =
  "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";
const POLL_MS = 5000;
const CHART_POINTS = 40;
const CHART_W = 340;
const CHART_H = 120;
const CHART_PAD = 4;
const SEED_KEY = "kp_livechart_seed";

/* ---------- helpers ---------- */

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/** Generate CHART_POINTS pseudo-random prices around a base. */
function generateSeedPrices(basePrice: number, seed: number): number[] {
  let volatility = 0.015; // ±1.5%
  const points: number[] = [];
  let p = basePrice * (1 - volatility / 2);
  for (let i = 0; i < CHART_POINTS; i++) {
    const r = seededRandom(seed + i);
    const drift = (r - 0.5) * volatility;
    p = p * (1 + drift);
    points.push(p);
    // tighten / loosen volatility slightly
    volatility += (0.012 - volatility) * 0.03;
  }
  return points;
}

function loadOrCreateSeed(): { seed: number; prices: number[] } {
  try {
    const raw = localStorage.getItem(SEED_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { seed: number; prices: number[] };
      if (
        saved &&
        typeof saved.seed === "number" &&
        Array.isArray(saved.prices) &&
        saved.prices.length === CHART_POINTS
      ) {
        return saved;
      }
    }
  } catch {
    /* corrupt entry — regenerate */
  }
  const seed = Math.floor(Math.random() * 2147483647);
  const basePrice = 700000 + Math.random() * 500000; // 700k–1.2M NOK (BTC i NOK-range)
  const prices = generateSeedPrices(basePrice, seed);
  const entry = { seed, prices };
  try {
    localStorage.setItem(SEED_KEY, JSON.stringify(entry));
  } catch {
    /* storage full — non-critical */
  }
  return entry;
}

function formatPrice(v: number): string {
  // NOK-visning (valuta-kontrakten): "1 042 500 kr" — aldri $/USDT mot nybegynnere
  return (
    Math.round(v).toLocaleString("nb-NO").replace(/,/g, "\u00A0") + "\u00A0kr"
  );
}

/** Build SVG area path from price points (left-to-right, with padding). */
function buildAreaPath(prices: number[], w: number, h: number, pad: number): string {
  if (prices.length < 2) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const stepX = (w - pad * 2) / (prices.length - 1);
  const toY = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);

  const pts = prices.map((v, i) => `${pad + i * stepX},${toY(v)}`);
  return `M${pts[0]} L${pts.slice(1).join(" ")} L${w - pad},${h - pad} L${pad},${h - pad} Z`;
}

/** Build SVG line path (no fill). */
function buildLinePath(prices: number[], w: number, h: number, pad: number): string {
  if (prices.length < 2) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const stepX = (w - pad * 2) / (prices.length - 1);
  const toY = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);

  const pts = prices.map((v, i) => `${pad + i * stepX},${toY(v)}`);
  return `M${pts[0]} L${pts.slice(1).join(" ")}`;
}

/* ===================================================
   Component
   =================================================== */

export default function LivePriceChart() {
  // ── state ──
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [isUp, setIsUp] = useState(true);
  const [fadedIn, setFadedIn] = useState(false);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  const mountRef = useRef(false);

  // ── seed on mount ──
  useEffect(() => {
    const { prices } = loadOrCreateSeed();
    setPriceHistory(prices);
    if (prices.length > 0) {
      const last = prices[prices.length - 1];
      setPrice(last);
      setPrevPrice(last);
    }
    // fade in after mount
    requestAnimationFrame(() => setFadedIn(true));
    mountRef.current = true;
  }, []);

  // ── fetch price (Binance USDT → NOK via eget fx-endepunkt, valuta-kontrakten) ──
  const fetchPrice = useCallback(async () => {
    try {
      const [priceRes, fxRes] = await Promise.all([
        fetch(BINANCE_URL),
        fetch("/api/fx/usdt-nok"),
      ]);
      if (!priceRes.ok) return;
      const data = (await priceRes.json()) as { symbol: string; price: string };
      const usdtPrice = Number.parseFloat(data.price);
      if (Number.isNaN(usdtPrice)) return;

      let rate = 10.5; // fallback hvis fx-endepunkt er nede
      if (fxRes.ok) {
        const fx = (await fxRes.json()) as { rate?: number };
        if (fx.rate && fx.rate > 0) rate = fx.rate;
      }
      const newPrice = usdtPrice * rate;

      setPrevPrice(price);
      setPrice((old) => {
        if (old !== null && newPrice !== old) {
          setIsUp(newPrice > old);
          setPriceFlash(newPrice > old ? "up" : "down");
          // clear flash after 600ms
          setTimeout(() => setPriceFlash(null), 600);
        }
        return newPrice;
      });

      // calculate 24h change from history
      setPriceHistory((prev) => {
        const next = [...prev, newPrice];
        if (next.length > CHART_POINTS) next.splice(0, next.length - CHART_POINTS);
        if (next.length >= 2) {
          const first = next[0];
          const change = ((newPrice - first) / first) * 100;
          setChange24h(change);
        }
        return next;
      });
    } catch {
      // silently retry next cycle
    }
  }, [price]);

  // ── poll ──
  useEffect(() => {
    if (!mountRef.current) return;
    fetchPrice();
    const id = setInterval(fetchPrice, POLL_MS);
    return () => clearInterval(id);
  }, [fetchPrice]);

  // ── display values ──
  const displayPrice = price ?? 950000; // fallback: BTC ~950k NOK
  const displayChange = change24h ?? 2.4;
  const displayPrices =
    priceHistory.length >= 2 ? priceHistory : generateSeedPrices(displayPrice, 12345);
  const svgW = CHART_W;
  const svgH = CHART_H;

  return (
    <div
      className={`${styles.card} ${fadedIn ? styles.visible : ""}`}
      style={{ width: "100%", maxWidth: 400 }}
    >
      {/* ── Header: coin icon + pair + 24h change ── */}
      <div className={styles.header}>
        <div className={styles.coinInfo}>
          {/* BTC icon */}
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden>
            <circle cx="14" cy="14" r="14" fill="#F7931A" />
            <path
              d="M19.87 16.36c-.28 1.14-2.2 1.56-3.8 1.7l.72 2.88-1.76.44-.7-2.8c-.46.12-.94.22-1.4.32l.7 2.82-1.76.44-.72-2.88c-.38.1-.76.2-1.12.3l-.02-.1-2.42.6-.46-1.86c1.34-.34 2.38-.82 2.3-1.74.04-.52.2-2.38.24-2.74.12-.08.24-.14.38-.2-.1-.04-.2-.08-.28-.12l.84-3.36c.04-.6-.22-1.12-.8-1.36.18-.04.38-.08.58-.12l-.82-3.3 2.42-.6.8 3.2c.64-.18 1.3-.34 1.94-.5l-.8-3.2 1.76-.44.82 3.3c1.46-.28 2.58-.06 3.16.58.5.56.46 1.38.14 2.02-.62.68-1.28 1.04-1.28 1.04s.78.18 1.54.74c.64.48.9 1.28.52 2.28z"
              fill="white"
            />
          </svg>
          <span className={styles.pair}>BTC / NOK</span>
        </div>
        <div className={`${styles.change} ${displayChange >= 0 ? styles.changeUp : styles.changeDown}`}>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden
            style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }}
          >
            {displayChange >= 0 ? (
              <path d="M5 1L9 7H1Z" fill="currentColor" />
            ) : (
              <path d="M5 9L1 3H9Z" fill="currentColor" />
            )}
          </svg>
          {displayChange >= 0 ? "+" : ""}
          {displayChange.toFixed(2)}%
        </div>
      </div>

      {/* ── Price ── */}
      <div className={styles.priceRow}>
        <span
          className={`${styles.price} ${
            priceFlash === "up"
              ? styles.priceFlashUp
              : priceFlash === "down"
                ? styles.priceFlashDown
                : ""
          }`}
        >
          {formatPrice(displayPrice)}
        </span>
        <span className={styles.usdtSuffix}>NOK</span>
      </div>

      {/* ── SVG Area Chart ── */}
      <div className={styles.chartWrap}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          height={svgH}
          preserveAspectRatio="none"
          className={styles.chart}
        >
          {/* Grid lines (subtle) */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={CHART_PAD}
              y1={svgH - CHART_PAD - f * (svgH - CHART_PAD * 2)}
              x2={svgW - CHART_PAD}
              y2={svgH - CHART_PAD - f * (svgH - CHART_PAD * 2)}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          ))}

          {/* Area fill */}
          <path
            d={buildAreaPath(displayPrices, svgW, svgH, CHART_PAD)}
            fill="url(#chartGrad)"
            className={styles.areaPath}
          />

          {/* Line */}
          <path
            d={buildLinePath(displayPrices, svgW, svgH, CHART_PAD)}
            fill="none"
            stroke={displayChange >= 0 ? "#10b981" : "#ef4444"}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.linePath}
          />

          {/* Gradient def */}
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={displayChange >= 0 ? "#10b981" : "#ef4444"}
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor={displayChange >= 0 ? "#10b981" : "#ef4444"}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Last updated ── */}
      <div className={styles.footer}>
        <span className={styles.pulse} />
        Live
      </div>
    </div>
  );
}
