/**
 * Cloudflare Worker for A/B Testing and Geo-blocking
 * Handles experiment variant assignment and geo-restrictions
 */

// A/B Test Configuration
const VARIANTS = ['A', 'B', 'C'] as const;
type Variant = typeof VARIANTS[number];

const COOKIE_NAME = 'kp_exp_cta';
const GEO_BLOCKED = ['CN', 'RU'];

// Extend Cloudflare Worker types
declare const addEventListener: (
  type: 'fetch',
  handler: (event: FetchEvent) => void
) => void;

interface FetchEvent {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

// Main fetch handler
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming request with A/B testing and geo-blocking
 */
async function handleRequest(request: Request): Promise<Response> {
  const country = request.headers.get('cf-ipcountry') || 'ZZ';
  
  // Geo-blocking check
  if (GEO_BLOCKED.includes(country)) {
    const modified = new Request(request, { 
      headers: replaceReferralHeader(request.headers) 
    });
    return fetch(modified);
  }

  // Parse existing cookie
  const cookies = parseCookie(request.headers.get('cookie') || '');
  let variant = cookies[COOKIE_NAME] as Variant | undefined;
  
  // Assign new variant if none exists
  if (!variant) {
    variant = assignVariant(request);
    const resp = await fetch(addVariantHeader(request, variant));
    const headers = new Headers(resp.headers);
    headers.append(
      'Set-Cookie', 
      `${COOKIE_NAME}=${variant}; Path=/; Max-Age=${60 * 60 * 24 * 30}; Secure; SameSite=Lax`
    );
    return new Response(resp.body, { status: resp.status, headers });
  }

  return fetch(addVariantHeader(request, variant));
}

/**
 * Parse cookie header into key-value object
 */
function parseCookie(header: string): Record<string, string> {
  return header
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const [key, value] = pair.split('=');
      if (key) acc[key] = value || '';
      return acc;
    }, {});
}

/**
 * Assign variant based on anonymous ID hash
 */
function assignVariant(request: Request): Variant {
  const anon = request.headers.get('x-kp-anon') || 
               request.headers.get('cf-connecting-ip') || 
               Math.random().toString();
  
  let hash = 7;
  for (let i = 0; i < anon.length; i++) {
    hash = (hash * 31 + anon.charCodeAt(i)) | 0;
  }
  
  return VARIANTS[Math.abs(hash) % VARIANTS.length];
}

/**
 * Add variant header to request for upstream processing
 */
function addVariantHeader(request: Request, variant: Variant): Request {
  const headers = new Headers(request.headers);
  headers.set('x-kp-experiment-variant', variant);
  return new Request(request, { 
    method: request.method, 
    headers, 
    body: request.body, 
    redirect: request.redirect 
  });
}

/**
 * Replace referral header for geo-blocked countries
 */
function replaceReferralHeader(headers: Headers): Headers {
  const h = new Headers(headers);
  h.set('x-kp-referral-allowed', 'false');
  return h;
}

// Export for testing
export { handleRequest, assignVariant, parseCookie };
