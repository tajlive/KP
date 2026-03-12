import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

// Fallback balance when no session exists
const DEFAULT_BALANCE = {
  balance: {
    starting: 100000,
    current: 100000,
    pnl: 0,
    pnlPercentage: 0,
    isPositive: true,
  },
  recentTrades: [] as Array<{
    id: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    total_value: number;
    created_at: string;
  }>,
};

export async function GET(request: NextRequest) {
  try {
    // For API routes in App Router, we need to use cookies() directly
    const cookieStore = await cookies();
    
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => { /* Read-only for GET request */ },
        },
      }
    );
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Try to get existing session from trading_sessions table
    const { data: session, error: sessionError } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('mode', 'paper')
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as any;
    
    // If no session exists, return default balance (frontend will handle init)
    if (sessionError || !session) {
      return NextResponse.json(DEFAULT_BALANCE);
    }
    
    // Calculate P&L with null checks
    const currentCapital = session.current_capital_nok ?? 100000;
    const startingCapital = session.starting_capital_nok ?? 100000;
    const pnl = currentCapital - startingCapital;
    const pnlPercentage = startingCapital > 0 
      ? (pnl / startingCapital) * 100 
      : 0;
    
    // Get recent trades
    const { data: recentTrades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
    }
    
    return NextResponse.json({
      balance: {
        starting: startingCapital,
        current: currentCapital,
        pnl: pnl,
        pnlPercentage: pnlPercentage,
        isPositive: pnl >= 0,
      },
      recentTrades: (recentTrades || []).map((trade) => ({
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
    // Return default balance on error to prevent UI crash
    return NextResponse.json(DEFAULT_BALANCE);
  }
}
