import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resetPaperTradingSession } from '@/lib/supabase/paper-trading';

export const dynamic = 'force-dynamic';

/**
 * POST /api/paper-trading/reset
 * P1: Nullstill alle aktive paper-trading-sesjoner for innlogget bruker.
 * Sletter trades og resetter kapital + counters til startverdier.
 * Idempotent: trygt a kalle flere ganger.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Ikke autentisert', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    // Valgfri startkapital fra body (default: 100000)
    let startingCapital = 100000;
    try {
      const body = await request.json() as { starting_capital_nok?: number };
      if (typeof body.starting_capital_nok === 'number' && body.starting_capital_nok >= 1000) {
        startingCapital = body.starting_capital_nok;
      }
    } catch {
      // Tom body er OK
    }

    // Hent alle aktive paper-sessions for brukeren
    const { data: sessions, error: fetchErr } = await supabase
      .from('trading_sessions')
      .select('id, starting_capital_nok')
      .eq('user_id', user.id)
      .eq('mode', 'paper')
      .eq('status', 'active');

    if (fetchErr) {
      console.error('[paper-trading/reset] fetch error:', fetchErr.message);
      return NextResponse.json(
        { error: 'Kunne ikke hente sesjoner', code: 'FETCH_FAILED' },
        { status: 500 },
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { success: true, reset: 0, message: 'Ingen aktive paper-sesjoner funnet' },
      );
    }

    // Reset alle aktive sesjoner
    const results = await Promise.allSettled(
      sessions.map((s: { id: string; starting_capital_nok: number | null }) =>
        resetPaperTradingSession(supabase, s.id, startingCapital)
      )
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(`[paper-trading/reset] ${failed.length} av ${sessions.length} feilet for user ${user.id}`);
      return NextResponse.json(
        {
          error: 'En eller flere sesjoner kunne ikke nullstilles',
          code: 'PARTIAL_RESET',
          total: sessions.length,
          failed: failed.length,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      success: true,
      reset: sessions.length,
      starting_capital_nok: startingCapital,
    });
  } catch (err) {
    console.error('[paper-trading/reset] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Uventet feil', code: 'UNEXPECTED_ERROR' },
      { status: 500 },
    );
  }
}
