'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/utils';
import { useSubscription } from '@/lib/hooks/useSubscription';
import type { TierSlug } from '@/lib/pricing/tiers';
import { useLocale } from 'next-intl';

type ViewMode = 'enkel' | 'mellom' | 'avansert';

const UPGRADE_VALUE: Record<string, { title: string; features: string[]; cta: string }> = {
  student: {
    title: 'Oppgrader til Bachelor',
    features: ['Krypto-Professor — stille spørsmål når som helst', 'Teknisk Analyse Masterclass', 'Ukentlige Live-Webinarer', '1 000 KLT tokens/mnd'],
    cta: 'Se priser',
  },
  bachelor: {
    title: 'Oppgrader til Master',
    features: ['Live Trading på Binance', 'Automatisk Trading (3 strategier)', 'Kopiering av topp-tradere', '2 500 KLT tokens/mnd'],
    cta: 'Oppgrader til Master',
  },
  master: { title: '', features: [], cta: '' },
  phd: { title: '', features: [], cta: '' },
  professor: { title: '', features: [], cta: '' },
};

export default function ProgressiveDashboard() {
  const locale = useLocale();
  const supabase = createClient();
  const { subscription, loading: subLoading, currentTier } = useSubscription();
  const userTier = (subscription?.tier_slug ?? currentTier ?? 'student') as TierSlug;
  const [viewMode, setViewMode] = useState<ViewMode>('enkel');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPreference() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('user_profiles')
            .select('view_mode_preference')
            .eq('id', user.id)
            .single();
          const pref = (data as { view_mode_preference?: ViewMode } | null)?.view_mode_preference;
          if (pref) {
            setViewMode(pref);
          } else {
            setViewMode(getDefaultViewMode(userTier));
          }
        }
      } catch (error) {
        console.error('Failed to load view preference:', error);
      } finally {
        setLoading(false);
      }
    }
    if (!subLoading) loadPreference();
  }, [subLoading, userTier]);

  function getDefaultViewMode(tier: string): ViewMode {
    if (tier === 'phd' || tier === 'professor') return 'avansert';
    if (tier === 'master') return 'mellom';
    return 'enkel';
  }

  async function saveViewMode(mode: ViewMode) {
    setViewMode(mode);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ view_mode_preference: mode } as Record<string, unknown>)
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Failed to save view mode:', error);
    }
  }

  const upgradeInfo = userTier && UPGRADE_VALUE[userTier]?.features?.length ? UPGRADE_VALUE[userTier] : null;

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Verdi av oppgradering — viser hva du låser opp */}
        {upgradeInfo && (
          <div className="mb-6 p-4 rounded-xl bg-linear-to-r from-blue-900/40 to-indigo-900/40 border border-blue-700/50">
            <h3 className="text-lg font-semibold text-white mb-2">✨ {upgradeInfo.title}</h3>
            <ul className="text-sm text-slate-300 space-y-1 mb-3">
              {upgradeInfo.features.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
            <a
              href={`/${locale}/priser`}
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium text-sm"
            >
              {upgradeInfo.cta} →
            </a>
          </div>
        )}

        {/* Header med toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Velkommen tilbake{userTier && `, ${userTier.charAt(0).toUpperCase() + userTier.slice(1)}-nivå`}
            </p>
          </div>

          {/* Toggle-knapper */}
          <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => saveViewMode('enkel')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'enkel'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              Enkel
            </button>
            <button
              onClick={() => saveViewMode('mellom')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'mellom'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              Mellom
            </button>
            <button
              onClick={() => saveViewMode('avansert')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'avansert'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              Avansert
            </button>
          </div>
        </div>

        {/* ENKEL VISNING (Student/Nybegynner) */}
        {viewMode === 'enkel' && (
          <div className="space-y-6">
            <PortfolioCard simple />
            <NextLessonCard />
            <SingleSignalCard />
          </div>
        )}

        {/* MELLOM VISNING (Bachelor/Master) */}
        {viewMode === 'mellom' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioCard />
            <PaperTradingChart />
            <SignalListCard limit={5} />
            <NextLessonCard />
          </div>
        )}

        {/* AVANSERT VISNING (PhD/Professor) */}
        {viewMode === 'avansert' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AdvancedTradingChart />
            </div>
            <div className="space-y-6">
              <PortfolioCard />
              <RiskMetricsCard />
            </div>
            <SignalListCard limit={10} />
            <AIInsightsCard />
            <AutoTradingStatusCard />
          </div>
        )}
      </div>
    </div>
  );
}

