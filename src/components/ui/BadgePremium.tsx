'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgePremiumProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  icon?: ReactNode;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-kp-surface-highlight text-kp-text-secondary border-kp-border',
  brand: 'bg-kp-brand-subtle text-kp-brand border-kp-brand/20',
  success: 'bg-kp-success-light text-kp-success border-kp-success/20',
  warning: 'bg-kp-warning-light text-kp-warning border-kp-warning/20',
  danger: 'bg-kp-danger-light text-kp-danger border-kp-danger/20',
  neutral: 'bg-kp-bg-tertiary text-kp-text-tertiary border-kp-border',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function BadgePremium({
  children,
  variant = 'default',
  size = 'md',
  className,
  icon,
}: BadgePremiumProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-badge font-medium border',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Level badge for courses/progression
interface LevelBadgeProps {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  className?: string;
}

const levelConfig = {
  beginner: { label: 'Nybegynner', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  intermediate: { label: 'Middels', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  advanced: { label: 'Avansert', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  expert: { label: 'Ekspert', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

export function LevelBadge({ level, className }: LevelBadgeProps) {
  const config = levelConfig[level];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-badge text-xs font-semibold border',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export default BadgePremium;
