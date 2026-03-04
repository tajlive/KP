/**
 * FREE AI Inference via Cloudflare Workers AI
 * 10,000 requests/day = ~416 requests/hour (plenty for auto-trading)
 * Falls back to rule-based system if AI is unavailable
 */

import { calculateRSI, calculateSMA, calculateEMA } from './market-data';

export interface PredictionInput {
  symbol: string;
  currentPrice: number;
  priceHistory: number[]; // Last 100 prices
  sentiment: number; // -1 to 1
  marketTrend: 'bull' | 'bear' | 'sideways';
  fearGreedIndex: number;
  rsi?: number;
  sma20?: number;
  sma50?: number;
}

export interface PredictionOutput {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  targetPrice: number;
  stopLoss: number;
  reason: string;
  indicators: {
    rsi: number;
    trend: string;
    sentimentSignal: string;
  };
}

// Cloudflare Workers AI endpoint (deployed)
const CF_WORKER_URL = process.env.NEXT_PUBLIC_CF_AI_WORKER_URL || 'https://klarpakke-ai-inference.tomarnejensen.workers.dev';

/**
 * Kjør AI prediction via Cloudflare Workers AI (GRATIS)
 * 10,000 requests/dag = ~416 requests/time = plenty
 */
export async function predictTrade(input: PredictionInput): Promise<PredictionOutput> {
  try {
    // Beregn tekniske indikatorer hvis ikke allerede gitt
    const enrichedInput = {
      ...input,
      rsi: input.rsi ?? calculateRSI(input.priceHistory),
      sma20: input.sma20 ?? calculateSMA(input.priceHistory, 20),
      sma50: input.sma50 ?? calculateSMA(input.priceHistory, 50),
    };

    // Try Cloudflare Workers AI first
    try {
      const response = await fetch(CF_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedInput),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          ...result,
          indicators: {
            rsi: enrichedInput.rsi,
            trend: enrichedInput.marketTrend,
            sentimentSignal: enrichedInput.sentiment > 0.3 ? 'BULLISH' :
                            enrichedInput.sentiment < -0.3 ? 'BEARISH' : 'NEUTRAL'
          }
        };
      }
    } catch (error) {
      console.warn('Cloudflare AI failed, using fallback:', error);
    }

    // Fallback: Rule-based prediction (100% gratis, ingen API nødvendig)
    return ruleBasedPrediction(enrichedInput);
  } catch (error) {
    console.error('Prediction failed:', error);
    return fallbackPrediction(input);
  }
}

/**
 * Rule-based prediction system (100% gratis)
 * Kombinerer tekniske indikatorer med sentiment og market data
 */
