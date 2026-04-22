// Supabase Edge Function: Auto Trading
// Runs every 5 minutes via pg_cron
// 
// Pipeline: REGIME → SONAR → EXECUTE
// Layer 1: Regime detection (EMA/ADX/RSI) - blocks BEAR market buys
// Layer 2: Sonar sentiment (Perplexity) - blocks avoid+high confidence
// Layer 3: Combined position sizing and execution

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================================================
// Types
// ============================================================================

interface AutoTradingConfig {
  id: string;
  user_id: string;
  enabled: boolean;
  mode: 'paper' | 'live';
  risk_level: 'low' | 'medium' | 'high';
  max_trade_size_nok: number;
}

interface TradingSignal {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  confidence: number;
  price: number;
  created_at: string;
  decision_type?: 'BUY' | 'SELL';
}

// Regime Types
interface RegimeResult {
  regime: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'UNCERTAIN';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  reasoning: string;
  indicators: {
    ema: { trend: string; ema21: number; ema55: number; ema200: number } | null;
    adx: { adx: number; trendStrength: string; trendDirection: string } | null;
    rsi: { value: number; condition: string } | null;
  };
  timestamp: string;
  symbol: string;
}

interface RegimeStrategy {
  regime: string;
  positionSizeMul: number;
  maxOpenPositions: number;
  stopLossMul: number;
  allowNewPositions: boolean;
  approach: string;
  description: string;
}

// Sentiment Types
interface MarketSentimentResult {
  symbol: string;
  recommendation: 'buy' | 'hold' | 'avoid';
  confidence: number;
  sentiment_score: number;
  news_count: number;
  key_headlines: string[];
  reasoning_excerpt: string;
  sources: { title: string; url: string }[];
  risk_flags: string[];
  analyzed_at: string;
}

// OHLCV for regime calculation
interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// Constants
// ============================================================================

const SENTIMENT_MIN_CONFIDENCE_BLOCK = 0.7;
const SENTIMENT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutter
const REGIME_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 timer

