/**
 * PAPER TRADING CLOSE API
 * POST /api/auto-trading/paper/close
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executePaperTrade } from '@/lib/paper-trading/realistic-execution';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { trade_id, close_reason = 'manual' } = body;

    if (!trade_id) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    // Fetch trade
    const { data: trade } = await supabase
      .from('auto_trading_trades')
      .select('*')
      .eq('id', trade_id)
      .eq('user_id', user.id)
      .eq('is_paper', true)
      .single();

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    if (trade.status !== 'OPEN') {
      return NextResponse.json({ error: 'Trade already closed' }, { status: 400 });
    }

    // Execute closing trade (opposite side)
    const closeResult = await executePaperTrade({
      symbol: trade.symbol,
      side: trade.side === 'LONG' ? 'sell' : 'buy',
      type: 'market',
      quantity: trade.quantity,
    });

    if (!closeResult.success || !closeResult.filled) {
      return NextResponse.json({ error: 'Close execution failed' }, { status: 500 });
    }

    // Calculate P&L
    const pnl = trade.side === 'LONG'
      ? (closeResult.executedPrice - trade.entry_price) * trade.quantity
      : (trade.entry_price - closeResult.executedPrice) * trade.quantity;

    const pnlPct = (pnl / (trade.entry_price * trade.quantity)) * 100;

    // Update trade
    await supabase
      .from('auto_trading_trades')
      .update({
        status: 'CLOSED',
        exit_price: closeResult.executedPrice,
        pnl_nok: pnl,
        pnl_pct: pnlPct,
        close_reason: close_reason,
        closed_at: new Date().toISOString(),
        // Add closing costs
        fees_paid: (trade.fees_paid || 0) + closeResult.feesAmount,
        slippage_pct: (trade.slippage_pct || 0) + closeResult.slippagePct,
      })
      .eq('id', trade_id);

    // Get session for updates
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('id', trade.session_id)
      .single();

    if (session) {
      const newCapital = session.current_capital_nok + trade.position_value_nok + pnl - closeResult.totalCost;
      const newTotalPnl = (session.total_pnl_nok || 0) + pnl;

      // Get all closed trades for win rate
      const { data: allTrades } = await supabase
        .from('auto_trading_trades')
        .select('pnl_nok')
        .eq('session_id', session.id)
        .eq('status', 'CLOSED')
        .not('pnl_nok', 'is', null);

      const winningTrades = allTrades?.filter(t => (t.pnl_nok || 0) > 0).length || 0;
      const totalClosed = allTrades?.length || 0;
      const winRate = totalClosed > 0 ? (winningTrades / totalClosed) * 100 : 0;

      await supabase
        .from('trading_sessions')
        .update({
          current_capital_nok: newCapital,
          total_pnl_nok: newTotalPnl,
          total_pnl_pct: (newTotalPnl / session.starting_capital_nok) * 100,
          win_rate: winRate,
          winning_trades: pnl > 0 ? (session.winning_trades || 0) + 1 : session.winning_trades,
          losing_trades: pnl <= 0 ? (session.losing_trades || 0) + 1 : session.losing_trades,
        })
        .eq('id', session.id);
    }

    return NextResponse.json({
      success: true,
      trade: {
        id: trade.id,
        entryPrice: trade.entry_price,
        exitPrice: closeResult.executedPrice,
        pnl,
        pnlPct,
        closingCosts: {
          fees: closeResult.feesAmount,
          slippage: closeResult.slippageAmount,
          total: closeResult.totalCost,
        },
      },
      session: session ? {
        currentCapital: session.current_capital_nok + trade.position_value_nok + pnl - closeResult.totalCost,
        totalPnl: (session.total_pnl_nok || 0) + pnl,
        winRate: session.win_rate,
      } : null,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Close failed' }, { status: 500 });
  }
}
