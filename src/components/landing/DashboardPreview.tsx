'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, TrendingUp, PieChart, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DashboardPreview() {
  const router = useRouter();
  const [mode, setMode] = useState<'paper' | 'live'>('paper');

  const paperData = {
    balance: 10420.50,
    change: +420.50,
    changePercent: +4.2,
    positions: [
      { symbol: 'BTC', amount: 0.15, value: 9820 },
      { symbol: 'ETH', amount: 2.5, value: 600 },
    ],
  };

  const liveData = {
    balance: 0,
    change: 0,
    changePercent: 0,
    positions: [],
  };

  const currentData = mode === 'paper' ? paperData : liveData;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl max-w-lg w-full mx-auto">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-teal-400" />
          <span className="font-fraunces font-bold text-slate-100">Portefølje</span>
        </div>
        <div className="flex bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => setMode('paper')}
            className={`px-3 py-1.5 rounded-md text-sm font-lexend transition-colors ${
              mode === 'paper'
                ? 'bg-teal-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paper
          </button>
          <button
            onClick={() => setMode('live')}
            className={`px-3 py-1.5 rounded-md text-sm font-lexend transition-colors ${
              mode === 'live'
                ? 'bg-amber-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <p className="font-lexend text-sm text-slate-400 mb-1">
              {mode === 'paper' ? 'Virtuell saldo' : 'Din saldo'}
            </p>
            <p className="font-fraunces text-5xl font-bold text-slate-100">
              {mode === 'paper' 
                ? `kr ${currentData.balance.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}`
                : 'kr 0,00'
              }
            </p>
            {mode === 'paper' && (
              <p className="flex items-center justify-center gap-1 mt-2 text-emerald-400 font-lexend">
                <TrendingUp className="w-4 h-4" />
                +kr {currentData.change.toLocaleString('nb-NO')} ({currentData.changePercent}%)
              </p>
            )}
            {mode === 'live' && (
              <p className="mt-2 text-slate-500 font-lexend text-sm">
                Koble til Binance for å starte
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Positions */}
      <div className="px-6 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-slate-400" />
          <span className="font-lexend text-sm text-slate-400">Dine posisjoner</span>
        </div>
        
        {mode === 'paper' && currentData.positions.map((pos, idx) => (
          <div
            key={pos.symbol}
            className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {pos.symbol}
              </div>
              <div>
                <p className="font-lexend font-medium text-white/90">{pos.symbol}</p>
                <p className="font-lexend text-sm text-white/70">{pos.amount} {pos.symbol}</p>
              </div>
            </div>
            <p className="font-lexend font-medium text-white/90">
              kr {pos.value.toLocaleString('nb-NO')}
            </p>
          </div>
        ))}

        {mode === 'live' && (
          <div className="text-center py-8 text-slate-500">
            <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-lexend text-sm">Ingen posisjoner ennå</p>
            <p className="font-lexend text-xs mt-1">Start lekepenger for å øve</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        <button 
          onClick={() => router.push('/innlogging')}
          className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-lexend font-medium rounded-lg transition-colors min-h-[44px]"
        >
          {mode === 'paper' ? 'Fortsett øving' : 'Start med lekepenger'}
        </button>
      </div>
    </div>
  );
}
