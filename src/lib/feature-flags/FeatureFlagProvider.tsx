'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { FeatureFlags } from '@/lib/flags';
import { getFlags } from '@/lib/flags';

const FeatureFlagContext = createContext<FeatureFlags | undefined>(undefined);

interface FeatureFlagProviderProps {
  children: ReactNode;
  initialFlags?: Partial<FeatureFlags>;
}

export function FeatureFlagProvider({ children, initialFlags }: FeatureFlagProviderProps) {
  const flags = useMemo(() => getFlags(initialFlags), [initialFlags]);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlagContext(): FeatureFlags {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    return getFlags();
  }
  return context;
}
