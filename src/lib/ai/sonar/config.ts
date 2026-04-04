/**
 * Sonar Agent Configuration
 * Miljøvariabler og konfigurasjon for Perplexity Sonar API
 */

import { logger } from '@/lib/logger';
import type { SonarCacheConfig, SonarMode, SonarTier } from './types';

// ============================================================================
// Environment Configuration
// ============================================================================

export const SONAR_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.SONAR_API_KEY || '';
export const SONAR_API_BASE_URL = process.env.SONAR_API_BASE_URL || 'https://api.perplexity.ai';

// ============================================================================
// Model Mapping
// ============================================================================

const MODEL_MAPPING: Record<SonarTier, string> = {
  'sonar': 'sonar',
  'sonar-pro': 'sonar-pro',
};

/**
 * Get the Perplexity model name for a given tier
 */
export function getModelForTier(tier: SonarTier): string {
  return MODEL_MAPPING[tier];
}

// ============================================================================
// Search Context Mapping (mode → search_context)
// ============================================================================

const SEARCH_CONTEXT_MAPPING: Record<SonarMode, 'low' | 'medium' | 'high'> = {
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
};

/**
 * Get the search_context parameter for a given mode
 */
export function getSearchContextForMode(mode: SonarMode): 'low' | 'medium' | 'high' {
  return SEARCH_CONTEXT_MAPPING[mode];
}

// ============================================================================
// Timeout Configuration
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Get validated timeout value
 */
export function getTimeout(timeoutMs?: number): number {
  if (!timeoutMs) return DEFAULT_TIMEOUT_MS;
  return Math.min(timeoutMs, MAX_TIMEOUT_MS);
}

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );
  // Add jitter to avoid thundering herd
  return delay + Math.random() * 1000;
}

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

export interface RateLimitConfig {
  tokensPerMinute: number;
  burstSize: number;
}

// Perplexity Sonar rate limits (adjust based on your plan)
export const RATE_LIMIT_CONFIG: Record<SonarTier, RateLimitConfig> = {
  'sonar': {
    tokensPerMinute: 100, // Adjust based on actual plan
    burstSize: 10,
  },
  'sonar-pro': {
    tokensPerMinute: 50, // Pro is more expensive, be more conservative
    burstSize: 5,
  },
};

// ============================================================================
// Cache Configuration
// ============================================================================

