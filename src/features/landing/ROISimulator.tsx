'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Calculator, AlertCircle, BarChart3, Loader2, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GlassCard } from '@/shared/ui/GlassCard';
import { ButtonPremium } from '@/shared/ui/ButtonPremium';
import {
  calculateBacktestWithCache,
  formatBacktestResult,
  type BacktestResult,
  type RiskProfile,
  STRATEGY_CONFIGS,
} from '@/lib/trading/backtestEngine';
import type { LandingBacktestTeaserRef } from './LandingBacktestTeaser';

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000];

const RISK_PROFILES: Array<{
  key: RiskProfile;
  label: string;
  desc: string;
  color: string;
  emoji: string;
}> = [
  { 
    key: 'konservativ', 
    label: 'Konservativ', 
    desc: 'ETH + DCA',
    color: 'bg-green-500',
    emoji: '🛡️'
  },
  { 
    key: 'balansert', 
    label: 'Balansert', 
    desc: 'BTC + SMA 20/50',
    color: 'bg-blue-500',
    emoji: '⚖️'
  },
  { 
    key: 'aggressiv', 
    label: 'Aggressiv', 
    desc: 'BTC + SMA 10/30',
    color: 'bg-purple-500',
    emoji: '🚀'
  },
];

const MONTHS_OPTIONS = [3, 6, 12, 24, 36];

interface ROISimulatorProps {
  backtestRef?: React.RefObject<LandingBacktestTeaserRef | null>;
}

