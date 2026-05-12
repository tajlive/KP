export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { runAutoTradingCycle } from '@/lib/trading/auto-trader';

export const runtime = 'nodejs';

// Vercel Cron handler
async function GETHandler(request: Request, env: Env)(request: Request) {
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

// Also support POST for pg_cron triggering
export const POST = GET;


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
