/**
 * Sonar Feature Flags
 * Styrer aktivering av Sonar-integrasjon på server- og klient-siden
 */

// ============================================================================
// Server-side flags
// ============================================================================

/**
 * Whether Sonar integration is enabled on the server
 * Set ENABLE_SONAR_INTEGRATION=true in environment to enable
 */
export const isSonarIntegrationEnabled = (): boolean => {
  const enabled = process.env.ENABLE_SONAR_INTEGRATION;
  return enabled === 'true' || enabled === '1' || enabled === 'yes';
};

/**
 * Whether to use Sonar Pro tier by default
 * Set SONAR_USE_PRO_TIER=true to use sonar-pro instead of sonar
 */
export const shouldUseSonarProTier = (): boolean => {
  const usePro = process.env.SONAR_USE_PRO_TIER;
  return usePro === 'true' || usePro === '1' || usePro === 'yes';
};

/**
 * Get the effective Sonar tier based on configuration
 */
export const getEffectiveSonarTier = (): 'sonar' | 'sonar-pro' => {
  return shouldUseSonarProTier() ? 'sonar-pro' : 'sonar';
};

// ============================================================================
// Client-side flags (for reference, actual implementation in FeatureFlagProvider)
// ============================================================================

/**
 * Client-side feature flag name for Sonar UI
 * Use with useFeatureFlag('sonar-ui') hook
 */
export const SONAR_UI_FEATURE_FLAG = 'sonar-ui' as const;

// ============================================================================
// Feature configuration
// ============================================================================

export interface SonarFeatureConfig {
  /** Is Sonar integration enabled server-side */
  enabled: boolean;
  /** Which tier to use */
  tier: 'sonar' | 'sonar-pro';
  /** Is the UI enabled client-side */
  uiEnabled: boolean;
  /** Health status */
  healthy: boolean;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * Get complete feature configuration
 * Note: uiEnabled should be checked client-side with useFeatureFlag('sonar-ui')
 */
export const getSonarFeatureConfig = (): Omit<SonarFeatureConfig, 'uiEnabled'> => {
  return {
    enabled: isSonarIntegrationEnabled(),
    tier: getEffectiveSonarTier(),
    healthy: isSonarIntegrationEnabled(), // Basic health check
  };
};

// ============================================================================
// Conditional execution helpers
// ============================================================================

/**
 * Execute a function only if Sonar is enabled, otherwise return fallback
 */
export async function withSonarEnabled<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isSonarIntegrationEnabled()) {
    return fallback;
  }
  try {
    return await fn();
  } catch (error) {
    // Log but don't throw - return fallback
    console.warn('[Sonar] Operation failed, using fallback:', error);
    return fallback;
  }
}

/**
 * Execute a function only if Sonar is enabled, otherwise return fallback (sync version)
 */
export function withSonarEnabledSync<T>(fn: () => T, fallback: T): T {
  if (!isSonarIntegrationEnabled()) {
    return fallback;
  }
  try {
    return fn();
  } catch (error) {
    console.warn('[Sonar] Operation failed, using fallback:', error);
    return fallback;
  }
}
