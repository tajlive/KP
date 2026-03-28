/**
 * Sonar Agent - Perplexity Sonar API Integration
 * Narrative analysis, market regime detection, and signal explanation
 */

// Types
export type {
  SonarMode,
  SonarTier,
  SonarRequestOptions,
  SonarMetrics,
  SentimentValue,
  ImpactLevel,
  NarrativeEvent,
  NarrativeSource,
  NarrativeScanResult,
  MarketRegime,
  RegimeSource,
  RegimeScanResult,
  Timeframe,
  Decision,
  RiskLevel,
  UserRiskProfile,
  SupportedLocale,
  ExplainSignalInput,
  ExplanationSource,
  ExplainSignalResult,
  SonarApiResponse,
  SonarApiError,
  CacheEntry,
  SonarCacheConfig,
  SonarError,
  SonarValidationError,
} from './types';

// Client
export {
  callSonar,
  getSonarMetrics,
  resetSonarMetrics,
  checkSonarHealth,
} from './client';

// Config
export {
  SONAR_API_KEY,
  SONAR_API_BASE_URL,
  getModelForTier,
  getSearchContextForMode,
  getTimeout,
  calculateBackoff,
  DEFAULT_RETRY_CONFIG,
  RATE_LIMIT_CONFIG,
  DEFAULT_CACHE_CONFIG,
  PROMPT_TEMPLATES,
  FALLBACK_VALUES,
  validateConfig,
} from './config';

// Narrative Scan
export {
  narrativeScan,
  narrativeScanWithFallback,
  sentimentToLabel,
  sentimentToColor,
  isElevatedEventRisk,
  impactToColor,
} from './narrativeScan';
export type { NarrativeScanOptions } from './narrativeScan';

// Regime Scan
export {
  regimeScan,
  regimeScanWithFallback,
  refreshRegime,
  isRegimeCacheValid,
  getRegimeCacheExpiry,
  clearRegimeCache,
  getCachedRegime,
  regimeToLabel,
  regimeToEmoji,
  regimeToColor,
  regimeToBgColor,
  isBullishRegime,
  isBearishRegime,
  requiresCaution,
  getRegimePositionAdjustment,
} from './regimeScan';
export type { RegimeScanOptions } from './regimeScan';

// Signal Explanation
export {
  explainSignal,
  explainSignalWithFallback,
  clearExplanationCache,
} from './explainSignal';
export type { ExplainSignalOptions } from './explainSignal';
