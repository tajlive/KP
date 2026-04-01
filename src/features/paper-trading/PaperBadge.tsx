'use client';

import { ReactNode } from 'react';

export interface PaperBadgeProps {
  variant?: 'default' | 'compact';
  className?: string;
  children?: ReactNode;
}

/**
 * White badge indicating paper trading / demo account
 * Used in various places to show user is in demo mode
 */
export default function PaperBadge({ variant = 'default', className = '' }: PaperBadgeProps) {
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-gray-200 ${className}`}>
        <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
        <span className="text-xs font-medium text-gray-700">Demo</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-gray-200 ${className}`}>
      <div className="h-2 w-2 rounded-full bg-gray-400"></div>
      <span className="text-sm font-medium text-gray-700">Demo Account</span>
    </div>
  );
}
