// ============================================================================
// src/app/api/auto-trading/start/route.ts
// START AUTO-TRADING SESSION
// ============================================================================
// Architecture Decision: Serverless "Tick" Pattern
//
// Why not long-running processes?
//   Vercel serverless = 10s timeout. Can't keep a bot alive.
//
// Why not Supabase Realtime?
//   Realtime needs a persistent WebSocket client. Our "bot" is a cron job
//   that ticks every 30-60 seconds. No client needed.
//
// Pattern: "Cron-Driven State Machine"
//   1. User clicks Start → creates session in DB with status='active'
//   2. Vercel Cron (every 1 min) queries all active sessions
//   3. For each session, executes strategy logic (RSI, MACD, etc.)
//   4. If signal → insert trade → triggers update session state
//   5. Update heartbeat → session stays "alive"
//
// Recovery: If heartbeat > 5 min old → pg_cron marks as 'crashed'
//           → recovery endpoint resumes from last known state
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api-auth';
import { StartSessionSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Rate limit
    const { allowed } = checkRateLimit(`start:${user.id}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate input
    const body = await req.json();
    const parsed = StartSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { strategy_id, trading_pair, mode, initial_capital, strategy_config } = parsed.data;
    const db = await createClient();

    // Ensure user_profiles row exists (trading_sessions.user_id FK references user_profiles(id))
    const { error: profileErr } = await db
      .from('user_profiles')
      .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (profileErr) {
      console.error('[POST /api/auto-trading/start] user_profiles upsert error:', profileErr.code, profileErr.message);
    }

    // Check tier for live trading
    if (mode === 'live') {
      const { data: profile } = await db
        .from('user_profiles')
        .select('tier')
        .eq('user_id', user.id)
        .single();

      if (!profile || !['phd', 'professor'].includes(profile.tier)) {
        return NextResponse.json(
          { error: 'Live trading requires PhD or Professor tier', code: 'TIER_REQUIRED' },
          { status: 402 }
        );
      }
    }

    // Check for existing active session on same pair
    // (UNIQUE index handles race condition, but we give a nicer error)
    const { data: existing } = await db
      .from('trading_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('trading_pair', trading_pair)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Active session already exists for this pair', session_id: existing.id },
        { status: 409 }
      );
    }

    // Create session
    const { data: session, error } = await db
      .from('trading_sessions')
      .insert({
        user_id: user.id,
        mode,
        status: 'active',
        strategy_id,
        strategy_config,
        trading_pair,
        current_capital: initial_capital,
        initial_capital,
        last_heartbeat: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Active session already exists for this pair' },
          { status: 409 }
        );
      }
      console.error('Failed to create session:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in start session:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
