'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Shield, Zap, Target, Wallet, AlertCircle } from 'lucide-react';
import { calculateOptimalTradePreview, OptimalTradeResult } from '@/lib/trading/optimal/engine';
import { Button } from '@/components/ui/button';

interface OptimalTraderProps {
  symbol?: string;
  currentPrice: number;
  onClose: () => void;
  onExecute: (result: OptimalTradeResult) => void;
}

const RISK_PROFILES = [
  { key: 'conservative', label: 'Konservativ', emoji: '🛡️', desc: 'ATR 2.5x', color: 'from-green-500 to-green-600' },
  { key: 'balanced', label: 'Balansert', emoji: '⚖️', desc: 'ATR 1.8x', color: 'from-blue-500 to-blue-600' },
  { key: 'aggressive', label: 'Aggressiv', emoji: '🚀', desc: 'ATR 1.2x', color: 'from-purple-500 to-purple-600' },
] as const;

export default function OptimalTrader({ 
  symbol = 'BTCUSDT', 
  currentPrice,
  onClose, 
  onExecute 
}: OptimalTraderProps) {
  const [portfolioValue, setPortfolioValue] = useState(100000);
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [signalStrength, setSignalStrength] = useState(0.85);
  const [isLoading, setIsLoading] = useState(false);
  const [tradePreview, setTradePreview] = useState<OptimalTradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculatePreview = useCallback(async () => {
    try {
      setError(null);
      const preview = await calculateOptimalTradePreview({
        userId: 'preview',
        symbol,
        side: 'BUY',
        signalStrength,
        portfolioValue,
        riskProfile,
        entryPrice: currentPrice
      });
      setTradePreview(preview);
    } catch (err) {
      setError('Kunne ikke beregne optimal trade');
    }
  }, [symbol, currentPrice, portfolioValue, riskProfile, signalStrength]);

  useEffect(() => {
    calculatePreview();
    const timer = setInterval(calculatePreview, 5000);
    return () => clearInterval(timer);
  }, [calculatePreview]);

  const handleExecute = async () => {
    if (!tradePreview) return;
    setIsLoading(true);
    try {
      await onExecute(tradePreview);
      onClose();
    } catch (err) {
      setError('Utføring feilet');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNOK = (value: number) => 
    new Intl.NumberFormat('no-NO', { 
      style: 'currency', 
      currency: 'NOK',
      maximumFractionDigits: 0 
    }).format(value);

  const formatUSD = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-slate-900/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 text-xs font-semibold mb-3">
            <Zap className="w-3 h-3" />
            KLA-251 Optimal Trading Engine
          </div>
          <h2 className="text-2xl font-black text-white mb-1">Optimal Trade</h2>
          <p className="text-slate-400 text-sm">Kelly Criterion + ATR Dynamic Stops</p>
        </div>

        {/* Live Price */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center">
            <span className="text-2xl font-black text-orange-400">
              {symbol.includes('BTC') ? '₿' : symbol.includes('ETH') ? 'Ξ' : '$'}
            </span>
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-white">{symbol}</div>
            <div className="text-2xl font-mono font-black text-emerald-400">
              {formatUSD(currentPrice)}
            </div>
          </div>
        </div>

        {/* Portfolio Input */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Wallet className="w-4 h-4 text-slate-400" />
            Porteføljeverdi (NOK)
          </label>
          <input
            type="range"
            min="10000"
            max="1000000"
            step="10000"
            value={portfolioValue}
            onChange={(e) => setPortfolioValue(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mb-3"
          />
          <div className="text-center">
            <span className="text-2xl font-black text-white">{formatNOK(portfolioValue)}</span>
          </div>
        </div>

        {/* Signal Strength */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Target className="w-4 h-4 text-slate-400" />
            Signal Strength: {(signalStrength * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={signalStrength}
            onChange={(e) => setSignalStrength(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Risk Profile */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-white mb-3 block">Risikoprofil</label>
          <div className="grid grid-cols-3 gap-2">
            {RISK_PROFILES.map((profile) => (
              <button
                key={profile.key}
                onClick={() => setRiskProfile(profile.key)}
                className={`p-3 rounded-xl text-center transition-all border-2 ${
                  riskProfile === profile.key
                    ? `bg-gradient-to-r ${profile.color} border-transparent text-white`
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                }`}
              >
                <span className="text-xl block mb-1">{profile.emoji}</span>
                <span className="text-xs font-bold block">{profile.label}</span>
                <span className="text-[10px] opacity-80">{profile.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trade Preview */}
        {tradePreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-amber-500/10 rounded-2xl border border-white/10"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-black/30 rounded-xl">
                <div className="text-xs text-slate-400 mb-1">Kelly Størrelse</div>
                <div className="text-lg font-black text-emerald-400">
                  {(tradePreview.kellyFraction * 100).toFixed(2)}%
                </div>
              </div>
              <div className="text-center p-3 bg-black/30 rounded-xl">
                <div className="text-xs text-slate-400 mb-1">Posisjon (NOK)</div>
                <div className="text-lg font-black text-white">
                  {(tradePreview.positionSizeNOK / 1000).toFixed(1)}k
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-black/30 rounded-lg">
                <div className="text-slate-400 mb-1">ATR</div>
                <div className="font-mono font-bold text-amber-400">
                  {formatUSD(tradePreview.atr.atr)}
                </div>
              </div>
              <div className="p-2 bg-black/30 rounded-lg">
                <div className="text-slate-400 mb-1">Stop Loss</div>
                <div className="font-mono font-bold text-red-400">
                  {formatUSD(tradePreview.stopPrice)}
                </div>
              </div>
              <div className="p-2 bg-black/30 rounded-lg">
                <div className="text-slate-400 mb-1">Target</div>
                <div className="font-mono font-bold text-emerald-400">
                  {formatUSD(tradePreview.targetPrice)}
                </div>
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-xs text-slate-400">Risk:Reward </span>
              <span className="text-lg font-black text-emerald-400">{tradePreview.rrRatio.toFixed(1)}:1</span>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            size="lg"
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-lg font-black h-14 rounded-xl shadow-lg shadow-emerald-500/25"
            onClick={handleExecute}
            disabled={isLoading || !tradePreview}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Kjører...
              </span>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 mr-2" />
                Kjøp Optimal
              </>
            )}
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="flex-1 border-white/20 bg-white/5 hover:bg-white/10 h-14 rounded-xl font-bold"
            onClick={onClose}
          >
            Avbryt
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <div className="text-xs text-slate-500 space-y-1">
            <div>Kelly Criterion • ATR Stop Loss • 3:1 Risk:Reward</div>
            <div className="text-emerald-400">⚡ Maksimal profittoptimalisering</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