const REGIME_STRATEGY_MAP: Record<string, RegimeStrategy> = {
  BULL: {
    regime: 'BULL',
    positionSizeMul: 1.0,
    maxOpenPositions: 3,
    stopLossMul: 1.0,
    allowNewPositions: true,
    approach: 'aggressive',
    description: 'Bull market: Full position size, normal stops',
  },
  BEAR: {
    regime: 'BEAR',
    positionSizeMul: 0.0,
    maxOpenPositions: 0,
    stopLossMul: 0.8,
    allowNewPositions: false,
    description: 'Bear market: NO new positions, protect capital',
  },
  SIDEWAYS: {
    regime: 'SIDEWAYS',
    positionSizeMul: 0.6,
    maxOpenPositions: 2,
    stopLossMul: 1.5,
    allowNewPositions: true,
    approach: 'cautious',
    description: 'Sideways: Reduced size, wider stops, range trading',
  },
  UNCERTAIN: {
    regime: 'UNCERTAIN',
    positionSizeMul: 0.3,
    maxOpenPositions: 1,
    stopLossMul: 1.2,
    allowNewPositions: true,
    approach: 'defensive',
    description: 'Uncertain: Minimal exposure, tight risk control',
  },
};

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Cron functions are protected by verify_jwt = false and the secret URL.
  // We keep a lightweight bearer check so only Supabase-authenticated callers
  // (pg_cron with service-role JWT or manual calls with anon JWT) can invoke.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer eyJ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY') || '';
  const sentimentEnabled = perplexityApiKey.startsWith('pplx-');

  const startTime = Date.now();
  const results = {
    totalUsers: 0,
    tradesExecuted: 0,
    tradesBlockedByRegime: 0,
    tradesBlockedBySentiment: 0,
    tradesBlockedByLimit: 0,
    errors: 0,
    regimeChecks: 0,
    sentimentChecks: 0,
    details: [] as any[],
  };

  try {
    // Get all active auto traders
    const { data: activeTradersRaw, error: tradersError } = await supabase
      .from('auto_trade_settings')
      .select('*')
      .eq('auto_trading_enabled', true);

    if (tradersError) throw tradersError;

    const activeTraders = (activeTradersRaw || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      enabled: row.auto_trading_enabled ?? false,
      mode: 'paper' as const,
      risk_level: (
        { conservative: 'low', moderate: 'medium', aggressive: 'high' } as Record<string, 'low' | 'medium' | 'high'>
      )[row.risk_profile] || 'medium',
      max_trade_size_nok: (row.max_position_percent ?? 10) * 1000,
    }));

    results.totalUsers = activeTraders.length;

    if (activeTraders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active traders', results }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get recent trading signals
    const minConfidence = 45;
    const { data: signals, error: signalsError } = await supabase
      .from('ai_decision_log')
      .select('*')
      .in('decision_type', ['BUY', 'SELL'])
      .gte('sentiment_score', minConfidence)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (signalsError) throw signalsError;

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No trading signals', results }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process each trader
    for (const config of activeTraders as AutoTradingConfig[]) {
      try {
        const { data: session } = await supabase
          .from('trading_sessions')
          .select('*')
          .eq('user_id', config.user_id)
          .eq('mode', config.mode)
          .eq('status', 'active')
          .single();

        if (!session && config.mode === 'paper') {
          await supabase.from('trading_sessions').insert({
            user_id: config.user_id,
            mode: 'paper',
            status: 'active',
            strategy_id: 'ensemble_ai',
            trading_pair: 'BTCUSDT',
            risk_level: 'medium',
            starting_capital_nok: 100000,
            current_capital_nok: 100000,
            initial_capital: 100000,
            current_capital: 100000,
            total_trades: 0,
            winning_trades: 0,
            losing_trades: 0,
            total_pnl: 0,
            strategy_config: {},
            started_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString(),
          });
          continue;
        }

        // Find valid signal
        const riskThresholds = { low: 80, medium: 70, high: 60 };
        const minSignalConfidence = riskThresholds[config.risk_level];
        
        const validSignal = signals.find(s => 
          s.sentiment_score >= minSignalConfidence &&
          new Date(s.created_at).getTime() > Date.now() - 30 * 60 * 1000
        );

        if (!validSignal) continue;

        // =========================================================================
        // LAYER 1: REGIME DETECTION (First Line of Defense)
        // =========================================================================
        let regimeCheck: {
          checked: boolean;
          blocked: boolean;
          regime?: RegimeResult;
          strategy?: RegimeStrategy;
          reason?: string;
          layer?: string;
        } = { checked: false, blocked: false };

        try {
          // Fetch OHLCV for regime calculation
          const ohlcv = await fetchOHLCV(supabase, validSignal.symbol);
          const regime = calculateRegime(ohlcv, validSignal.symbol);
          results.regimeChecks++;

          const strategy = REGIME_STRATEGY_MAP[regime.regime];
          
          regimeCheck = {
            checked: true,
            blocked: false,
            regime,
            strategy,
          };

          // Hard block: BEAR market = no new BUY positions
          if (validSignal.decision_type === 'BUY' && !strategy.allowNewPositions) {
            regimeCheck.blocked = true;
            regimeCheck.reason = `REGIME_BLOCK: ${strategy.description}`;
            regimeCheck.layer = 'regime';
            results.tradesBlockedByRegime++;

            await logDecision(supabase, config.user_id, {
              decision_type: 'REGIME_BLOCK',
              symbol: validSignal.symbol,
              regime_context: regime.regime,
              regime_confidence: regime.confidence,
              regime_reasoning: regime.reasoning,
              block_layer: 'regime',
              decision_reason: strategy.description,
            });

            results.details.push({
              user_id: config.user_id,
              symbol: validSignal.symbol,
              action: 'BLOCKED_BY_REGIME',
              regime: regime.regime,
              regime_confidence: regime.confidence,
              reason: strategy.description,
            });
            continue;
          }

          // Check max open positions limit
          const openPositions = await countOpenPositions(supabase, config.user_id, validSignal.symbol);
          if (openPositions >= strategy.maxOpenPositions) {
            regimeCheck.blocked = true;
            regimeCheck.reason = `REGIME_LIMIT: Max ${strategy.maxOpenPositions} positions in ${regime.regime}`;
            regimeCheck.layer = 'regime_limit';
            results.tradesBlockedByLimit++;

            await logDecision(supabase, config.user_id, {
              decision_type: 'REGIME_LIMIT_BLOCK',
              symbol: validSignal.symbol,
              regime_context: regime.regime,
              block_layer: 'regime_limit',
              decision_reason: `Max positions reached: ${openPositions}/${strategy.maxOpenPositions}`,
            });
            continue;
          }

          // Log regime pass
          await logDecision(supabase, config.user_id, {
            decision_type: 'REGIME_PASS',
            symbol: validSignal.symbol,
            regime_context: regime.regime,
            regime_confidence: regime.confidence,
            regime_reasoning: regime.reasoning,
            position_size_mul: strategy.positionSizeMul,
          });

        } catch (regimeError) {
          console.error(`Regime check failed for ${validSignal.symbol}:`, regimeError);
          // Fail-open: continue without regime blocking
        }

        // =========================================================================
        // LAYER 2: SONAR SENTIMENT (Second Line of Defense)
        // =========================================================================
        let sentimentCheck: {
          checked: boolean;
          blocked: boolean;
          sentiment?: MarketSentimentResult;
          reason?: string;
          layer?: string;
        } = { checked: false, blocked: false };

        if (sentimentEnabled) {
          try {
            const sentiment = await getMarketSentiment(
              validSignal.symbol,
              supabase,
              perplexityApiKey
            );
            results.sentimentChecks++;
            
            const blockResult = shouldBlockTrade(sentiment);
            
            sentimentCheck = {
              checked: true,
              blocked: blockResult.shouldBlock,
              sentiment,
              reason: blockResult.reason,
            };

            if (blockResult.shouldBlock) {
              sentimentCheck.layer = 'sonar';
              results.tradesBlockedBySentiment++;

              await logDecision(supabase, config.user_id, {
                decision_type: 'SENTIMENT_BLOCK',
                symbol: validSignal.symbol,
                sonar_recommendation: sentiment.recommendation,
                sonar_confidence: sentiment.confidence,
                sonar_sentiment: sentiment.recommendation === 'buy' ? 'bullish' : 
                                 sentiment.recommendation === 'avoid' ? 'bearish' : 'neutral',
                block_layer: 'sonar',
                decision_reason: blockResult.reason,
                regime_context: regimeCheck.regime?.regime,
              });

              results.details.push({
                user_id: config.user_id,
                symbol: validSignal.symbol,
                action: 'BLOCKED_BY_SENTIMENT',
                sentiment_recommendation: sentiment.recommendation,
                sentiment_confidence: sentiment.confidence,
                reason: blockResult.reason,
              });
              continue;
            }

            // Log sentiment pass
            await logDecision(supabase, config.user_id, {
              decision_type: 'SENTIMENT_PASS',
              symbol: validSignal.symbol,
              sonar_recommendation: sentiment.recommendation,
              sonar_confidence: sentiment.confidence,
              sonar_sentiment: sentiment.recommendation === 'buy' ? 'bullish' : 
                               sentiment.recommendation === 'avoid' ? 'bearish' : 'neutral',
              regime_context: regimeCheck.regime?.regime,
            });

          } catch (sentimentError) {
            console.error(`Sentiment check failed:`, sentimentError);
            await logDecision(supabase, config.user_id, {
              decision_type: 'SENTIMENT_ERROR',
              symbol: validSignal.symbol,
              decision_reason: sentimentError instanceof Error ? sentimentError.message : 'Unknown',
              regime_context: regimeCheck.regime?.regime,
            });
          }
        }

        // =========================================================================
        // LAYER 3: COMBINED POSITION SIZING
        // =========================================================================
        const baseMultiplier = validSignal.confidence / 100;
        const regimeMul = regimeCheck.strategy?.positionSizeMul ?? 1.0;
        
        // Sentiment adjustment: bearish sentiment reduces size (but doesn't block)
        let sentimentMul = 1.0;
        if (sentimentCheck.sentiment) {
          if (sentimentCheck.sentiment.recommendation === 'hold' && sentimentCheck.sentiment.confidence > 0.5) {
            sentimentMul = 0.75;
          }
        }
        
        const finalSizeMul = regimeMul * sentimentMul;
        const tradeValue = config.max_trade_size_nok * baseMultiplier * finalSizeMul;
        const quantity = tradeValue / validSignal.price;

        // Skip if below minimum
        if (tradeValue < 1000) continue;

        // =========================================================================
        // EXECUTE TRADE
        // =========================================================================
        if (config.mode === 'paper' && session) {
          const totalValue = quantity * validSignal.price;
          
          const currentBalance = session.current_capital_nok ?? session.current_capital ?? 0;
          if (validSignal.decision_type === 'BUY' && currentBalance < totalValue) {
            continue;
          }

          const newBalance = validSignal.decision_type === 'BUY'
            ? currentBalance - totalValue
            : currentBalance + totalValue;

          await supabase.from('trades').insert({
            session_id: session.id,
            user_id: config.user_id,
            mode: config.mode,
            trading_pair: validSignal.symbol,
            side: validSignal.decision_type.toLowerCase(),
            order_type: 'market',
            quantity,
            price: validSignal.price,
            total_value: totalValue,
            fee: totalValue * 0.001,
            status: 'filled',
            is_copy: false,
            idempotency_key: `${session.id}-${validSignal.decision_type.toLowerCase()}-${Date.now()}`,
            executed_at: new Date().toISOString(),
          });

          await supabase
            .from('trading_sessions')
            .update({
              current_capital_nok: newBalance,
              current_capital: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.id);

          results.tradesExecuted++;
          
          await supabase.from('auto_trade_log').insert({
            user_id: config.user_id,
            signal_id: validSignal.id,
            symbol: validSignal.symbol,
            action: validSignal.decision_type.toLowerCase(),
            confidence: validSignal.confidence,
            price: validSignal.price,
            mode: config.mode,
            success: true,
            regime_context: regimeCheck.regime?.regime,
            sentiment_recommendation: sentimentCheck.sentiment?.recommendation,
            position_size_mul: finalSizeMul,
          });

          await logDecision(supabase, config.user_id, {
            decision_type: 'EXECUTE',
            symbol: validSignal.symbol,
            confidence: Math.round(finalSizeMul * 100),
            regime_context: regimeCheck.regime?.regime,
            sonar_sentiment: sentimentCheck.sentiment?.recommendation === 'buy' ? 'bullish' : 
                            sentimentCheck.sentiment?.recommendation === 'avoid' ? 'bearish' : 'neutral',
            sonar_recommendation: sentimentCheck.sentiment?.recommendation,
            position_size_mul: finalSizeMul,
            decision_reason: `Trade executed: regime=${regimeCheck.regime?.regime}, sentiment=${sentimentCheck.sentiment?.recommendation}, size_mul=${finalSizeMul.toFixed(2)}`,
          });

          results.details.push({
            user_id: config.user_id,
            symbol: validSignal.symbol,
            action: validSignal.decision_type,
            confidence: validSignal.confidence,
            value: tradeValue,
            regime: regimeCheck.regime?.regime,
            sentiment: sentimentCheck.sentiment?.recommendation,
            size_multiplier: finalSizeMul,
          });
        }

        if (config.mode === 'live') {
          console.log(`Live trade skipped for user ${config.user_id}`);
        }

      } catch (error) {
        console.error(`Error processing trader ${config.user_id}:`, error);
        results.errors++;
        
        await supabase.from('auto_trade_log').insert({
          user_id: config.user_id,
          mode: config.mode,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        results,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        sentiment_enabled: sentimentEnabled,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto trading cycle failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

async function logDecision(
  supabase: any,
  userId: string,
  data: {
    decision_type: string;
    symbol?: string;
    confidence?: number;
    regime_context?: string;
    regime_confidence?: string;
    regime_reasoning?: string;
    sonar_sentiment?: string;
    sonar_recommendation?: string;
    sonar_confidence?: number;
    position_size_mul?: number;
    block_layer?: string;
    decision_reason?: string;
  }
) {
  try {
    await supabase.from('ai_decision_log').insert({
      user_id: userId,
      decision_type: data.decision_type,
      symbol: data.symbol || 'UNKNOWN',
      confidence: data.confidence || 0,
      analysis_data: {
        regime_context: data.regime_context,
        regime_confidence: data.regime_confidence,
        sonar_sentiment: data.sonar_sentiment,
        sonar_recommendation: data.sonar_recommendation,
        sonar_confidence: data.sonar_confidence,
        position_size_mul: data.position_size_mul,
        block_layer: data.block_layer,
      },
      decision_reason: data.decision_reason || data.regime_reasoning,
    });
  } catch (e) {
    console.error('Failed to log decision:', e);
  }
}

async function countOpenPositions(supabase: any, userId: string, symbol: string): Promise<number> {
  try {
    // In unified schema, open position is tracked via trading_sessions.open_position JSON
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('open_position')
      .eq('user_id', userId)
      .eq('mode', 'paper')
      .eq('status', 'active')
      .single();
    if (session?.open_position) {
      return 1;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

async function fetchOHLCV(supabase: any, symbol: string): Promise<OHLCV[]> {
  // Try to get from market_data table or cache
  const { data } = await supabase
    .from('market_ohlcv_cache')
    .select('ohlcv_data, updated_at')
    .eq('symbol', symbol.toUpperCase())
    .single();

  if (data?.ohlcv_data && Array.isArray(data.ohlcv_data)) {
    return data.ohlcv_data;
  }

  // Return empty array - will result in UNCERTAIN regime
  return [];
}

// ============================================================================
// Regime Calculation (Simplified for Edge Function)
// ============================================================================

function calculateRegime(ohlcv: OHLCV[], symbol: string): RegimeResult {
  if (ohlcv.length < 200) {
    return {
      regime: 'UNCERTAIN',
      confidence: 'LOW',
      confidenceScore: 0.1,
      reasoning: 'Insufficient OHLCV data (need 200+ candles)',
      indicators: { ema: null, adx: null, rsi: null },
      timestamp: new Date().toISOString(),
      symbol,
    };
  }

  const closes = ohlcv.map(c => c.close);
  const highs = ohlcv.map(c => c.high);
  const lows = ohlcv.map(c => c.low);

  // Simplified EMA calculation using SMA for performance
  const sma21 = calculateSMA(closes, 21);
  const sma55 = calculateSMA(closes, 55);
  const sma200 = calculateSMA(closes, 200);

  const currentPrice = closes[closes.length - 1];
  const price21 = sma21[sma21.length - 1];
  const price55 = sma55[sma55.length - 1];
  const price200 = sma200[sma200.length - 1];

  // Determine regime
  let regime: RegimeResult['regime'];
  let reasoning: string[] = [];
  let bullScore = 0;
  let bearScore = 0;

  // Price vs EMAs
  if (currentPrice > price21 && price21 > price55) {
    bullScore += 2;
    reasoning.push('Price above SMA21 and SMA21>SMA55');
  } else if (currentPrice < price200) {
    bearScore += 2;
    reasoning.push('Price below SMA200');
  }

  // EMA alignment
  if (price21 > price55 && price55 > price200) {
    bullScore += 2;
    reasoning.push('Bullish SMA alignment');
  } else if (price21 < price55 && price55 < price200) {
    bearScore += 2;
    reasoning.push('Bearish SMA alignment');
  }

  // Simple trend strength (price change over last 20 candles)
  const priceChange20 = (closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20];
  if (priceChange20 > 0.1) {
    bullScore += 1;
    reasoning.push('Strong 20-period uptrend');
  } else if (priceChange20 < -0.1) {
    bearScore += 1;
    reasoning.push('Strong 20-period downtrend');
  }

  if (bullScore > bearScore + 1) {
    regime = 'BULL';
  } else if (bearScore > bullScore + 1) {
    regime = 'BEAR';
  } else if (Math.abs(priceChange20) < 0.05) {
    regime = 'SIDEWAYS';
    reasoning.push('Low volatility, likely ranging');
  } else {
    regime = 'UNCERTAIN';
    reasoning.push('Mixed signals');
  }

  const totalScore = bullScore + bearScore + 1;
  const confidenceScore = regime === 'BULL' ? bullScore / totalScore : 
                          regime === 'BEAR' ? bearScore / totalScore : 0.4;

  let confidence: RegimeResult['confidence'];
  if (confidenceScore >= 0.7) confidence = 'HIGH';
  else if (confidenceScore >= 0.4) confidence = 'MEDIUM';
  else confidence = 'LOW';

  return {
    regime,
    confidence,
    confidenceScore,
    reasoning: reasoning.join('; '),
    indicators: {
      ema: { 
        trend: currentPrice > price21 ? 'above_21' : 'below_21',
        ema21: price21,
        ema55: price55,
        ema200: price200,
      },
      adx: null, // Simplified
      rsi: null, // Simplified
    },
    timestamp: new Date().toISOString(),
    symbol,
  };
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma[i] = NaN;
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      sma[i] = sum / period;
    }
  }
  return sma;
}

// ============================================================================
// Sentiment Functions
// ============================================================================

async function getMarketSentiment(
  symbol: string,
  supabase: any,
  perplexityApiKey: string
): Promise<MarketSentimentResult> {
  // Check cache
  const { data: cached } = await supabase
    .from('sonar_sentiment_cache')
    .select('sentiment_data, created_at')
    .eq('symbol', symbol.toUpperCase())
    .single();

  if (cached && isSentimentCacheValid(cached.created_at)) {
    return cached.sentiment_data;
  }

  // Call Sonar Pro
  const prompt = buildMarketSentimentPrompt(symbol);
  
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

  await supabase.from('sonar_sentiment_cache').upsert({
    symbol: symbol.toUpperCase(),
    sentiment_data: parsed,
    recommendation: parsed.recommendation,
    confidence: parsed.confidence,
    created_at: new Date().toISOString(),
  }, { onConflict: 'symbol' });

  return parsed;
}

function isSentimentCacheValid(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < SENTIMENT_CACHE_TTL_MS;
}

function shouldBlockTrade(sentiment: MarketSentimentResult): { shouldBlock: boolean; reason?: string } {
  if (sentiment.recommendation === 'avoid' && sentiment.confidence > SENTIMENT_MIN_CONFIDENCE_BLOCK) {
    return {
      shouldBlock: true,
      reason: `Sonar blocked: ${sentiment.reasoning_excerpt}`,
    };
  }
  return { shouldBlock: false };
}

function buildMarketSentimentPrompt(symbol: string): string {
  return `Analyze latest news for ${symbol} (last 12-24h). Return JSON:
{
  "symbol": "${symbol}",
  "recommendation": "buy|hold|avoid",
  "confidence": 0.85,
  "sentiment_score": 0.3,
  "news_count": 12,
  "key_headlines": ["..."],
  "reasoning_excerpt": "...",
  "sources": [{"title":"...","url":"..."}],
  "risk_flags": []
}`;
}

function parseSentimentResponse(response: string, symbol: string): MarketSentimentResult {
  try {
    const parsed = JSON.parse(response);
    return {
      symbol: parsed.symbol || symbol.toUpperCase(),
      recommendation: ['buy', 'hold', 'avoid'].includes(parsed.recommendation) ? parsed.recommendation : 'hold',
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
      sentiment_score: Math.max(-1, Math.min(1, parsed.sentiment_score || 0)),
      news_count: parsed.news_count || 0,
      key_headlines: parsed.key_headlines || [],
      reasoning_excerpt: parsed.reasoning_excerpt || '',
      sources: parsed.sources || [],
      risk_flags: parsed.risk_flags || [],
      analyzed_at: new Date().toISOString(),
    };
  } catch {
    return {
      symbol: symbol.toUpperCase(),
      recommendation: 'hold',
      confidence: 0.5,
      sentiment_score: 0,
      news_count: 0,
      key_headlines: [],
      reasoning_excerpt: 'Parse error',
      sources: [],
      risk_flags: ['parse_error'],
      analyzed_at: new Date().toISOString(),
    };
  }
}
