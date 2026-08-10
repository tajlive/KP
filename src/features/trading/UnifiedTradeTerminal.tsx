"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrices } from "@/hooks/usePrices";
import { AutoStrategyPanel } from "@/features/trading/AutoStrategyPanel";
import { PilotDashboard } from "@/features/trading/PilotDashboard";
import { FirstTradeFlow } from "@/features/trading/FirstTradeFlow";
import { WalletBalance } from "@/features/trading/WalletBalance";
import { FirstTradeReward } from "@/features/dashboard/FirstTradeReward";
import { formatNOK } from "@/lib/format/currency";
import {
  getDisplayUsdtToNokRate,
  nokPriceToUsdt,
  usdtPriceToNok,
} from "@/lib/market/nok";
import { BacktestPanel } from "@/features/backtest/BacktestPanel";
import { ModeGuide } from "@/features/trading/ModeGuide";

// ─── Types ───
type TradeMode = "manual" | "auto" | "pilot" | "stats" | "backtest";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

// ─── Live Ticker Bar ───
const TICKER_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "AVAXUSDT",
  "DOGEUSDT",
  "LINKUSDT",
  "ADAUSDT",
  "DOTUSDT",
  "UNIUSDT",
  "POLUSDT",
];
const TICKER_ICONS: Record<string, string> = {
  BTCUSDT: "₿",
  ETHUSDT: "⟠",
  SOLUSDT: "◎",
  AVAXUSDT: "▲",
  DOGEUSDT: "Ð",
  LINKUSDT: "⬡",
  ADAUSDT: "⬢",
  DOTUSDT: "◈",
  UNIUSDT: "🦄",
  POLUSDT: "◆",
};

