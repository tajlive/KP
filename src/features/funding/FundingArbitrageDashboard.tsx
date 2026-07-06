
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, ArrowRightLeft, Shield, Info, ExternalLink } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { identifyCrossExchangeArbitrage, getHistoricalArbitragePerformance, calculateArbitragePosition } from '@/lib/futures/cross-exchange-arb';
import { useLocale, useTranslations } from 'next-intl';

const RISK_PROFILES_NO = [
  { key: 'conservative', label: 'Konservativ', maxAlloc: '5%', color: 'text-green-400', bg: 'bg-green-500/10' },
  { key: 'balanced', label: 'Balansert', maxAlloc: '10%', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'aggressive', label: 'Aggressiv', maxAlloc: '20%', color: 'text-amber-400', bg: 'bg-amber-500/10' },
] as const;

const RISK_PROFILES_EN = [
  { key: 'conservative', label: 'Conservative', maxAlloc: '5%', color: 'text-green-400', bg: 'bg-green-500/10' },
  { key: 'balanced', label: 'Balanced', maxAlloc: '10%', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'aggressive', label: 'Aggressive', maxAlloc: '20%', color: 'text-amber-400', bg: 'bg-amber-500/10' },
] as const;

const RISK_PROFILES = [
  { key: 'conservative', label: 'Konservativ', maxAlloc: '5%', color: 'text-green-400', bg: 'bg-green-500/10' },
  { key: 'balanced', label: 'Balansert', maxAlloc: '10%', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'aggressive', label: 'Aggressiv', maxAlloc: '20%', color: 'text-amber-400', bg: 'bg-amber-500/10' },
] as const;

