

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, user_id, event_type, event_data, page_path } = body;

    const supabase = createClient();

    // Insert event
    await supabase.from('analytics_events').insert({
      user_id,
      session_id,
      event_type,
      event_data,
      page_path,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics event error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
