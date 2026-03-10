"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { ChartWrapper } from "@/components/ui/chart-wrapper";
import { TrendingUp, TrendingDown, BarChart3, Play, Loader2, Info, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricePoint {
  timestamp: number;
  price: number;
  date: string;
}

interface StrategyResult {
  points: { date: string; value: number; price: number }[];
  finalValue: number;
  totalReturn: number;
  maxDrawdown: number;
  winDays: number;
  totalDays: number;
  avgBuyPrice?: number;
  trades?: number;
}

interface BacktestResults {
  hodl: StrategyResult;
  dca: StrategyResult;
  grid: StrategyResult;
  priceChange: number;
}

type Coin = "bitcoin" | "ethereum" | "solana" | "binancecoin";
type Period = 30 | 90 | 180 | 365;
type Strategy = "hodl" | "dca" | "grid";

const COINS: { id: Coin; label: string; symbol: string; color: string }[] = [
  { id: "bitcoin", label: "Bitcoin", symbol: "BTC", color: "#F7931A" },
  { id: "ethereum", label: "Ethereum", symbol: "ETH", color: "#627EEA" },
  { id: "solana", label: "Solana", symbol: "SOL", color: "#9945FF" },
  { id: "binancecoin", label: "BNB", symbol: "BNB", color: "#F0B90B" },
];

const PERIODS: { days: Period; label: string }[] = [
  { days: 30, label: "1M" },
  { days: 90, label: "3M" },
  { days: 180, label: "6M" },
  { days: 365, label: "1Å" },
];

const STRATEGIES: { id: Strategy; label: string; shortDesc: string; color: string }[] = [
  { id: "hodl", label: "Kjøp & Hold", shortDesc: "Investerer alt dag 1", color: "#64748b" },
  { id: "dca", label: "DCA Ukentlig", shortDesc: "Investerer fast hver uke", color: "#3b82f6" },
  { id: "grid", label: "Grid Trading", shortDesc: "Kjøper lavt, selger høyt", color: "#22c55e" },
];

// ─── Backtest engines ─────────────────────────────────────────────────────────

function runHODL(prices: PricePoint[], investment: number): StrategyResult {
  if (prices.length === 0) return emptyResult(investment);
  const startPrice = prices[0].price;
  const coins = investment / startPrice;
  let peak = investment;
  let maxDD = 0;
  let winDays = 0;

  const points = prices.map((p, i) => {
    const value = coins * p.price;
    if (value > peak) peak = value;
    const dd = (peak - value) / peak;
    if (dd > maxDD) maxDD = dd;
    if (i > 0 && value > coins * prices[i - 1].price) winDays++;
    return { date: p.date, value: Math.round(value), price: Math.round(p.price) };
  });

  const finalValue = coins * prices[prices.length - 1].price;
  return {
    points,
    finalValue: Math.round(finalValue),
    totalReturn: ((finalValue - investment) / investment) * 100,
    maxDrawdown: maxDD * 100,
    winDays,
    totalDays: prices.length - 1,
    trades: 1,
  };
}

function runDCA(prices: PricePoint[], investment: number): StrategyResult {
  if (prices.length === 0) return emptyResult(investment);
  const weeks = Math.floor(prices.length / 7);
  const weeklyBuy = investment / Math.max(weeks, 1);
  let totalCoins = 0;
  let totalSpent = 0;
  let buyDays = 0;
  let peak = 0;
  let maxDD = 0;
  let winDays = 0;

  const points = prices.map((p, i) => {
    // Kjøp hver 7. dag
    if (i % 7 === 0 && totalSpent < investment - 1) {
      const toBuy = Math.min(weeklyBuy, investment - totalSpent);
      totalCoins += toBuy / p.price;
      totalSpent += toBuy;
      buyDays++;
    }
    const currentValue = totalCoins * p.price;
    const portfolioValue = currentValue + (investment - totalSpent);
    if (portfolioValue > peak) peak = portfolioValue;
    const dd = peak > 0 ? (peak - portfolioValue) / peak : 0;
    if (dd > maxDD) maxDD = dd;
    if (i > 0) {
      const prevValue = totalCoins * prices[i - 1].price + (investment - totalSpent);
      if (portfolioValue > prevValue) winDays++;
    }
    return { date: p.date, value: Math.round(portfolioValue), price: Math.round(p.price) };
  });

  const finalValue = totalCoins * prices[prices.length - 1].price + (investment - totalSpent);
  return {
    points,
    finalValue: Math.round(finalValue),
    totalReturn: ((finalValue - investment) / investment) * 100,
    maxDrawdown: maxDD * 100,
    winDays,
    totalDays: prices.length - 1,
    avgBuyPrice: totalCoins > 0 ? totalSpent / totalCoins : 0,
    trades: buyDays,
  };
}

function runGrid(prices: PricePoint[], investment: number): StrategyResult {
  if (prices.length === 0) return emptyResult(investment);

  const GRID_LEVELS = 10;
  const GRID_RANGE = 0.15; // ±15% rundt startpris
  const startPrice = prices[0].price;
  const gridStep = (startPrice * GRID_RANGE * 2) / GRID_LEVELS;

  // Initialiser grid: sett kjøpsordre under startpris, salgsordre over
  interface GridOrder { price: number; coins: number; type: "buy" | "sell" }
  const orders: GridOrder[] = [];
  const perLevelCapital = investment / (GRID_LEVELS / 2 + 1); // Reserve cash

  for (let i = 1; i <= GRID_LEVELS / 2; i++) {
    orders.push({ price: startPrice - i * gridStep, coins: perLevelCapital / (startPrice - i * gridStep), type: "buy" });
    orders.push({ price: startPrice + i * gridStep, coins: perLevelCapital / startPrice, type: "sell" }); // sells initialized coins
  }

  let cash = investment / 2; // Start med halvt cash
  let coins = (investment / 2) / startPrice; // Halvt i coins
  const filledBuys = new Set<number>();
  const filledSells = new Set<number>();
  let peak = investment;
  let maxDD = 0;
  let winDays = 0;
  let totalTrades = 0;

  const points = prices.map((p, i) => {
    // Sjekk om noen grid-ordrer er fylt
    for (let j = 0; j < orders.length; j++) {
      const o = orders[j];
      if (o.type === "buy" && !filledBuys.has(j) && p.price <= o.price && cash >= o.coins * o.price) {
        cash -= o.coins * o.price;
        coins += o.coins;
        filledBuys.add(j);
        totalTrades++;
      }
      if (o.type === "sell" && !filledSells.has(j) && p.price >= o.price && coins >= o.coins) {
        cash += o.coins * o.price;
        coins -= o.coins;
        filledSells.add(j);
        totalTrades++;
      }
    }
    // Reset fylt kjøp hvis prisen stiger over order (mulighet for ny kjøp)
    if (i > 0 && p.price > prices[i-1].price) {
      for (const j of filledBuys) {
        if (p.price > orders[j].price * 1.02) filledBuys.delete(j);
      }
    }
    // Reset fylt salg hvis prisen faller under order
    if (i > 0 && p.price < prices[i-1].price) {
      for (const j of filledSells) {
        if (p.price < orders[j].price * 0.98) filledSells.delete(j);
      }
    }

    const portfolioValue = cash + coins * p.price;
    if (portfolioValue > peak) peak = portfolioValue;
    const dd = (peak - portfolioValue) / peak;
    if (dd > maxDD) maxDD = dd;
    if (i > 0) {
      const prevVal = cash + coins * prices[i-1].price;
      if (portfolioValue > prevVal) winDays++;
    }
    return { date: p.date, value: Math.round(portfolioValue), price: Math.round(p.price) };
  });

  const finalValue = cash + coins * prices[prices.length - 1].price;
  return {
    points,
    finalValue: Math.round(finalValue),
    totalReturn: ((finalValue - investment) / investment) * 100,
    maxDrawdown: maxDD * 100,
    winDays,
    totalDays: prices.length - 1,
    trades: totalTrades,
  };
}

function emptyResult(investment: number): StrategyResult {
  return { points: [], finalValue: investment, totalReturn: 0, maxDrawdown: 0, winDays: 0, totalDays: 0, trades: 0 };
}

// ─── Fetch historiske priser ──────────────────────────────────────────────────

async function fetchHistoricalPrices(coin: Coin, days: Period): Promise<PricePoint[]> {
  // Use our API proxy instead of calling CoinGecko directly
  const response = await fetch(`/api/market/chart?coin=${coin}&days=${days}&currency=nok`, {
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.ok || !result.data?.prices) {
    throw new Error('Invalid response format');
  }
  
  return result.data.prices.map((p: { timestamp: number; price: number; date: string }) => ({
    timestamp: p.timestamp,
    price: p.price,
    date: p.date,
  }));
}

// ─── Formatering ──────────────────────────────────────────────────────────────

const NOK = (v: number) => new Intl.NumberFormat("no-NO", { maximumFractionDigits: 0 }).format(v) + " kr";
const PCT = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 shadow-2xl text-xs min-w-[160px]">
      <div className="text-slate-400 font-medium mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4 items-center mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-300">{p.name}</span>
          </span>
          <span className="font-bold text-white">{NOK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Metrikk-kort ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, positive }: {
  label: string; value: string; sub?: string; positive?: boolean;
}) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
      <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-black ${positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-red-400"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Strategi-knapp ───────────────────────────────────────────────────────────

function StrategyToggle({ strategy, active, result, investment, onClick }: {
  strategy: typeof STRATEGIES[number];
  active: boolean;
  result?: StrategyResult;
  investment: number;
  onClick: () => void;
}) {
  const ret = result?.totalReturn ?? 0;
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${
        active
          ? "border-opacity-100 bg-opacity-20"
          : "border-slate-700 bg-transparent hover:border-slate-600"
      }`}
      style={active ? { borderColor: strategy.color, backgroundColor: strategy.color + "18" } : {}}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-300">{strategy.label}</span>
        {result && (
          <span className={`text-xs font-black ${ret >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {PCT(ret)}
          </span>
        )}
      </div>
      <div className="text-xs text-slate-500">{strategy.shortDesc}</div>
    </button>
  );
}

