/**
 * Cloudflare Pages Function — API Fallback Proxy
 * 
 * ALL /api/* routes proxy to Vercel during migration.
 * This ensures zero downtime while converting API routes individually.
 */

export interface Env {
  VERCEL_APP_URL: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const targetBase = env.VERCEL_APP_URL || 'https://klarpakke.vercel.app';
  const target = `${targetBase}${url.pathname}${url.search}`;

  // Clone headers and add Cloudflare proxy marker
  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-By', 'cloudflare-pages');
  headers.set('X-Forwarded-Host', url.host);

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });

    // Clone response so we can modify headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Proxy-Status', 'cloudflare-vercel-fallback');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'API proxy error',
        path: url.pathname,
        target,
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
