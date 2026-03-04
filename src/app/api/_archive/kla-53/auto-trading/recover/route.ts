// ============================================================================
// src/app/api/auto-trading/recover/route.ts  
// CRASH RECOVERY: Resume a crashed session
// ============================================================================
// Recovery flow:
// 1. pg_cron detects stale heartbeat → marks session as 'crashed'
// 2. This endpoint (called by Vercel Cron or manual trigger):
//    a. Reads session state from DB
//    b. Validates it's recoverable (crash_count < 5)
//    c. Sets status back to 'active'
//    d. Updates heartbeat
//    e. Queues notification
// 3. Next cron tick picks up the session and resumes strategy
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api-auth';
import { RecoverSessionSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET handler for cron-based automated recovery
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await createClient();

    // Recover ALL crashed sessions (called by Vercel Cron every minute)
    const { data: crashedSessions, error } = await db
      .from('trading_sessions')
      .select('id, user_id, crash_count')
      .eq('status', 'crashed')
      .lt('crash_count', 5);  // Give up after 5 crashes

    if (error) {
      console.error('Failed to fetch crashed sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch crashed sessions' }, { status: 500 });
    }

    const results = [];
    for (const session of crashedSessions ?? []) {
      const { error: updateError } = await db
        .from('trading_sessions')
        .update({
          status: 'active',
          crash_count: session.crash_count + 1,
          last_heartbeat: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (!updateError) {
        // Notify user their bot was recovered
        await db.from('notification_queue').insert({
          user_id: session.user_id,
          type: 'bot_recovered',
          payload: { session_id: session.id, crash_count: session.crash_count + 1 },
        });
        results.push({ session_id: session.id, recovered: true });
      } else {
        results.push({ session_id: session.id, recovered: false, error: updateError.message });
      }
    }

    // Also stop sessions that have crashed too many times
    const { data: abandoned } = await db
      .from('trading_sessions')
      .update({ status: 'stopped', stopped_at: new Date().toISOString() })
      .eq('status', 'crashed')
      .gte('crash_count', 5)
      .select('id, user_id');

    for (const session of abandoned ?? []) {
      await db.from('notification_queue').insert({
        user_id: session.user_id,
        type: 'bot_crashed',
        payload: { 
          session_id: session.id, 
          permanent: true,
          message: 'Bot stopped after 5 consecutive crashes. Please restart manually.' 
        },
      });
    }

    return NextResponse.json({ recovered: results, abandoned: abandoned?.length ?? 0 });
  } catch (err) {
    console.error('Unexpected error in recover GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler for manual recovery by authenticated user
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const db = await createClient();

    const body = await req.json();
    const parsed = RecoverSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { data: session, error } = await db
      .from('trading_sessions')
      .update({
        status: 'active',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.session_id)
      .eq('user_id', user.id)
      .eq('status', 'crashed')
      .select()
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found or not crashed' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error('Unexpected error in recover POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