export default function FundingArbitrageDashboard() {
  const locale = useLocale();
  const t = useTranslations('funding');
  const isEn = locale === 'en';
  const RISK_PROFILES = isEn ? RISK_PROFILES_EN : RISK_PROFILES_NO;
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState(100000);
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'balanced' | 'aggressive'>('conservative');
  const [showDetails, setShowDetails] = useState(false);
  
  const historical = getHistoricalArbitragePerformance();
  const position = calculateArbitragePosition(portfolioValue, riskLevel);

  useEffect(() => {
    async function load() {
      try {
        const arb = await identifyCrossExchangeArbitrage();
        setOpportunities(arb);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatNOK = (val: number) => 
    new Intl.NumberFormat('no-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(val);

  const formatPct = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ⚠️ DISCLAIMER HEADER */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-amber-400 mb-2">{isEn ? 'Important Information about Funding Arbitrage' : 'Viktig Informasjon om Funding Arbitrage'}</h2>
              <ul className="text-amber-200/80 space-y-1 text-sm">
                <li>• <strong>{isEn ? 'Historical numbers, no guarantee' : 'Historiske tall, ingen garanti'}:</strong> {isEn ? 'Historical APY varies (4-15%), can go negative. Past performance does not guarantee future results.' : 'Historisk APY varierer (4-15%), kan gå negativt. Fortidig avkastning garanterer ikke fremtidig resultat.'}</li>
                <li>• <strong>{isEn ? 'No automatic execution' : 'Ingen automatisk utførelse'}:</strong> {isEn ? 'This is only an analysis tool. All trading must be done manually on your own exchange accounts.' : 'Dette er kun et analyseverktøy. All handel må utføres manuelt på dine egne exchange-kontoer.'}</li>
                <li>• <strong>{isEn ? 'Risk' : 'Risiko'}:</strong> {isEn ? 'Exchange failure, basis risk, margin calls, liquidity risk.' : 'Exchange failure, basis risk, margin calls, likviditetsrisiko.'}</li>
                <li>• <strong>{isEn ? 'Complexity' : 'Kompleksitet'}:</strong> {isEn ? 'Requires accounts on multiple exchanges, understanding of derivatives.' : 'Krever kontoer på flere exchanges, forståelse av derivater.'}</li>
                <li>• <strong>{isEn ? 'Regulation' : 'Regulering'}:</strong> {isEn ? 'Check local rules before starting. Not available in all jurisdictions.' : 'Sjekk lokale regler før du starter. Ikke tilgjengelig for alle jurisdiksjoner.'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Historical Performance (Realistic) */}
        {/* DISCLAIMER: All numbers are backtested estimates. Not guaranteed. */}
        <Card variant="glass" glassVariant="elevated" padding="none" className="p-8">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            {t('historicalPerformanceTitle')}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-white/5 rounded-2xl">
              <div className="text-4xl font-black text-emerald-400">{formatPct(historical.avgAnnualReturn)}</div>
              <div className="text-sm text-slate-400 uppercase tracking-wider mt-1">{isEn ? 'Avg APY' : 'Gj.snitt APY'}</div>
              <div className="text-xs text-slate-500">{isEn ? 'Historical estimate' : 'Historisk estimat'}</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-2xl">
              <div className="text-4xl font-black text-rose-400">{formatPct(historical.maxDrawdown)}</div>
              <div className="text-sm text-slate-400 uppercase tracking-wider mt-1">Max Drawdown</div>
              <div className="text-xs text-slate-500">{isEn ? 'Worst month' : 'Verste måned'}</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-2xl">
              <div className="text-4xl font-black text-blue-400">{historical.winRate}%</div>
              <div className="text-sm text-slate-400 uppercase tracking-wider mt-1">Win Rate</div>
              <div className="text-xs text-slate-500">{isEn ? 'Positive months' : 'Positive måneder'}</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-2xl">
              <div className="text-4xl font-black text-amber-400">{formatPct(historical.bestMonth)}</div>
              <div className="text-sm text-slate-400 uppercase tracking-wider mt-1">{isEn ? 'Best Month' : 'Beste Måned'}</div>
              <div className="text-xs text-slate-500">{formatPct(historical.worstMonth)} {isEn ? 'worst' : 'verste'}</div>
            </div>
          </div>
        </Card>

        {/* Position Calculator */}
        <Card variant="glass" glassVariant="elevated" padding="none" className="p-8">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            {isEn ? 'Position Calculator' : 'Posisjonskalkulator'}
          </h2>

          {/* Portfolio Input */}
          <div className="mb-6">
            <label className="text-sm text-slate-400 mb-2 block">{isEn ? 'Portfolio Value (NOK)' : 'Porteføljeverdi (NOK)'}</label>
            <input
              type="range"
              min="10000"
              max="1000000"
              step="10000"
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg accent-blue-500"
            />
            <div className="text-center mt-2 text-2xl font-black text-white">{formatNOK(portfolioValue)}</div>
          </div>

          {/* Risk Profile */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {RISK_PROFILES.map((profile) => (
              <button
                key={profile.key}
                onClick={() => setRiskLevel(profile.key as any)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  riskLevel === profile.key
                    ? `${profile.bg} border-current ${profile.color}`
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                }`}
              >
                <div className="font-bold">{profile.label}</div>
                <div className="text-sm opacity-80">Max {profile.maxAlloc}</div>
              </button>
            ))}
          </div>

          {/* Calculation Results */}
          <div className="grid md:grid-cols-3 gap-4 p-6 bg-white/5 rounded-2xl">
            <div>
              <div className="text-sm text-slate-400">{isEn ? 'Max Position' : 'Maks Posisjon'}</div>
              <div className="text-2xl font-black text-white">{formatNOK(position.maxPosition)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">{isEn ? 'Collateral Required' : 'Collateral Nødvendig'}</div>
              <div className="text-2xl font-black text-amber-400">{formatNOK(position.collateralRequired)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">{isEn ? 'Estimated Daily' : 'Estimert Daglig'}</div>
              <div className="text-2xl font-black text-emerald-400">{formatNOK(position.estimatedDailyYield)}</div>
            </div>
          </div>
          
          <p className={`mt-4 text-center text-sm ${RISK_PROFILES.find(p => p.key === riskLevel)?.color}`}>
            {position.riskWarning}
          </p>
        </Card>

        {/* Live Opportunities */}
        <Card variant="glass" glassVariant="elevated" padding="none" className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <ArrowRightLeft className="w-6 h-6 text-purple-400" />
              {isEn ? 'Live Cross-Exchange Opportunities' : 'Live Cross-Exchange Muligheter'}
            </h2>
            {loading && <span className="text-slate-400">{isEn ? 'Loading...' : 'Laster...'}</span>}
          </div>

          {opportunities.length === 0 && !loading ? (
            <div className="text-center py-12 text-slate-400">
              {isEn ? 'No arbitrage opportunities right now.' : 'Ingen arbitrage-muligheter akkurat nå.'}<br />
              {isEn ? 'Funding rates are too similar between exchanges.' : 'Funding rates er for like mellom exchanges.'}
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-white">{opp.symbol}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        opp.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                        opp.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {opp.riskLevel.toUpperCase()} RISIKO
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400">{formatPct(opp.estimatedAnnual)}</div>
                      <div className="text-xs text-slate-400">Estimert APY</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                      <div className="text-xs text-emerald-400 uppercase mb-1">LONG på</div>
                      <div className="text-lg font-bold text-white">{opp.longExchange}</div>
                      <div className="text-sm text-emerald-300">{formatPct(opp.longRate * 100)} funding</div>
                    </div>
                    <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/20">
                      <div className="text-xs text-rose-400 uppercase mb-1">SHORT på</div>
                      <div className="text-lg font-bold text-white">{opp.shortExchange}</div>
                      <div className="text-sm text-rose-300">{formatPct(opp.shortRate * 100)} funding</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                    >
                      <Info className="w-4 h-4" />
                      {showDetails ? (isEn ? 'Hide' : 'Skjul') : (isEn ? 'Show' : 'Vis')} {isEn ? 'details' : 'detaljer'}
                    </button>
                    <span className="text-sm text-slate-400">
                      Netto: {formatPct(opp.netRate * 100)} per 8t
                    </span>
                  </div>

                  {showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      <p className="text-sm text-slate-300 mb-2">{isEn ? 'Requires:' : 'Krever:'}</p>
                      <ul className="text-sm text-slate-400 space-y-1">
                        {opp.requires.map((req: string, j: number) => (
                          <li key={j}>• {req}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4">
          <p className="text-slate-400 text-sm">
            {isEn ? 'This feature requires manual configuration. We do not offer auto-trading.' : 'Denne funksjonen krever manuell konfigurasjon. Vi tilbyr ikke auto-trading.'}
          </p>
          <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors flex items-center gap-2 mx-auto">
            <ExternalLink className="w-5 h-5" />
            {isEn ? 'Read Guide: How to Set Up Funding Arbitrage' : 'Les Guide: Slik setter du opp Funding Arbitrage'}
          </button>
        </div>
      </div>
    </div>
  );
}
