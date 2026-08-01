'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Play, Loader2, TrendingUp, TrendingDown, Activity, BarChart3, Shield, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from "@/lib/utils";

interface MonteCarloResult {
  probabilityOfProfit: number;
  probabilityOfRuin: number;
  medianReturn: number;
  meanReturn: number;
  confidenceInterval95: [number, number];
  confidenceInterval99: [number, number];
  maxConsecutiveLosses: number;
}

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
  monteCarlo?: MonteCarloResult;
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
  const [showAdvancedMonteCarlo, setShowAdvancedMonteCarlo] = useState(false);

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
      setShowAdvancedMonteCarlo(false);
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

  const mc = result?.monteCarlo;

  const getRuinVerdict = (ruinPct: number) => {
    if (ruinPct < 5) return { text: 'Trygg — lav risiko for store tap', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
    if (ruinPct <= 15) return { text: 'Moderat — tåler normalt svingninger', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' };
    return { text: 'Risikabel — høy fare for store tap', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  };

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
            {error}
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

            {/* Backtest-metrikker */}
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

            {/* Monte Carlo-resultater */}
            {mc && (
              <div className="px-4 pb-4 space-y-3">
                <div className="border-t border-[#1E2530] pt-3">
                  {/* Infoboks */}
                  <div className="text-[11px] text-slate-400 bg-slate-800/30 border border-[#1E2530] rounded-lg px-3 py-2 mb-3 leading-relaxed">
                    Handlene dine er stokket 10 000 ganger for å simulere ulike utfall — som 10 000 parallelle fremtider. Ikke bare det som skjedde én gang.
                  </div>

                  {/* Samlet vurdering */}
                  {(() => {
                    const v = getRuinVerdict(mc.probabilityOfRuin * 100);
                    return (
                      <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 border", v.bg, v.border)}>
                        <Shield className={cn("w-4 h-4", v.color)} />
                        <span className={cn("text-xs font-semibold", v.color)}>{v.text}</span>
                      </div>
                    );
                  })()}

                  {/* 4 hovedtall */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <MonteCarloCard
                      label="Sjanse for gevinst"
                      value={`${(mc.probabilityOfProfit * 100).toFixed(0)}%`}
                      sub={`${(mc.probabilityOfProfit * 100).toFixed(0)} av 100 ganger går du i pluss`}
                      positive={mc.probabilityOfProfit > 0.5}
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                    <MonteCarloCard
                      label="Risiko for ruin"
                      value={`${(mc.probabilityOfRuin * 100).toFixed(1)}%`}
                      sub="Sjanse for å miste halvparten"
                      positive={mc.probabilityOfRuin < 0.05}
                      icon={<TrendingDown className="w-4 h-4" />}
                    />
                    <MonteCarloCard
                      label="Forventet resultat"
                      value={`${mc.medianReturn > 0 ? '+' : ''}${mc.medianReturn.toFixed(1)}%`}
                      sub={`Mellom ${mc.confidenceInterval95[0].toFixed(0)}% og ${mc.confidenceInterval95[1] > 0 ? '+' : ''}${mc.confidenceInterval95[1].toFixed(0)}%`}
                      positive={mc.medianReturn > 0}
                      icon={<Activity className="w-4 h-4" />}
                    />
                    <MonteCarloCard
                      label="Tap på rad"
                      value={`${mc.maxConsecutiveLosses}`}
                      sub={`Verste tapsrekke — vær forberedt`}
                      positive={mc.maxConsecutiveLosses <= 5}
                      icon={<Zap className="w-4 h-4" />}
                    />
                  </div>

                  {/* Avansert */}
                  <button
                    onClick={() => setShowAdvancedMonteCarlo(!showAdvancedMonteCarlo)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mt-2"
                  >
                    {showAdvancedMonteCarlo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Flere detaljer
                  </button>

                  {showAdvancedMonteCarlo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2"
                    >
                      <AdvancedMetric label="Gjennomsnittlig avkastning" value={`${mc.meanReturn > 0 ? '+' : ''}${mc.meanReturn.toFixed(1)}%`} />
                      <AdvancedMetric label="99% trygghetsintervall" value={`${mc.confidenceInterval99[0].toFixed(0)}% — ${mc.confidenceInterval99[1] > 0 ? '+' : ''}${mc.confidenceInterval99[1].toFixed(0)}%`} />
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className={cn("px-4", mc ? "pb-4 pt-0" : "pb-4")}>
              <p className="text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                {result.disclaimer}
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

function MonteCarloCard({
  label,
  value,
  sub,
  positive,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center p-3 rounded-lg bg-[#0B0F19] border border-[#1E2530]"
    >
      <div className={`flex items-center justify-center gap-1 mb-0.5 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <span className="text-[11px] text-slate-300">{label}</span>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
    </motion.div>
  );
}

function AdvancedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#0B0F19] border border-[#1E2530] px-3 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-slate-300">{value}</div>
    </div>
  );
}

export default BacktestPanel;
