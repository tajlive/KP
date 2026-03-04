'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StressIndicatorProps {
  currentPnL: number;
  maxDrawdown: number;
  pnlHistory?: number[]; // For volatility calculation
  className?: string;
}

export function StressIndicator({
  currentPnL,
  maxDrawdown,
  pnlHistory = [],
  className,
}: StressIndicatorProps) {
  const t = useTranslations('trading');

  const stressLevel = useMemo(() => {
    return calculateStressLevel(currentPnL, maxDrawdown, pnlHistory);
  }, [currentPnL, maxDrawdown, pnlHistory]);

  const stressConfig = getStressConfig(stressLevel, t);

  return (
    <div
      className={cn(
        'p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border',
        stressLevel > 70
          ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10'
          : stressLevel > 40
            ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-900/10'
            : 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10',
        className
      )}
      data-testid="stress-indicator"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{stressConfig.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold">{t('stressLevel')}</h3>
            <p className={cn('text-xs font-medium', stressConfig.colorClass)}>
              {stressConfig.message}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={cn(
              'text-2xl font-bold',
              stressLevel > 70
                ? 'text-red-600'
                : stressLevel > 40
                  ? 'text-yellow-600'
                  : 'text-green-600'
            )}
          >
            {stressLevel}%
          </span>
        </div>
      </div>

      {/* Stress Progress Bar */}
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <MotionDiv
          className={cn(
            'absolute h-full rounded-full transition-all duration-500',
            stressLevel < 25
              ? 'bg-green-500'
              : stressLevel < 50
                ? 'bg-yellow-500'
                : stressLevel < 75
                  ? 'bg-orange-500'
                  : 'bg-red-500'
          )}
          style={{ width: `${stressLevel}%` }}
        />
        {/* Zone markers */}
        <div className="absolute top-0 left-[25%] w-px h-full bg-white/50" />
        <div className="absolute top-0 left-[50%] w-px h-full bg-white/50" />
        <div className="absolute top-0 left-[75%] w-px h-full bg-white/50" />
      </div>

      {/* Zone labels */}
      <div className="flex justify-between mt-1 text-[10px] text-gray-400 uppercase tracking-wider">
        <span>Calm</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Extreme</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {currentPnL >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span>P&L</span>
          </div>
          <p
            className={cn(
              'text-sm font-mono font-semibold',
              currentPnL >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {currentPnL >= 0 ? '+' : ''}
            {currentPnL.toLocaleString('nb-NO', {
              style: 'currency',
              currency: 'NOK',
            })}
          </p>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Activity className="w-3 h-3 text-red-500" />
            <span>Max Drawdown</span>
          </div>
          <p className="text-sm font-mono font-semibold text-red-600">
            -{maxDrawdown.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Learning moment for high stress */}
      {stressLevel > 50 && (
        <Alert
          variant={stressLevel > 75 ? 'destructive' : 'default'}
          className={cn(
            'mt-4',
            stressLevel > 75
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-yellow-500/50 bg-yellow-500/10'
          )}
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            {t('stressTriggerTitle')}
          </AlertTitle>
          <AlertDescription className="text-xs mt-1 space-y-1">
            <p className="text-gray-600 dark:text-gray-400">
              {t('stressTriggerDescription')}
            </p>
            <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-gray-500">
              <li>{t('stressTriggerImpulsivity')}</li>
              <li>{t('stressTriggerOvertrading')}</li>
              <li>{t('stressTriggerFOMO')}</li>
            </ul>
            <p
              className={cn(
                'mt-2 font-semibold',
                stressLevel > 75 ? 'text-red-600' : 'text-yellow-600'
              )}
            >
              {t('stressTriggerAdvice')}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Helper function to calculate stress level
function calculateStressLevel(
  currentPnL: number,
  maxDrawdown: number,
  pnlHistory: number[]
): number {
  let stress = 0;

  // P&L component (negative P&L increases stress)
  if (currentPnL < -100000) stress += 30;
  else if (currentPnL < -50000) stress += 25;
  else if (currentPnL < -20000) stress += 20;
  else if (currentPnL < -10000) stress += 15;
  else if (currentPnL < -5000) stress += 10;
  else if (currentPnL < 0) stress += 5;

  // Drawdown component
  if (maxDrawdown > 30) stress += 40;
  else if (maxDrawdown > 20) stress += 30;
  else if (maxDrawdown > 15) stress += 25;
  else if (maxDrawdown > 10) stress += 15;
  else if (maxDrawdown > 5) stress += 10;

  // Volatility component (if we have history)
  if (pnlHistory.length >= 5) {
    const recentPnl = pnlHistory.slice(-10);
    const variance =
      recentPnl.reduce((sum, val) => sum + Math.pow(val - currentPnL, 2), 0) /
      recentPnl.length;
    const volatility = Math.sqrt(variance);

    if (volatility > 50000) stress += 20;
    else if (volatility > 30000) stress += 15;
    else if (volatility > 15000) stress += 10;
    else if (volatility > 5000) stress += 5;
  }

  return Math.min(stress, 100);
}

// Get stress configuration based on level
function getStressConfig(
  level: number,
  t: (key: string) => string
): {
  emoji: string;
  message: string;
  colorClass: string;
} {
  if (level < 25) {
    return {
      emoji: '😊',
      message: t('stressLevelCalm'),
      colorClass: 'text-green-600',
    };
  }
  if (level < 50) {
    return {
      emoji: '😐',
      message: t('stressLevelModerate'),
      colorClass: 'text-yellow-600',
    };
  }
  if (level < 75) {
    return {
      emoji: '😰',
      message: t('stressLevelHigh'),
      colorClass: 'text-orange-600',
    };
  }
  return {
    emoji: '🤯',
    message: t('stressLevelExtreme'),
    colorClass: 'text-red-600',
  };
}

// Motion div component for progress bar animation  
function MotionDiv({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn('transition-all duration-500 ease-out', className)}
      style={style}
    />
  );
}
