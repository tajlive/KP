/**
 * LIVE TRADING EXECUTION API
 * Uses trading_sessions and trades tables + Binance API
 *
 * CRITICAL: Only for users with phd/professor tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api-auth';
import { RiskManager } from '@/lib/auto-trading/risk-manager';
import { z } from 'zod';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ExecuteTradeSchema = z.object({
  symbol: z.string().regex(/^[A-Z]+USDT$/, 'Symbol must end with USDT'),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  session_id: z.string().uuid(),
});

interface BinanceApiKeys {
  api_key: string;
  api_secret: string;
}

/**
 * Generate Binance API signature
 */
function generateSignature(queryString: string, apiSecret: string): string {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
}

/**
 * Execute trade on Binance
 */
async function executeBinanceTrade(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  keys: BinanceApiKeys,
  testnet: boolean = false
): Promise<{ success: boolean; orderId?: number; price?: number; error?: string }> {
  try {
    const baseUrl = testnet
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';

    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    const signature = generateSignature(queryString, keys.api_secret);

    const response = await fetch(
      `${baseUrl}/api/v3/order?${queryString}&signature=${signature}`,
      {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': keys.api_key,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.msg || 'Binance API error' };
    }

    const data = await response.json();
    const totalValue = data.fills?.reduce((sum: number, fill: { price: string; qty: string }) =>
      sum + parseFloat(fill.price) * parseFloat(fill.qty), 0) || 0;
    const avgPrice = totalValue > 0 ? totalValue / quantity : 0;

    return {
      success: true,
      orderId: data.orderId,
      price: avgPrice,
    };
  } catch (error) {
    console.error('Binance execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Decrypt Binance API keys from Supabase Vault
 */
async function getBinanceKeys(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ keys: BinanceApiKeys; testnet: boolean } | null> {
  // Get encrypted key IDs from profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('binance_api_key_id, binance_api_secret_id, binance_connected')
    .eq('id', userId)
    .single();

  if (!profile?.binance_connected || !profile.binance_api_key_id || !profile.binance_api_secret_id) {
    return null;
  }

  // Decrypt keys via RPC function (must be created in migration)
  const { data: decryptedKeys, error } = await supabase.rpc('decrypt_binance_keys', {
    key_id: profile.binance_api_key_id,
    secret_id: profile.binance_api_secret_id,
  });

  if (error || !decryptedKeys) {
    console.error('Failed to decrypt Binance keys:', error);
    return null;
  }

  return {
    keys: {
      api_key: decryptedKeys.api_key,
      api_secret: decryptedKeys.api_secret,
    },
    testnet: decryptedKeys.is_testnet || false,
  };
}

/**
 * POST /api/auto-trading/live/execute
 * Execute a live trade on Binance
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

    // 1. Check tier
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tier, binance_connected')
      .eq('id', user.id)
      .single();

    if (!profile || !['phd', 'professor'].includes(profile.tier)) {
      return NextResponse.json(
        {
          error: 'Live trading requires PhD or Professor tier',
          code: 'TIER_REQUIRED',
          upgrade_url: '/pricing',
        },
        { status: 402 }
      );
    }

    if (!profile.binance_connected) {
      return NextResponse.json(
        {
          error: 'Connect Binance API keys first',
          code: 'BINANCE_NOT_CONNECTED',
          setup_url: '/dashboard/settings/binance',
        },
        { status: 400 }
      );
    }

    // 2. Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .eq('mode', 'live')
      .eq('status', 'active')
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or not active', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 3. Get Binance keys
    const binanceAuth = await getBinanceKeys(user.id, supabase);
    if (!binanceAuth) {
      return NextResponse.json(
        { error: 'Failed to retrieve Binance API keys', code: 'KEY_RETRIEVAL_FAILED' },
        { status: 500 }
      );
    }

    // 4. Fetch current price from Binance
    const priceResponse = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!priceResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch current price', code: 'PRICE_FETCH_FAILED' },
        { status: 503 }
      );
    }

    const priceData = await priceResponse.json();
    const currentPrice = parseFloat(priceData.price);
    const tradeValue = quantity * currentPrice;

    // 5. Validate capital
    if (side === 'buy' && tradeValue > session.current_capital) {
      return NextResponse.json(
        {
          error: 'Insufficient capital',
          available: session.current_capital,
          required: tradeValue,
        },
        { status: 400 }
      );
    }

    // 6. Risk check
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
      direction: side === 'buy' ? 'LONG' : 'SHORT',
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

    // 7. Execute on Binance
    const binanceResult = await executeBinanceTrade(
      symbol,
      side.toUpperCase() as 'BUY' | 'SELL',
      quantity,
      binanceAuth.keys,
      binanceAuth.testnet
    );

    if (!binanceResult.success) {
      return NextResponse.json(
        {
          error: 'Binance execution failed',
          code: 'BINANCE_ERROR',
          details: binanceResult.error,
        },
        { status: 500 }
      );
    }

    // 8. Calculate PnL for sell orders
    let realizedPnl: number | null = null;
    if (side === 'sell' && session.open_position) {
      const position = session.open_position as { quantity: number; entry_price: number };
      const entryValue = quantity * position.entry_price;
      const exitValue = quantity * (binanceResult.price || currentPrice);
      const fee = exitValue * 0.001;
      realizedPnl = exitValue - entryValue - fee;
    }

    // 9. Calculate stop loss/take profit for buy orders
    let stopLossPrice: number | undefined;
    let takeProfitPrice: number | undefined;
    if (side === 'buy') {
      const stopLossPercent = riskConfig.stopLossPercent;
      stopLossPrice = currentPrice * (1 - stopLossPercent / 100);
      takeProfitPrice = currentPrice * (1 + stopLossPercent * 2 / 100);
    }

    // 10. Record trade in database
    const idempotencyKey = `${session_id}-${side}-live-${binanceResult.orderId || Date.now()}`;
    const executedPrice = binanceResult.price || currentPrice;
    const fee = executedPrice * quantity * 0.001;

    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        session_id,
        user_id: user.id,
        idempotency_key: idempotencyKey,
        mode: 'live',
        trading_pair: symbol.replace('USDT', '/USDT'),
        side,
        order_type: 'market',
        quantity,
        price: executedPrice,
        total_value: executedPrice * quantity,
        fee,
        status: 'filled',
        binance_order_id: binanceResult.orderId?.toString(),
        stop_loss_price: stopLossPrice,
        take_profit_price: takeProfitPrice,
        realized_pnl: realizedPnl,
        strategy_signal: {
          source: 'manual',
          timestamp: new Date().toISOString(),
          binance_testnet: binanceAuth.testnet,
        },
        executed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tradeError) {
      console.error('Trade record error:', tradeError);
      return NextResponse.json(
        {
          error: 'Trade executed on Binance but failed to record',
          code: 'RECORD_FAILED',
          binance_order_id: binanceResult.orderId,
        },
        { status: 500 }
      );
    }

    // 11. Fetch updated session
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
        binance_order_id: binanceResult.orderId,
        executed_price: executedPrice,
        testnet: binanceAuth.testnet,
        performance: {
          response_time_ms: Date.now() - startTime,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Live trade execution error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
