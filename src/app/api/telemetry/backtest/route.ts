/**
 * API route for backtest telemetry
 * 
 * Mottar anonymisert bruk av backtest-kalkulatoren og lagrer i
 * backtest_telemetry tabellen for analyse og konverteringssporing.
 * 
 * @api {post} /api/telemetry/backtest Logg backtest-bruk
 * @api {post} /api/telemetry/backtest/convert Marker konvertering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/telemetry/backtest
 * Logger bruk av backtest-kalkulator
 */
export async function POST(request: NextRequest) {
  // Sjekk om dette er en "convert" request
  const pathname = request.nextUrl.pathname;
  if (pathname.endsWith('/convert')) {
    return handleConvert(request);
  }
  
  try {
    const body = await request.json();
    const {
      sessionId,
      strategyId,
      periodMonths,
      initialCapitalNOK,
      metrics,
      cacheHit,
      cacheAgeMs,
    } = body;

    // Valider påkrevde felter
    if (!sessionId || !strategyId || !periodMonths || !initialCapitalNOK) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Valider metrics
    if (!metrics || typeof metrics !== 'object') {
      return NextResponse.json(
        { error: 'Invalid metrics' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Bruk RPC for å logge til databasen
    const { error } = await supabase.rpc('log_backtest_telemetry', {
      p_session_id: sessionId,
      p_strategy_id: strategyId,
      p_period_months: periodMonths,
      p_initial_capital_nok: initialCapitalNOK,
      p_metrics: metrics,
      p_cache_hit: cacheHit ?? false,
      p_cache_age_ms: cacheAgeMs ?? null,
      p_anonymous_id: null, // Kan utvides senere
      p_user_agent: request.headers.get('user-agent') ?? null,
      p_referrer: request.headers.get('referer') ?? null,
    });

    if (error) {
      console.error('Failed to log telemetry:', error);
      return NextResponse.json(
        { error: 'Failed to log telemetry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telemetry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Håndter konvertering (bruker gikk fra kalkulator til paper trading)
 */
async function handleConvert(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.rpc('mark_backtest_converted', {
      p_session_id: sessionId,
    });

    if (error) {
      console.error('Failed to mark conversion:', error);
      return NextResponse.json(
        { error: 'Failed to mark conversion' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Convert error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
