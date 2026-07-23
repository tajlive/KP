'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import Link from 'next/link';
import { Card } from './card';
import { Button } from './button';

/** Kuraterte illustrasjons-varianter — konsistent stil (brand-blå linjer på mørk bunn). */
export type EmptyStateVariant = 'chart' | 'trophy' | 'wallet';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  /** Navigasjons-CTA — rendres som Link i stedet for knapp */
  href?: string;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: ReactNode;
  /** Kuratert SVG-illustrasjon — overstyres av icon-prop om begge er satt */
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

const ILLUSTRATIONS: Record<EmptyStateVariant, ReactNode> = {
  chart: (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="80" height="80" rx="20" fill="#161719" stroke="#26282f" strokeWidth="2" />
      <path d="M24 66 L24 30" stroke="#3d7aff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <path d="M24 66 L72 66" stroke="#3d7aff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <path d="M26 58 L38 48 L48 52 L60 38 L70 30" stroke="#3d7aff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="30" r="4.5" fill="#34d399" />
      <path d="M26 44 L34 44 M26 52 L30 52" stroke="#3d7aff" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="80" height="80" rx="20" fill="#161719" stroke="#26282f" strokeWidth="2" />
      <path d="M34 26 h28 v14 a14 14 0 0 1 -28 0 z" stroke="#3d7aff" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M34 30 h-8 a8 8 0 0 0 10 10" stroke="#3d7aff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M62 30 h8 a8 8 0 0 1 -10 10" stroke="#3d7aff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M48 54 v8" stroke="#3d7aff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M38 70 h20" stroke="#3d7aff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M48 32 l2.2 4.4 4.8.7 -3.5 3.4.8 4.8 -4.3 -2.2 -4.3 2.2.8 -4.8 -3.5 -3.4 4.8 -.7 z" fill="#34d399" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="80" height="80" rx="20" fill="#161719" stroke="#26282f" strokeWidth="2" />
      <rect x="24" y="34" width="48" height="32" rx="8" stroke="#3d7aff" strokeWidth="3.5" />
      <path d="M24 42 a8 8 0 0 1 8 -8 h28" stroke="#3d7aff" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="60" cy="50" r="4" fill="#34d399" />
      <path d="M30 58 h10" stroke="#3d7aff" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),
};

function EmptyStateIllustration({ variant }: { variant: EmptyStateVariant }) {
  return (
    <div data-testid="empty-state-illustration" className="mx-auto w-24 h-24 mb-6">
      {ILLUSTRATIONS[variant]}
    </div>
  );
}

function ActionControl({ action }: { action: EmptyStateAction }) {
  if (action.href) {
    return (
      <Link
        href={action.href}
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-kp-brand px-6 font-medium text-white transition-colors hover:bg-kp-brand-hover"
      >
        {action.label}
      </Link>
    );
  }
  return (
    <Button
      variant={action.variant || 'primary'}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );
}

export function EmptyState({
  icon,
  variant,
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
          action.href ? (
            <Link
              href={action.href}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-kp-border px-4 text-sm font-medium text-kp-text-primary"
            >
              {action.label}
            </Link>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )
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
      {icon ? (
        <div className="mx-auto w-16 h-16 rounded-2xl bg-kp-surface-highlight flex items-center justify-center text-kp-text-tertiary mb-6">
          <div className="w-8 h-8">{icon}</div>
        </div>
      ) : variant ? (
        <EmptyStateIllustration variant={variant} />
      ) : null}

      <h3 className="text-title-sm font-bold text-kp-text-primary mb-3">
        {title}
      </h3>

      {description && (
        <p className="text-body-sm text-kp-text-secondary mb-6 max-w-xs mx-auto">
          {description}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {action && <ActionControl action={action} />}
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
