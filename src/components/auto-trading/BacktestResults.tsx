'use client';

import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Percent, 
  Activity,
  Bot,
  Target,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Strategy {
  id: string;
  name: string;
  symbol: string;
  indicators: string[];
  stopLoss: number;
  takeProfit: number;
}

interface BacktestResultData {
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgTrade: number;
  bestTrade: number;
  worstTrade: number;
  startDate: string;
  endDate: string;
}

interface BacktestResultsProps {
  strategy?: Strategy | null;
  onBacktestComplete?: (result: {
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    totalTrades: number;
  }) => void;
}

// Mock backtest results
const MOCK_RESULTS: BacktestResultData = {
  totalReturn: 12543,
  totalReturnPercent: 12.54,
  winRate: 62.5,
  totalTrades: 48,
  winningTrades: 30,
  losingTrades: 18,
  maxDrawdown: -8.23,
  sharpeRatio: 1.45,
  profitFactor: 1.78,
  avgTrade: 261.31,
  bestTrade: 1250,
  worstTrade: -680,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
};

export default function BacktestResults({ 
  strategy,
  onBacktestComplete 
}: BacktestResultsProps) {
  const [results] = useState<BacktestResultData>(MOCK_RESULTS);
  const [hasCompleted, setHasCompleted] = useState(false);

  const stats = [
    {
      label: 'Total Avkastning',
      value: `$${results.totalReturn.toLocaleString()}`,
      subValue: `+${results.totalReturnPercent}%`,
      icon: DollarSign,
      color: 'green',
      positive: true,
    },
    {
      label: 'Win Rate',
      value: `${results.winRate}%`,
      subValue: `${results.winningTrades}/${results.totalTrades} handler`,
      icon: Percent,
      color: 'blue',
    },
    {
      label: 'Max Drawdown',
      value: `${results.maxDrawdown}%`,
      subValue: 'Største tap fra topp',
      icon: TrendingDown,
      color: 'red',
    },
    {
      label: 'Sharpe Ratio',
      value: results.sharpeRatio.toFixed(2),
      subValue: 'Risk-adjusted return',
      icon: Activity,
      color: 'emerald',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600', border: 'border-green-200' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600', border: 'border-blue-200' },
    red: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600', border: 'border-red-200' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600', border: 'border-emerald-200' },
  };

  const handleComplete = () => {
    setHasCompleted(true);
    onBacktestComplete?.({
      winRate: results.winRate,
      totalReturn: results.totalReturnPercent,
      maxDrawdown: results.maxDrawdown,
      totalTrades: results.totalTrades,
    });
  };

  // Hvis ingen strategi er valgt
  if (!strategy) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Ingen strategi å teste
        </h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          Du må først bygge en strategi i "Bygg strategi"-fanen før du kan kjøre backtest.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
          <Bot className="w-4 h-4" />
          <span>Gå til <strong>Bygg strategi</strong> for å komme i gang</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Strategy Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-1">
              Backtest: {strategy.name}
            </h2>
            <p className="text-blue-700 dark:text-blue-300 mb-2">
              Tester strategien på historiske data for å se hvordan den ville prestert.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 bg-white dark:bg-blue-800 rounded-full text-blue-800 dark:text-blue-200">
                {strategy.symbol}
              </span>
              <span className="px-3 py-1 bg-white dark:bg-blue-800 rounded-full text-blue-800 dark:text-blue-200">
                SL: {strategy.stopLoss}%
              </span>
              <span className="px-3 py-1 bg-white dark:bg-blue-800 rounded-full text-blue-800 dark:text-blue-200">
                TP: {strategy.takeProfit}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Backtest Resultater
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Periode: {results.startDate} til {results.endDate}
          </p>
        </div>

        <div className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const colors = colorClasses[stat.color];
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${colors.text}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stat.subValue}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Performance Chart Placeholder */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Ytelsesgraf</h4>
            <div className="h-48 bg-gradient-to-b from-green-100/50 to-transparent dark:from-green-900/20 rounded-lg flex items-end justify-between px-4 pb-4">
              {Array.from({ length: 12 }).map((_, i) => {
                const height = 20 + Math.random() * 60;
                const isPositive = height > 40;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div 
                      className={`w-8 rounded-t ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-400">M{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          {!hasCompleted ? (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                size="lg"
              >
                <CheckCircle2 className="w-5 h-5" />
                Godkjenn og gå videre
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-300"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Backtest fullført! Du kan nå gå til Paper Trading.</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
