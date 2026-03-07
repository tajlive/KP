import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, user_id, event_type, event_name, page_path } = body;

    const supabase = await createClient();

    // Insert event - event_name derived from event_type or page_path if not provided
    await supabase.from('analytics_events').insert({
      user_id: user_id ?? null,
      session_id: session_id ?? null,
      event_type: event_type ?? 'page_view',
      event_name: event_name ?? page_path ?? 'unknown',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics event error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
