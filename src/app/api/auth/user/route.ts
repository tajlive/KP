

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase: any = (await createClient()) as unknown;
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('[Auth User API]:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
