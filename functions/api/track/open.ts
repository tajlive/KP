/**
 * Cloudflare Worker: Email Open Tracking Pixel
 * Migrert fra: src/app/api/track/open/route.ts
 * Dato: 2026-05-12
 * 
 * Triggers: GET /api/track/open?id=<contactId>&seq=<sequence>
 * Returns: 1x1 transparent GIF
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// 1x1 transparent GIF (base64 decoded to Uint8Array for Workers)
const TRACKING_PIXEL = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  c => c.charCodeAt(0)
);

const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');
    const sequence = parseInt(searchParams.get('seq') || '1', 10);

    if (!contactId || !env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(TRACKING_PIXEL, { headers: PIXEL_HEADERS });
    }

    try {
      // Log open event
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
          sequence,
          event: 'open',
          user_agent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        }),
      });

      // Update contact (only if not already opened)
      await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/campaign_contacts?id=eq.${contactId}&opened_at=is.null`,
        {
          method: 'PATCH',
          headers: {
            'apikey': env.NEXT_PUBLIC_SUPABASE_URL,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ opened_at: new Date().toISOString() }),
        }
      );
    } catch (error) {
      console.error('Open tracking error:', error);
    }

    return new Response(TRACKING_PIXEL, { headers: PIXEL_HEADERS });
  },
};
