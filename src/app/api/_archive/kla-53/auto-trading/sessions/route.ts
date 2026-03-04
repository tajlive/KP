// ============================================================================
// src/app/api/auto-trading/sessions/route.ts
// LIST USER'S TRADING SESSIONS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const db = await createClient();
    const status = req.nextUrl.searchParams.get('status') ?? 'active';

    const { data: sessions, error } = await db
      .from('trading_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', status)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
