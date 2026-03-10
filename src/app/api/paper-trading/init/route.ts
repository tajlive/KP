import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getOrCreatePaperTradingSession } from '@/lib/supabase/paper-trading';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create response for cookie handling
    const response = NextResponse.next();
    
    // Get authenticated user using SSR client with cookies
    const supabase = createServerClient(request, response);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get or create session — send supabase-klienten inn (har riktige cookies)
    const session = await getOrCreatePaperTradingSession(supabase, user.id);
    
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        starting_balance: session.starting_capital_nok,
        current_balance: session.current_capital_nok,
        is_active: session.status === 'active',
        created_at: session.started_at,
      },
    });
  } catch (error) {
    console.error('[paper-trading/init POST]', error);
    return NextResponse.json(
      { error: 'Failed to initialize paper trading', detail: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Create response for cookie handling
    const response = NextResponse.next();
    
    // Get authenticated user using SSR client with cookies
    const supabase = createServerClient(request, response);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get or create session — send supabase-klienten inn (har riktige cookies)
    const session = await getOrCreatePaperTradingSession(supabase, user.id);
    
    const pnl = session.current_capital_nok - session.starting_capital_nok;
    const pnlPercentage = (pnl / session.starting_capital_nok) * 100;
    
    return NextResponse.json({
      session: {
        id: session.id,
        starting_balance: session.starting_capital_nok,
        current_balance: session.current_capital_nok,
        is_active: session.status === 'active',
        created_at: session.started_at,
        pnl,
        pnlPercentage,
      },
    });
  } catch (error) {
    console.error('[paper-trading/init GET]', error);
    return NextResponse.json(
      { error: 'Failed to get paper trading session', detail: String(error) },
      { status: 500 }
    );
  }
}
