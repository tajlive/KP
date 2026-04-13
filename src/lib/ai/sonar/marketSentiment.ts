/**
 * Market Sentiment Service
 * Perplexity Sonar Pro-basert news-sentiment analyse for auto-trading filter
 * 
 * Bruksmønster:
 * - Kaller Sonar Pro med nyhets-søk for gitt symbol
 * - Returnerer strukturert sentiment med recommendation (buy/hold/avoid)
 * - Brukes i auto-trade pipeline for å blokkere trades når confidence > 0.7 og recommendation = 'avoid'
 * 
 * Cache: 15 minutter i sonar_sentiment_cache tabellen
 */

import { callSonar } from './client';
import { PROMPT_TEMPLATES } from './config';
import type { SonarTier, SonarMode } from './types';

// Re-eksporter typer
export type {
  MarketSentimentResult,
  SentimentRecommendation,
  SentimentCacheEntry,
} from './types';

import type { MarketSentimentResult, SentimentRecommendation } from './types';

// Konstanter
const SENTIMENT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutter
const SENTIMENT_MIN_CONFIDENCE_BLOCK = 0.7; // Blokker hvis confidence > 0.7

/**
 * Hent markedsentiment for et symbol fra Sonar Pro
 * 
 * @param symbol - Krypto-symbol (f.eks. "BTC", "ETH")
 * @param options - Optional konfigurasjon
 * @returns MarketSentimentResult med recommendation, confidence, sources
 */
export async function getMarketSentiment(
  symbol: string,
  options?: {
    tier?: SonarTier;
    mode?: SonarMode;
    useCache?: boolean;
  }
): Promise<MarketSentimentResult> {
  const { 
    tier = 'sonar-pro', 
    mode = 'high',
    useCache = true 
  } = options || {};

  // Sjekk cache hvis aktivert
  if (useCache) {
    const cached = await getCachedSentiment(symbol);
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
  }

  // Bygg prompt
  const prompt = PROMPT_TEMPLATES.MARKET_SENTIMENT({ symbol });

  // Kall Sonar Pro
  const response = await callSonar(prompt, {
    tier,
    mode,
    jsonMode: true,
  });

  // Parse JSON-respons
  const parsed = parseSentimentResponse(response, symbol);

  // Cache resultatet
  if (useCache) {
    await cacheSentiment(symbol, parsed);
  }

  return parsed;
}

/**
 * Sjekk om en trade skal blokkeres basert på sentiment
 * 
 * Regel: Blokker hvis recommendation === 'avoid' OG confidence > 0.7
 * 
 * @param sentiment - MarketSentimentResult fra getMarketSentiment()
 * @returns { shouldBlock: boolean, reason?: string }
 */
export function shouldBlockTrade(
  sentiment: MarketSentimentResult
): { shouldBlock: boolean; reason?: string } {
  if (
    sentiment.recommendation === 'avoid' && 
    sentiment.confidence > SENTIMENT_MIN_CONFIDENCE_BLOCK
  ) {
    return {
      shouldBlock: true,
      reason: `Trade blocked: Negative news sentiment (${sentiment.confidence.toFixed(2)} confidence). ${sentiment.reasoning_excerpt}`,
    };
  }

  return { shouldBlock: false };
}

/**
 * Hent sentiment fra cache (server-side Supabase client kreves)
 * 
 * @param symbol - Krypto-symbol
 * @returns Cache entry eller null
 */
async function getCachedSentiment(
  symbol: string
): Promise<{ data: MarketSentimentResult; timestamp: number } | null> {
  try {
    // Dynamisk import for å unngå bundle issues på client-side
    const { createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('sonar_sentiment_cache')
      .select('sentiment_data, created_at')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      data: data.sentiment_data as any as MarketSentimentResult,
      timestamp: new Date(data.created_at).getTime(),
    };
  } catch (error) {
    // Cache miss eller feil - fortsett uten cache
    return null;
  }
}

/**
 * Sjekk om cache fortsatt er gyldig
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < SENTIMENT_CACHE_TTL_MS;
}

/**
 * Lagre sentiment i cache
 */
async function cacheSentiment(
  symbol: string,
  sentiment: MarketSentimentResult
): Promise<void> {
  try {
    const { createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('sonar_sentiment_cache') as any).upsert(
      {
        symbol: symbol.toUpperCase(),
        sentiment_data: sentiment,
        recommendation: sentiment.recommendation,
        confidence: sentiment.confidence,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'symbol' }
    );
  } catch (error) {
    // Ignorer cache-feil - ikke kast videre
  }
}

/**
 * Parse JSON-respons fra Sonar Pro
 */
