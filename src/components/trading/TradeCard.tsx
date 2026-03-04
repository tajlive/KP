'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TradeNotification {
  id: string;
  pair: string;
  side: 'BUY' | 'SELL';
  amount: number;
  pnlPercent: number;
  strategy: string;
  aiExplanation: string;
  timestamp: Date;
}

interface TradeCardProps {
  trade: TradeNotification;
  onDismiss: (id: string) => void;
  index: number;
}

export function TradeCard({ trade, onDismiss, index }: TradeCardProps) {
  const isProfit = trade.pnlPercent > 0;
  const isLoss = trade.pnlPercent < 0;

  // Fire confetti on profit
  const fireConfetti = useCallback(() => {
    const colors = isProfit
      ? ['#10B981', '#34D399', '#6EE7B7', '#059669']
      : ['#EF4444', '#F87171', '#FCA5A5', '#DC2626'];

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
      disableForReducedMotion: true,
    });
  }, [isProfit]);

  useEffect(() => {
    if (isProfit) {
      // Small delay for better UX
      const timer = setTimeout(fireConfetti, 300);
      return () => clearTimeout(timer);
    }
  }, [isProfit, fireConfetti]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(trade.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [trade.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ x: 300, opacity: 0, scale: 0.8 }}
      animate={{
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring' as const,
          stiffness: 260,
          damping: 20,
          delay: index * 0.1,
        },
      }}
      exit={{
        x: -100,
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.3 },
      }}
      className="pointer-events-auto"
    >
      <Card
        className={cn(
          'relative w-[320px] overflow-hidden border-2 p-4 shadow-lg',
          isProfit &&
            'border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-emerald-200 dark:border-emerald-600 dark:from-emerald-950/30 dark:to-green-950/20 dark:shadow-emerald-900/20',
          isLoss &&
            'border-red-400 bg-gradient-to-br from-red-50 to-orange-50 shadow-red-200 dark:border-red-600 dark:from-red-950/30 dark:to-orange-950/20 dark:shadow-red-900/20',
          !isProfit &&
            !isLoss &&
            'border-blue-400 bg-gradient-to-br from-blue-50 to-sky-50 dark:border-blue-600 dark:from-blue-950/30 dark:to-sky-950/20'
        )}
      >
        {/* Animated border glow for profit */}
        {isProfit && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-emerald-400/50"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(16, 185, 129, 0)',
                '0 0 20px 4px rgba(16, 185, 129, 0.3)',
                '0 0 0 0 rgba(16, 185, 129, 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Pulsing border for loss */}
        {isLoss && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-red-400/50"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 space-y-3">
          {/* Header: Pair + Side + Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {trade.pair}
              </span>
              <Badge
                variant={trade.side === 'BUY' ? 'default' : 'secondary'}
                className={cn(
                  'text-xs',
                  trade.side === 'BUY'
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-amber-500 hover:bg-amber-600'
                )}
              >
                {trade.side === 'BUY' ? 'KJØP' : 'SALG'}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {new Date(trade.timestamp).toLocaleTimeString('nb-NO', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {/* Amount + P&L */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Beløp</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ${trade.amount.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 dark:text-slate-400">P&L</p>
              <motion.div
                className={cn(
                  'flex items-center gap-1 text-2xl font-bold',
                  isProfit && 'text-emerald-600 dark:text-emerald-400',
                  isLoss && 'text-red-600 dark:text-red-400',
                  !isProfit && !isLoss && 'text-slate-600'
                )}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
              >
                {isProfit ? (
                  <TrendingUp className="h-5 w-5" />
                ) : isLoss ? (
                  <TrendingDown className="h-5 w-5" />
                ) : null}
                <span>
                  {isProfit ? '+' : ''}
                  {trade.pnlPercent.toFixed(2)}%
                </span>
              </motion.div>
            </div>
          </div>

          {/* Strategy badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {trade.strategy}
            </Badge>
            {isProfit && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
              </motion.div>
            )}
          </div>

          {/* AI Explanation - fades in after 1 second */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 1, duration: 0.5 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg bg-white/50 p-2 text-xs text-slate-600 backdrop-blur-sm dark:bg-slate-900/50 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">AI: </span>
              {trade.aiExplanation}
            </div>
          </motion.div>

          {/* Progress bar for auto-dismiss */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-slate-300 dark:bg-slate-700"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
          />
        </div>
      </Card>
    </motion.div>
  );
}

// Trade Card Container for stacking
interface TradeCardContainerProps {
  trades: TradeNotification[];
  onDismiss: (id: string) => void;
}

export function TradeCardContainer({ trades, onDismiss }: TradeCardContainerProps) {
  // Only show max 3 trades
  const visibleTrades = trades.slice(0, 3);

  return (
    <div className="fixed right-4 top-20 z-50 flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {visibleTrades.map((trade, index) => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onDismiss={onDismiss}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