export const DEFAULT_CACHE_CONFIG: SonarCacheConfig = {
  regimeTtlMs: 4 * 60 * 60 * 1000, // 4 hours
  explanationTtlMs: 30 * 60 * 1000, // 30 minutes
  narrativeTtlMs: 2 * 60 * 60 * 1000, // 2 hours
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that required environment variables are set
 */
export function validateConfig(): { valid: boolean; error?: string } {
  if (!SONAR_API_KEY) {
    return {
      valid: false,
      error: 'PERPLEXITY_API_KEY or SONAR_API_KEY environment variable is required',
    };
  }

  // Basic format validation (Perplexity keys start with pplx-)
  if (!SONAR_API_KEY.startsWith('pplx-')) {
    logger.warn('[Sonar] API key does not start with expected "pplx-" prefix');
  }

  return { valid: true };
}

// ============================================================================
// Prompt Templates
// ============================================================================

export const PROMPT_TEMPLATES = {
  NARRATIVE_SCAN: (symbol: string): string => `
Du er en finansiell analytiker som skal analysere nyheter og narrativet rundt kryptovalutaen ${symbol}.

INSTRUKSJONER:
1. Søk i åpne webkilder (nyheter, bloggposter, offentlige data) for informasjon om ${symbol} fra de siste 12-24 timer
2. Fokuser på de viktigste driverne som påvirker prisen
3. Returner KUN gyldig JSON som matcher det eksakte skjemaet nedenfor
4. Inkluder kilder med tittel og URL
5. Vurder sentiment fra -1 (svært negativt) til 1 (svært positivt)
6. Vurder event_risk fra 0 (ingen risiko) til 1 (ekstrem risiko)

RETURNSKJEMA:
{
  "symbol": "${symbol}",
  "sentiment": 0.5,
  "event_risk": 0.3,
  "key_events": [
    { "title": "Kort beskrivelse av hendelsen", "impact": "low|medium|high" }
  ],
  "reasoning_excerpt": "Kort oppsummering av analysen (maks 200 tegn)",
  "sources": [
    { "title": "Kildenavn", "url": "https://..." }
  ]
}

VIKTIG:
- Bruk KUN åpne, offentlige kilder
- IKKE inkluder personlige data (PII)
- Sentiment må være ett av: -1, -0.5, 0, 0.5, 1
- Impact må være ett av: "low", "medium", "high"
- JSON må være gyldig og komplett
`,

  REGIME_SCAN: `
Du er en makroanalytiker som skal vurdere det overordnede markedsregimet for kryptovaluta-markedet.

INSTRUKSJONER:
1. Analyser hele kryptomarkedet (ikke én spesifikk coin)
2. Vurder om vi er i: bull (oppgang), bear (nedgang), range (sideways), eller unclear (uklart)
3. Identifiser hoveddrivere og risikofaktorer
4. Returner KUN gyldig JSON som matcher skjemaet nedenfor

RETURNSKJEMA:
{
  "regime": "bull|bear|range|unclear",
  "confidence": 0.75,
  "reasoning_excerpt": "Kort begrunnelse for regime-vurderingen (maks 200 tegn)",
  "risk_flags": ["regulatory_crackdown", "exchange_risk", "liquidity_concern"],
  "sources": [
    { "title": "Kildenavn", "url": "https://..." }
  ]
}

VIKTIG:
- Regime må være ett av: "bull", "bear", "range", "unclear"
- Confidence må være 0-1
- Risk_flags er valgfri liste med risikofaktorer
- JSON må være gyldig og komplett
`,

  EXPLAIN_SIGNAL: (input: {
    symbol: string;
    timeframe: string;
    decision: string;
    score: number;
    risk_level: number;
    factors: Record<string, number>;
    userRiskProfile: string;
  }): string => `
Du er en pedagogisk investeringsveileder for Klarpakke Universitet. Forklar et trading-signal på en enkel måte for en norsk småsparere med lav teknisk kompetanse.

SIGNALEINFO:
- Symbol: ${input.symbol}
- Tidsramme: ${input.timeframe}
- Anbefaling: ${input.decision}
- Score: ${input.score}/100
- Risikonivå: ${input.risk_level}/5
- Brukerens risikoprofil: ${input.userRiskProfile}

FAKTORER:
${Object.entries(input.factors)
  .map(([key, value]) => `- ${key}: ${value.toFixed(2)}`)
  .join('\n')}

INSTRUKSJONER:
1. Bruk enkel, forståelig norsk (ikke fagsjargong)
2. Vær nøktern - ikke overdriv eller hype
3. Inkluder alltid en risikoadvarsel
4. Presiser at historisk avkastning ikke garanterer fremtidig resultat
5. Returner KUN gyldig JSON

RETURNSKJEMA:
{
  "title": "Kort, beskrivende tittel på signalet",
  "summary": "2-4 setninger med lettlest forklaring",
  "key_points": [
    "Viktig poeng 1",
    "Viktig poeng 2"
  ],
  "risk_warnings": [
    "Tydelig risikoadvarsel 1",
    "Tydelig risikoadvarsel 2"
  ],
  "sources": [
    { "title": "Kildenavn", "url": "https://..." }
  ]
}

VIKTIG:
- Hold tittelen under 60 tegn
- Summary skal være forståelig for noen uten trading-erfaring
- Alltid inkluder minst én risikoadvarsel om at trading er risikofullt
- JSON må være gyldig og komplett
`,

  /**
   * MARKET_SENTIMENT - Nyhetsbasert sentiment analyse for auto-trading filter
   * 
   * Brukes til å blokkere trades når det er negativt sentiment med høy confidence.
   * Regel: Hvis recommendation === 'avoid' OG confidence > 0.7 → blokker trade
   */
  MARKET_SENTIMENT: (input: { symbol: string }): string => `
Du er en finansiell nyhetsanalytiker for en krypto trading-plattform. Analyser SISTE NYHETER for ${input.symbol} fra de siste 12-24 timer.

OPPGAVE:
1. Søk i åpne webkilder etter nyheter om ${input.symbol}
2. Vurder om nyhetene er: POSITIVE (kan kjøpe), NEUTRALE (hold), eller NEGATIVE (unngå)
3. Returner KUN gyldig JSON med strukturen nedenfor

RETURNSKJEMA:
{
  "symbol": "${input.symbol}",
  "recommendation": "buy|hold|avoid",
  "confidence": 0.85,
  "sentiment_score": 0.3,
  "news_count": 12,
  "key_headlines": [
    "Kort oppsummering av viktig nyhet 1",
    "Kort oppsummering av viktig nyhet 2"
  ],
  "reasoning_excerpt": "Kort begrunnelse for anbefalingen (maks 150 tegn)",
  "sources": [
    { "title": "Kildenavn", "url": "https://..." }
  ],
  "risk_flags": ["regulatory_concern", "exchange_issue"]
}

FELT-BESKRIVELSER:
- recommendation: "buy" hvis nyheter er positive, "hold" hvis nøytrale/usikre, "avoid" hvis negative
- confidence: 0.0 til 1.0 (hvor sikker er du på anbefalingen)
- sentiment_score: -1.0 (veldig negativt) til 1.0 (veldig positivt)
- news_count: antall relevante nyheter funnet
- key_headlines: opptil 3 viktige nyhetshodesett
- risk_flags: valgfri liste med risikofaktorer (f.eks. "hack", "regulatory", "liquidity")

VIKTIG:
- Bruk KUN åpne, offentlige kilder
- IKKE inkluder personlige data (PII)
- recommendation MÅ være én av: "buy", "hold", "avoid"
- Høy confidence (>0.7) med "avoid" vil BLOKKERE trades automatisk
- JSON må være gyldig og komplett
`,
} as const;

// ============================================================================
// Fallback Values
// ============================================================================

export const FALLBACK_VALUES = {
  narrative_sentiment: 0,
  event_risk: 0,
  market_regime: 'unclear' as const,
} as const;