function ruleBasedPrediction(input: PredictionInput): PredictionOutput {
  const { sentiment, marketTrend, fearGreedIndex, currentPrice, rsi, sma20, sma50 } = input;

  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];

  // 1. Sentiment Analysis (25% weight)
  if (sentiment > 0.5) {
    buyScore += 25;
    reasons.push('Strong bullish sentiment');
  } else if (sentiment > 0.2) {
    buyScore += 15;
    reasons.push('Moderate bullish sentiment');
  } else if (sentiment < -0.5) {
    sellScore += 25;
    reasons.push('Strong bearish sentiment');
  } else if (sentiment < -0.2) {
    sellScore += 15;
    reasons.push('Moderate bearish sentiment');
  }

  // 2. Market Trend (20% weight)
  if (marketTrend === 'bull') {
    buyScore += 20;
    reasons.push('Bull market trend');
  } else if (marketTrend === 'bear') {
    sellScore += 20;
    reasons.push('Bear market trend');
  }

  // 3. Fear & Greed Index (15% weight)
  if (fearGreedIndex > 75) {
    sellScore += 15; // Extreme greed = sell signal (contrarian)
    reasons.push('Extreme greed (contrarian)');
  } else if (fearGreedIndex > 60) {
    buyScore += 10;
    reasons.push('High greed');
  } else if (fearGreedIndex < 25) {
    buyScore += 15; // Extreme fear = buy signal (contrarian)
    reasons.push('Extreme fear (contrarian)');
  } else if (fearGreedIndex < 40) {
    sellScore += 10;
    reasons.push('High fear');
  }

  // 4. RSI (20% weight)
  if (rsi !== undefined) {
    if (rsi < 30) {
      buyScore += 20; // Oversold
      reasons.push('RSI oversold (<30)');
    } else if (rsi < 40) {
      buyScore += 10;
      reasons.push('RSI approaching oversold');
    } else if (rsi > 70) {
      sellScore += 20; // Overbought
      reasons.push('RSI overbought (>70)');
    } else if (rsi > 60) {
      sellScore += 10;
      reasons.push('RSI approaching overbought');
    }
  }

  // 5. Moving Average Crossover (20% weight)
  if (sma20 && sma50) {
    if (sma20 > sma50) {
      buyScore += 20; // Golden cross
      reasons.push('Golden cross (SMA20 > SMA50)');
    } else if (sma20 < sma50) {
      sellScore += 20; // Death cross
      reasons.push('Death cross (SMA20 < SMA50)');
    }
  }

  // Determine action
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 0.5;

  if (buyScore > sellScore + 20) {
    action = 'BUY';
    confidence = Math.min(0.95, 0.5 + (buyScore - sellScore) / 100);
  } else if (sellScore > buyScore + 20) {
    action = 'SELL';
    confidence = Math.min(0.95, 0.5 + (sellScore - buyScore) / 100);
  }

  // Calculate target and stop loss
  const targetPrice = action === 'BUY' ? currentPrice * 1.05 :
                      action === 'SELL' ? currentPrice * 0.95 : currentPrice;
  const stopLoss = action === 'BUY' ? currentPrice * 0.97 :
                   action === 'SELL' ? currentPrice * 1.03 : currentPrice * 0.95;

  return {
    action,
    confidence,
    targetPrice,
    stopLoss,
    reason: reasons.slice(0, 3).join('; ') || 'Mixed signals',
    indicators: {
      rsi: rsi || 50,
      trend: marketTrend,
      sentimentSignal: sentiment > 0.3 ? 'BULLISH' :
                       sentiment < -0.3 ? 'BEARISH' : 'NEUTRAL'
    }
  };
}

/**
 * Simplified fallback prediction
 */
function fallbackPrediction(input: PredictionInput): PredictionOutput {
  const { sentiment, marketTrend, fearGreedIndex, currentPrice } = input;

  // Simple rules:
  if (sentiment > 0.5 && marketTrend === 'bull' && fearGreedIndex > 60) {
    return {
      action: 'BUY',
      confidence: 0.7,
      targetPrice: currentPrice * 1.05,
      stopLoss: currentPrice * 0.97,
      reason: 'Bullish sentiment + bull market + high greed',
      indicators: {
        rsi: 50,
        trend: marketTrend,
        sentimentSignal: 'BULLISH'
      }
    };
  }

  if (sentiment < -0.5 && marketTrend === 'bear' && fearGreedIndex < 40) {
    return {
      action: 'SELL',
      confidence: 0.7,
      targetPrice: currentPrice * 0.95,
      stopLoss: currentPrice * 1.03,
      reason: 'Bearish sentiment + bear market + high fear',
      indicators: {
        rsi: 50,
        trend: marketTrend,
        sentimentSignal: 'BEARISH'
      }
    };
  }

  return {
    action: 'HOLD',
    confidence: 0.5,
    targetPrice: currentPrice,
    stopLoss: currentPrice * 0.95,
    reason: 'Mixed signals - waiting for clearer direction',
    indicators: {
      rsi: 50,
      trend: marketTrend,
      sentimentSignal: 'NEUTRAL'
    }
  };
}

/**
 * Batch prediction for multiple symbols
 */
export async function predictTradeBatch(
  inputs: PredictionInput[]
): Promise<PredictionOutput[]> {
  return Promise.all(inputs.map(input => predictTrade(input)));
}
