import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

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

const RESPONSE_TIME_SLA_MS = 3000; // 3 second SLA

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieEncoding: 'raw',
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {
            /* Read-only for GET request */
          },
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Fetch active paper trading session
    const { data: session, error: sessionError } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('mode', 'paper')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      // Log database errors to Sentry
      Sentry.captureException(sessionError, {
        tags: {
          endpoint: 'paper-trading-balance',
          requestId,
          type: 'session_fetch_error',
        },
        extra: {
          userId: user.id,
          message: sessionError.message,
        },
      });

      // Return 500 for actual errors (not just "no session")
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
          details: sessionError.message,
        },
        { status: 500 }
      );
    }

    // No session found - valid state, return success=false
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          balance: DEFAULT_BALANCE.balance,
          message: 'No active paper trading session',
          requestId,
        },
        { status: 200 }
      );
    }

    // Calculate P&L
    const currentCapital = session.current_capital_nok ?? 100000;
    const startingCapital = session.starting_capital_nok ?? 100000;
    const pnl = currentCapital - startingCapital;
    const pnlPercentage = startingCapital > 0 ? (pnl / startingCapital) * 100 : 0;

    // Fetch recent trades
    const { data: recentTrades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('session_id', session.id)
      .order('executed_at', { ascending: false })
      .limit(5);

    if (tradesError) {
      // Log but don't fail - trades are optional
      Sentry.captureException(tradesError, {
        tags: {
          endpoint: 'paper-trading-balance',
          requestId,
          type: 'trades_fetch_warning',
        },
      });
    }

    const responseTime = Date.now() - startTime;
    const isSlow = responseTime > RESPONSE_TIME_SLA_MS;

    // Warn if response is slow
    if (isSlow) {
      Sentry.captureMessage(
        `Paper trading balance endpoint exceeded SLA (${responseTime}ms)`,
        'warning'
      );
    }

    return NextResponse.json(
      {
        success: true,
        requestId,
        session_id: session.id,
        balance: {
          starting: startingCapital,
          current: currentCapital,
          pnl: pnl,
          pnlPercentage: pnlPercentage,
          isPositive: pnl >= 0,
        },
        recentTrades: (recentTrades || []).map((trade: Record<string, unknown>) => ({
          id: trade.id,
          symbol: trade.trading_pair,
          side: trade.side,
          quantity: trade.quantity,
          price: trade.price,
          total_value: trade.total_value,
          created_at: trade.created_at,
        })),
        _meta: {
          responseTimeMs: responseTime,
          isSlowResponse: isSlow,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Send comprehensive error to Sentry
    Sentry.captureException(error, {
      tags: {
        endpoint: 'paper-trading-balance',
        requestId,
        type: 'endpoint_error',
      },
      extra: {
        responseTimeMs: responseTime,
        errorMessage: errorMsg,
        errorName: error instanceof Error ? error.name : 'unknown',
      },
    });

    console.error(`[paper-trading-balance] Error (${requestId}):`, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch balance',
        details: errorMsg,
        requestId,
      },
      { status: 500 }
    );
  }
}
