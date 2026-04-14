'use client';

import { useFeatureFlag } from './useFeatureFlag';
import type { FeatureFlags } from '@/lib/flags';
import type { ReactNode } from 'react';

interface FeatureGateProps {
  flag: keyof FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps): ReactNode {
  const enabled = useFeatureFlag(flag);

  if (enabled) {
    return children;
  }
  return fallback;
}
