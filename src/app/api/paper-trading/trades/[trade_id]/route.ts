import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ trade_id: string }> }
) {
  try {
    const { trade_id } = await context.params;
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);

    const authResult = await supabase.auth.getUser();
    const user = authResult.data.user;
    if (authResult.error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fetchResult = await supabase
      .from('trades')
      .select('id, user_id, mode')
      .eq('id', trade_id)
      .eq('user_id', user.id)
      .single();

    const trade = fetchResult.data;
    if (fetchResult.error || !trade) {
      return NextResponse.json({ error: 'Trade ikke funnet' }, { status: 404 });
    }
    if (trade.mode !== 'paper') {
      return NextResponse.json(
        { error: 'Kun paper trades kan slettes' },
        { status: 403 }
      );
    }

    const deleteResult = await supabase
      .from('trades')
      .delete()
      .eq('id', trade_id)
      .eq('user_id', user.id);

    if (deleteResult.error) throw deleteResult.error;

    return NextResponse.json({ ok: true, deleted_id: trade_id });
  } catch (error) {
    console.error('[DELETE /api/paper-trading/trades]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trade_id: string }> }
) {
  try {
    const { trade_id } = await context.params;
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);

    const authResult = await supabase.auth.getUser();
    const user = authResult.data.user;
    if (authResult.error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await supabase
      .from('trades')
      .select(
        'id, session_id, mode, trading_pair, side, order_type, quantity, price, total_value, fee, status, realized_pnl, strategy_signal, executed_at, created_at'
      )
      .eq('id', trade_id)
      .eq('user_id', user.id)
      .single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: 'Trade ikke funnet' }, { status: 404 });
    }

    return NextResponse.json({ trade: result.data });
  } catch (error) {
    console.error('[GET /api/paper-trading/trades]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