// ─── Hoved-komponent ──────────────────────────────────────────────────────────

export default function BacktestDemoWidget() {
  const locale = useLocale();
  const [coin, setCoin] = useState<Coin>("bitcoin");
  const [period, setPeriod] = useState<Period>(90);
  const [investment, setInvestment] = useState(50000);
  const [activeStrategies, setActiveStrategies] = useState<Set<Strategy>>(new Set(["hodl", "dca", "grid"]));
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCoinPicker, setShowCoinPicker] = useState(false);

  const selectedCoin = COINS.find(c => c.id === coin)!;

  const runBacktest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const priceData = await fetchHistoricalPrices(coin, period);
      setPrices(priceData);
      const hodl = runHODL(priceData, investment);
      const dca = runDCA(priceData, investment);
      const grid = runGrid(priceData, investment);
      const priceChange = priceData.length >= 2
        ? ((priceData[priceData.length - 1].price - priceData[0].price) / priceData[0].price) * 100
        : 0;
      setResults({ hodl, dca, grid, priceChange });
    } catch {
      setError("Kunne ikke hente markedsdata — prøv igjen.");
    } finally {
      setLoading(false);
    }
  }, [coin, period, investment]);

  // Kjør ved mount og ved param-endring
  useEffect(() => {
    runBacktest();
  }, [coin, period]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-kalkuler ved investment-endring (ingen ny fetch nødvendig)
  useEffect(() => {
    if (prices.length === 0) return;
    const hodl = runHODL(prices, investment);
    const dca = runDCA(prices, investment);
    const grid = runGrid(prices, investment);
    const priceChange = prices.length >= 2
      ? ((prices[prices.length - 1].price - prices[0].price) / prices[0].price) * 100
      : 0;
    setResults({ hodl, dca, grid, priceChange });
  }, [investment, prices]);

  // Bygg chartdata: merge alle aktive strategier
  const chartData = results
    ? results.hodl.points.map((p, i) => ({
        date: p.date,
        ...(activeStrategies.has("hodl") ? { "Kjøp & Hold": results.hodl.points[i]?.value } : {}),
        ...(activeStrategies.has("dca") ? { "DCA Ukentlig": results.dca.points[i]?.value } : {}),
        ...(activeStrategies.has("grid") ? { "Grid Trading": results.grid.points[i]?.value } : {}),
      }))
    : [];

  const toggleStrategy = (s: Strategy) => {
    setActiveStrategies(prev => {
      const next = new Set(prev);
      if (next.has(s)) { if (next.size > 1) next.delete(s); }
      else next.add(s);
      return next;
    });
  };

  const bestStrategy = results
    ? (["hodl", "dca", "grid"] as Strategy[]).reduce((best, s) =>
        results[s].totalReturn > results[best].totalReturn ? s : best, "hodl" as Strategy)
    : null;

  return (
    <section className="py-20 px-4 bg-[#0A0B0D] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-bold mb-5">
            <BarChart3 className="w-4 h-4" />
            Historisk backtest — reelle priser
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Slik hadde du gjort det.
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Faktiske markedsdata. Tre strategier. Du bestemmer beløp og periode.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* ── Venstre kolonne: kontroller ── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Coin-velger */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Krypto</div>
              <div className="relative">
                <button
                  onClick={() => setShowCoinPicker(p => !p)}
                  className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                      style={{ background: selectedCoin.color + "22", color: selectedCoin.color }}>
                      {selectedCoin.symbol.slice(0, 2)}
                    </span>
                    {selectedCoin.label}
                    <span className="text-slate-400 text-sm font-normal">{selectedCoin.symbol}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {showCoinPicker && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-20 shadow-2xl">
                    {COINS.map(c => (
                      <button key={c.id} onClick={() => { setCoin(c.id); setShowCoinPicker(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-700 transition-colors ${c.id === coin ? "text-white font-bold" : "text-slate-300"}`}>
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                          style={{ background: c.color + "22", color: c.color }}>
                          {c.symbol.slice(0, 2)}
                        </span>
                        <span>{c.label}</span>
                        <span className="text-slate-500">{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Periode */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tidsperiode</div>
              <div className="grid grid-cols-4 gap-2">
                {PERIODS.map(p => (
                  <button key={p.days} onClick={() => setPeriod(p.days)}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      period === p.days
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Investering */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Investering</div>
              <div className="text-3xl font-black text-white mb-4">
                {new Intl.NumberFormat("no-NO").format(investment)}
                <span className="text-lg text-slate-400 ml-1">kr</span>
              </div>
              <input type="range" min={10000} max={500000} step={5000} value={investment}
                onChange={e => setInvestment(Number(e.target.value))}
                aria-label="Investering i NOK"
                className="w-full h-2 rounded-full bg-slate-700 appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer" />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>10k</span><span>500k</span>
              </div>
            </div>

            {/* Strategi-velger */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Strategier</div>
              <div className="space-y-2">
                {STRATEGIES.map(s => (
                  <StrategyToggle key={s.id} strategy={s}
                    active={activeStrategies.has(s.id)}
                    result={results?.[s.id]}
                    investment={investment}
                    onClick={() => toggleStrategy(s.id)} />
                ))}
              </div>
            </div>

            {/* Refresh */}
            <button onClick={runBacktest} disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? "Henter data..." : "Oppdater"}
            </button>
          </div>

          {/* ── Høyre kolonne: chart + metrics ── */}
          <div className="lg:col-span-8 space-y-4">

            {/* Pris-info banner */}
            {results && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-white">{selectedCoin.label}</div>
                  <div className="text-xs text-slate-400">{period} dager</div>
                </div>
                <div className={`flex items-center gap-1.5 text-sm font-bold ${results.priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {results.priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {PCT(results.priceChange)} prisendring
                </div>
              </div>
            )}

            {/* Hoved-chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-2xl z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-2xl z-10">
                  <div className="text-center">
                    <div className="text-red-400 text-sm mb-3">{error}</div>
                    <button onClick={runBacktest} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                      Prøv igjen
                    </button>
                  </div>
                </div>
              )}
              <ChartWrapper height={300} minHeight={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }}
                      tickLine={false} axisLine={false}
                      interval={Math.floor(chartData.length / 5)} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                      width={45} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={investment} stroke="#334155" strokeDasharray="4 4" label={{ value: "Start", fill: "#64748b", fontSize: 10, position: "right" }} />
                    {activeStrategies.has("hodl") && (
                      <Line type="monotone" dataKey="Kjøp & Hold" stroke="#64748b" strokeWidth={2.5}
                        dot={false} activeDot={{ r: 4, fill: "#64748b" }} />
                    )}
                    {activeStrategies.has("dca") && (
                      <Line type="monotone" dataKey="DCA Ukentlig" stroke="#3b82f6" strokeWidth={2.5}
                        dot={false} activeDot={{ r: 4, fill: "#3b82f6" }} />
                    )}
                    {activeStrategies.has("grid") && (
                      <Line type="monotone" dataKey="Grid Trading" stroke="#22c55e" strokeWidth={2.5}
                        dot={false} activeDot={{ r: 4, fill: "#22c55e" }} />
                    )}
                    <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
                  </LineChart>
                </ChartWrapper>
            </div>

            {/* Metrics grid */}
            {results && (
              <div className="grid grid-cols-3 gap-3">
                {(["hodl", "dca", "grid"] as Strategy[]).filter(s => activeStrategies.has(s)).map(s => {
                  const r = results[s];
                  const strategy = STRATEGIES.find(st => st.id === s)!;
                  const isBest = bestStrategy === s;
                  return (
                    <div key={s}
                      className={`bg-slate-900 border rounded-2xl p-4 space-y-3 ${isBest ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800"}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: strategy.color }} />
                          {strategy.label}
                        </div>
                        {isBest && <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Best</span>}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Sluttverdi</div>
                        <div className="text-lg font-black text-white">{NOK(r.finalValue)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-slate-500">Avkastning</div>
                          <div className={`font-bold ${r.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {PCT(r.totalReturn)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Max drawdown</div>
                          <div className="font-bold text-red-400">-{r.maxDrawdown.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Grønne dager</div>
                          <div className="font-bold text-slate-200">
                            {r.totalDays > 0 ? Math.round((r.winDays / r.totalDays) * 100) : 0}%
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Handler</div>
                          <div className="font-bold text-slate-200">{r.trades}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Disclaimer + CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-start gap-2 text-xs text-slate-500 flex-1">
                <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                Historisk avkastning er ingen garanti for fremtidig avkastning. Krypto er en risikofylt investering.
                Reelle priser fra CoinGecko.
              </div>
              <button
                onClick={() => window.location.href = `/${locale}/kurs`}
                className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors">
                Lær strategiene →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
