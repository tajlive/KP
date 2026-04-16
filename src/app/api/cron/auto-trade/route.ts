import { NextResponse } from 'next/server';
import { runAutoTradingCycle } from '@/lib/trading/auto-trader';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Vercel Cron handler
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && cronSecret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  
  try {
    // Opprett service-role klient for admin-operasjoner i cron-jobb
    const supabase = await createClient();
    const results = await runAutoTradingCycle(supabase);
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      ...results,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
