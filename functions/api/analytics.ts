export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * Analytics API - Main endpoint for client-side tracking
 * Proxies to /api/analytics/event for consistency
 */


async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward to the event endpoint
    const response = await fetch(new URL('/api/analytics/event', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json().catch(() => ({}));
    
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', ..., { status: response.status }.headers || {} }, status: , { status: response.status }.status || 200 });
  } catch {
    // Fail silently - analytics should never block UI
    return new Response(JSON.stringify({ received: true });
  }
}

// Health check
async function GETHandler(request: Request, env: Env)() {
  return NextResponse.json({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
