/**
 * Cloudflare Worker: Sanity Webhook Handler
 * Migrert fra: src/app/api/webhooks/sanity/route.ts
 * Dato: 2026-05-12
 * 
 * Triggers: POST /api/webhooks/sanity
 * Action: Validates signature, purges KV cache for Sanity content
 */

export interface Env {
  SANITY_WEBHOOK_SECRET: string;
  CACHE: KVNamespace;
}

const SIGNATURE_HEADER_NAME = 'sanity-webhook-signature';

async function isValidSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const digest = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return signature === digest;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!env.SANITY_WEBHOOK_SECRET) {
      console.error('[Sanity Webhook] SANITY_WEBHOOK_SECRET is not set');
      return new Response(
        JSON.stringify({ message: 'Webhook secret not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const signature = request.headers.get(SIGNATURE_HEADER_NAME) ?? '';
    const body = await request.text();

    if (!await isValidSignature(body, signature, env.SANITY_WEBHOOK_SECRET)) {
      return new Response(
        JSON.stringify({ message: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const json = JSON.parse(body);
      const docType = json._type;
      const revalidated: string[] = [];

      // Purge KV cache for general Sanity content
      await env.CACHE.delete('tag:sanity');
      revalidated.push('sanity');

      // Purge specific tags based on document type
      if (docType) {
        await env.CACHE.delete(`tag:sanity:${docType}`);
        revalidated.push(`sanity:${docType}`);
      }

      // Also purge Cache API entries
      const cache = caches.default;
      const url = new URL(request.url);
      
      // Purge common Sanity-affected paths
      const pathsToPurge = [
        '/',           // Landing page
        '/no',         // Norwegian landing
        '/en',         // English landing
        '/no/hjelp',   // Help page
        '/en/hjelp',
      ];

      for (const path of pathsToPurge) {
        url.pathname = path;
        await cache.delete(url.toString());
      }

      return new Response(
        JSON.stringify({
          revalidated: true,
          type: docType,
          purgedTags: revalidated,
          purgedPaths: pathsToPurge,
          now: Date.now(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('[Sanity Webhook] Failed to process webhook:', err);
      return new Response(
        JSON.stringify({ message: 'Webhook processing failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
