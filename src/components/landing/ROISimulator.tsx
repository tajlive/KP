'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calculator, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ButtonPremium } from '@/components/ui/ButtonPremium';

interface ROISimulatorProps {
  className?: string;
}

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];
const MONTHLY_RATES = [0.5, 1, 2, 3, 5, 8, 10]; // Monthly %

export function ROISimulator({ className = '' }: ROISimulatorProps) {
  const [amount, setAmount] = useState<number>(10000);
  const [monthlyRate, setMonthlyRate] = useState<number>(2);
  const [months, setMonths] = useState<number>(12);
  const [showCompound, setShowCompound] = useState<boolean>(true);

  const results = useMemo(() => {
    const monthlyMultiplier = 1 + monthlyRate / 100;
    
    if (showCompound) {
      // Compound interest: A = P * (1 + r)^n
      const finalAmount = amount * Math.pow(monthlyMultiplier, months);
      const totalProfit = finalAmount - amount;
      return {
        finalAmount,
        totalProfit,
        totalReturn: (totalProfit / amount) * 100,
      };
    } else {
      // Simple interest: A = P * (1 + r * n)
      const totalProfit = amount * (monthlyRate / 100) * months;
      const finalAmount = amount + totalProfit;
      return {
        finalAmount,
        totalProfit,
        totalReturn: (totalProfit / amount) * 100,
      };
    }
  }, [amount, monthlyRate, months, showCompound]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <section className={`py-16 lg:py-24 bg-kp-bg-primary ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-kp-text-secondary max-w-2xl mx-auto"
          >
            Juster beløp, avkastning og tid for å se potensielle resultater. 
            Inkluderer renters rente-effekt.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard variant="elevated" className="h-full">
              <div className="space-y-8">
                {/* Amount Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-kp-text-primary mb-3">
                    Startbeløp
                    <span className="text-kp-brand font-bold">{formatCurrency(amount)}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setAmount(preset)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          amount === preset
                            ? 'bg-kp-brand text-white'
                            : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                        }`}
                      >
                        {preset >= 1000 ? `${preset / 1000}k` : preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full mt-4 accent-kp-brand"
                  />
                </div>

                {/* Monthly Rate Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-kp-text-primary mb-3">
                    Månedlig avkastning
                    <span className="text-kp-success font-bold">{monthlyRate}%</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {MONTHLY_RATES.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setMonthlyRate(rate)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          monthlyRate === rate
                            ? 'bg-kp-success text-white'
                            : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(Number(e.target.value))}
                    className="w-full mt-4 accent-kp-success"
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-kp-text-primary mb-3">
                    Tidshorisont
                    <span className="text-kp-brand font-bold">{months} måneder</span>
                  </label>
                  <div className="flex gap-2 mb-4">
                    {[6, 12, 24, 36].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMonths(m)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${
                          months === m
                            ? 'bg-kp-brand text-white'
                            : 'bg-kp-surface text-kp-text-secondary hover:bg-kp-surface-highlight'
                        }`}
                      >
                        {m >= 12 ? `${m / 12} år` : `${m} mnd`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full accent-kp-brand"
                  />
                </div>

                {/* Compound Toggle */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-kp-surface/50">
                  <button
                    onClick={() => setShowCompound(!showCompound)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      showCompound ? 'bg-kp-brand' : 'bg-kp-border'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        showCompound ? 'translate-x-6' : ''
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-kp-text-primary">
                      Renteres rente
                    </p>
                    <p className="text-xs text-kp-text-tertiary">
                      Reinvestert avkastning gir eksponentiell vekst
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard variant="elevated" className="h-full flex flex-col justify-center">
              <div className="space-y-6">
                {/* Final Amount */}
                <div className="text-center p-6 rounded-xl bg-gradient-to-br from-kp-brand/10 to-kp-brand/5 border border-kp-brand/20">
                  <p className="text-sm text-kp-text-secondary mb-2">
                    Din portefølje etter {months} måneder
                  </p>
                  <p className="text-4xl sm:text-5xl font-bold text-kp-text-primary mb-2">
                    {formatCurrency(results.finalAmount)}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-kp-success">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-lg font-semibold">
                      +{formatCurrency(results.totalProfit)}
                    </span>
                    <span className="text-sm opacity-80">
                      ({results.totalReturn.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 border-b border-kp-border">
                    <span className="text-kp-text-secondary">Startbeløp</span>
                    <span className="font-medium text-kp-text-primary">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-kp-border">
                    <span className="text-kp-text-secondary">Total avkastning</span>
                    <span className="font-medium text-kp-success">
                      +{formatCurrency(results.totalProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-kp-border">
                    <span className="text-kp-text-secondary">Årlig avkastning</span>
                    <span className="font-medium text-kp-brand">
                      ~{((Math.pow(1 + monthlyRate / 100, 12) - 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-kp-text-secondary">Månedlig avkastning</span>
                    <span className="font-medium text-kp-text-primary">{monthlyRate}%</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-200">
                    Dette er en simulering basert på historisk data. 
                    Faktisk avkastning kan variere. Start alltid med lekepenger 
                    for å teste strategier.
                  </p>
                </div>

                {/* CTA */}
                <ButtonPremium
                  size="lg"
                  glow
                  className="w-full"
                  icon={<TrendingUp className="w-5 h-5" />}
                >
                  Prøv med lekepenger nå
                </ButtonPremium>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default ROISimulator;
