/**
 * UNIFIED PAPER TRADING API - FIXED VERSION
 * Uses trading_sessions and trades tables only (20250224210000 schema)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api-auth';
import { RiskManager } from '@/lib/auto-trading/risk-manager';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ExecuteTradeSchema = z.object({
  symbol: z.string().regex(/^[A-Z]+USDT$/, 'Symbol must end with USDT'),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  session_id: z.string().uuid(),
});

/**
 * POST /api/auto-trading/paper/execute
 * Execute a paper trade (buy or sell)
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const parsed = ExecuteTradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { symbol, side, quantity, session_id } = parsed.data;
    const supabase = await createClient();

    // 1. Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .eq('mode', 'paper')
      .eq('status', 'active')
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or not active', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Fetch current price from Binance
    let currentPrice: number;
    try {
      const priceResponse = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!priceResponse.ok) {
        throw new Error(`Binance API error: ${priceResponse.status}`);
      }

      const priceData = await priceResponse.json();
      currentPrice = parseFloat(priceData.price);
    } catch (error) {
      console.error('Price fetch error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch current price',
          code: 'PRICE_FETCH_FAILED',
          retryAfter: 10,
        },
        { status: 503 }
      );
    }

    const tradeValue = quantity * currentPrice;
    const fee = tradeValue * 0.001; // 0.1% Binance fee

    // 3. Validate capital
    if (side === 'buy') {
      const totalCost = tradeValue + fee;
      if (totalCost > session.current_capital) {
        return NextResponse.json(
          {
            error: 'Insufficient capital',
            available: session.current_capital,
            required: totalCost,
          },
          { status: 400 }
        );
      }
    }

    // 4. Risk check (for buy orders)
    if (side === 'buy') {
      const riskConfig = session.risk_config || {
        maxPositionSizePercent: 2,
        stopLossPercent: 1,
        maxDailyLossPercent: 5,
        maxDailyTrades: 10,
        maxDrawdownPercent: 15,
        maxLeverage: 1,
      };

      const riskManager = new RiskManager(riskConfig);
      const riskCheck = await riskManager.canExecuteTrade({
        userId: user.id,
        sessionId: session_id,
        tradeAmount: tradeValue,
        currentCapital: session.current_capital,
        direction: 'LONG',
        symbol,
      });

      if (!riskCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Trade blocked by risk management',
            code: 'RISK_VIOLATION',
            reason: riskCheck.reason,
            suggestedAmount: riskCheck.suggestedAmount,
          },
          { status: 400 }
        );
      }
    }

    // 5. Calculate stop loss and take profit (for buy orders)
    let stopLossPrice: number | undefined;
    let takeProfitPrice: number | undefined;

    if (side === 'buy') {
      const stopLossPercent = session.risk_config?.stopLossPercent || 1;
      stopLossPrice = currentPrice * (1 - stopLossPercent / 100);
      takeProfitPrice = currentPrice * (1 + stopLossPercent * 2 / 100); // 2:1 R:R
    }

    // 6. Calculate PnL for sell orders
    let realizedPnl: number | null = null;

    if (side === 'sell' && session.open_position) {
      const position = session.open_position as {
        quantity: number;
        entry_price: number;
      };

      if (quantity > position.quantity) {
        return NextResponse.json(
          {
            error: 'Insufficient position',
            available: position.quantity,
            requested: quantity,
          },
          { status: 400 }
        );
      }

      const entryValue = quantity * position.entry_price;
      const exitValue = quantity * currentPrice;
      realizedPnl = exitValue - entryValue - fee;
    }

    // 7. Generate idempotency key
    const idempotencyKey = `${session_id}-${side}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // 8. Insert trade (atomic with session update via trigger)
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        session_id,
        user_id: user.id,
        idempotency_key: idempotencyKey,
        mode: 'paper',
        trading_pair: symbol.replace('USDT', '/USDT'),
        side,
        order_type: 'market',
        quantity,
        price: currentPrice,
        total_value: tradeValue,
        fee,
        status: 'filled',
        stop_loss_price: stopLossPrice,
        take_profit_price: takeProfitPrice,
        realized_pnl: realizedPnl,
        strategy_signal: { source: 'manual', timestamp: new Date().toISOString() },
        executed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tradeError) {
      console.error('Trade insert error:', tradeError);

      if (tradeError.code === '23505') {
        return NextResponse.json(
          { error: 'Duplicate trade detected', code: 'DUPLICATE_TRADE' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to execute trade', details: tradeError.message },
        { status: 500 }
      );
    }

    // 9. Fetch updated session (trigger will have updated it)
    const { data: updatedSession } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    return NextResponse.json(
      {
        success: true,
        trade,
        session: updatedSession,
        performance: {
          response_time_ms: Date.now() - startTime,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Paper trade execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
