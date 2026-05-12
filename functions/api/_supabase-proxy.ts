/**
 * Generic Supabase REST Proxy Worker
 * 
 * Håndterer simple CRUD-routes som bare videresender requests til Supabase REST API.
 * Brukes for routes som:
 *   - Kun gjør SELECT/INSERT/UPDATE/DELETE mot Supabase
 *   - Ikke har kompleks business-logikk
 *   - Ikke bruker pg direkte
 * 
 * Routes som bruker denne:
 *   - /api/v1/user/*
 *   - /api/v1/progress/*
 *   - /api/v1/payments/* (simple)
 *   - /api/v1/signals/* (simple)
 *   - /api/v1/marketplace/* (simple)
 *   - /api/v1/design-tokens
 *   - /api/v1/stats/*
 *   - /api/v1/onboarding/*
 *   - /api/v1/analytics/*
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// Route mapping: path pattern → { table, allowedMethods, requiredFields }
const ROUTE_MAP: Record<string, {
  table: string;
  methods: string[];
  select?: string;
  order?: string;
  limit?: number;
}> = {
  '/api/v1/design-tokens': {
    table: 'design_tokens',
    methods: ['GET'],
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Find matching route
    let routeConfig = ROUTE_MAP[path];
    if (!routeConfig) {
      // Try wildcard match
      for (const [pattern, config] of Object.entries(ROUTE_MAP)) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '(.+)') + '$');
        if (regex.test(path)) {
          routeConfig = config;
          break;
        }
      }
    }

    if (!routeConfig) {
      return new Response(
        JSON.stringify({ error: 'Route not mapped in proxy' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!routeConfig.methods.includes(request.method)) {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // Build Supabase REST URL
      let restUrl = `${supabaseUrl}/rest/v1/${routeConfig.table}`;
      
      // Forward query parameters
      const searchParams = url.searchParams;
      if (searchParams.toString()) {
        restUrl += '?' + searchParams.toString();
      }
      
      // Forward request to Supabase
      const response = await fetch(restUrl, {
        method: request.method,
        headers: {
          'apikey': anonKey,
          'Authorization': request.headers.get('Authorization') || `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          ...(request.method === 'POST' || request.method === 'PATCH' 
            ? { 'Prefer': 'return=minimal' } 
            : {}),
        },
        body: request.method !== 'GET' && request.method !== 'HEAD' 
          ? await request.text() 
          : undefined,
      });

      // Return Supabase response
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
