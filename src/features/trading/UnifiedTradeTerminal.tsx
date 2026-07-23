"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrices } from "@/hooks/usePrices";
import { AutoStrategyPanel } from "@/features/trading/AutoStrategyPanel";
import { JokerDashboard } from "@/features/trading/JokerDashboard";
import { FirstTradeFlow } from "@/features/trading/FirstTradeFlow";
import { FirstTradeReward } from "@/features/dashboard/FirstTradeReward";
import { formatNOK } from "@/lib/format/currency";
import { getDisplayUsdtToNokRate, nokPriceToUsdt, usdtPriceToNok } from "@/lib/market/nok";

// ─── Types ───
type TradeMode = "manual" | "auto" | "joker";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

// ─── Live Ticker Bar ───
function LiveTicker() {
  const { prices } = usePrices();
  const tickers: PriceData[] = React.useMemo(() => {
    const map: Record<string, string> = {
      BTCUSDT: "₿",
      ETHUSDT: "⟠",
      XRPUSDT: "◎",
      SOLUSDT: "◎",
      ADAUSDT: "⬡",
    };
    const priceData: PriceData[] = [];
    for (const [symbol, data] of Object.entries(prices).slice(0, 8)) {
      const p = (data as { price?: number; price_change_percent_24h?: number | null }).price ?? 0;
      const change = (data as { price_change_percent_24h?: number | null }).price_change_percent_24h ?? 0;
      priceData.push({
        symbol: symbol.replace("USDT", ""),
        price: p,
        change24h: change,
      });
    }
    return priceData.length > 0 ? priceData : [
      { symbol: "BTC", price: usdtPriceToNok(63258), change24h: 2.3 },
      { symbol: "ETH", price: usdtPriceToNok(2245), change24h: -0.8 },
      { symbol: "XRP", price: usdtPriceToNok(3.12), change24h: 0.5 },
      { symbol: "SOL", price: usdtPriceToNok(142.3), change24h: 4.1 },
      { symbol: "ADA", price: usdtPriceToNok(0.89), change24h: -1.2 },
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
            <span className="text-slate-400">{t.symbol}</span>
            <span className="text-white font-medium">
              {formatNOK(t.price, { locale: "nb-NO", fractionDigits: t.price > 1000 ? 0 : 2 })}
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
const MODES: { id: TradeMode; label: string; short: string; accent: string }[] = [
  { id: "manual", label: "Manuell", short: "✋", accent: "data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400" },
  { id: "auto", label: "Auto", short: "🤖", accent: "data-[state=active]:border-amber-400 data-[state=active]:text-amber-400" },
  { id: "joker", label: "Joker", short: "🃏", accent: "data-[state=active]:border-violet-400 data-[state=active]:text-violet-400" },
];

function ModeTabs({ active, onChange }: { active: TradeMode; onChange: (m: TradeMode) => void }) {
  const t = useTranslations("trading");

  return (
    <div className="flex items-center gap-0.5 bg-[#0A0D12] rounded-xl p-0.5 border border-[#1E2530]">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          data-state={active === m.id ? "active" : "inactive"}
          className={cn(
            "relative px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200",
            "border border-transparent",
            "text-slate-500 hover:text-slate-300",
            m.accent,
          )}
        >
          <span className="hidden sm:inline">{m.short} </span>
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ─── Price Sparkline (real Binance 15m klines, client-side) ───
const SPARK_KLINES_URL =
  "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=40";
const SPARK_POLL_MS = 30_000;

function PriceSparkline({ className }: { className?: string }) {
  const [points, setPoints] = React.useState<number[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(SPARK_KLINES_URL);
        if (!res.ok) return;
        const raw = (await res.json()) as unknown[];
        const closes = raw
          .map((k) => usdtPriceToNok(Number((k as unknown[])[4])))
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
  const H = 36;
  const PAD = 1.5;

  let linePath = "";
  let areaPath = "";
  let up = true;
  if (points.length >= 2) {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = (W - PAD * 2) / (points.length - 1);
    const toY = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);
    const pts = points.map((v, i) => `${(PAD + i * stepX).toFixed(2)},${toY(v).toFixed(2)}`);
    linePath = `M${pts[0]} L${pts.slice(1).join(" ")}`;
    areaPath = `${linePath} L${(W - PAD).toFixed(2)},${H - PAD} L${PAD},${H - PAD} Z`;
    up = points[points.length - 1] >= points[0];
  }

  const stroke = up ? "#34d399" : "#f87171";

  return (
    <div className={cn("relative min-h-0", className)}>
      {linePath ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#sparkFill)" stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke={stroke}
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <div className="w-full h-full rounded-lg bg-slate-800/30 animate-pulse" />
      )}
    </div>
  );
}

// ─── Price Card (real NOK price instead of fake chart) ───
function PriceCard({ className }: { className?: string }) {
  const { prices } = usePrices();

  const btc = prices["BTCUSDT"] as { price?: number; price_change_percent_24h?: number | null } | undefined;
  const priceNok = btc?.price ?? usdtPriceToNok(63258);
  const change24h = btc?.price_change_percent_24h ?? 0;
  const priceUsdt = nokPriceToUsdt(priceNok);

  return (
    <div className={cn("relative w-full rounded-xl bg-[#0A0D12] border border-[#1E2530] p-4 sm:p-6 flex flex-col", className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
            BTC / NOK
          </div>
          <div className="text-white text-2xl sm:text-3xl font-bold font-mono">
            {formatNOK(priceNok, { locale: "nb-NO", fractionDigits: 0 })}
          </div>
          <div className={cn(
            "text-xs font-medium mt-1",
            Number(change24h) >= 0 ? "text-emerald-400" : "text-red-400",
          )}>
            {Number(change24h) >= 0 ? "+" : ""}{change24h}% (24h)
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-500">USDT-kurs</div>
          <div className="text-white font-mono text-sm">
            {formatNOK(priceUsdt, { locale: "nb-NO", style: "decimal", fractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">1 USD ≈ {getDisplayUsdtToNokRate()} NOK</div>
        </div>
      </div>
      <PriceSparkline className="flex-1 mt-4" />
      <div className="text-xs text-slate-500 mt-2">BTC/NOK · 15-minutters lys · siste 10 timer · Kilde: Binance</div>
    </div>
  );
}

// ─── Buy/Sell Panel ───
function OrderPanel({ mode }: { mode: TradeMode }) {
  const t = useTranslations("trading");
  const { prices } = usePrices();
  const [side, setSide] = React.useState<"buy" | "sell">("buy");
  const [amount, setAmount] = React.useState("1000");
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ ok: boolean; msg: string } | null>(null);

  const amountNum = Number(amount);
  const amountError = amountNum <= 0 ? "Beløpet må være større enn 0" : "";

  const priceNok = React.useMemo(() => {
    const btc = prices["BTCUSDT"] as { price?: number } | undefined;
    return btc?.price ?? usdtPriceToNok(63258);
  }, [prices]);

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
          pair: "BTC/USDT",
          side,
          amount_nok: Number(amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const qty = (Number(amount) / priceNok).toFixed(6);
        setFeedback({ ok: true, msg: `${side === "buy" ? "Kjøpte" : "Solgte"} ${qty} BTC · ${formatNOK(Number(amount), { locale: "nb-NO" })}` });
        // Send confirmation email
        fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "trade_confirmed",
            symbol: "BTCUSDT",
            side,
            amount: Number(amount),
            price: data.trade.price,
          }),
        }).catch(() => {});
      } else {
        setFeedback({ ok: false, msg: data.error || "Feil" });
      }
    } catch {
      setFeedback({ ok: false, msg: "Nettverksfeil" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
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
        <label htmlFor="trade-amount" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
          Beløp (NOK)
        </label>
        <div className="relative">
          <input
            id="trade-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0A0D12] border border-[#1E2530] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#0066FF] transition-colors"
            placeholder="0.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 font-mono">
            ≈ {(Number(amount) / priceNok).toFixed(6)} BTC
          </span>
        </div>
        {amountError && (
          <p className="text-[11px] text-red-400 mt-1">{amountError}</p>
        )}
      </div>

      {/* Price display */}
      <div className="flex justify-between text-xs text-slate-500">
        <span>1 BTC = {priceNok.toLocaleString("no")} kr</span>
        <span>Spread: 0.02%</span>
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
        {loading ? "Utfører..." : `${side === "buy" ? "Kjøp" : "Selg"} BTC`}
      </button>

      {/* Feedback */}
      {feedback && (
        <div className={cn(
          "text-xs text-center px-2 py-1 rounded",
          feedback.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400",
        )}>
          {feedback.msg}
        </div>
      )}

      {/* Mode-specific info */}
      <div className={cn(
        "text-center text-[11px] px-3 py-1.5 rounded-lg",
        "bg-[#0A0D12] border border-[#1E2530]",
      )}>
        {mode === "manual" && "Du handler selv — full kontroll"}
        {mode === "auto" && "AI-en handler basert på dine regler"}
        {mode === "joker" && "AI-en analyserer og handler automatisk"}
      </div>
    </div>
  );
}

// ─── Positions / Orders Mini-list ───
function MiniPositionList() {
  const [positions, setPositions] = React.useState<Array<{
    symbol: string;
    position_type: string;
    quantity: number;
    entry_price: number;
    current_price?: number;
    profit_loss?: number;
  }>>([]);

  React.useEffect(() => {
    fetch("/api/paper-trading/balance")
      .then(r => r.json())
      .then(d => setPositions(d.positions || []))
      .catch(() => {});
  }, []);

  const sideLabel = (type: string) => type.includes("long") ? "LONG" : "SHORT";
  const sideColor = (type: string) => type.includes("long") ? "text-emerald-400" : "text-red-400";

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
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0A0D12] border border-[#1E2530] text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-white font-mono">{p.symbol?.replace("USDT", "/USDT")}</span>
            <span className={cn("text-[10px] font-bold uppercase", sideColor(p.position_type))}>
              {sideLabel(p.position_type)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono">{Number(p.quantity).toFixed(4)}</span>
            <span className={cn("font-mono font-bold", (p.profit_loss ?? 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
              {p.profit_loss != null ? `${(p.profit_loss ?? 0) >= 0 ? "+" : ""}${Number(p.profit_loss).toFixed(0)} kr` : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Terminal ───
export function UnifiedTradeTerminal() {
  const t = useTranslations("trading");
  const [mode, setMode] = React.useState<TradeMode>("manual");
  const searchParams = useSearchParams();
  // Guided første-gangs-modus: opt-in via /trade?first=1 (fra OnboardingChecklist).
  // Eksisterende brukere og vanlig /trade påvirkes ikke.
  const isFirstTrade = searchParams.get("first") === "1";
  const [firstTradeDone, setFirstTradeDone] = React.useState(false);

  if (isFirstTrade) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white sm:text-xl">Trade</h1>
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

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white sm:text-xl">Trade</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              ● BETA
            </span>
          </div>
          <ModeTabs active={mode} onChange={setMode} />
        </div>

        {/* Main grid: chart + panels */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
          {/* Chart column */}
          <div className="space-y-3">
            <PriceCard className="h-[280px] sm:h-[380px]" />

            {/* Mode description bar */}
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium border",
                mode === "manual" && "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
                mode === "auto" && "bg-amber-500/5 border-amber-500/20 text-amber-400",
                mode === "joker" && "bg-violet-500/5 border-violet-500/20 text-violet-400",
              )}
            >
              {mode === "manual" && "✋ Manuell modus — du bestemmer alt. Kjøp og selg direkte fra ordrepanelet."}
              {mode === "auto" && "🤖 Auto modus — sett dine regler, AI-en utfører handlene. Du beholder kontroll over strategien."}
              {mode === "joker" && "🃏 JokerTrade — AI-en analyserer markedet, velger handler og utfører. Len deg tilbake."}
            </motion.div>
          </div>

          {/* Side panel: Mode-spesifikt innhold */}
          <div className="space-y-3">
            {mode === "manual" && (
              <>
                <OrderPanel mode={mode} />
                <MiniPositionList />
              </>
            )}
            {mode === "auto" && <AutoStrategyPanel />}
            {mode === "joker" && <JokerDashboard />}
          </div>
        </div>
      </div>
    </div>
  );
}
