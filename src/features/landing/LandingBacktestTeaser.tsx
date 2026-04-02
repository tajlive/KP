
'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Play, Loader2, TrendingUp, TrendingDown, BarChart3, ArrowRight, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/shared/ui/GlassCard';
import { ButtonPremium } from '@/shared/ui/ButtonPremium';

interface BacktestResult {
  trades: Trade[];
  equityCurve: { timestamp: number; equity: number }[];
  metrics: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
  };
  buyHoldReturn: number;
  enhancedMetrics: {
    buyHoldReturnPct: number;
    alpha: number;
    startValueNOK: number;
    endValueNOK: number;
  };
  strategyName: string;
  symbol: string;
  period: number;
  disclaimer: string;
}

interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: 'LONG';
  size: number;
  pnl: number;
  pnlPct: number;
  fee: number;
}

type RiskProfile = 'konservativ' | 'balansert' | 'aggressiv';

interface StrategyConfig {
  symbol: string;
  smaFast: number;
  smaSlow: number;
  maxPositionPct: number;
  name: string;
}

const STRATEGY_MAP: Record<RiskProfile, StrategyConfig> = {
  konservativ: {
    symbol: 'ETHUSDT',
    smaFast: 30,
    smaSlow: 100,
    maxPositionPct: 0.5,
    name: 'ETH SMA 30/100',
  },
  balansert: {
    symbol: 'BTCUSDT',
    smaFast: 20,
    smaSlow: 50,
    maxPositionPct: 0.75,
    name: 'BTC SMA 20/50',
  },
  aggressiv: {
    symbol: 'BTCUSDT',
    smaFast: 10,
    smaSlow: 30,
    maxPositionPct: 1.0,
    name: 'BTC SMA 10/30',
  },
};

const MONTHS_TO_DAYS: Record<number, number> = {
  3: 90,
  6: 180,
  12: 365,
  24: 730,
  36: 1095,
};

export interface LandingBacktestTeaserRef {
  runBacktestWithConfig: (config: {
    amount: number;
    riskProfile: RiskProfile;
    months: number;
  }) => void;
}

