import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getOrCreatePaperTradingSession } from '@/lib/supabase/paper-trading';

export const dynamic = 'force-dynamic';

/**
 * POST /api/paper-trading/init
 * Auto-initialiserer paper trading for innlogget bruker.
 * Idempotent: trygt å kalle flere ganger.
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

    const session = await getOrCreatePaperTradingSession(supabase, user.id);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        created_at: session.created_at,
        starting_capital_nok: session.starting_capital_nok,
        current_capital_nok: session.current_capital_nok,
      },
    });
  } catch (err) {
    console.error('[paper-trading/init] Error:', err);
    return NextResponse.json(
      { error: 'Kunne ikke initialisere paper trading', code: 'INIT_FAILED' },
      { status: 500 },
    );
  }
}
