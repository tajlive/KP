/**
 * Cloudflare Worker: API Router & Bridge
 * 
 * Håndterer routing av API requests under migrering fra Vercel.
 * 
 * Strategi (Strangler Fig Pattern):
 *   1. Konverterte routes → kjører direkte i Workers
 *   2. Ukonverterte routes → proxied til Vercel
 *   3. Etter hvert som routes konverteres, fjernes de fra proxy-listen
 * 
 * Konfigurasjon: Endre vercelUrl og oppdater MIGRATED_ROUTES etter hvert.
 */

export interface Env {
  VERCEL_URL: string;           // e.g., "klarpakke.vercel.app"
  CACHE: KVNamespace;
}

// Routes som ER konvertert og kjører i Workers
const MIGRATED_ROUTES = [
  '/api/health',
  '/api/track/click',
  '/api/track/funnel',
  '/api/track/open',
  '/api/revalidate',
  '/api/fx/usdt-nok',
  '/api/webhooks/sanity',
];

// Sjekk om en path matcher en konvertert route
function isMigrated(path: string): boolean {
  for (const route of MIGRATED_ROUTES) {
    if (path === route || path.startsWith(route + '/')) {
      return true;
    }
  }
  return false;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Ikke-proxy ruter: La andre Workers håndtere dem
    // (Denne filen er fallback for umatchede routes)
    
    // Proxy ukonverterte routes til Vercel
    const vercelUrl = `https://${env.VERCEL_URL || 'klarpakke.vercel.app'}${path}${url.search}`;
    
    const proxyRequest = new Request(vercelUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
        'X-Forwarded-Host': url.host,
        'X-Forwarded-Proto': url.protocol.replace(':', ''),
      },
      body: request.body,
    });

    // Timeout for proxy (10 sekunder)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(proxyRequest, { signal: controller.signal });
      clearTimeout(timeout);
      
      // Kopier response med CORS-headers
      const corsHeaders = new Headers(response.headers);
      corsHeaders.set('Access-Control-Allow-Origin', '*');
      corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: corsHeaders,
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error(`[API Bridge] Proxy error for ${path}:`, error);
      return new Response(
        JSON.stringify({ 
          error: 'Proxy error', 
          path,
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
