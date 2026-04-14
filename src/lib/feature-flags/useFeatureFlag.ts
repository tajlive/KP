'use client';

import { useFeatureFlagContext } from './FeatureFlagProvider';
import type { FeatureFlags } from '@/lib/flags';

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const flags = useFeatureFlagContext();
  return flags[flag] ?? false;
}
