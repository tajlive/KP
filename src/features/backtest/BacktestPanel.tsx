'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Play, Loader2, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface BacktestResult {
  trades: unknown[];
  equityCurve: { timestamp: number; equity: number }[];
  metrics: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
    profitFactor: number;
  };
  buyHoldReturn: number;
  disclaimer: string;
}

// Alle 11 tradable symboler (samme liste som Auto-strategi)
const SYMBOLS = [
  { value: 'BTCUSDT', label: '₿ BTC' },
  { value: 'ETHUSDT', label: '⟠ ETH' },
  { value: 'SOLUSDT', label: '◎ SOL' },
  { value: 'BNBUSDT', label: '◈ BNB' },
  { value: 'XRPUSDT', label: '◎ XRP' },
  { value: 'ADAUSDT', label: '⬡ ADA' },
  { value: 'AVAXUSDT', label: '▲ AVAX' },
  { value: 'DOTUSDT', label: '● DOT' },
  { value: 'LINKUSDT', label: '⛓ LINK' },
  { value: 'DOGEUSDT', label: 'Ð DOGE' },
  { value: 'MATICUSDT', label: '◆ MATIC' },
];

const STRATEGIES = [
  { value: 'SMA_CROSSOVER', label: 'Trend (SMA)' },
  { value: 'RSI_MEAN_REVERSION', label: 'RSI Mean Reversion' },
  { value: 'DCA', label: 'DCA (kjøp jevnt)' },
  { value: 'GRID', label: 'Grid (sideveis)' },
  { value: 'MULTI_SIGNAL', label: 'Multi-signal (AI)' },
];

const PERIODS = [
  { days: 30, label: '30 d' },
  { days: 90, label: '90 d' },
  { days: 180, label: '6 mnd' },
  { days: 365, label: '1 år' },
];

export function BacktestPanel() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [strategy, setStrategy] = useState('SMA_CROSSOVER');
  const [capital, setCapital] = useState(50000);
  const [period, setPeriod] = useState(365);
  const [includeMonteCarlo, setIncludeMonteCarlo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktestAction = async () => {
    setLoading(true);
    setError('');
    try {
      const { executeBacktest } = await import('@/lib/actions/backtest');
      const data = await executeBacktest({
        symbol,
        interval: '1d',
        strategy: strategy as never,
        initialCapital: capital,
        period,
        includeMonteCarlo,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest feilet');
    } finally {
      setLoading(false);
    }
  };

  const formatNOK = (value: number) =>
    new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(value);

  const chartData = result?.equityCurve.map((point) => ({
    date: new Date(point.timestamp).toLocaleDateString('no-NO'),
    equity: point.equity,
  })) || [];

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
        Backtest — test strategien mot historiske data
      </div>

      <div className="space-y-4 bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4">
        {/* Kontroller */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
              Symbol
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E2530] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#0052FF]"
            >
              {SYMBOLS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 md:col-span-2">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
              Strategi
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E2530] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#0052FF]"
            >
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
              Kapital: {formatNOK(capital)}
            </label>
            <input
              type="range"
              min="10000"
              max="500000"
              step="10000"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="w-full accent-[#0052FF]"
            />
          </div>
        </div>

        {/* Periode + kjør */}
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriod(p.days)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                period === p.days
                  ? "bg-[#0052FF]/20 text-[#4D8DFF] border border-[#0052FF]/40"
                  : "bg-[#0B0F19] text-slate-500 border border-[#1E2530] hover:border-slate-600",
              )}
            >
              {p.label}
            </button>
          ))}

          <label className="flex items-center gap-1.5 ml-1 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMonteCarlo}
              onChange={(e) => setIncludeMonteCarlo(e.target.checked)}
              className="accent-[#0052FF]"
            />
            Monte Carlo
          </label>

          <button
            onClick={runBacktestAction}
            disabled={loading}
            className={cn(
              "ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              "bg-[#0052FF] text-white hover:bg-[#0066FF] shadow-lg shadow-[#0052FF]/20 active:scale-[0.98]",
              loading && "opacity-50 cursor-not-allowed",
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Kjør backtest
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Resultater */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0A0D12] border border-[#1E2530] rounded-xl overflow-hidden"
          >
            {/* Chart */}
            <div className="p-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0052FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0052FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A0A0F',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: unknown) => formatNOK(Number(value))}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#0052FF"
                    fill="url(#equityGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Metrikker */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 pt-0">
              <MetricCard
                label="Avkastning"
                value={`${result.metrics.totalReturnPct > 0 ? '+' : ''}${result.metrics.totalReturnPct.toFixed(1)}%`}
                positive={result.metrics.totalReturnPct > 0}
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <MetricCard
                label="Max Drawdown"
                value={`${result.metrics.maxDrawdownPct.toFixed(1)}%`}
                positive={false}
                icon={<TrendingDown className="w-4 h-4" />}
              />
              <MetricCard
                label="Sharpe"
                value={result.metrics.sharpeRatio.toFixed(2)}
                positive={result.metrics.sharpeRatio > 1}
                icon={<Activity className="w-4 h-4" />}
              />
              <MetricCard
                label="Win Rate"
                value={`${result.metrics.winRate.toFixed(0)}%`}
                positive={result.metrics.winRate > 50}
                icon={<BarChart3 className="w-4 h-4" />}
              />
            </div>

            {/* Disclaimer */}
            <div className="px-4 pb-4">
              <p className="text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                ⚠️ {result.disclaimer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({
  label,
  value,
  positive,
  icon,
}: {
  label: string;
  value: string;
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center p-3 rounded-lg bg-[#0B0F19] border border-[#1E2530]"
    >
      <div className={`flex items-center justify-center gap-1 mb-1 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <span className="text-[11px] text-slate-500">{label}</span>
    </motion.div>
  );
}

export default BacktestPanel;
