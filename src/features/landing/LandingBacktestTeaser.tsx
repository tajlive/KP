'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { localizedPathname } from '@/middleware/locale-path';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Play, TrendingUp, TrendingDown, BarChart3, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { GlassCard } from '@/shared/ui/GlassCard';
import { ButtonPremium } from '@/shared/ui/ButtonPremium';
import { 
  useBacktestEstimate, 
  useBacktestEquityCurve,
  type RiskProfile as PresetRiskProfile,
  RISK_PROFILE_LABELS 
} from './useBacktestEstimate';

// Mapping fra UI-profil til preset-profil
type UIRiskProfile = 'konservativ' | 'balansert' | 'aggressiv';

const UI_TO_PRESET_MAP: Record<UIRiskProfile, PresetRiskProfile> = {
  konservativ: 'conservative',
  balansert: 'balanced',
  aggressiv: 'aggressive',
};

const PRESET_TO_UI_LABEL: Record<PresetRiskProfile, string> = {
  conservative: 'Konservativ',
  balanced: 'Balansert',
  aggressive: 'Aggressiv',
};

export interface LandingBacktestTeaserRef {
  runBacktestWithConfig: (config: {
    amount: number;
    riskProfile: UIRiskProfile;
    months: number;
  }) => void;
}

export const LandingBacktestTeaser = forwardRef<LandingBacktestTeaserRef, {}>(
  function LandingBacktestTeaser(_, ref) {
    const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('landing.backtestTeaser');
    const [riskProfile, setRiskProfile] = useState<UIRiskProfile>('balansert');
    const [amount, setAmount] = useState<number>(50000);
    const [months, setMonths] = useState<number>(12);
    const [hasRun, setHasRun] = useState(false);

    // Konverter til preset-profil
    const presetProfile = UI_TO_PRESET_MAP[riskProfile];
    
    // Hent estimat fra preaggregerte data
    const estimate = useBacktestEstimate(presetProfile, months, amount);
    const equityCurve = useBacktestEquityCurve(estimate, months);

    useImperativeHandle(ref, () => ({
      runBacktestWithConfig: (config: { amount: number; riskProfile: UIRiskProfile; months: number }) => {
        setAmount(config.amount);
        setRiskProfile(config.riskProfile);
        setMonths(config.months);
        setHasRun(true);
      },
    }));

    const formatNOK = (value: number) =>
      new Intl.NumberFormat('no-NO', {
        style: 'currency',
        currency: 'NOK',
        maximumFractionDigits: 0,
      }).format(value);

    // Bygg chart data for Recharts
    const chartData = equityCurve.map(point => ({
      month: `${t('monthLabel')} ${point.month}`,
      pessimistic: point.pessimistic,
      expected: point.expected,
      optimistic: point.optimistic,
    }));

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
              <span>{t('badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-kp-text-primary mb-4">
              {t('title')}{' '}
              <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
                {t('titleAccent')}
              </span>
            </h2>
            <p className="text-kp-text-secondary max-w-xl mx-auto">
              {t('subtitle')}
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
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {/* Risk Profile */}
                <div className="flex items-center gap-2 min-w-0">
                  <label className="text-sm text-kp-text-secondary shrink-0">{t('strategyLabel')}</label>
                  <div className="flex gap-1 flex-wrap">
                    {(Object.keys(UI_TO_PRESET_MAP) as UIRiskProfile[]).map((profile) => (
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
                <div className="flex items-center gap-2 min-w-0">
                  <label className="text-sm text-kp-text-secondary shrink-0">{t('amountLabel')}</label>
                  <select
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="bg-kp-surface border border-kp-border rounded-lg px-3 py-2 text-sm text-kp-text-primary min-w-0 min-h-[44px]"
                  >
                    <option value={10000}>10 000 kr</option>
                    <option value={25000}>25 000 kr</option>
                    <option value={50000}>50 000 kr</option>
                    <option value={100000}>100 000 kr</option>
                  </select>
                </div>

                {/* Months */}
                <div className="flex items-center gap-2 min-w-0">
                  <label className="text-sm text-kp-text-secondary shrink-0">{t('periodLabel')}</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="bg-kp-surface border border-kp-border rounded-lg px-3 py-2 text-sm text-kp-text-primary min-w-0 min-h-[44px]"
                  >
                    <option value={3}>3 måneder</option>
                    <option value={6}>6 måneder</option>
                    <option value={12}>12 måneder</option>
                    <option value={24}>24 måneder</option>
                    <option value={36}>36 måneder</option>
                  </select>
                </div>

                <ButtonPremium
                  size="sm"
                  onClick={() => setHasRun(true)}
                  icon={<Play className="w-4 h-4" />}
                  className="ml-auto"
                >
                  {t('runButton')}
                </ButtonPremium>
              </div>
            </GlassCard>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {hasRun && estimate && (
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
                          <BarChart3 className="w-5 h-5 inline mr-1" /> {t('simulatedEstimate', { months })}
                        </h3>
                        <p className="text-sm text-kp-text-secondary">
                          {t('profileLabel')} {PRESET_TO_UI_LABEL[presetProfile]} • {estimate.preset.strategyLabel} • {estimate.preset.asset}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-kp-text-tertiary">{t('volatilityLabel')}</p>
                        <p className="text-lg font-bold text-kp-text-primary">
                          {estimate.formatted.volatility}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scenarios */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-kp-border">
                    {/* Pessimistisk */}
                    <div className="text-center p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-sm text-amber-400 mb-1">{t('pessimistic')}</p>
                      <p className="text-2xl font-bold text-amber-300">
                        {estimate.formatted.pessimisticReturn}
                      </p>
                      <p className="text-sm text-amber-400/80">
                        {estimate.formatted.pessimistic}
                      </p>
                    </div>

                    {/* Forventet */}
                    <div className="text-center p-4 rounded-xl bg-kp-brand/10 border border-kp-brand/30 ring-2 ring-kp-brand/20">
                      <p className="text-sm text-kp-brand mb-1">{t('expected')}</p>
                      <p className="text-3xl font-bold text-kp-brand-light">
                        {estimate.formatted.expectedReturn}
                      </p>
                      <p className="text-sm text-kp-brand/80">
                        {estimate.formatted.expected}
                      </p>
                    </div>

                    {/* Optimistisk */}
                    <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-green-400 mb-1">{t('optimistic')}</p>
                      <p className="text-2xl font-bold text-green-300">
                        {estimate.formatted.optimisticReturn}
                      </p>
                      <p className="text-sm text-green-400/80">
                        {estimate.formatted.optimistic}
                      </p>
                    </div>
                  </div>

                  {/* Chart */}
                  {chartData.length > 0 && (
                    <div className="p-6 h-72 border-b border-kp-border">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="month" hide />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0A0A0F',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                            }}
                            formatter={(value) => [formatNOK(Number(value)), t('tooltipValue')]}
                            labelFormatter={() => ''}
                          />
                          <Line
                            type="monotone"
                            dataKey="pessimistic"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                            name={t('pessimistic')}
                          />
                          <Line
                            type="monotone"
                            dataKey="expected"
                            stroke="#0052FF"
                            strokeWidth={3}
                            dot={false}
                            name={t('expected')}
                          />
                          <Line
                            type="monotone"
                            dataKey="optimistic"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            name={t('optimistic')}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 p-6 border-b border-kp-border">
                    <MetricCard
                      label={`${t('startAmount')} (${t('tooltipValue')})`}
                      value={estimate.formatted.invested}
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                    <MetricCard
                      label={`${t('maxDrawdown')} (${t('tooltipValue')})`}
                      value={estimate.formatted.maxDrawdown}
                      negative
                      icon={<TrendingDown className="w-4 h-4" />}
                    />
                  </div>

                  {/* Disclaimer */}
                  <div className="p-6">
                    <div className="flex items-start gap-3 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-3">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p>
                          {t('disclaimer', { strategy: estimate.preset.strategyLabel })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    <ButtonPremium
                      onClick={() => router.push(localizedPathname(locale, '/signup'))}
                      icon={<ArrowRight className="w-4 h-4" />}
                      iconPosition="right"
                      glow
                      className="w-full"
                    >
                      {t('cta')}
                    </ButtonPremium>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!hasRun && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-12"
            >
              <BarChart3 className="w-16 h-16 text-kp-text-tertiary mx-auto mb-4" />
              <p className="text-kp-text-secondary text-lg">
                {t('emptyStateTitle')}
              </p>
              <p className="text-sm text-kp-text-tertiary mt-2">
                {t('emptyStateSubtitle')}
              </p>
            </motion.div>
          )}
        </div>
      </section>
    );
  }
);

// Metric card component
function MetricCard({
  label,
  value,
  negative = false,
  icon,
}: {
  label: string;
  value: string;
  negative?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="text-center p-4 rounded-lg bg-kp-surface-highlight">
      <div className={`flex items-center justify-center gap-1 mb-1 ${negative ? 'text-kp-error' : 'text-kp-success'}`}>
        {icon}
        <span className="text-xl font-bold">{value}</span>
      </div>
      <span className="text-xs text-kp-text-tertiary">{label}</span>
    </div>
  );
}

export default LandingBacktestTeaser;
