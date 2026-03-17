'use client';

import { useFeatureFlag } from './useFeatureFlag';
import type { ReactNode } from 'react';

interface FeatureGateProps {
  flag: string;
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
