'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Card } from './card';
import { Button } from './button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className={cn('text-center py-8', className)}>
        {icon && (
          <div className="mx-auto w-12 h-12 rounded-xl bg-kp-surface-highlight flex items-center justify-center text-kp-text-tertiary mb-4">
            {icon}
          </div>
        )}
        <h3 className="text-base font-semibold text-kp-text-primary mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-kp-text-tertiary mb-4">{description}</p>
        )}
        {action && (
          <Button
            variant="secondary"
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card
      variant="glass"
      glassVariant="subtle"
      padding="lg"
      className={cn('text-center max-w-md mx-auto', className)}
    >
      {icon && (
        <div className="mx-auto w-16 h-16 rounded-2xl bg-kp-surface-highlight flex items-center justify-center text-kp-text-tertiary mb-6">
          <div className="w-8 h-8">{icon}</div>
        </div>
      )}
      
      <h3 className="text-title-sm font-bold text-kp-text-primary mb-3">
        {title}
      </h3>
      
      {description && (
        <p className="text-body-sm text-kp-text-secondary mb-6 max-w-xs mx-auto">
          {description}
        </p>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {action && (
          <Button
            variant={action.variant || 'primary'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="ghost"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default EmptyState;
