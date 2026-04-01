

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { NextResponse } from 'next/server';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!key) return null;
  return createClient<Database>(url, key);
}

export async function POST(request: Request) {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return NextResponse.json({ error: 'No database connection' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { session_id, event_type, step_number, metadata } = body;

    if (!session_id || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('signup_funnel')
      .insert([{
        session_id,
        event_type,
        step_number,
        metadata: metadata || {},
        user_agent: request.headers.get('user-agent') || '',
        referrer: request.headers.get('referer') || '',
      }]);

    if (error) {
      console.error('Funnel tracking error:', error);
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Track funnel error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
