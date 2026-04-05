/**
 * Market Intelligence API Route
 * Returns combined regime + sentiment data for UI
 * 
 * GET /api/market-intelligence?symbol=BTC
 * Response time target: < 500ms (using cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectRegime, REGIME_STRATEGY_MAP, RegimeResult } from '@/services/regimeDetector';
import { getMarketSentiment } from '@/lib/ai/sonar/marketSentiment';
import { createServerClient } from '@/lib/supabase/server';
import type { MarketSentimentResult } from '@/lib/ai/sonar/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache TTL: 15 minutes for sentiment, 4 hours for regime
const SENTIMENT_CACHE_TTL_MS = 15 * 60 * 1000;
const REGIME_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

interface MarketIntelligenceResponse {
  regime: {
    type: RegimeResult['regime'];
    confidence: RegimeResult['confidence'];
    reasoning: string;
    indicators: RegimeResult['indicators'];
  };
  sentiment: {
    type: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    recommendation: MarketSentimentResult['recommendation'];
    keyEvents: string[];
    newsCount: number;
    sources: { title: string; url: string }[];
  };
  activeStrategy: {
    positionSizeMul: number;
    maxOpenPositions: number;
    approach: string;
    description: string;
    isBlockingBuys: boolean;
  };
  updatedAt: string;
  cached: boolean;
}

/**
 * GET /api/market-intelligence?symbol=BTC
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get('symbol') || 'BTC').toUpperCase();

    const supabase = await createServerClient();

    // Fetch both in parallel
    const [regimeData, sentimentData] = await Promise.all([
      getOrComputeRegime(symbol, supabase),
      getOrComputeSentiment(symbol, supabase),
    ]);

    // Determine strategy
    const strategy = REGIME_STRATEGY_MAP[regimeData.regime];
    
    // Calculate combined sentiment type
    const sentimentType = mapRecommendationToType(sentimentData.recommendation);

    const response: MarketIntelligenceResponse = {
      regime: {
        type: regimeData.regime,
        confidence: regimeData.confidence,
        reasoning: regimeData.reasoning,
        indicators: regimeData.indicators,
      },
      sentiment: {
        type: sentimentType,
        confidence: sentimentData.confidence,
        recommendation: sentimentData.recommendation,
        keyEvents: sentimentData.key_headlines,
        newsCount: sentimentData.news_count,
        sources: sentimentData.sources,
      },
      activeStrategy: {
        positionSizeMul: strategy.positionSizeMul,
        maxOpenPositions: strategy.maxOpenPositions,
        approach: strategy.approach,
        description: strategy.description,
        isBlockingBuys: !strategy.allowNewPositions,
      },
      updatedAt: new Date().toISOString(),
      cached: isCacheHit(regimeData.timestamp, sentimentData.analyzed_at),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 min browser cache
      },
    });

  } catch (error) {
    console.error('Market intelligence error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch market intelligence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get cached regime or compute new
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrComputeRegime(symbol: string, supabase: any): Promise<RegimeResult> {
  // Check cache
  const { data: cached } = await supabase
    .from('regime_cache')
    .select('regime_data, created_at')
    .eq('symbol', symbol)
    .single();

  if (cached && isRegimeCacheValid(cached.created_at)) {
    return cached.regime_data as RegimeResult;
  }

  // Fetch OHLCV data
  const ohlcv = await fetchOHLCV(supabase, symbol);
  
  // Calculate regime
  const regime = detectRegime(ohlcv, symbol);

  // Cache result
  await supabase.from('regime_cache').upsert({
    symbol,
    regime_data: regime,
    created_at: new Date().toISOString(),
  }, { onConflict: 'symbol' });

  return regime;
}

/**
 * Get cached sentiment or compute new
 */
async function getOrComputeSentiment(
  symbol: string, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<MarketSentimentResult> {
  // Check cache
  const { data: cached } = await supabase
    .from('sonar_sentiment_cache')
    .select('sentiment_data, created_at')
    .eq('symbol', symbol)
    .single();

  if (cached && isSentimentCacheValid(cached.created_at)) {
    return cached.sentiment_data as MarketSentimentResult;
  }

  // Fetch fresh sentiment
  const sentiment = await getMarketSentiment(symbol, { useCache: false });

  return sentiment;
}

/**
 * Fetch OHLCV from cache or database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOHLCV(supabase: any, symbol: string): Promise<Array<{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>> {
  // Try market cache first
  const { data: cached } = await supabase
    .from('market_ohlcv_cache')
    .select('ohlcv_data')
    .eq('symbol', symbol)
    .single();

  if (cached?.ohlcv_data && Array.isArray(cached.ohlcv_data)) {
    return cached.ohlcv_data;
  }

  // Try to fetch from market_data table
  const { data: marketData } = await supabase
    .from('market_data')
    .select('*')
    .eq('symbol', symbol)
    .order('timestamp', { ascending: true })
    .limit(500);

  if (marketData && marketData.length >= 200) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return marketData.map((d: any) => ({
      timestamp: new Date(d.timestamp).getTime(),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume || 0,
    }));
  }

  // Return empty array - will result in UNCERTAIN regime
  return [];
}

/**
 * Map sentiment recommendation to type
 */
function mapRecommendationToType(
  recommendation: MarketSentimentResult['recommendation']
): 'bullish' | 'bearish' | 'neutral' {
  switch (recommendation) {
    case 'buy': return 'bullish';
    case 'avoid': return 'bearish';
    case 'hold':
    default: return 'neutral';
  }
}

/**
 * Check if regime cache is valid (4 hours)
 */
function isRegimeCacheValid(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age < REGIME_CACHE_TTL_MS;
}

/**
 * Check if sentiment cache is valid (15 minutes)
 */
function isSentimentCacheValid(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age < SENTIMENT_CACHE_TTL_MS;
}

/**
 * Check if both were cache hits
 */
function isCacheHit(regimeTimestamp: string, sentimentTimestamp: string): boolean {
  return isRegimeCacheValid(regimeTimestamp) && isSentimentCacheValid(sentimentTimestamp);
}
