/**
 * Cloudflare Worker: Health Check
 * Migrert fra: src/app/api/health/route.ts
 * 
 * Denne Worker-en erstatter Vercel sin Next.js API route for health checks.
 * Den bruker Supabase REST API (ikke pg direkte) fordi Workers-runtime
 * ikke støtter native Node.js pg-klient.
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const startTime = Date.now();

    try {
      // Check database via Supabase REST
      const dbStart = Date.now();
      const dbResponse = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      const dbTime = Date.now() - dbStart;

      // Check KV (optional, for caching verification)
      const kvStart = Date.now();
      await env.CACHE.put('health-check', Date.now().toString(), { expirationTtl: 60 });
      const kvTime = Date.now() - kvStart;

      const totalTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          checks: {
            database: {
              status: dbResponse.ok ? 'ok' : 'error',
              responseTime: dbTime,
            },
            kv: {
              status: 'ok',
              responseTime: kvTime,
            },
          },
          totalResponseTime: totalTime,
          platform: 'cloudflare-workers',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
