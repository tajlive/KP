'use client';

import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calculator, Info, BarChart3 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import type { LandingBacktestTeaserRef } from './LandingBacktestTeaser';

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000];
const RISK_PROFILES = [
  { label: 'Konservativ', rate: 0.3, color: 'bg-green-500', key: 'konservativ' as const },
  { label: 'Balansert', rate: 0.6, color: 'bg-blue-500', key: 'balansert' as const },
  { label: 'Agressiv', rate: 1.2, color: 'bg-purple-500', key: 'aggressiv' as const },
];

interface ROISimulatorProps {
  backtestRef?: React.RefObject<LandingBacktestTeaserRef | null>;
}

export function ROISimulator({ backtestRef }: ROISimulatorProps) {
  const [amount, setAmount] = useState<number>(50000);
  const [riskIndex, setRiskIndex] = useState<number>(1);
  const [months, setMonths] = useState<number>(12);

  const { rate: monthlyRate, label } = RISK_PROFILES[riskIndex];

  const results = useMemo(() => {
    const monthlyMultiplier = 1 + monthlyRate / 100;
    const finalAmount = amount * Math.pow(monthlyMultiplier, months);
    const totalProfit = finalAmount - amount;
    return {
      finalAmount,
      totalProfit,
      totalReturn: (totalProfit / amount) * 100,
    };
  }, [amount, monthlyRate, months]);

  const formatNOK = (value: number) =>
    new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <section className="py-16 lg:py-24 bg-kp-bg-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kp-brand/10 text-kp-brand text-sm font-medium mb-4"
          >
            <Calculator className="w-4 h-4" />
            <span>Avkastningskalkulator</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-kp-text-primary mb-4"
          >
            Se hva du kan oppnå
          </motion.h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <GlassCard variant="elevated" className="h-full">
            <div className="space-y-8">
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-kp-text-primary mb-3">
                  <span>Investeringsbeløp</span>
                  <span className="text-kp-brand font-bold">{formatNOK(amount)}</span>
                </label>
                <input
                  type="range"
                  min="10000"
                  max="100000"
                  step="5000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full accent-kp-brand"
                />
                <div className="flex justify-between gap-2 mt-3">
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

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-kp-text-primary mb-3">
                  <span>Risikoprofil</span>
                  <span className="text-kp-brand font-bold">{label}</span>
                </label>
                <div className="flex gap-2">
                  {RISK_PROFILES.map((profile, i) => (
                    <button
                      key={profile.label}
                      onClick={() => setRiskIndex(i)}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        riskIndex === i
                          ? `${profile.color} text-white`
                          : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                      }`}
                    >
                      {profile.label}
                      <span className="block text-xs opacity-80">~{profile.rate}%/mnd</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-kp-text-primary mb-3">
                  <span>Tidshorisont</span>
                  <span className="text-kp-brand font-bold">{months} måneder</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="36"
                  step="3"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full accent-kp-brand"
                />
                <div className="flex justify-between mt-2 text-xs text-kp-text-tertiary">
                  <span>3 mnd</span>
                  <span>12 mnd</span>
                  <span>24 mnd</span>
                  <span>36 mnd</span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="elevated" className="h-full flex flex-col justify-center">
            <div className="space-y-6">
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-kp-brand/10 to-kp-brand/5 border border-kp-brand/20">
                <p className="text-sm text-kp-text-secondary mb-2">Din portefølje etter {months} måneder</p>
                <motion.p
                  key={results.finalAmount}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl sm:text-5xl font-bold text-kp-text-primary mb-2"
                >
                  {formatNOK(results.finalAmount)}
                </motion.p>
                <div className="flex items-center justify-center gap-2 text-kp-success">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-lg font-semibold">+{formatNOK(results.totalProfit)}</span>
                  <span className="text-sm opacity-80">({results.totalReturn.toFixed(1)}%)</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-kp-border">
                  <span className="text-kp-text-secondary">Startbeløp</span>
                  <span className="font-medium">{formatNOK(amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-kp-border">
                  <span className="text-kp-text-secondary">Månedlig avkastning</span>
                  <span className="font-medium text-kp-brand">~{monthlyRate}%</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">
                  Basert på historisk paper-trading data. Ingen garanti for fremtidig avkastning.
                  Start alltid med lekepenger.
                </p>
              </div>

              {/* Link to backtest */}
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
                  Se hva denne strategien faktisk har gjort historisk →
                </button>
              )}

              <ButtonPremium size="lg" glow className="w-full" icon={<TrendingUp className="w-5 h-5" />}>
                Prøv med lekepenger
              </ButtonPremium>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

export default ROISimulator;
