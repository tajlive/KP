import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executePaperTrade } from '@/lib/supabase/paper-trading';
import { z } from 'zod';

const tradeSchema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  price: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = tradeSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid trade data', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { symbol, side, quantity, price } = validation.data;
    
    // Execute trade
    const result = await executePaperTrade(user.id, {
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      price,
    });
    
    return NextResponse.json({
      success: true,
      trade: {
        symbol: symbol.toUpperCase(),
        side,
        quantity,
        price,
        total_value: quantity * price,
      },
      new_balance: result.new_balance,
      trade_id: result.trade_id,
    });
  } catch (error: any) {
    console.error('Paper trading execute error:', error);
    
    if (error.message === 'Insufficient balance for this trade') {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }
    
    if (error.message === 'No active paper trading session found') {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}
