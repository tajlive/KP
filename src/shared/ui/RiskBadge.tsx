'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type RiskLevel = 'low' | 'medium' | 'high';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const config = {
  low: { icon: TrendingUp, color: 'text-[var(--kp-positive)] bg-[var(--kp-positive)]/10' },
  medium: { icon: Minus, color: 'text-[var(--kp-live)] bg-[var(--kp-live)]/10' },
  high: { icon: AlertTriangle, color: 'text-[var(--kp-negative)] bg-[var(--kp-negative)]/10' },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const t = useTranslations('components.riskBadge');
  const { icon: Icon, color } = config[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        color,
        className
      )}
      aria-label={t('label', { level })}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(level)}
    </span>
  );
}