function parseSentimentResponse(
  response: string,
  symbol: string
): MarketSentimentResult {
  try {
    const parsed = JSON.parse(response);

    // Valider required felter
    const recommendation = validateRecommendation(parsed.recommendation);
    const confidence = validateConfidence(parsed.confidence);

    return {
      symbol: parsed.symbol || symbol.toUpperCase(),
      recommendation,
      confidence,
      sentiment_score: validateSentimentScore(parsed.sentiment_score),
      news_count: parsed.news_count ?? 0,
      key_headlines: parsed.key_headlines || [],
      reasoning_excerpt: parsed.reasoning_excerpt || '',
      sources: parsed.sources || [],
      risk_flags: parsed.risk_flags || [],
      analyzed_at: new Date().toISOString(),
    };
  } catch (error) {
    // Fallback ved parse-feil
    return {
      symbol: symbol.toUpperCase(),
      recommendation: 'hold',
      confidence: 0.5,
      sentiment_score: 0,
      news_count: 0,
      key_headlines: [],
      reasoning_excerpt: 'Failed to parse sentiment response',
      sources: [],
      risk_flags: ['parse_error'],
      analyzed_at: new Date().toISOString(),
    };
  }
}

/**
 * Valider recommendation verdi
 */
function validateRecommendation(value: unknown): SentimentRecommendation {
  const valid: SentimentRecommendation[] = ['buy', 'hold', 'avoid'];
  if (typeof value === 'string' && valid.includes(value as SentimentRecommendation)) {
    return value as SentimentRecommendation;
  }
  return 'hold';
}

/**
 * Valider confidence (0-1)
 */
function validateConfidence(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(value as string);
  if (!isNaN(num) && num >= 0 && num <= 1) {
    return num;
  }
  return 0.5;
}

/**
 * Valider sentiment_score (-1 til 1)
 */
function validateSentimentScore(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(value as string);
  if (!isNaN(num) && num >= -1 && num <= 1) {
    return num;
  }
  return 0;
}

// ============================================================================
// Edge Function Helpers (brukes i supabase/functions/auto-trade/)
// ============================================================================

/**
 * Hent sentiment fra Edge Function-kontekst (med Supabase admin client)
 * 
 * Brukes i auto-trade Edge Function hvor vi har service_role tilgang
 */
export async function getMarketSentimentForEdgeFunction(
  symbol: string,
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{ data: { sentiment_data: MarketSentimentResult; created_at: string } | null; error?: Error }>;
        };
        order: (column: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: Array<{ sentiment_data: MarketSentimentResult; created_at: string }> | null; error?: Error }>;
        };
      };
    };
  },
  perplexityApiKey: string
): Promise<MarketSentimentResult> {
  // Sjekk cache først
  const { data: cached } = await supabase
    .from('sonar_sentiment_cache')
    .select('sentiment_data, created_at')
    .eq('symbol', symbol.toUpperCase())
    .single();

  if (cached && isCacheValid(new Date(cached.created_at).getTime())) {
    return cached.sentiment_data as MarketSentimentResult;
  }

  // Kall Sonar Pro direkte fra Edge Function
  const prompt = PROMPT_TEMPLATES.MARKET_SENTIMENT({ symbol });
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.1,
      return_citations: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sonar API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '{}';
  
  const parsed = parseSentimentResponse(content, symbol);

  // Cache resultatet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('sonar_sentiment_cache') as any).upsert(
    {
      symbol: symbol.toUpperCase(),
      sentiment_data: parsed,
      recommendation: parsed.recommendation,
      confidence: parsed.confidence,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'symbol' }
  );

  return parsed;
}

/**
 * Sjekk om trade skal blokkeres (Edge Function versjon)
 */
export function checkSentimentBlock(
  sentiment: MarketSentimentResult
): { blocked: boolean; reason?: string; loggedAt: string } {
  const { shouldBlock, reason } = shouldBlockTrade(sentiment);
  
  return {
    blocked: shouldBlock,
    reason,
    loggedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Metrikker og Helse
// ============================================================================

/**
 * Hent metrikker for sentiment-tjenesten
 */
export async function getSentimentMetrics(): Promise<{
  cacheHitRate: number;
  totalAnalyses: number;
  blockedTrades24h: number;
}> {
  try {
    const { createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();

    // Hent antall cache entries
    const { count: totalCached } = await supabase
      .from('sonar_sentiment_cache')
      .select('*', { count: 'exact', head: true });

    // Hent antall blokkerte trades fra ai_decision_log
    const { count: blockedCount } = await supabase
      .from('ai_decision_log')
      .select('*', { count: 'exact', head: true })
      .eq('decision_type', 'SENTIMENT_BLOCK')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return {
      cacheHitRate: 0, // Beregnes ved behov
      totalAnalyses: totalCached || 0,
      blockedTrades24h: blockedCount || 0,
    };
  } catch (error) {
    return {
      cacheHitRate: 0,
      totalAnalyses: 0,
      blockedTrades24h: 0,
    };
  }
}
