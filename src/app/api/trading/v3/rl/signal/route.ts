/**
 * RL Trading Signal API
 * 
 * Returns trading signals from the RL sentiment agent
 * POST /api/trading/v3/rl/signal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PPOAgent, ACTIONS } from '@/lib/trading/rl/ppo-agent';
import { calculateSentimentSignal } from '@/lib/trading/rl/sentiment-reward';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      symbol, 
      currentPrice, 
      portfolio,
      useSentiment = true 
    } = body;
    
    if (!symbol || !currentPrice) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get current fear/greed index
    const { data: fearGreed } = await supabase
      .from('market_sentiment')
      .select('value, trend')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    const fearGreedIndex = fearGreed?.value ?? 50;
    const fearGreedTrend = ((fearGreed?.trend as unknown) as number) ?? 0;
    
    // Get latest technical indicators
    const { data: indicators } = await supabase
      .from('technical_indicators')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    // Get active RL agent
    const { data: agentData } = await supabase
      .from('rl_agents')
      .select('state_vector, config')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    let action: number;
    let confidence: number;
    let sentimentSignal: number | undefined;
    
    if (agentData?.state_vector) {
      // Use RL agent
      // @ts-expect-error - deserialize method signature mismatch
      const agent = PPOAgent.deserialize(Buffer.from(agentData.state_vector).toString());
      
      const state = PPOAgent.encodeState(
        {
          open: currentPrice * 0.99,
          high: currentPrice * 1.01,
          low: currentPrice * 0.98,
          close: currentPrice,
          volume: 1000000
        },
        {
          rsi: indicators?.rsi ?? 50,
          macd: indicators?.macd ?? 0,
          macdSignal: indicators?.macd_signal ?? 0,
          bbUpper: indicators?.bb_upper ?? currentPrice * 1.05,
          bbLower: indicators?.bb_lower ?? currentPrice * 0.95,
          bbMiddle: indicators?.bb_middle ?? currentPrice,
          atr: indicators?.atr ?? currentPrice * 0.02,
          ema20: indicators?.ema20 ?? currentPrice,
          ema50: indicators?.ema50 ?? currentPrice
        },
        {
          fearGreedIndex,
          fearGreedTrend,
          volatility: indicators?.atr ? indicators.atr / currentPrice : 0.02,
          trendStrength: (indicators?.adx as number) ?? 25,
          regime: (indicators?.adx ?? 0) > 50 ? 'volatile' : 
                  ((indicators?.ema20 ?? 0) > (indicators?.ema50 ?? 0) ? 'bull' : 'bear')
        },
        {
          totalEquity: portfolio?.totalEquity ?? 10000,
          availableBalance: portfolio?.availableBalance ?? 5000,
          openPositions: portfolio?.openPositions ?? 0,
          dailyPnl: portfolio?.dailyPnl ?? 0,
          maxDrawdown: portfolio?.maxDrawdown ?? 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
          sharpe30d: portfolio?.sharpe30d ?? 1
        },
        {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          dayOfMonth: new Date().getDate(),
          month: new Date().getMonth() + 1
        }
      );
      
      const result = agent.selectAction(state, false);
      action = result.action;
      confidence = Math.exp(result.logProb);
    } else {
      // Fallback to sentiment-based signal
      sentimentSignal = calculateSentimentSignal(fearGreedIndex as number, fearGreedTrend as number);
      
      // Convert signal to action
      if (sentimentSignal > 0.5) action = 4; // 100% buy
      else if (sentimentSignal > 0) action = 3; // 50% buy
      else if (sentimentSignal === 0) action = 2; // hold
      else if (sentimentSignal > -0.5) action = 1; // 50% sell
      else action = 0; // 100% sell
      
      confidence = Math.abs(sentimentSignal);
    }
    
    const positionSignal = ACTIONS[action];
    
    return NextResponse.json({
      signal: {
        action,
        position: positionSignal,
        side: positionSignal > 0 ? 'buy' : positionSignal < 0 ? 'sell' : 'hold',
        confidence: Math.round(confidence * 100) / 100,
        strength: Math.abs(positionSignal)
      },
      sentiment: useSentiment ? {
        index: fearGreedIndex,
        trend: fearGreedTrend,
        signal: sentimentSignal,
        interpretation: fearGreedIndex <= 20 ? 'extreme_fear' :
                       fearGreedIndex <= 40 ? 'fear' :
                       fearGreedIndex <= 60 ? 'neutral' :
                       fearGreedIndex <= 80 ? 'greed' : 'extreme_greed'
      } : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('RL signal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
