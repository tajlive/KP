

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, user_id, page_path, referrer, user_agent } = body;

    const supabase = createClient();

    // Call the track_page_view function
    await supabase.rpc('track_page_view', {
      p_user_id: user_id,
      p_session_id: session_id,
      p_page_path: page_path,
      p_referrer: referrer,
      p_user_agent: user_agent,
      p_ip_hash: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
