// ============================================================================
// src/app/api/copy-trading/unfollow/route.ts
// STOP COPYING A LEADER
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api-auth';
import { UnfollowSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const parsed = UnfollowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const db = (await createClient()) as any;

    const { data, error } = await db
      .from('copy_trading_follows')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.follow_id)
      .eq('follower_id', user.id) // Only own follows
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Follow relationship not found' }, { status: 404 });
    }

    return NextResponse.json({ unfollowed: true, follow: data });
  } catch (err) {
    console.error('Unexpected error in unfollow:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
