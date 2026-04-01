import { NextRequest, NextResponse } from 'next/server';
import { executeOptimalTrade } from '@/lib/trading/optimal/engine';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const OptimalTradeSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{3,10}USDT$/),
  side: z.enum(['BUY', 'SELL']),
  entryPrice: z.number().positive(),
  signalStrength: z.number().min(0.5).max(1).default(0.85),
  portfolioValue: z.number().min(10000).default(100000),
  riskProfile: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
  pyramidLevel: z.number().int().min(1).max(3).default(1),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validation = OptimalTradeSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const {
      symbol,
      side,
      entryPrice,
      signalStrength,
      portfolioValue,
      riskProfile,
      pyramidLevel
    } = validation.data;
    
    // Execute optimal trade calculation
    const result = await executeOptimalTrade({
      userId: user.id,
      symbol,
      side,
      signalStrength,
      portfolioValue,
      riskProfile,
      pyramidLevel,
      entryPrice
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Trade calculation failed' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      trade: {
        symbol,
        side,
        entryPrice,
        positionSizeNOK: result.positionSizeNOK,
        positionSizeUSD: result.positionSizeUSD,
        kellyFraction: result.kellyFraction,
        kellyStats: result.kellyStats,
        atr: result.atr,
        stopPrice: result.stopPrice,
        targetPrice: result.targetPrice,
        rrRatio: result.rrRatio,
        quantity: result.quantity
      }
    });
    
  } catch (error) {
    console.error('Optimal trade API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for trade history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    
    // TODO: Implement after regenerating Supabase types
    // const { data, error } = await supabase
    //   .from('optimal_trades')
    //   .select('*')
    //   .eq('user_id', user.id)
    //   .order('created_at', { ascending: false })
    //   .limit(limit);
    
    return NextResponse.json({ trades: [], note: 'History temporarily disabled' });
    
  } catch (error) {
    console.error('Optimal trade history error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
