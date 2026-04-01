'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Calculator, AlertCircle, BarChart3, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GlassCard } from '@/shared/ui/GlassCard';
import { ButtonPremium } from '@/shared/ui/ButtonPremium';
import { calculateROI, ROIScenario } from '@/lib/roi/calculator';
import type { HistoricalReturnData } from '@/lib/roi/historical';
import type { LandingBacktestTeaserRef } from './LandingBacktestTeaser';

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000];
const RISK_PROFILES = [
  { 
    key: 'konservativ' as const, 
    label: 'Konservativ', 
    desc: 'ETH + DCA',
    color: 'bg-green-500',
    emoji: '🛡️'
  },
  { 
    key: 'balansert' as const, 
    label: 'Balansert', 
    desc: 'BTC + SMA 20/50',
    color: 'bg-blue-500',
    emoji: '⚖️'
  },
  { 
    key: 'aggressiv' as const, 
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
  const [amount, setAmount] = useState<number>(50000);
  const [riskIndex, setRiskIndex] = useState<number>(1);
  const [months, setMonths] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    scenarios: ROIScenario;
    historical: HistoricalReturnData;
    formatted: {
      principal: string;
      optimistic: string;
      expected: string;
      pessimistic: string;
      returns: {
        optimistic: string;
        expected: string;
        pessimistic: string;
      };
    };
  } | null>(null);
  
  const riskProfile = RISK_PROFILES[riskIndex].key;

  // Beregn ROI når inputs endres
  useEffect(() => {
    let cancelled = false;
    
    async function calculate() {
      setLoading(true);
      setError(null);
      
      try {
        const roi = await calculateROI(amount, riskProfile, months);
        if (!cancelled) {
          setResult(roi);
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
            <span>Avkastningskalkulator</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-kp-text-primary mb-4">
            Hva kan du oppnå?{' '}
            <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
              Realistisk estimat
            </span>
          </h2>
          <p className="text-kp-text-secondary max-w-xl mx-auto">
            Basert på ekte historiske data fra Binance — ikke hardkodede renter.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls */}
          <GlassCard variant="elevated" className="h-full">
            <div className="space-y-8">
              {/* Amount Slider */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-kp-text-primary mb-3">
                  <span>Investeringsbeløp</span>
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
                  Risikoprofil
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
                  <span>Tidshorisont</span>
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
                  <p className="text-kp-text-secondary">Henter historiske data...</p>
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
              ) : result ? (
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
                      value={result.formatted.optimistic}
                      returnPct={result.formatted.returns.optimistic}
                      color="text-green-400"
                      bgColor="bg-green-500/10"
                    />
                    <ScenarioRow
                      label="Forventet"
                      value={result.formatted.expected}
                      returnPct={result.formatted.returns.expected}
                      color="text-kp-brand"
                      bgColor="bg-kp-brand/10"
                      isMain
                    />
                    <ScenarioRow
                      label="Pessimistisk"
                      value={result.formatted.pessimistic}
                      returnPct={result.formatted.returns.pessimistic}
                      color="text-amber-400"
                      bgColor="bg-amber-500/10"
                    />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-kp-surface-highlight">
                      <p className="text-xs text-kp-text-tertiary">Max drawdown</p>
                      <p className="text-lg font-bold text-kp-error">
                        {(result.historical.maxDrawdown * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-kp-surface-highlight">
                      <p className="text-xs text-kp-text-tertiary">Volatilitet</p>
                      <p className="text-lg font-bold text-kp-text-primary">
                        {(result.historical.volatility * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.scenarios.equityCurve}>
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
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => formatNOK(Number(value))}
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
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Basert på {result.historical.dataPoints} dager historiske data 
                        ({RISK_PROFILES[riskIndex].desc}). Ingen garanti for fremtidig avkastning.
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
