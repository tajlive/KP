

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  try {
    const { id } = await params;

    // Verify admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles' as any)
      .select('role')
      .eq('id', user.id)
      .single() as any;

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark as resolved
    const { error } = await supabase
      .from('client_errors')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Error resolving error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
