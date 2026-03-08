import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreatePaperTradingSession } from '@/lib/supabase/paper-trading';

export async function POST(request: Request) {
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
    
    // Get or create session
    const session = await getOrCreatePaperTradingSession(user.id);
    
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        starting_balance: session.starting_balance,
        current_balance: session.current_balance,
        is_active: session.is_active,
        created_at: session.created_at,
      },
    });
  } catch (error) {
    console.error('Paper trading init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize paper trading' },
      { status: 500 }
    );
  }
}

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
    
    // Get or create session
    const session = await getOrCreatePaperTradingSession(user.id);
    
    const pnl = session.current_balance - session.starting_balance;
    const pnlPercentage = (pnl / session.starting_balance) * 100;
    
    return NextResponse.json({
      session: {
        id: session.id,
        starting_balance: session.starting_balance,
        current_balance: session.current_balance,
        is_active: session.is_active,
        created_at: session.created_at,
        pnl,
        pnlPercentage,
      },
    });
  } catch (error) {
    console.error('Paper trading get error:', error);
    return NextResponse.json(
      { error: 'Failed to get paper trading session' },
      { status: 500 }
    );
  }
}
