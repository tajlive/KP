/**
 * Cloudflare Worker: Funnel Tracking
 * Migrert fra: src/app/api/track/funnel/route.ts
 * Dato: 2026-05-12
 * 
 * Triggers: POST /api/track/funnel
 * Body: { session_id, event_type, step_number?, metadata? }
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'No database connection' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body = await request.json();
      const { session_id, event_type, step_number, metadata } = body;

      if (!session_id || !event_type) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/signup_funnel`, {
        method: 'POST',
        headers: {
          'apikey': env.NEXT_PUBLIC_SUPABASE_URL,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          session_id,
          event_type,
          step_number,
          metadata: metadata || {},
          user_agent: request.headers.get('user-agent') || '',
          referrer: request.headers.get('referer') || '',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Funnel tracking error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to track' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('Track funnel error:', err);
      return new Response(
        JSON.stringify({ error: 'Internal error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
