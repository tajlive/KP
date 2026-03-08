import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPaperTradingSession, calculatePnL, getPaperTradeHistory } from '@/lib/supabase/paper-trading';

export async function GET(request: Request) {
  try {
    // Get authenticated user
    const supabase = (await createClient()) as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get session
    const session = await getPaperTradingSession(user.id);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No paper trading session found' },
        { status: 404 }
      );
    }
    
    // Calculate P&L
    const pnl = calculatePnL(session);
    
    // Get recent trades
    const recentTrades = await getPaperTradeHistory(session.id, 5);
    
    return NextResponse.json({
      balance: {
        starting: session.starting_balance,
        current: session.current_balance,
        pnl: pnl.absolute,
        pnlPercentage: pnl.percentage,
        isPositive: pnl.isPositive,
      },
      recentTrades: recentTrades.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        total_value: trade.total_value,
        created_at: trade.created_at,
      })),
    });
  } catch (error) {
    console.error('Paper trading balance error:', error);
    return NextResponse.json(
      { error: 'Failed to get balance' },
      { status: 500 }
    );
  }
}