function LiveTicker() {
  const { prices } = usePrices();
  const tickers: PriceData[] = React.useMemo(() => {
    const priceData: PriceData[] = [];
    for (const symbol of TICKER_SYMBOLS) {
      const data = prices[symbol];
      if (!data && priceData.length > 0) continue; // mangler data, men minst én pris er der
      const p =
        (
          data as
            | { price?: number; price_change_percent_24h?: number | null }
            | undefined
        )?.price ?? 0;
      const change =
        (data as { price_change_percent_24h?: number | null } | undefined)
          ?.price_change_percent_24h ?? 0;
      priceData.push({
        symbol: symbol.replace("USDT", ""),
        price: p,
        change24h: change,
      });
    }
    return priceData.length > 0
      ? priceData
      : [
          { symbol: "BTC", price: usdtPriceToNok(63258), change24h: 2.3 },
          { symbol: "ETH", price: usdtPriceToNok(2245), change24h: -0.8 },
          { symbol: "SOL", price: usdtPriceToNok(142.3), change24h: 4.1 },
        ];
  }, [prices]);

  return (
    <div className="w-full overflow-hidden bg-[#0D1117] border-b border-[#1E2530]">
      <div className="flex gap-0 animate-scroll-x">
        {[...tickers, ...tickers].map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono whitespace-nowrap border-r border-[#1E2530] shrink-0"
          >
            <span className="text-slate-400">
              {TICKER_ICONS[t.symbol + "USDT"] ?? ""} {t.symbol}
            </span>
            <span className="text-white font-medium">
              {formatNOK(t.price, {
                locale: "nb-NO",
                fractionDigits: t.price > 1000 ? 0 : 2,
              })}
            </span>
            <span
              className={cn(
                "text-[11px] font-bold",
                Number(t.change24h) >= 0 ? "text-emerald-400" : "text-red-400",
              )}
            >
              {Number(t.change24h) >= 0 ? "+" : ""}
              {t.change24h}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mode Tabs ───
const MODES: { id: TradeMode; label: string; short: string; accent: string }[] =
  [
    {
      id: "manual",
      label: "Manuell",
      short: "✋",
      accent:
        "data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400",
    },
    {
      id: "auto",
      label: "Auto",
      short: "🤖",
      accent:
        "data-[state=active]:border-amber-400 data-[state=active]:text-amber-400",
    },
    {
      id: "pilot",
      label: "Pilot",
      short: "🃏",
      accent:
        "data-[state=active]:border-violet-400 data-[state=active]:text-violet-400",
    },
    {
      id: "stats",
      label: "Statistikk",
      short: "📊",
      accent:
        "data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400",
    },
    {
      id: "backtest",
      label: "Backtest",
      short: "🔬",
      accent:
        "data-[state=active]:border-blue-400 data-[state=active]:text-blue-400",
    },
  ];

function ModeTabs({
  active,
  onChange,
  locked,
}: {
  active: TradeMode;
  onChange: (m: TradeMode) => void;
  locked: TradeMode[];
}) {
  const t = useTranslations("trading");

  return (
    <div className="flex items-center gap-0.5 bg-[#0A0D12] rounded-xl p-0.5 border border-[#1E2530]">
      {MODES.map((m) => {
        const isLocked = locked.includes(m.id);
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            data-state={active === m.id ? "active" : "inactive"}
            aria-disabled={isLocked}
            className={cn(
              "relative px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200",
              "border border-transparent",
              "text-slate-500 hover:text-slate-300",
              isLocked && "opacity-50",
              m.accent,
            )}
          >
            <span className="hidden sm:inline">
              {isLocked ? "🔒" : m.short}{" "}
            </span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Progressiv avsløring: Auto/Pilot låses opp etter første handel ───
// Kilde: /api/paper-trading/balance → recentTrades. null = ukjent ennå
// (viser ulåst mens vi laster — eksisterende brukere skal ikke flimre).
function useHasTraded() {
  const [hasTraded, setHasTraded] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/paper-trading/balance")
      .then(async (r) => {
        // 404 NO_SESSION = bruker uten paper-konto => ingen handler ennå
        if (r.status === 404) {
          if (!cancelled) setHasTraded(false);
          return;
        }
        if (!r.ok) return; // 401/503/nettverk — ikke lås ut eksisterende brukere
        const d = await r.json().catch(() => null);
        // Bare manuelle handler teller — DCA-botens auto-handler (is_bot)
        // skal ikke låse opp Auto/Pilot for brukeren.
        if (!cancelled && d)
          setHasTraded(
            (d.recentTrades?.filter((t: { is_bot?: boolean }) => !t.is_bot)
              ?.length ?? 0) > 0,
          );
      })
      .catch(() => {});
    const onTrade = () => setHasTraded(true);
    window.addEventListener("kp:trade-executed", onTrade);
    return () => {
      cancelled = true;
      window.removeEventListener("kp:trade-executed", onTrade);
    };
  }, []);

  return hasTraded;
}

// ─── Price Sparkline (Kraken 15m klines via egen rute, client-side) ───
const SPARK_KLINES_URL =
  "/api/market/klines?symbol=BTCUSDT&interval=15m&limit=40";
const SPARK_POLL_MS = 30_000;

function PriceSparkline({ className }: { className?: string }) {
  const [points, setPoints] = React.useState<number[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(SPARK_KLINES_URL);
        if (!res.ok) return;
        const body = (await res.json()) as {
          klines?: Array<{ close: number }>;
        };
        const closes = (body.klines ?? [])
          .map((k) => usdtPriceToNok(Number(k.close)))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (!cancelled && closes.length > 1) setPoints(closes);
      } catch {
        /* nettverksfeil — behold forrige graf */
      }
    };
    load();
    const id = setInterval(load, SPARK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const W = 100;
  const H = 40;
  const PAD = 2.5;

  let linePath = "";
  let areaPath = "";
  let up = true;
  let lastX = 0;
  let lastY = 0;
  let min = 0;
  let max = 0;
  if (points.length >= 2) {
    min = Math.min(...points);
    max = Math.max(...points);
    const range = max - min || 1;
    const stepX = (W - PAD * 2) / (points.length - 1);
    const toX = (i: number) => PAD + i * stepX;
    const toY = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);

    // Catmull-Rom → kubisk bezier (glatt kurve i stedet for rette segmenter)
    const P = points.map((v, i) => [toX(i), toY(v)] as const);
    let d = `M${P[0][0].toFixed(2)},${P[0][1].toFixed(2)}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[Math.min(P.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    linePath = d;
    areaPath = `${d} L${P[P.length - 1][0].toFixed(2)},${H - PAD} L${P[0][0].toFixed(2)},${H - PAD} Z`;
    [lastX, lastY] = P[P.length - 1] as unknown as [number, number];
    up = points[points.length - 1] >= points[0];
  }

  const stroke = up ? "#34d399" : "#f87171";
  const fmtK = (v: number) =>
    v >= 10000 ? `${Math.round(v / 1000)}k` : v.toFixed(0);

  return (
    <div className={cn("relative min-h-0", className)}>
      {linePath ? (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
              <filter
                id="sparkGlow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="1.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Diskret rutenett: 3 horisontale linjer */}
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={PAD}
                x2={W - PAD}
                y1={H * f}
                y2={H * f}
                stroke="#ffffff"
                strokeOpacity="0.05"
                strokeWidth="0.3"
              />
            ))}
            <path d={areaPath} fill="url(#sparkFill)" stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke={stroke}
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              filter="url(#sparkGlow)"
            />
            {/* Siste punkt: glødende markør */}
            <circle
              cx={lastX}
              cy={lastY}
              r="1.8"
              fill={stroke}
              opacity="0.35"
            />
            <circle cx={lastX} cy={lastY} r="0.9" fill={stroke} />
          </svg>
          {/* Min/mer-verdier */}
          <span className="absolute top-0 right-0 text-[9px] font-mono text-slate-500 select-none">
            {fmtK(max)}
          </span>
          <span className="absolute bottom-0 right-0 text-[9px] font-mono text-slate-500 select-none">
            {fmtK(min)}
          </span>
        </>
      ) : (
        <div className="w-full h-full rounded-lg bg-slate-800/30 animate-pulse" />
      )}
    </div>
  );
}

// ─── Price Card (real NOK price instead of fake chart) ───
function PriceCard({ className }: { className?: string }) {
  const { prices } = usePrices();

  const btc = prices["BTCUSDT"] as
    | { price?: number; price_change_percent_24h?: number | null }
    | undefined;
  const priceNok = btc?.price ?? usdtPriceToNok(63258);
  const change24h = btc?.price_change_percent_24h ?? 0;
  const priceUsdt = nokPriceToUsdt(priceNok);

  return (
    <div
      className={cn(
        "relative w-full rounded-xl bg-[#0A0D12] border border-[#1E2530] p-3 sm:p-4 flex flex-col",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
            BTC / NOK
          </div>
          <div className="text-white text-xl sm:text-2xl font-bold font-mono">
            {formatNOK(priceNok, { locale: "nb-NO", fractionDigits: 0 })}
          </div>
          <div
            className={cn(
              "text-xs font-medium mt-1",
              Number(change24h) >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {Number(change24h) >= 0 ? "+" : ""}
            {change24h}% (24h)
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-500">USDT-kurs</div>
          <div className="text-white font-mono text-sm">
            {formatNOK(priceUsdt, {
              locale: "nb-NO",
              style: "decimal",
              fractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            1 USD ≈ {getDisplayUsdtToNokRate()} NOK
          </div>
        </div>
      </div>
      <PriceSparkline className="flex-1 mt-2.5 min-h-0" />
      <div className="text-xs text-slate-500 mt-1.5">
        BTC/NOK · siste 10 timer · Kilde: Kraken
      </div>
    </div>
  );
}

// ─── Buy/Sell Panel ───
function OrderPanel({ mode }: { mode: TradeMode }) {
  const t = useTranslations("trading");
  const { prices } = usePrices();
  const [side, setSide] = React.useState<"buy" | "sell">("buy");
  const [amount, setAmount] = React.useState("1000");
  const [symbol, setSymbol] = React.useState("BTCUSDT");
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const SYMBOLS = [
    { symbol: "BTCUSDT", base: "BTC", icon: "₿", name: "Bitcoin" },
    { symbol: "ETHUSDT", base: "ETH", icon: "⟠", name: "Ethereum" },
    { symbol: "SOLUSDT", base: "SOL", icon: "◎", name: "Solana" },
    { symbol: "BNBUSDT", base: "BNB", icon: "◈", name: "BNB" },
    { symbol: "XRPUSDT", base: "XRP", icon: "◎", name: "XRP" },
    { symbol: "ADAUSDT", base: "ADA", icon: "⬡", name: "Cardano" },
    { symbol: "AVAXUSDT", base: "AVAX", icon: "▲", name: "Avalanche" },
    { symbol: "DOTUSDT", base: "DOT", icon: "●", name: "Polkadot" },
    { symbol: "LINKUSDT", base: "LINK", icon: "⛓", name: "Chainlink" },
    { symbol: "DOGEUSDT", base: "DOGE", icon: "Ð", name: "Dogecoin" },
    { symbol: "MATICUSDT", base: "MATIC", icon: "◆", name: "Polygon" },
  ];

  const selectedMeta = SYMBOLS.find((s) => s.symbol === symbol) ?? SYMBOLS[0];
  const amountNum = Number(amount);
  const amountError = amountNum <= 0 ? "Beløpet må være større enn 0" : "";

  const priceNok = React.useMemo(() => {
    const data = prices[symbol] as { price?: number } | undefined;
    return data?.price ?? usdtPriceToNok(symbol === "BTCUSDT" ? 63258 : 100);
  }, [prices, symbol]);

  const handleTrade = async () => {
    if (amountNum <= 0) {
      setFeedback({ ok: false, msg: "Beløpet må være større enn 0" });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/paper-trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: selectedMeta.base + "/USDT",
          side,
          amount_nok: Number(amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const qty = (Number(amount) / priceNok).toFixed(6);
        setFeedback({
          ok: true,
          msg: `${side === "buy" ? "Kjøpte" : "Solgte"} ${qty} ${selectedMeta.base} · ${formatNOK(Number(amount), { locale: "nb-NO" })}`,
        });
        // Progressiv avsløring: lås opp Auto/Pilot i denne sesjonen
        window.dispatchEvent(new Event("kp:trade-executed"));
        // Send confirmation email — API-en returnerer {success, trade_id,
        // session_id, new_balance} (INGEN trade-objekt). P0-fiks 2026-08-08:
        // data.trade.price kastet TypeError INNI try → catch overstyrte
        // suksessmeldingen med «Handelen kunne ikke gjennomføres» selv om
        // handelen var utført (bekreftet: trade b2828a44… status=filled).
        fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "trade_confirmed",
            symbol,
            side,
            amount: Number(amount),
            price: data.trade?.price ?? priceNok,
          }),
        }).catch(() => {});
      } else {
        setFeedback({ ok: false, msg: data.error || data.message || "Feil" });
      }
    } catch (err) {
      const msg =
        err instanceof TypeError && err.message === "Failed to fetch"
          ? "Ingen tilkobling — sjekk nettverket"
          : "Handelen kunne ikke gjennomføres — prøv igjen";
      setFeedback({ ok: false, msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Symbol selector */}
      <div>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
          Valuta
        </span>
        <div className="flex rounded-lg bg-[#0A0D12] border border-[#1E2530] p-0.5 overflow-x-auto">
          {SYMBOLS.map((s) => (
            <button
              key={s.symbol}
              onClick={() => setSymbol(s.symbol)}
              className={cn(
                "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                symbol === s.symbol
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              {s.icon} {s.base}
            </button>
          ))}
        </div>
      </div>

      {/* Side toggle */}
      <div className="flex rounded-lg bg-[#0A0D12] border border-[#1E2530] p-0.5">
        <button
          onClick={() => setSide("buy")}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-md transition-all",
            side === "buy"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-slate-500 hover:text-slate-300",
          )}
        >
          Kjøp
        </button>
        <button
          onClick={() => setSide("sell")}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-md transition-all",
            side === "sell"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-slate-500 hover:text-slate-300",
          )}
        >
          Selg
        </button>
      </div>

      {/* Amount input */}
      <div>
        <label
          htmlFor="trade-amount"
          className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block"
        >
          Beløp (NOK)
        </label>
        <div className="relative">
          <input
            id="trade-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0A0D12] border border-[#1E2530] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#0052FF] transition-colors"
            placeholder="0.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 font-mono">
            ≈ {(Number(amount) / priceNok).toFixed(6)} {selectedMeta.base}
          </span>
        </div>
        {amountError && (
          <p className="text-[11px] text-red-400 mt-1">{amountError}</p>
        )}
      </div>

      {/* Price display */}
      <div className="flex justify-between text-xs text-slate-500">
        <span className="font-mono">
          1 {selectedMeta.base} = {priceNok.toLocaleString("no")} kr
        </span>
        <span className="font-mono text-slate-400">Spread: 0.02%</span>
      </div>

      {/* Action button */}
      <button
        onClick={handleTrade}
        disabled={loading}
        className={cn(
          "w-full py-3 rounded-xl text-sm font-bold transition-all duration-200",
          "shadow-lg active:scale-[0.98] disabled:opacity-50",
          side === "buy"
            ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20"
            : "bg-red-500 text-white hover:bg-red-400 shadow-red-500/20",
        )}
      >
        {loading
          ? "Utfører..."
          : `${side === "buy" ? "Kjøp" : "Selg"} ${selectedMeta.base}`}
      </button>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            "text-xs text-center px-2 py-1 rounded",
            feedback.ok
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400",
          )}
        >
          {feedback.msg}
        </div>
      )}

      {/* Mode-specific info */}
      <div
        className={cn(
          "text-center text-[11px] px-3 py-1.5 rounded-lg",
          "bg-[#0A0D12] border border-[#1E2530]",
        )}
      >
        {mode === "manual" && "Du handler selv — full kontroll"}
        {mode === "auto" && "AI-en handler basert på dine regler"}
        {mode === "pilot" && "AI-en analyserer og handler automatisk"}
      </div>
    </div>
  );
}

// ─── Positions / Orders Mini-list ───
function MiniPositionList() {
  const [positions, setPositions] = React.useState<
    Array<{
      symbol: string;
      position_type: string;
      quantity: number;
      entry_price: number;
      current_price?: number;
      profit_loss?: number;
      is_bot?: boolean;
      exit_reason?: string;
    }>
  >([]);

  React.useEffect(() => {
    fetch("/api/paper-trading/balance")
      .then((r) => r.json())
      .then((d) => setPositions(d.positions || d.recentTrades || []))
      .catch(() => {});
  }, []);

  const sideLabel = (type: string) =>
    type.includes("long") ? "LONG" : "SHORT";
  const sideColor = (type: string) =>
    type.includes("long") ? "text-emerald-400" : "text-red-400";

  // Ikon basert på handelstype
  const tradeIcon = (p: {
    is_bot?: boolean;
    exit_reason?: string;
    side?: string;
  }) => {
    if (p.exit_reason?.includes("stoploss")) return "🛑";
    if (p.exit_reason?.includes("take_profit")) return "🎯";
    if (p.is_bot) return "🤖";
    return "✋";
  };

  if (positions.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-slate-500">
        Ingen åpne posisjoner
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider px-1">
        Posisjoner
      </div>
      {positions.map((p, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0A0D12] border border-[#1E2530] text-xs hover:border-[#2A3040] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span
              className="text-sm"
              title={
                p.is_bot
                  ? "Bot-handel"
                  : p.exit_reason?.includes("stoploss")
                    ? "Stoploss"
                    : p.exit_reason?.includes("take_profit")
                      ? "Take profit"
                      : "Manuell"
              }
            >
              {tradeIcon(p)}
            </span>
            <span className="text-white font-mono">
              {p.symbol?.replace("USDT", "/USDT")}
            </span>
            <span
              className={cn(
                "text-[10px] font-bold uppercase",
                sideColor(p.position_type || "long"),
              )}
            >
              {sideLabel(p.position_type || "long")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono">
              {Number(p.quantity).toFixed(4)}
            </span>
            <span
              className={cn(
                "font-mono font-bold",
                (p.profit_loss ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
              )}
            >
              {p.profit_loss != null
                ? `${(p.profit_loss ?? 0) >= 0 ? "+" : ""}${Number(p.profit_loss).toFixed(0)} kr`
                : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Statistikk-tab (merged from /dashboard/pilot, 2026-08-01) ────
function StatsTab() {
  const [data, setData] = React.useState<{
    totalPnl: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    byCoin: Array<{
      coin: string;
      trades: number;
      pnl: number;
      winRate: number;
    }>;
    trades: Array<{
      id: string;
      trading_pair: string;
      side: string;
      total_value: number;
      realized_pnl: number | null;
      pilot_explanation: string | null;
      created_at: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/pilot", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        const a = d?.analytics ?? {};
        setData({
          totalPnl: a.totalPnl ?? 0,
          winRate: a.winRate ?? 0,
          totalTrades: a.totalTrades ?? 0,
          winningTrades: a.winningTrades ?? 0,
          losingTrades: a.losingTrades ?? 0,
          byCoin: a.byCoin ?? [],
          trades: d?.trades ?? a?.trades ?? [],
        });
      })
      .catch(() => setData(null))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("nb-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(n);
  const coinLabel = (p: string) => p.replace("USDT", "");

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-[#8B9DC3] text-sm">
        Laster statistikk...
      </div>
    );
  if (!data)
    return (
      <div className="text-red-400 text-sm p-4">Kunne ikke hente data</div>
    );

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Resultat"
          value={fmt(data.totalPnl)}
          color={data.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard
          label="Win-rate"
          value={`${data.winRate.toFixed(0)}%`}
          color="text-[#60A5FA]"
        />
        <StatCard
          label="Vinnere"
          value={`${data.winningTrades}`}
          color="text-emerald-400"
        />
        <StatCard
          label="Tapere"
          value={`${data.losingTrades}`}
          color="text-red-400"
        />
      </div>

      {/* Per coin */}
      {data.byCoin.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">
            Per kryptovaluta
          </h3>
          <div className="space-y-1">
            {data.byCoin.map((c) => (
              <div
                key={c.coin}
                className="flex items-center justify-between bg-[#1A1F2E] border border-[#1E2530] rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-white font-medium">
                  {coinLabel(c.coin)}
                </span>
                <span className="text-[#8B9DC3]">{c.trades} handler</span>
                <span
                  className={c.pnl >= 0 ? "text-emerald-400" : "text-red-400"}
                >
                  {fmt(c.pnl)}
                </span>
                <span className="text-[#60A5FA]">{c.winRate.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent trades — moderne AI-forklaringer (2026-08-03) */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Siste handler</h3>
        <div className="space-y-2">
          {data.trades.slice(0, 10).map((t) => (
            <div
              key={t.id}
              className="bg-[#1A1F2E] border border-[#1E2530] rounded-xl p-3 text-sm hover:border-[#2A3142] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      t.side === "buy"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400",
                    )}
                  >
                    {t.side === "buy" ? "▲ KJØP" : "▼ SALG"}
                  </span>
                  <span className="text-white font-medium">
                    {coinLabel(t.trading_pair)}
                  </span>
                  {t.realized_pnl !== null && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                        t.realized_pnl > 0
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400",
                      )}
                    >
                      {fmt(t.realized_pnl)}
                    </span>
                  )}
                </div>
                <span className="text-[#5E6478] text-xs tabular-nums">
                  {new Date(t.created_at).toLocaleTimeString("nb-NO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {t.pilot_explanation && (
                <div className="mt-2 flex gap-2 rounded-lg bg-[#0D1117] border border-[#1E2530]/50 p-2.5">
                  <span className="text-sm shrink-0 mt-0.5">🧠</span>
                  <p className="text-[#A8B8D8] text-xs leading-relaxed">
                    {t.pilot_explanation}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        {data.trades.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#8B9DC3] text-sm">Ingen handler ennå.</p>
            <p className="text-[#5E6478] text-xs mt-1">
              Start Auto-handel for å se AI-forklaringer her.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-[#1A1F2E] border border-[#1E2530] rounded-lg p-4">
      <p className="text-[#8B9DC3] text-xs mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ─── Main Terminal ───
export function UnifiedTradeTerminal() {
  const t = useTranslations("trading");
  const [mode, setMode] = React.useState<TradeMode>("manual");
  const hasTraded = useHasTraded();
  const [lockHint, setLockHint] = React.useState(false);
  const [showUnlock, setShowUnlock] = React.useState(false);
  const prevHasTraded = React.useRef<boolean | null>(null);

  // URL-param: /trade?tab=auto|stats|pilot|manual, /trade?first=1 → Pilot
  // (tab=joker godtas fortsatt som gammelt alias → pilot)
  const searchParams = useSearchParams();
  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "auto") setMode("auto");
    else if (tab === "stats") setMode("stats");
    else if (tab === "pilot" || tab === "joker") setMode("pilot");
    else if (tab === "backtest") setMode("backtest");
    else if (searchParams.get("first") === "1") setMode("pilot");
  }, [searchParams]);

  // Auto er låst til brukeren har gjort minst én manuell trade.
  const lockedModes: TradeMode[] = hasTraded === false ? ["auto"] : [];

  React.useEffect(() => {
    if (hasTraded === true && prevHasTraded.current === false) {
      setLockHint(false);
      setShowUnlock(true);
      const id = setTimeout(() => setShowUnlock(false), 6000);
      prevHasTraded.current = hasTraded;
      return () => clearTimeout(id);
    }
    prevHasTraded.current = hasTraded;
    return undefined;
  }, [hasTraded]);

  const handleModeChange = (m: TradeMode) => {
    if (lockedModes.includes(m)) {
      setLockHint(true);
      return;
    }
    setLockHint(false);
    setMode(m);
  };

  // Guided første-gangs-modus: opt-in via /trade?first=1 (fra OnboardingChecklist).
  // Eksisterende brukere og vanlig /trade påvirkes ikke.
  const isFirstTrade = searchParams.get("first") === "1";
  const [firstTradeDone, setFirstTradeDone] = React.useState(false);

  if (isFirstTrade) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white sm:text-xl">Handel</h1>
            <Link
              href="/trade"
              className="text-sm text-slate-400 underline-offset-4 hover:underline"
            >
              {t("firstTrade.exitToFull")}
            </Link>
          </div>

          {firstTradeDone ? (
            <div className="mx-auto max-w-md space-y-4 text-center">
              <FirstTradeReward totalTrades={1} />
              <Link
                href="/dashboard/historikk"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-base font-bold text-black hover:bg-emerald-400"
              >
                {t("firstTrade.seeResult")}
              </Link>
            </div>
          ) : (
            <FirstTradeFlow onComplete={() => setFirstTradeDone(true)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Live Ticker */}
      <LiveTicker />

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-2">
        {/* Header row — wrapper på mobil: faner får egen rad under tittel */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white sm:text-xl">Handel</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              ● BETA
            </span>
          </div>
          <div className="order-3 w-full overflow-x-auto sm:order-none sm:w-auto">
            <ModeTabs
              active={mode}
              onChange={handleModeChange}
              locked={lockedModes}
            />
          </div>
          <WalletBalance />
        </div>

        {/* Main grid: chart + panels */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
          {/* Chart column */}
          <div className="space-y-3">
            <PriceCard className="h-[210px] sm:h-[260px]" />

            {/* Mode description bar */}
            <motion.div
              key={showUnlock ? "unlock" : lockHint ? "lock" : mode}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium border",
                showUnlock &&
                  "bg-violet-500/10 border-violet-500/30 text-violet-300",
                !showUnlock &&
                  lockHint &&
                  "bg-slate-500/5 border-slate-500/20 text-slate-400",
                !showUnlock &&
                  !lockHint &&
                  mode === "manual" &&
                  "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
                !showUnlock &&
                  !lockHint &&
                  mode === "auto" &&
                  "bg-amber-500/5 border-amber-500/20 text-amber-400",
                !showUnlock &&
                  !lockHint &&
                  mode === "stats" &&
                  "bg-cyan-500/5 border-cyan-500/20 text-cyan-400",
              )}
            >
              {showUnlock &&
                "🔓 Auto er låst opp! Du bestemmer selv — ingenting handles automatisk før du skrur det på."}
              {!showUnlock &&
                lockHint &&
                "🔒 Låses opp etter din første handel — gjør ett kjøp i Manuell modus, så åpnes Auto."}
              {!showUnlock &&
                !lockHint &&
                mode === "manual" &&
                "✋ Manuell modus — du bestemmer alt. Kjøp og selg direkte fra ordrepanelet."}
              {!showUnlock &&
                !lockHint &&
                mode === "auto" &&
                "🤖 Auto modus — sett dine regler, AI-en utfører handlene og forklarer hvert valg. Du beholder kontroll over strategien."}
              {!showUnlock &&
                !lockHint &&
                mode === "stats" &&
                "📊 Statistikk — resultater, win-rate og AI-forklaringer for handlene dine."}
            </motion.div>
            {/* Mode guide — trinn-for-trinn for nye brukere */}
            {(mode === "manual" || mode === "auto") && (
              <ModeGuide mode={mode} />
            )}
          </div>

          {/* Side panel: Mode-spesifikt innhold — høyere prioritet: først på mobil, sticky på desktop */}
          <div className="space-y-3 order-first lg:order-none lg:sticky lg:top-2">
            {mode === "manual" && (
              <>
                <OrderPanel mode={mode} />
                <MiniPositionList />
              </>
            )}
            {mode === "auto" && <AutoStrategyPanel />}
            {mode === "pilot" && <PilotDashboard />}
            {mode === "stats" && <StatsTab />}
            {mode === "backtest" && <BacktestPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
