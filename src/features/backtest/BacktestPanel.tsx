
'use client';

import { useState } from 'react';
import type { StrategyType } from '@/lib/backtest/engine';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Play, Loader2, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

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

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const STRATEGIES = [
  { value: 'SMA_CROSSOVER', label: 'SMA Crossover' },
  { value: 'RSI_MEAN_REVERSION', label: 'RSI Mean Reversion' },
];
const PERIODS = [
  { days: 30, label: '30 dager' },
  { days: 90, label: '90 dager' },
  { days: 365, label: '1 år' },
];

export function BacktestPanel() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [strategy, setStrategy] = useState<StrategyType>('SMA_CROSSOVER');
  const [capital, setCapital] = useState(50000);
  const [period, setPeriod] = useState(365);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktestAction = async () => {
    setLoading(true);
    try {
      const { executeBacktest } = await import('@/lib/actions/backtest');
      const data = await executeBacktest({
        symbol,
        interval: '1d',
        strategy,
        initialCapital: capital,
        period,
      });
      setResult(data);
    } catch (error) {
      console.error(error);
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
    <section className="py-8">
      <Card variant="glass" glassVariant="elevated" padding="md" className="overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-kp-border">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-kp-brand" />
            <h2 className="text-xl font-bold text-kp-text-primary">Backtest</h2>
          </div>
          
          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-kp-text-secondary mb-1 block">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-kp-surface border border-kp-border rounded-lg px-3 py-2 text-sm"
              >
                {SYMBOLS.map((s) => (
                  <option key={s} value={s}>{s.replace('USDT', '')}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-kp-text-secondary mb-1 block">Strategi</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyType)}
                className="w-full bg-kp-surface border border-kp-border rounded-lg px-3 py-2 text-sm"
              >
                {STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="text-xs text-kp-text-secondary mb-1 block">
                Kapital: {formatNOK(capital)}
              </label>
              <input
                type="range"
                min="10000"
                max="500000"
                step="10000"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full accent-kp-brand"
              />
            </div>
          </div>
          
          {/* Periods */}
          <div className="flex gap-2 mt-4">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === p.days
                    ? 'bg-kp-brand text-white'
                    : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                }`}
              >
                {p.label}
              </button>
            ))}
            <Button
              size="sm"
              onClick={runBacktestAction}
              disabled={loading}
              icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              className="ml-auto"
            >
              Kjør backtest
            </Button>
          </div>
        </div>
        
        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-kp-border"
            >
              {/* Chart */}
              <div className="p-6 h-64">
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
                       
                      formatter={(value: any) => formatNOK(Number(value))}
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
              
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 pt-0">
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
              <div className="px-6 pb-6">
                <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                  ⚠️ {result.disclaimer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </section>
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
      className="text-center p-4 rounded-lg bg-kp-surface-highlight"
    >
      <div className={`flex items-center justify-center gap-1 mb-1 ${positive ? 'text-kp-success' : 'text-kp-error'}`}>
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <span className="text-xs text-kp-text-tertiary">{label}</span>
    </motion.div>
  );
}

export default BacktestPanel;
