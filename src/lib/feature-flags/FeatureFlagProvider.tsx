'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

export type FeatureFlagsMap = Record<string, boolean>;

const defaultFlags: FeatureFlagsMap = {
  'v2-layout': false,
};

function getFlagsFromEnv(): FeatureFlagsMap {
  const v2Layout = process.env.NEXT_PUBLIC_V2_LAYOUT;
  const v2Enabled =
    v2Layout === 'true' || v2Layout === '1' || v2Layout === 'yes';

  return {
    ...defaultFlags,
    'v2-layout': v2Enabled,
  };
}

const FeatureFlagContext = createContext<FeatureFlagsMap | undefined>(
  undefined,
);

interface FeatureFlagProviderProps {
  children: ReactNode;
}

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const flags = useMemo(() => getFlagsFromEnv(), []);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlagContext(): FeatureFlagsMap {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    return defaultFlags;
  }
  return context;
}
