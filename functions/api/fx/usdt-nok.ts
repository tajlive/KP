/**
 * Cloudflare Worker: USDT/NOK Exchange Rate
 * Migrert fra: src/app/api/fx/usdt-nok/route.ts
 * Dato: 2026-05-12
 * 
 * Triggers: GET /api/fx/usdt-nok
 * Returns: { rate, updatedAt, source }
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/global_settings?select=usdt_nok_rate,updated_at&id=eq.1&limit=1`,
        {
          headers: {
            'apikey': env.NEXT_PUBLIC_SUPABASE_URL,
            'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const record = data[0];

      if (!record) {
        return new Response(
          JSON.stringify({ error: 'Missing USDT/NOK rate' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const rate = Number(record.usdt_nok_rate);
      if (!Number.isFinite(rate) || rate <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid USDT/NOK rate' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          rate,
          updatedAt: record.updated_at ?? null,
          source: 'global_settings',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
