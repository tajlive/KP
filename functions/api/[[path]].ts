/**
 * Universal API Proxy — Cloudflare Worker
 * 
 * Håndterer ALLE simple API routes som bare gjør CRUD mot Supabase.
 * Routes med spesiell business-logikk konverteres individuelt.
 * 
 * URL-pattern: /api/<path> → proxy til Supabase REST
 * 
 * Støttet:
 *   - GET /api/v1/<table> → SELECT
 *   - POST /api/v1/<table> → INSERT
 *   - PATCH /api/v1/<table>?id=eq.X → UPDATE
 *   - DELETE /api/v1/<table>?id=eq.X → DELETE
 * 
 * Auth: Forwarder Authorization-header fra client
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CACHE: KVNamespace;
}

// Routes som IKKE skal proxies (har egne Workers eller Edge Functions)
const EXCLUDED_PATHS = [
  '/api/health',
  '/api/track',
  '/api/revalidate',
  '/api/fx',
  '/api/webhooks',
  '/api/v1/trading',
  '/api/v1/admin',
  '/api/v1/ai',
  '/api/v1/cron',
  '/api/auth',
  '/api/cron',
  '/api/binance',
  '/api/stripe',
];

function shouldProxy(path: string): boolean {
  for (const excluded of EXCLUDED_PATHS) {
    if (path.startsWith(excluded)) {
      return false;
    }
  }
  return true;
}

// Map URL paths to Supabase tables
function getTableFromPath(path: string): string | null {
  // Remove /api/v1/ prefix
  const match = path.match(/^\/api\/v1\/([^\/]+)(?:\/.*)?$/);
  if (match) {
    return match[1];
  }
  
  // Remove /api/ prefix for simple routes
  const simpleMatch = path.match(/^\/api\/(.+)$/);
  if (simpleMatch) {
    return simpleMatch[1];
  }
  
  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Skip if this path has its own Worker
    if (!shouldProxy(path)) {
      return new Response(
        JSON.stringify({ error: 'Route has dedicated handler' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const table = getTableFromPath(path);
    if (!table) {
      return new Response(
        JSON.stringify({ error: 'Invalid path' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    try {
      // Build Supabase REST URL
      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
      const restUrl = `${supabaseUrl}/rest/v1/${table}${url.search}`;
      
      // Get auth token from request or use anon key
      const authHeader = request.headers.get('Authorization');
      const apiKey = request.headers.get('apikey') || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // Forward request to Supabase
      const proxyHeaders: Record<string, string> = {
        'apikey': apiKey,
        'Authorization': authHeader || `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
      
      // Add Prefer header for mutations
      if (request.method === 'POST' || request.method === 'PATCH') {
        proxyHeaders['Prefer'] = 'return=minimal';
      }
      
      const proxyRequest = new Request(restUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' 
          ? await request.text() 
          : undefined,
      });
      
      const response = await fetch(proxyRequest);
      
      // Return response with CORS
      const corsHeaders = new Headers(response.headers);
      corsHeaders.set('Access-Control-Allow-Origin', '*');
      corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: corsHeaders,
      });
      
    } catch (error) {
      console.error(`[API Proxy] Error for ${path}:`, error);
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

// Handle OPTIONS for CORS preflight
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      'Access-Control-Max-Age': '86400',
    },
  });
};
