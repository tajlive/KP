'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Play, Loader2, TrendingUp, TrendingDown, BarChart3, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ButtonPremium } from '@/components/ui/ButtonPremium';

interface BacktestResult {
  trades: unknown[];
  equityCurve: { timestamp: number; equity: number }[];
  metrics: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
  };
  buyHoldReturn: number;
  disclaimer: string;
}

const SYMBOLS = [
  { value: 'BTCUSDT', label: 'BTC' },
  { value: 'ETHUSDT', label: 'ETH' },
];

const PERIODS = [
  { days: 90, label: '90 dager' },
  { days: 365, label: '1 år' },
];

export function LandingBacktestTeaser() {
  const router = useRouter();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [period, setPeriod] = useState(365);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          interval: '1d',
          strategy: 'SMA_CROSSOVER',
          initialCapital: 100000,
          period,
        }),
      });

      if (!response.ok) throw new Error('Backtest failed');

      const data = await response.json();
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

  const chartData =
    result?.equityCurve.map((point) => ({
      date: new Date(point.timestamp).toLocaleDateString('no-NO', {
        month: 'short',
        day: 'numeric',
      }),
      equity: point.equity,
    })) || [];

  return (
    <section className="py-16 lg:py-24 bg-kp-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kp-brand/10 text-kp-brand text-sm font-medium mb-4">
            <BarChart3 className="w-4 h-4" />
            <span>Historisk test</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-kp-text-primary mb-4">
            Se hva AI-strategien har gjort{' '}
            <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
              historisk
            </span>
          </h2>
          <p className="text-kp-text-secondary max-w-xl mx-auto">
            Test vår SMA Crossover-strategi på historiske data. Ingen registrering nødvendig.
          </p>
        </motion.div>

        {/* Backtest Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard variant="elevated" className="overflow-hidden">
            {/* Controls */}
            <div className="p-6 border-b border-kp-border">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-kp-text-secondary">Symbol:</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="bg-kp-surface border border-kp-border rounded-lg px-3 py-2 text-sm text-kp-text-primary"
                  >
                    {SYMBOLS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-kp-text-secondary">Periode:</label>
                  <div className="flex gap-1">
                    {PERIODS.map((p) => (
                      <button
                        key={p.days}
                        onClick={() => setPeriod(p.days)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          period === p.days
                            ? 'bg-kp-brand text-white'
                            : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <ButtonPremium
                  size="sm"
                  onClick={runBacktest}
                  disabled={loading}
                  icon={
                    loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )
                  }
                  className="ml-auto"
                >
                  Kjør gratis test
                </ButtonPremium>
              </div>
            </div>

            {/* Results */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {/* Chart */}
                  <div className="p-6 h-64 border-b border-kp-border">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="teaserGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
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
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => formatNOK(Number(value))}
                        />
                        <Area
                          type="monotone"
                          dataKey="equity"
                          stroke="#0052FF"
                          fill="url(#teaserGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
                    <MetricBox
                      label="Avkastning"
                      value={`${result.metrics.totalReturnPct > 0 ? '+' : ''}${result.metrics.totalReturnPct.toFixed(1)}%`}
                      positive={result.metrics.totalReturnPct > 0}
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                    <MetricBox
                      label="Max Drawdown"
                      value={`${result.metrics.maxDrawdownPct.toFixed(1)}%`}
                      positive={false}
                      icon={<TrendingDown className="w-4 h-4" />}
                    />
                    <MetricBox
                      label="Win Rate"
                      value={`${result.metrics.winRate.toFixed(0)}%`}
                      positive={result.metrics.winRate > 50}
                      icon={<BarChart3 className="w-4 h-4" />}
                    />
                    <MetricBox
                      label="Antall trades"
                      value={result.metrics.totalTrades.toString()}
                      positive={true}
                      isNeutral
                    />
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    <GlassCard
                      variant="default"
                      className="bg-gradient-to-r from-kp-brand/10 to-kp-brand/5 border-kp-brand/20"
                    >
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
                        <div>
                          <p className="text-kp-text-primary font-medium">
                            Prøv med dine egne innstillinger
                          </p>
                          <p className="text-sm text-kp-text-secondary">
                            Velg strategi, juster kapital, test flere symboler
                          </p>
                        </div>
                        <ButtonPremium
                          onClick={() => router.push('/no/signup')}
                          icon={<ArrowRight className="w-4 h-4" />}
                          iconPosition="right"
                        >
                          Registrer deg gratis
                        </ButtonPremium>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Disclaimer */}
                  <div className="px-6 pb-6">
                    <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                      ⚠️ Historisk avkastning. Ingen garanti for fremtidig avkastning.
                      Paper trading = virtuelle penger.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state hint */}
            {!result && !loading && (
              <div className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-kp-text-tertiary mx-auto mb-4" />
                <p className="text-kp-text-secondary">
                  Klikk "Kjør gratis test" for å se historisk ytelse
                </p>
                <p className="text-xs text-kp-text-tertiary mt-2">
                  Basert på ekte Binance-data • Ingen registrering nødvendig
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

function MetricBox({
  label,
  value,
  positive,
  icon,
  isNeutral = false,
}: {
  label: string;
  value: string;
  positive: boolean;
  icon?: React.ReactNode;
  isNeutral?: boolean;
}) {
  const colorClass = isNeutral
    ? 'text-kp-text-primary'
    : positive
      ? 'text-kp-success'
      : 'text-kp-error';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center p-4 rounded-lg bg-kp-surface-highlight"
    >
      <div className={`flex items-center justify-center gap-1 mb-1 ${colorClass}`}>
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <span className="text-xs text-kp-text-tertiary">{label}</span>
    </motion.div>
  );
}

export default LandingBacktestTeaser;
