import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTrialStatus } from '@/lib/trial/trial-manager';

export async function GET(_request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const status = await getTrialStatus(user.id);
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('Trial status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
