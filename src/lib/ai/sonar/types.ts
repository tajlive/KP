/**
 * Sonar Agent Types
 * Type-definisjoner for Perplexity Sonar/Sonar Pro API-integrasjon
 */

// ============================================================================
// Sonar API Configuration Types
// ============================================================================

export type SonarMode = 'low' | 'medium' | 'high';
export type SonarTier = 'sonar' | 'sonar-pro';

export interface SonarRequestOptions {
  tier: SonarTier;
  mode: SonarMode;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface SonarMetrics {
  callsTotal: number;
  callsByTier: Record<SonarTier, number>;
  callsByMode: Record<SonarMode, number>;
  errorsTotal: number;
  cacheHits: number;
  cacheMisses: number;
  averageLatencyMs: number;
}

// ============================================================================
// Narrative Scan Types
// ============================================================================

export type SentimentValue = -1 | -0.5 | 0 | 0.5 | 1;
export type ImpactLevel = 'low' | 'medium' | 'high';

export interface NarrativeEvent {
  title: string;
  impact: ImpactLevel;
}

export interface NarrativeSource {
  title: string;
  url: string;
}

export interface NarrativeScanResult {
  symbol: string;
  sentiment: SentimentValue;
  event_risk: number; // 0..1
  key_events: NarrativeEvent[];
  reasoning_excerpt: string;
  sources: NarrativeSource[];
}

// ============================================================================
// Regime Scan Types
// ============================================================================

export type MarketRegime = 'bull' | 'bear' | 'range' | 'unclear';

export interface RegimeSource {
  title: string;
  url: string;
}

export interface RegimeScanResult {
  regime: MarketRegime;
  confidence: number; // 0..1
  reasoning_excerpt: string;
  risk_flags: string[];
  sources: RegimeSource[];
}

// ============================================================================
// Signal Explanation Types
// ============================================================================

export type Timeframe = 'short' | 'medium' | 'long';
export type Decision = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
export type RiskLevel = 1 | 2 | 3 | 4 | 5;
export type UserRiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type SupportedLocale = 'nb-NO';

export interface ExplainSignalInput {
  symbol: string;
  timeframe: Timeframe;
  decision: Decision;
  score: number; // 0–100
  risk_level: RiskLevel;
  factors: Record<string, number>;
  userRiskProfile: UserRiskProfile;
  locale: SupportedLocale;
}

export interface ExplanationSource {
  title: string;
  url: string;
}

export interface ExplainSignalResult {
  title: string;
  summary: string;
  key_points: string[];
  risk_warnings: string[];
  sources: ExplanationSource[];
}

// ============================================================================
// API Response Types (internal)
// ============================================================================

export interface SonarApiResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
}

export interface SonarApiError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface SonarCacheConfig {
  regimeTtlMs: number;
  explanationTtlMs: number;
  narrativeTtlMs: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class SonarError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'RATE_LIMIT' | 'API_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR',
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'SonarError';
  }
}

export class SonarValidationError extends SonarError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', undefined, false);
    this.name = 'SonarValidationError';
  }
}
