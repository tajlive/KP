'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  badge?: string;
  align?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  delay?: number;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  badge,
  align = 'center',
  size = 'md',
  animate = false,
  delay = 0,
  className,
}: SectionHeadingProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const sizeClasses = {
    sm: {
      title: 'text-title-sm',
      subtitle: 'text-body-sm',
    },
    md: {
      title: 'text-title',
      subtitle: 'text-body',
    },
    lg: {
      title: 'text-heading-sm md:text-heading',
      subtitle: 'text-body md:text-body-lg',
    },
  };

  return (
    <div 
      className={cn(alignClasses[align], className, animate && 'animate-fade-in')} 
      style={{ animationDelay: `${delay}s` }}
    >
      {badge && (
        <span className="inline-flex items-center px-3 py-1 rounded-badge text-xs font-semibold bg-kp-brand-subtle text-kp-brand mb-4">
          {badge}
        </span>
      )}
      <h2 
        className={cn(
          'font-bold text-kp-text-primary tracking-tight',
          sizeClasses[size].title
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p 
          className={cn(
            'mt-3 text-kp-text-secondary max-w-2xl',
            sizeClasses[size].subtitle,
            align === 'center' && 'mx-auto'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Page Header variant for top of pages
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('pb-8 border-b border-kp-border mb-8', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-sm md:text-heading font-bold text-kp-text-primary tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-body text-kp-text-secondary max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export default SectionHeading;
