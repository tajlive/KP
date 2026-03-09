// ============================================================================
// src/app/api/copy-trading/leaders/route.ts
// LEADERBOARD: Top performers
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api-auth';
import { LeaderboardQuerySchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = LeaderboardQuerySchema.safeParse({
      timeframe: params.timeframe,
      limit: params.limit ? parseInt(params.limit) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const db = (await createClient()) as unknown;

    // Use materialized view (refreshed every 60 seconds by pg_cron)
    const { data: leaders, error } = await db
      .from('leaderboard')
      .select('*')
      .order('total_pnl', { ascending: false })
      .limit(parsed.data.limit);

    if (error) {
      console.error('Failed to fetch leaderboard:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Check which leaders the current user follows
    const { data: follows } = await db
      .from('copy_trading_follows')
      .select('leader_id')
      .eq('follower_id', user.id)
      .eq('is_active', true);

    const followedLeaderIds = new Set(follows?.map(f => f.leader_id) ?? []);

    const enrichedLeaders = (leaders ?? []).map(leader => ({
      ...leader,
      is_following: followedLeaderIds.has(leader.user_id),
    }));

    return NextResponse.json({ leaders: enrichedLeaders });
  } catch (err) {
    console.error('Unexpected error in leaderboard:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
