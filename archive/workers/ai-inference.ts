/**
 * Cloudflare Worker for AI Inference
 * FREE: 10,000 requests/day via Cloudflare Workers AI
 * Model: @cf/meta/llama-2-7b-chat-int8 (gratis)
 */

export interface Env {
  AI: any; // Cloudflare Workers AI binding
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const input = await request.json() as {
        symbol: string;
        currentPrice: number;
        sentiment: number;
        marketTrend: string;
        fearGreedIndex: number;
        rsi?: number;
        sma20?: number;
        sma50?: number;
      };

      // Check if AI binding is available
      if (!env.AI) {
        // Fallback: Return rule-based prediction
        return new Response(
          JSON.stringify(ruleBasedPrediction(input)),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Use Cloudflare Workers AI (GRATIS - 10,000 requests/dag)
      const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          {
            role: 'system',
            content: `You are a crypto trading AI expert. Analyze market data and provide trading recommendations.

Respond ONLY with valid JSON in this exact format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "targetPrice": number,
  "stopLoss": number,
  "reason": "brief explanation"
}

Rules:
- BUY when: sentiment > 0.3 AND market trend is bullish AND RSI < 70
- SELL when: sentiment < -0.3 AND market trend is bearish AND RSI > 30
- HOLD otherwise
- Target price should be 5% away from current for BUY/SELL
- Stop loss should be 3% away for protection`
          },
          {
            role: 'user',
            content: `
Analyze this trading scenario:
- Symbol: ${input.symbol}
- Current Price: $${input.currentPrice}
- Sentiment Score: ${input.sentiment} (-1 to 1, positive = bullish)
- Market Trend: ${input.marketTrend}
- Fear & Greed Index: ${input.fearGreedIndex} (0 = extreme fear, 100 = extreme greed)
- RSI: ${input.rsi || 'N/A'} (30 = oversold, 70 = overbought)
- SMA20: ${input.sma20 || 'N/A'}
- SMA50: ${input.sma50 || 'N/A'}

Should I BUY, SELL, or HOLD? Provide JSON response only.
            `.trim()
          }
        ],
        max_tokens: 256,
        temperature: 0.1 // Low temperature for consistent results
      });

      // Parse AI response
      try {
        const aiText = response.response || '';
        // Extract JSON from response
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const aiOutput = JSON.parse(jsonMatch[0]);

          // Validate output
          const validAction = ['BUY', 'SELL', 'HOLD'].includes(aiOutput.action);
          const validConfidence = typeof aiOutput.confidence === 'number' &&
                                 aiOutput.confidence >= 0 &&
                                 aiOutput.confidence <= 1;

          if (validAction && validConfidence) {
            return new Response(
              JSON.stringify(aiOutput),
              {
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json'
                }
              }
            );
          }
        }

        throw new Error('Invalid AI response format');
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Fallback to rule-based
        return new Response(
          JSON.stringify(ruleBasedPrediction(input)),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          action: 'HOLD',
          confidence: 0.5,
          targetPrice: 0,
          stopLoss: 0,
          reason: 'AI inference failed, using conservative approach'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }
};

/**
 * Rule-based fallback prediction
 */
function ruleBasedPrediction(input: {
  symbol: string;
  currentPrice: number;
  sentiment: number;
  marketTrend: string;
  fearGreedIndex: number;
  rsi?: number;
}) {
  const { sentiment, marketTrend, fearGreedIndex, currentPrice, rsi = 50 } = input;

  // Rule 1: Strong buy signal
  if (sentiment > 0.5 && marketTrend === 'bull' && fearGreedIndex > 60 && rsi < 70) {
    return {
      action: 'BUY',
      confidence: 0.85,
      targetPrice: Math.round(currentPrice * 1.05 * 100) / 100,
      stopLoss: Math.round(currentPrice * 0.97 * 100) / 100,
      reason: 'Strong bullish sentiment in bull market with moderate RSI'
    };
  }

  // Rule 2: Strong sell signal
  if (sentiment < -0.5 && marketTrend === 'bear' && fearGreedIndex < 40 && rsi > 30) {
    return {
      action: 'SELL',
      confidence: 0.85,
      targetPrice: Math.round(currentPrice * 0.95 * 100) / 100,
      stopLoss: Math.round(currentPrice * 1.03 * 100) / 100,
      reason: 'Strong bearish sentiment in bear market with moderate RSI'
    };
  }

  // Rule 3: Contrarian buy (extreme fear)
  if (fearGreedIndex < 25 && rsi < 40) {
    return {
      action: 'BUY',
      confidence: 0.75,
      targetPrice: Math.round(currentPrice * 1.05 * 100) / 100,
      stopLoss: Math.round(currentPrice * 0.97 * 100) / 100,
      reason: 'Contrarian buy: extreme fear and oversold conditions'
    };
  }

  // Rule 4: Contrarian sell (extreme greed)
  if (fearGreedIndex > 80 && rsi > 60) {
    return {
      action: 'SELL',
      confidence: 0.75,
      targetPrice: Math.round(currentPrice * 0.95 * 100) / 100,
      stopLoss: Math.round(currentPrice * 1.03 * 100) / 100,
      reason: 'Contrarian sell: extreme greed and approaching overbought'
    };
  }

  // Rule 5: RSI-based
  if (rsi < 30) {
    return {
      action: 'BUY',
      confidence: 0.7,
      targetPrice: Math.round(currentPrice * 1.04 * 100) / 100,
      stopLoss: Math.round(currentPrice * 0.96 * 100) / 100,
      reason: 'RSI indicates oversold conditions'
    };
  }

  if (rsi > 70) {
    return {
      action: 'SELL',
      confidence: 0.7,
      targetPrice: Math.round(currentPrice * 0.96 * 100) / 100,
      stopLoss: Math.round(currentPrice * 1.04 * 100) / 100,
      reason: 'RSI indicates overbought conditions'
    };
  }

  // Default: HOLD
  return {
    action: 'HOLD',
    confidence: 0.5,
    targetPrice: Math.round(currentPrice * 100) / 100,
    stopLoss: Math.round(currentPrice * 0.95 * 100) / 100,
    reason: 'Mixed signals - waiting for clearer direction'
  };
}