export const LandingBacktestTeaser = forwardRef<LandingBacktestTeaserRef, {}>(
  function LandingBacktestTeaser(_, ref) {
    const router = useRouter();
    const [riskProfile, setRiskProfile] = useState<RiskProfile>('balansert');
    const [amount, setAmount] = useState<number>(50000);
    const [months, setMonths] = useState<number>(12);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BacktestResult | null>(null);

    useImperativeHandle(ref, () => ({
      runBacktestWithConfig: (config: { amount: number; riskProfile: RiskProfile; months: number }) => {
        setAmount(config.amount);
        setRiskProfile(config.riskProfile);
        setMonths(config.months);
        // Trigger backtest automatically
        handleRunBacktest(config.amount, config.riskProfile, config.months);
      },
    }));

    const handleRunBacktest = async (
      capital: number = amount,
      profile: RiskProfile = riskProfile,
      periodMonths: number = months
    ) => {
      setLoading(true);
      setError(null);
      try {
        const period = MONTHS_TO_DAYS[periodMonths] || 365;
        const config = STRATEGY_MAP[profile];
        
        const response = await fetch('/api/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: config.symbol,
            interval: '1d',
            strategy: 'SMA_CROSSOVER',
            initialCapital: capital / 10.5, // Convert NOK to USD
            period,
            smaFast: config.smaFast,
            smaSlow: config.smaSlow,
            maxPositionPct: config.maxPositionPct,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Backtest failed');
        }

        const data = await response.json();
        setResult(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Kunne ikke hente data. Prøv igjen.');
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

    const formatDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleDateString('no-NO', {
        month: 'short',
        day: 'numeric',
      });
    };

    // Build chart data with both strategy and buy&hold curves
    const chartData = result?.equityCurve.map((point, index) => {
      const initialEquity = result.equityCurve[0]?.equity || 1;
      const buyHoldInitial = result.trades[0]?.entryPrice || 1;
      const currentPrice = result.trades[result.trades.length - 1]?.exitPrice || buyHoldInitial;
      
      // Calculate buy&hold value at this point
      const priceAtIndex = result.equityCurve[index]?.timestamp 
        ? result.equityCurve.find((_, i) => i === index) 
        : null;
      
      return {
        date: formatDate(point.timestamp),
        equity: point.equity * 10.5, // Convert to NOK
        buyHold: initialEquity * 10.5 * (1 + (result.enhancedMetrics.buyHoldReturnPct / 100) * (index / result.equityCurve.length)),
      };
    }) || [];

    const config = STRATEGY_MAP[riskProfile];

    return (
      <section className="py-16 lg:py-24 bg-kp-bg-primary" id="backtest">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
              Se hva strategien faktisk har gjort{' '}
              <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
                historisk
              </span>
            </h2>
            <p className="text-kp-text-secondary max-w-xl mx-auto">
              Test vår SMA Crossover-strategi på ekte markedsdata fra Binance.
              Ingen registrering nødvendig.
            </p>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <GlassCard variant="elevated" className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Risk Profile */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-kp-text-secondary">Strategi:</label>
                  <div className="flex gap-1">
                    {(Object.keys(STRATEGY_MAP) as RiskProfile[]).map((profile) => (
                      <button
                        key={profile}
                        onClick={() => setRiskProfile(profile)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                          riskProfile === profile
                            ? 'bg-kp-brand text-white'
                            : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                        }`}
                      >
                        {profile}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-kp-text-secondary">Beløp:</label>
                  <select
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="bg-kp-surface border border-kp-border rounded-lg px-3 py-2 text-sm text-kp-text-primary"
                  >
                    <option value={10000}>10 000 kr</option>
                    <option value={25000}>25 000 kr</option>
                    <option value={50000}>50 000 kr</option>
                    <option value={100000}>100 000 kr</option>
                  </select>
                </div>

                {/* Months */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-kp-text-secondary">Periode:</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="bg-kp-surface border border-kp-border rounded-lg px-3 py-2 text-sm text-kp-text-primary"
                  >
                    <option value={3}>3 måneder</option>
                    <option value={6}>6 måneder</option>
                    <option value={12}>12 måneder</option>
                    <option value={24}>24 måneder</option>
                  </select>
                </div>

                <ButtonPremium
                  size="sm"
                  onClick={() => handleRunBacktest()}
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
                  Kjør test
                </ButtonPremium>
              </div>
            </GlassCard>
          </motion.div>

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <GlassCard variant="elevated" className="p-4 bg-kp-error/10 border-kp-error/30">
                <div className="flex items-center gap-3 text-kp-error">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <GlassCard variant="elevated" className="overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-kp-border">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-kp-text-primary">
                          📊 Historisk backtest — siste {months} måneder
                        </h3>
                        <p className="text-sm text-kp-text-secondary">
                          Strategi: {result.strategyName} • {result.symbol}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-kp-text-tertiary">Alpha vs Buy&Hold</p>
                        <p className={`text-lg font-bold ${result.enhancedMetrics.alpha >= 0 ? 'text-kp-success' : 'text-kp-error'}`}>
                          {result.enhancedMetrics.alpha >= 0 ? '+' : ''}{result.enhancedMetrics.alpha.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="p-6 h-72 border-b border-kp-border">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="strategyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="buyholdGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6b7280" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
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
                           
                          formatter={(value: any, name: any) => [
                            formatNOK(Number(value)),
                            name === 'equity' ? 'Din strategi' : 'Buy & Hold'
                          ]}
                          labelStyle={{ color: '#9ca3af' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="buyHold"
                          stroke="#6b7280"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fill="url(#buyholdGradient)"
                          name="Buy & Hold"
                        />
                        <Area
                          type="monotone"
                          dataKey="equity"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#strategyGradient)"
                          name="Din strategi"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-kp-border">
                    <AnimatedMetric
                      label="Avkastning"
                      value={result.metrics.totalReturnPct}
                      format="pct"
                      positive={result.metrics.totalReturnPct > 0}
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                    <AnimatedMetric
                      label="Max Drawdown"
                      value={result.metrics.maxDrawdownPct}
                      format="pct"
                      positive={false}
                      icon={<TrendingDown className="w-4 h-4" />}
                    />
                    <AnimatedMetric
                      label="Sharpe"
                      value={result.metrics.sharpeRatio}
                      format="number"
                      positive={result.metrics.sharpeRatio > 1}
                      icon={<BarChart3 className="w-4 h-4" />}
                    />
                    <AnimatedMetric
                      label="Win Rate"
                      value={result.metrics.winRate}
                      format="pct"
                      positive={result.metrics.winRate > 50}
                      icon={<BarChart3 className="w-4 h-4" />}
                    />
                  </div>

                  {/* Value Summary */}
                  <div className="p-6 border-b border-kp-border bg-kp-surface-highlight/50">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="text-center flex-1">
                        <p className="text-sm text-kp-text-tertiary mb-1">Startbeløp</p>
                        <p className="text-xl font-bold text-kp-text-primary">
                          {formatNOK(result.enhancedMetrics.startValueNOK)}
                        </p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-kp-text-tertiary hidden sm:block" />
                      <div className="text-center flex-1">
                        <p className="text-sm text-kp-text-tertiary mb-1">Sluttverdi</p>
                        <motion.p 
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className={`text-2xl font-bold ${result.enhancedMetrics.endValueNOK > result.enhancedMetrics.startValueNOK ? 'text-kp-success' : 'text-kp-error'}`}
                        >
                          {formatNOK(result.enhancedMetrics.endValueNOK)}
                        </motion.p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-sm text-kp-text-tertiary mb-1">Antall handler</p>
                        <p className="text-xl font-bold text-kp-text-primary">
                          {result.metrics.totalTrades}
                        </p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-sm text-kp-text-tertiary mb-1">vs Buy&Hold</p>
                        <p className={`text-xl font-bold ${result.enhancedMetrics.alpha >= 0 ? 'text-kp-success' : 'text-kp-error'}`}>
                          {result.enhancedMetrics.alpha >= 0 ? '+' : ''}{result.enhancedMetrics.alpha.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Negative Result Message */}
                  {result.metrics.totalReturnPct < 0 && (
                    <div className="px-6 pt-4">
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
                        Markedet var utfordrende i denne perioden — prøv en lengre tidshorisont for å se historisk trend.
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="p-6">
                    <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                      ⚠️ {result.disclaimer}. Paper trading = virtuelle penger.
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    <ButtonPremium
                      onClick={() => router.push('/no/signup')}
                      icon={<ArrowRight className="w-4 h-4" />}
                      iconPosition="right"
                      glow
                      className="w-full"
                    >
                      Prøv selv med dine egne innstillinger — gratis
                    </ButtonPremium>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!result && !loading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-12"
            >
              <BarChart3 className="w-16 h-16 text-kp-text-tertiary mx-auto mb-4" />
              <p className="text-kp-text-secondary text-lg">
                Klikk "Kjør test" for å se historisk ytelse
              </p>
              <p className="text-sm text-kp-text-tertiary mt-2">
                Basert på ekte Binance-data • Ingen registrering nødvendig
              </p>
            </motion.div>
          )}
        </div>
      </section>
    );
  }
);

// Animated metric component with count-up effect
function AnimatedMetric({
  label,
  value,
  format,
  positive,
  icon,
}: {
  label: string;
  value: number;
  format: 'pct' | 'number';
  positive: boolean;
  icon: React.ReactNode;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= value) || (increment < 0 && current <= value)) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formattedValue = format === 'pct' 
    ? `${displayValue > 0 ? '+' : ''}${displayValue.toFixed(1)}%`
    : displayValue.toFixed(2);

  const colorClass = positive ? 'text-kp-success' : 'text-kp-error';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center p-4 rounded-lg bg-kp-surface-highlight"
    >
      <div className={`flex items-center justify-center gap-1 mb-1 ${colorClass}`}>
        {icon}
        <span className="text-xl font-bold">{formattedValue}</span>
      </div>
      <span className="text-xs text-kp-text-tertiary">{label}</span>
    </motion.div>
  );
}

export default LandingBacktestTeaser;
