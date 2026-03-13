// ============================================================================
// src/app/api/copy-trading/follow/route.ts
// START COPYING A LEADER
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api-auth';
import { FollowLeaderSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const parsed = FollowLeaderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { leader_id, scale_factor, max_trade_size, allocation_percent } = parsed.data;
    const db: unknown = (await createClient()) as unknown;

    // Check subscription tier limits
    const { data: profile } = await db
      .from('user_profiles')
      .select('tier')
      .eq('user_id', user.id)
      .single() as unknown;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Tier-based limits
    const maxFollows: Record<string, number> = {
      free: 0,
      bachelor: 1,
      master: 3,
      phd: 999,
      professor: 999,
    };

    const limit = maxFollows[profile.tier] ?? 0;

    if (limit === 0) {
      return NextResponse.json(
        { error: 'Copy trading requires a paid subscription', code: 'TIER_REQUIRED', required_tier: 'bachelor' },
        { status: 402 }
      );
    }

    // Count current active follows
    const { count: currentFollows } = await db
      .from('copy_trading_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id)
      .eq('is_active', true);

    if ((currentFollows ?? 0) >= limit) {
      const nextTier = profile.tier === 'student' ? 'master' : 'phd';
      return NextResponse.json(
        {
          error: `You can follow max ${limit} leader(s) on ${profile.tier} tier. Upgrade to ${nextTier} for more.`,
          code: 'FOLLOW_LIMIT_REACHED',
          current: currentFollows,
          limit,
        },
        { status: 402 }
      );
    }

    // Verify leader exists and has trades
    const { data: leader } = await db
      .from('user_profiles')
      .select('user_id, display_name')
      .eq('user_id', leader_id)
      .single() as unknown;

    if (!leader) {
      return NextResponse.json({ error: 'Leader not found' }, { status: 404 });
    }

    // Can't follow yourself
    if (leader_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Create follow relationship
    const { data: follow, error } = await db
      .from('copy_trading_follows')
      .upsert(
        {
          follower_id: user.id,
          leader_id,
          scale_factor: scale_factor ?? 1.0,
          allocation_percent: allocation_percent ?? 10,
          max_trade_amount: max_trade_size ?? null,
          is_active: true,
        },
        { onConflict: 'follower_id,leader_id' }
      )
      .select()
      .single() as unknown;

    if (error) {
      console.error('Failed to create follow:', error);
      return NextResponse.json({ error: 'Failed to follow leader' }, { status: 500 });
    }

    // Send notification
    await db.from('notification_queue').insert({
      user_id: user.id,
      type: 'copy_started',
      payload: { leader_name: leader.display_name, leader_id, scale_factor },
    });

    return NextResponse.json({ follow }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in follow:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
