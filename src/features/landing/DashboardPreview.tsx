'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Wallet, TrendingUp, TrendingDown, PieChart, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

interface CoinData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  virtualAmount: number;
  virtualEntryPrice: number;
}

const VIRTUAL_ALLOCATION: CoinData[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 0, change24h: 0, virtualAmount: 0.65, virtualEntryPrice: 90_000 },
  { symbol: 'ETH', name: 'Ethereum', price: 0, change24h: 0, virtualAmount: 3.2, virtualEntryPrice: 2_800 },
];

const INITIAL_BALANCE = 100_000;

function formatNOK(n: number): string {
  return n.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DashboardPreview() {
  const router = useRouter();
  const t = useTranslations("landing.demoWidget");
  const [mode, setMode] = useState<'paper' | 'live'>('paper');
  const [coins, setCoins] = useState<CoinData[]>(VIRTUAL_ALLOCATION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT"]');
        if (!res.ok) throw new Error('Binance API error');
        const data = await res.json() as BinanceTicker[];
        
        const updated = VIRTUAL_ALLOCATION.map((coin) => {
          const ticker = data.find((d) => d.symbol === `${coin.symbol}USDT`);
          return {
            ...coin,
            price: ticker ? parseFloat(ticker.lastPrice) : coin.virtualEntryPrice,
            change24h: ticker ? parseFloat(ticker.priceChangePercent) : 0,
          };
        });
        
        setCoins(updated);
        setLoading(false);
      } catch (err) {
        console.error('[DashboardPreview] Price fetch failed:', err);
        setLoading(false);
      }
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, []);

  const paperData = {
    balance: INITIAL_BALANCE,
    positions: coins,
    totalValue: coins.reduce((sum, c) => sum + c.price * c.virtualAmount, 0),
  };

  const totalPnL = paperData.positions.reduce((sum, c) => {
    const currentValue = c.price * c.virtualAmount;
    const entryValue = c.virtualEntryPrice * c.virtualAmount;
    return sum + (currentValue - entryValue);
  }, 0);

  const totalPnLPct = (totalPnL / INITIAL_BALANCE) * 100;
  const totalPortfolioValue = INITIAL_BALANCE + totalPnL;

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
          <span className="font-fraunces font-bold text-slate-100">{t("portfolio")}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            Demo
          </span>
        </div>
        <div className="flex bg-slate-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('paper')}
            className={`px-3 py-1.5 rounded-md text-sm font-lexend transition-colors ${
              mode === 'paper'
                ? 'bg-teal-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t("paper")}
          </button>
          <button
            type="button"
            onClick={() => setMode('live')}
            className={`px-3 py-1.5 rounded-md text-sm font-lexend transition-colors ${
              mode === 'live'
                ? 'bg-amber-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t("live")}
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
              {mode === 'paper' ? t("virtualBalance") : t("yourBalance")}
            </p>
            <p className="font-fraunces text-5xl font-bold text-slate-100">
              {mode === 'paper' 
                ? `kr ${formatNOK(totalPortfolioValue)}`
                : 'kr 0,00'
              }
            </p>
            {mode === 'paper' && !loading && (
              <p className={`flex items-center justify-center gap-1 mt-2 font-lexend ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {totalPnL >= 0 ? '+' : ''}{formatNOK(totalPnL)} kr ({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%)
              </p>
            )}
            {mode === 'live' && (
              <p className="mt-2 text-slate-500 font-lexend text-sm">
                {t("connectBinance")}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Positions */}
      <div className="px-6 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-slate-400" />
          <span className="font-lexend text-sm text-slate-400">{t("yourPositions")}</span>
        </div>
        
        {mode === 'paper' && loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
                  <div className="space-y-1">
                    <div className="w-16 h-4 bg-slate-700 animate-pulse rounded" />
                    <div className="w-24 h-3 bg-slate-700 animate-pulse rounded" />
                  </div>
                </div>
                <div className="w-20 h-4 bg-slate-700 animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}
        
        {mode === 'paper' && !loading && currentData.positions.map((pos: CoinData, idx: number) => {
          const currentValue = pos.price * pos.virtualAmount;
          const entryValue = pos.virtualEntryPrice * pos.virtualAmount;
          const pnl = currentValue - entryValue;
          const pnlPct = ((pos.price - pos.virtualEntryPrice) / pos.virtualEntryPrice) * 100;
          
          return (
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
                  <p className="font-lexend font-medium text-white/90">{pos.name}</p>
                  <p className="font-lexend text-sm text-white/70">
                    {pos.virtualAmount} {pos.symbol} @ ${pos.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-lexend font-medium text-white/90">
                  kr {formatNOK(currentValue * 11)}
                </p>
                <p className={`font-lexend text-xs ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}

        {mode === 'live' && (
          <div className="text-center py-8 text-slate-500">
            <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-lexend text-sm">{t("noPositions")}</p>
            <p className="font-lexend text-xs mt-1">{t("startPaperToPractice")}</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        <button 
          type="button"
          onClick={() => router.push('/innlogging')}
          className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-lexend font-medium rounded-lg transition-colors min-h-[44px]"
        >
          {mode === 'paper' ? t("continuePractice") : t("startWithPaper")}
        </button>
      </div>
    </div>
  );
}
