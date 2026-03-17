'use client';

import { useFeatureFlagContext } from './FeatureFlagProvider';

export function useFeatureFlag(flag: string): boolean {
  const flags = useFeatureFlagContext();
  return flags[flag] ?? false;
}
