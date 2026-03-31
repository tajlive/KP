'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle' | 'glow';
  hover?: 'lift' | 'glow' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  animate?: boolean;
  delay?: number;
}

const variants = {
  default: 'bg-kp-bg-card backdrop-blur-glass border border-kp-border',
  elevated: 'bg-kp-bg-card backdrop-blur-glass border border-kp-border-hover shadow-glass',
  subtle: 'bg-kp-surface-highlight border border-kp-border',
  glow: 'bg-kp-bg-card backdrop-blur-glass border border-kp-brand/20 shadow-glow-brand',
};

const hoverEffects = {
  lift: 'hover:-translate-y-1 hover:shadow-glass-hover transition-all duration-300',
  glow: 'hover:border-kp-brand/30 hover:shadow-glow-brand transition-all duration-300',
  none: '',
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function GlassCard({
  children,
  className,
  variant = 'default',
  hover = 'lift',
  padding = 'md',
  animate = false,
  delay = 0,
}: GlassCardProps) {
  const baseClasses = cn(
    'rounded-card relative overflow-hidden',
    variants[variant],
    hoverEffects[hover],
    paddings[padding],
    className
  );

  // Surface gradient overlay for depth
  const gradientOverlay = (
    <div 
      className="absolute inset-0 pointer-events-none opacity-50"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%)',
      }}
    />
  );

  if (animate) {
    return (
      <div
        className={cn(baseClasses, 'animate-fade-in')}
        style={{ animationDelay: `${delay}s` }}
      >
        {gradientOverlay}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {gradientOverlay}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Stat Card for dashboard/data display
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  className,
  animate = false,
  delay = 0,
}: StatCardProps) {
  const changeColors = {
    positive: 'text-kp-success',
    negative: 'text-kp-danger',
    neutral: 'text-kp-text-tertiary',
  };

  return (
    <div className={animate ? 'animate-fade-in' : ''} style={{ animationDelay: `${delay}s` }}>
      <GlassCard 
        variant="elevated" 
        hover="lift" 
        padding="md"
        className={className}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-kp-text-tertiary mb-1">{label}</p>
            <p className="text-2xl font-bold text-kp-text-primary tracking-tight">{value}</p>
            {change && (
              <p className={cn('text-sm mt-1 font-medium', changeColors[changeType])}>
                {changeType === 'positive' && '↑ '}
                {changeType === 'negative' && '↓ '}
                {change}
              </p>
            )}
          </div>
          {icon && (
            <div className="p-2 rounded-lg bg-kp-surface-highlight text-kp-brand">
              {icon}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export default GlassCard;
