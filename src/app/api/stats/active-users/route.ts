import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();

    const { count, error } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Active users API error:', error);
      return NextResponse.json({ count: 0, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    console.error('Active users API unexpected error:', error);
    return NextResponse.json(
      { count: 0, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
