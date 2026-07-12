import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/paper-trading/init
 * Proxy til Supabase Edge Function paper-trading-init.
 * Auto-initialiserer paper trading for innlogget bruker.
 * Idempotent: trygt å kalle flere ganger.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured', code: 'CONFIG_ERROR' },
        { status: 500 },
      );
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/paper-trading-init`;

    // Forward the Authorization header (the user's Bearer JWT)
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('[paper-trading/init] Proxy error:', err);
    return NextResponse.json(
      { error: 'Kunne ikke initialisere paper trading', code: 'INIT_FAILED' },
      { status: 500 },
    );
  }
}
