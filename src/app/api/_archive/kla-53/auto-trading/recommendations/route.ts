

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STRATEGY RECOMMENDATIONS API
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Returns personalized strategy recommendations based on:
 * 1. Current market regime analysis
 * 2. Available strategies from database
 * 3. User's risk profile
 * 
 * Endpoint: GET /api/auto-trading/recommendations?symbol=BTCUSDT&timeframe=1h
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MarketRegimeDetector, MarketAnalysis } from '@/lib/auto-trading/market-regime-detector';
import { TimeInterval } from '@/lib/auto-trading/binance-historical-data';
import { getErrorMessage } from '@/lib/utils/error';

// Valid timeframes
const VALID_TIMEFRAMES: TimeInterval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

// Strategy suggestions based on market regime
const REGIME_STRATEGY_MAPPING: Record<string, string[]> = {
  'TRENDING_UP': ['trend_following', 'momentum', 'breakout'],
  'TRENDING_DOWN': ['trend_following_short', 'defensive', 'mean_reversion'],
  'RANGING': ['mean_reversion', 'grid_trading', 'range_trading'],
  'VOLATILE': ['breakout', 'scalping', 'defensive'],
  'UNCERTAIN': ['defensive', 'grid_trading', 'mean_reversion'],
};

// Educational links by strategy type
const EDUCATIONAL_LINKS: Record<string, { title: string; url: string; description: string }> = {
  'trend_following': {
    title: 'Trend Following Strategier',
    url: '/learn/strategies/trend-following',
    description: 'Lær å trade med trenden for konsistente gevinster',
  },
  'momentum': {
    title: 'Momentum Trading',
    url: '/learn/strategies/momentum',
    description: 'Fang store moves med momentum-indikatorer',
  },
  'breakout': {
    title: 'Breakout Trading',
    url: '/learn/strategies/breakout',
    description: 'Profiter når prisen bryter ut av rangen',
  },
  'mean_reversion': {
    title: 'Mean Reversion',
    url: '/learn/strategies/mean-reversion',
    description: 'Trade tilbake til gjennomsnittet i sideways marked',
  },
  'grid_trading': {
    title: 'Grid Trading',
    url: '/learn/strategies/grid-trading',
    description: 'Automatisk kjøp og salg innenfor et prisområde',
  },
  'range_trading': {
    title: 'Range Trading',
    url: '/learn/strategies/range-trading',
    description: 'Kjøp på støtte, selg på motstand',
  },
  'scalping': {
    title: 'Scalping',
    url: '/learn/strategies/scalping',
    description: 'Små, raske trades med høy frekvens',
  },
  'defensive': {
    title: 'Defensive Strategier',
    url: '/learn/risk-management/defensive',
    description: 'Beskytte kapital i usikre markeder',
  },
  'trend_following_short': {
    title: 'Short Selling',
    url: '/learn/strategies/short-selling',
    description: 'Profiter på fallende markeder',
  },
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();

    // ==========================================
    // AUTHENTICATION (Optional - can be public)
    // ==========================================
    const { data: { user } } = await supabase.auth.getUser();

    // ==========================================
    // PARSE QUERY PARAMETERS
    // ==========================================
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const timeframe = (searchParams.get('timeframe') || '1h') as TimeInterval;
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10);

    // Validate timeframe
    if (!VALID_TIMEFRAMES.includes(timeframe)) {
      return NextResponse.json(
        {
          error: 'Invalid timeframe',
          message: `Timeframe must be one of: ${VALID_TIMEFRAMES.join(', ')}`,
          received: timeframe,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // FETCH: Market Analysis
    // ==========================================
    const detector = new MarketRegimeDetector();
    let analysis: MarketAnalysis;

    try {
      analysis = await detector.analyzeMarket(symbol, timeframe);
    } catch (error) {
      console.error('Market analysis error:', getErrorMessage(error));
      return NextResponse.json(
        {
          error: 'Failed to analyze market',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 503 }
      );
    }

    // ==========================================
    // FETCH: Available Strategies from DB
    // ==========================================
    const { data: strategies, error: strategiesError } = await supabase
      .from('auto_trading_strategies')
      .select('*')
      .eq('is_active', true)
      .order('expected_annual_return_pct', { ascending: false });

    if (strategiesError) {
      console.error('Error fetching strategies:', getErrorMessage(strategiesError));
    }

    // ==========================================
    // MATCH: Strategies to Market Regime
    // ==========================================
    const recommendedStrategyTypes = REGIME_STRATEGY_MAPPING[analysis.regime] || ['defensive'];
    
    // Score and rank strategies
    const scoredStrategies = (strategies || []).map(strategy => {
      let score = 0;
      let matchReason = '';

      // Check if strategy type matches recommended types
      const strategyType = strategy.strategy_type || strategy.name?.toLowerCase() || 'unknown';
      const isTypeMatch = recommendedStrategyTypes.some(type => 
        strategyType.includes(type) || 
        (strategy.description || '').toLowerCase().includes(type)
      );

      if (isTypeMatch) {
        score += 50;
        matchReason = 'Strategien passer godt til nåværende markedssituasjon';
      }

      // Risk level compatibility
      const marketRiskScore = analysis.regime === 'VOLATILE' ? 3 : 
                              analysis.regime === 'TRENDING_UP' ? 2 : 1;
      const strategyRiskLevel = strategy.risk_level || 'balanced';
      const strategyRiskScore = strategyRiskLevel === 'aggressive' ? 3 : 
                                strategyRiskLevel === 'balanced' ? 2 : 1;
      
      if (strategyRiskScore <= marketRiskScore + 1) {
        score += 30;
        matchReason = matchReason || 'Risikonivået er passende for markedet';
      }

      // Historical performance bonus
      if (strategy.expected_annual_return_pct && strategy.expected_annual_return_pct > 20) {
        score += 20;
      }

      return {
        ...strategy,
        score,
        matchReason: matchReason || 'Generell diversifisering',
      };
    });

    // Sort by score and take top N
    const topStrategies = scoredStrategies
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        riskLevel: s.risk_level,
        expectedReturn: s.expected_annual_return_pct,
        timeframe: s.timeframe,
        score: s.score,
        matchReason: s.matchReason,
      }));

    // ==========================================
    // BUILD: Educational Links
    // ==========================================
    const educationalLinks = recommendedStrategyTypes
      .slice(0, 3)
      .map(type => EDUCATIONAL_LINKS[type])
      .filter(Boolean);

    // ==========================================
    // RESPONSE
    // ==========================================
    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      analysis: {
        regime: analysis.regime,
        confidence: analysis.confidence,
        metrics: analysis.metrics,
        reasoning: analysis.reasoning,
      },
      strategies: topStrategies,
      recommendedApproach: analysis.recommendedStrategies.slice(0, 3),
      educationalLinks,
      performance: {
        responseTimeMs: elapsed,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in recommendations endpoint:', getErrorMessage(error));
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