// === KOMPONENTER ===

function PortfolioCard({ simple }: { simple?: boolean }) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">Din Portefølje</h3>
      <div className="text-3xl font-bold text-green-400">1,045,230 kr</div>
      <div className="text-sm text-gray-400 mt-1">+4.5% (45,230 kr) denne uken</div>
      {!simple && (
        <div className="mt-4 space-y-2 pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">BTC:</span>
            <span className="text-white font-semibold">0.5 (~520k kr)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">ETH:</span>
            <span className="text-white font-semibold">8.2 (~340k kr)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">USDT:</span>
            <span className="text-white font-semibold">185k kr</span>
          </div>
        </div>
      )}
    </div>
  );
}

function NextLessonCard() {
  return (
    <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-xl">
      <h3 className="text-xl font-semibold text-white mb-2">📚 Neste leksjon</h3>
      <p className="text-gray-300 mb-4">Risikostyring 101: Stop-loss og posisjonsstørrelse</p>
      <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors min-h-[44px]">
        Start leksjon (8 min)
      </button>
    </div>
  );
}

function SingleSignalCard() {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">🎯 Anbefalt signal</h3>
        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
          87% confidence
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-lg font-semibold text-white">BTC/USDT</div>
            <div className="text-sm text-gray-400">Kjøp ved 98,450 kr</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">+2.3%</div>
            <div className="text-xs text-gray-400">forventet profit</div>
          </div>
        </div>
        <p className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded-lg">
          💡 <strong>AI forklaring:</strong> RSI er 28 (oversolgt).
          Historisk sett stiger BTC 73% av gangene etter dette nivået.
        </p>
        <button className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold text-white transition-colors min-h-[44px]">
          Kjøp nå (lekepenger)
        </button>
      </div>
    </div>
  );
}

function SignalListCard({ limit }: { limit: number }) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">Siste Signal ({limit})</h3>
      <div className="space-y-3">
        {['BTC/USDT', 'ETH/USDT', 'SOL/USDT'].slice(0, limit).map((pair, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <div>
              <div className="font-semibold text-white">{pair}</div>
              <div className="text-sm text-gray-400">Kjøp</div>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-semibold">+2.5%</div>
              <div className="text-xs text-gray-400">82% confidence</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaperTradingChart() {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-64 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-2">📈</div>
        <p className="text-gray-400">Lekepenger Chart</p>
        <p className="text-sm text-gray-500">(Integrasjon med TradingView kommer)</p>
      </div>
    </div>
  );
}

function AdvancedTradingChart() {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-96 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-gray-400">Advanced Trading Chart</p>
        <p className="text-sm text-gray-500">Med indikatorer og teknisk analyse</p>
      </div>
    </div>
  );
}

function RiskMetricsCard() {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">📊 Risk Metrics</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Sharpe Ratio:</span>
          <span className="text-green-400 font-semibold">1.8</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Max Drawdown:</span>
          <span className="text-yellow-400 font-semibold">-12%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Win Rate:</span>
          <span className="text-green-400 font-semibold">68%</span>
        </div>
      </div>
    </div>
  );
}

function AIInsightsCard() {
  return (
    <div className="bg-emerald-900/30 border border-emerald-700 p-6 rounded-xl">
      <h3 className="text-xl font-semibold text-white mb-4">🤖 AI Innsikt</h3>
      <div className="space-y-3 text-sm">
        <p className="text-gray-300">
          <strong className="text-emerald-400">BTC:</strong> AI modellen predikerer
          74% sannsynlighet for oppgang de neste 24t basert på on-chain data.
        </p>
        <p className="text-gray-300">
          <strong className="text-emerald-400">ETH:</strong> Whale activity økt med
          23% siste uke. Historisk korrelert med prisoppgang.
        </p>
      </div>
    </div>
  );
}

function AutoTradingStatusCard() {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">🤖 Auto-Trading</h3>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <span className="text-green-400 font-semibold">Aktiv</span>
      </div>
      <div className="space-y-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Aktive strategier:</span>
          <span className="text-white">3</span>
        </div>
        <div className="flex justify-between">
          <span>Åpne posisjoner:</span>
          <span className="text-white">2</span>
        </div>
        <div className="flex justify-between">
          <span>Dagens PnL:</span>
          <span className="text-green-400">+4,230 kr</span>
        </div>
      </div>
    </div>
  );
}
