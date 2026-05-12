/**
 * Cloudflare Worker: Email Click Tracking
 * Migrert fra: src/app/api/track/click/route.ts
 * Dato: 2026-05-12
 * 
 * Triggers: GET /api/track/click?id=<contactId>&url=<url>&seq=<sequence>
 * Action: Logs click to Supabase, redirects to target URL
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// Helper: Supabase REST client via fetch
async function supabaseQuery(env: Env, table: string, method: string, body?: unknown) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`;
  const response = await fetch(url, {
    method,
    headers: {
      'apikey': env.NEXT_PUBLIC_SUPABASE_URL,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=minimal' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');
    const url = searchParams.get('url');
    const sequence = parseInt(searchParams.get('seq') || '1', 10);

    if (!contactId || !url) {
      return Response.redirect('https://www.klarpakke.no', 302);
    }

    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.redirect(url, 302);
    }

    try {
      // Fetch contact email
      const contactRes = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/campaign_contacts?select=email&id=eq.${contactId}&limit=1`,
        {
          headers: {
            'apikey': env.NEXT_PUBLIC_SUPABASE_URL,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const contacts = await contactRes.json();
      const email = contacts[0]?.email;

      // Log click
      await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_tracking`, {
        method: 'POST',
        headers: {
          'apikey': env.NEXT_PUBLIC_SUPABASE_URL,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          contact_id: contactId,
          email,
          sequence,
          event: 'click',
          url,
          user_agent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        }),
      });

      // Update contact
      await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/campaign_contacts?id=eq.${contactId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': env.NEXT_PUBLIC_SUPABASE_URL,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ clicked_at: new Date().toISOString() }),
        }
      );
    } catch (error) {
      console.error('Click tracking error:', error);
    }

    return Response.redirect(url, 302);
  },
};
