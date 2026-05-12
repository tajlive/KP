/**
 * Cloudflare Worker: pricing
 * Migrert fra: src/app/api/pricing/route.ts
 * Dato: 2026-05-12
 * 
 * Methods: GET
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CACHE: KVNamespace;
}



export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') {
      // TODO: Implement GET handler from src/app/api/pricing/route.ts
      return new Response(JSON.stringify({ ok: true, method: 'GET' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Not implemented' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