export function ROISimulator({ backtestRef }: ROISimulatorProps) {
  const [amount, setAmount] = useState<number>(100000);
  const [riskIndex, setRiskIndex] = useState<number>(1);
  const [months, setMonths] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [formatted, setFormatted] = useState<ReturnType<typeof formatBacktestResult> | null>(null);
  
  const riskProfile = RISK_PROFILES[riskIndex].key;

  // Beregn backtest når inputs endres
  useEffect(() => {
    let cancelled = false;
    
    async function calculate() {
      setLoading(true);
      setError(null);
      
      try {
        const config = STRATEGY_CONFIGS[riskProfile];
        const backtestResult = await calculateBacktestWithCache({
          initialCapitalNOK: amount,
          strategyId: config.id,
          months,
        });
        
        if (!cancelled) {
          // fromCache indikerer om resultatet kom fra cache
          const cacheResult = backtestResult as { fromCache?: boolean };
          if (cacheResult.fromCache) {
            console.log('[Backtest] Served from cache');
          }
          setResult(backtestResult);
          setFormatted(formatBacktestResult(backtestResult));
        }
      } catch (err) {
        if (!cancelled) {
          setError('Kunne ikke hente historiske data. Prøv igjen.');
          console.error(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    // Debounce for å unngå for mange kall
    const timer = setTimeout(calculate, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amount, riskProfile, months]);

  const formatNOK = (value: number) =>
    new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(value);

  // Generer equity curve for chart
  const equityCurveData = result?.equityCurve.map((point, index) => ({
    month: Math.floor(index / 30),
    value: point.equity * (result.usdNokRate),
  })) || [];

  // Beregn scenario-kurver
  const scenarioCurve = Array.from({ length: months + 1 }, (_, i) => {
    const progress = i / months;
    const startValue = amount;
    
    if (!result) return { month: i, optimistic: startValue, expected: startValue, pessimistic: startValue };
    
    // Bruk eksponensiell vekst basert på faktiske scenarier
    const optimisticValue = startValue * Math.pow(1 + result.scenarios.optimistic / 100, progress);
    const expectedValue = startValue * Math.pow(1 + result.scenarios.expected / 100, progress);
    const pessimisticValue = startValue * Math.pow(1 + result.scenarios.pessimistic / 100, progress);
    
    return {
      month: i,
      optimistic: Math.round(optimisticValue),
      expected: Math.round(expectedValue),
      pessimistic: Math.round(pessimisticValue),
    };
  });

  return (
    <section className="py-16 lg:py-24 bg-kp-bg-primary" id="roi-calculator">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kp-brand/10 text-kp-brand text-sm font-medium mb-4">
            <Calculator className="w-4 h-4" />
            <span>Backtest-kalkulator</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-kp-text-primary mb-4">
            Hva kan du oppnå?{' '}
            <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
              Ekte backtest
            </span>
          </h2>
          <p className="text-kp-text-secondary max-w-xl mx-auto">
            Basert på ekte historiske data fra Binance med realistiske trading fees og slippage.
            Samme motor som brukes i paper trading.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls */}
          <GlassCard variant="elevated" className="h-full">
            <div className="space-y-8">
              {/* Amount Slider */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-kp-text-primary mb-3">
                  <span>Startkapital</span>
                  <span className="text-kp-brand font-bold text-lg">
                    {formatNOK(amount)}
                  </span>
                </label>
                <input
                  type="range"
                  min="10000"
                  max="500000"
                  step="10000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full accent-kp-brand h-2 bg-kp-surface rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between gap-2 mt-3 flex-wrap">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        amount === preset
                          ? 'bg-kp-brand text-white'
                          : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                      }`}
                    >
                      {preset / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Profile */}
              <div>
                <label className="text-sm font-medium text-kp-text-primary mb-3 block">
                  Strategi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RISK_PROFILES.map((profile, i) => (
                    <button
                      key={profile.key}
                      onClick={() => setRiskIndex(i)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all border-2 ${
                        riskIndex === i
                          ? `${profile.color} text-white border-transparent`
                          : 'bg-kp-surface text-kp-text-secondary border-kp-border hover:border-kp-brand/50'
                      }`}
                    >
                      <span className="text-xl block mb-1">{profile.emoji}</span>
                      <span className="block">{profile.label}</span>
                      <span className="text-xs opacity-80 block mt-1">{profile.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Months */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-kp-text-primary mb-3">
                  <span>Periode</span>
                  <span className="text-kp-brand font-bold">{months} måneder</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {MONTHS_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMonths(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        months === m
                          ? 'bg-kp-brand text-white'
                          : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                      }`}
                    >
                      {m} mnd
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Results */}
          <GlassCard variant="elevated" className="h-full">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center py-12"
                >
                  <Loader2 className="w-12 h-12 text-kp-brand animate-spin mb-4" />
                  <p className="text-kp-text-secondary">Kjører backtest mot historiske data...</p>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center py-12 text-center"
                >
                  <AlertCircle className="w-12 h-12 text-kp-error mb-4" />
                  <p className="text-kp-error">{error}</p>
                </motion.div>
              ) : result && formatted ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Scenarios */}
                  <div className="space-y-3">
                    <ScenarioRow
                      label="Optimistisk"
                      value={formatted.scenarios.optimistic}
                      returnPct={formatted.scenarios.optimisticReturn}
                      color="text-green-400"
                      bgColor="bg-green-500/10"
                    />
                    <ScenarioRow
                      label="Forventet"
                      value={formatted.scenarios.expected}
                      returnPct={formatted.scenarios.expectedReturn}
                      color="text-kp-brand"
                      bgColor="bg-kp-brand/10"
                      isMain
                    />
                    <ScenarioRow
                      label="Pessimistisk"
                      value={formatted.scenarios.pessimistic}
                      returnPct={formatted.scenarios.pessimisticReturn}
                      color="text-amber-400"
                      bgColor="bg-amber-500/10"
                    />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-kp-surface-highlight">
                      <p className="text-xs text-kp-text-tertiary">Max drawdown</p>
                      <p className="text-lg font-bold text-kp-error">
                        {formatted.metrics.maxDrawdown}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-kp-surface-highlight">
                      <p className="text-xs text-kp-text-tertiary">Volatilitet</p>
                      <p className="text-lg font-bold text-kp-text-primary">
                        {formatted.metrics.volatility}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-kp-surface-highlight">
                      <p className="text-xs text-kp-text-tertiary">Win rate</p>
                      <p className="text-lg font-bold text-kp-brand">
                        {formatted.metrics.winRate}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-kp-surface-highlight">
                      <p className="text-xs text-kp-text-tertiary">Antall trades</p>
                      <p className="text-lg font-bold text-kp-text-primary">
                        {result.metrics.totalTrades}
                      </p>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scenarioCurve}>
                        <Line
                          type="monotone"
                          dataKey="optimistic"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="expected"
                          stroke="#0052FF"
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="pessimistic"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0A0A0F',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value) => typeof value === 'number' ? formatNOK(value) : value}
                          labelFormatter={(label) => `Måned ${label}`}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Backtest Link */}
                  {backtestRef && (
                    <button
                      onClick={() => {
                        backtestRef.current?.runBacktestWithConfig({
                          amount,
                          riskProfile: RISK_PROFILES[riskIndex].key,
                          months,
                        });
                      }}
                      className="w-full text-sm text-kp-brand hover:text-kp-brand-light underline transition-colors flex items-center justify-center gap-2 py-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Se detaljert historikk for denne strategien ↓
                    </button>
                  )}

                  {/* Disclaimer */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-200 flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Beregnet med historisk backtest.</strong> Tidligere avkastning 
                        er ingen garanti for fremtidig avkastning. Strategien har utført 
                        {result.metrics.totalTrades} trades over {result.equityCurve.length} dager 
                        med {STRATEGY_CONFIGS[riskProfile].feeRate * 100}% trading fees. 
                        Start med paper trading.
                      </span>
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

function ScenarioRow({
  label,
  value,
  returnPct,
  color,
  bgColor,
  isMain = false,
}: {
  label: string;
  value: string;
  returnPct: string;
  color: string;
  bgColor: string;
  isMain?: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center justify-between p-4 rounded-xl ${bgColor} ${
        isMain ? 'ring-2 ring-kp-brand/30' : ''
      }`}
    >
      <div>
        <p className={`text-sm ${isMain ? 'font-semibold text-kp-text-primary' : 'text-kp-text-secondary'}`}>
          {label}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-xl font-bold ${color}`}>{returnPct}</p>
        <p className="text-sm text-kp-text-tertiary">{value}</p>
      </div>
    </motion.div>
  );
}

export default ROISimulator;
