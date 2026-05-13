#!/usr/bin/env node
/**
 * Cloudflare Pages Deploy Script
 * 
 * 1. Runs cf:build (pre-build → next-on-pages → post-build)
 * 2. Replaces next-on-pages _worker.js with lightweight proxy Worker
 *    that includes migrated API routes
 * 3. Deploys to Cloudflare Pages
 */

import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Worker base code — robots.txt/sitemap.xml injected post-build
function buildWorkerCode(robotsTxt, sitemapXml) {
  return `
/**
 * Cloudflare Pages Worker — Static assets + API routes + Vercel proxy
 */

const FLY_FALLBACK = 'https://klarpakke.fly.dev';

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

async function getSupabase(env) {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// ===== MIGRATED API ROUTES =====

async function handleFxUsdtNok(request, env) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'Supabase not configured' }, 500);
  }
  try {
    const supabase = await getSupabase(env);
    const { data, error } = await supabase
      .from('global_settings')
      .select('usdt_nok_rate,updated_at')
      .eq('id', 1)
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    const rate = Number(data?.usdt_nok_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return jsonResponse({ error: 'Missing USDT/NOK rate' }, 404);
    }
    return jsonResponse({ rate, updatedAt: data?.updated_at ?? null, source: 'global_settings' }, 200, {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
    });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
}

async function handleErrorReport(request, env) {
  return jsonResponse({ 
    disabled: true, 
    reason: 'Error reporting temporarily disabled due to database issues' 
  }, 200);
}

async function handleStats(request, env) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return jsonResponse({ 
      active_paper_traders: 0, avg_return_pct: null, best_return_pct: null, hasEnoughData: false 
    }, 200);
  }
  try {
    const supabase = await getSupabase(env);
    const { data: sessions, error } = await supabase
      .from('trading_sessions')
      .select('current_capital_nok, initial_capital')
      .eq('mode', 'paper')
      .eq('status', 'active');
    
    if (error || !sessions || sessions.length === 0) {
      return jsonResponse({ 
        active_paper_traders: 0, avg_return_pct: null, best_return_pct: null, hasEnoughData: false 
      }, 200);
    }

    const returns = sessions
      .map(s => {
        const current = Number(s.current_capital_nok) || 100000;
        const initial = Number(s.initial_capital) || 100000;
        return ((current - initial) / initial) * 100;
      })
      .filter(r => !isNaN(r));

    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
    const bestReturn = returns.length > 0 ? Math.max(...returns) : null;

    return jsonResponse({
      active_paper_traders: sessions.length,
      avg_return_pct: avgReturn,
      best_return_pct: bestReturn,
      hasEnoughData: sessions.length >= 10,
    }, 200, {
      'Cache-Control': 'public, s-maxage=300',
    });
  } catch (err) {
    return jsonResponse({ 
      active_paper_traders: 0, avg_return_pct: null, best_return_pct: null, hasEnoughData: false 
    }, 200);
  }
}

async function handleLeads(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const email = body?.email;
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return jsonResponse({ error: 'Invalid email address' }, 400);
    }

    // Best-effort DB write
    if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = await getSupabase(env);
        await supabase.from('leads').upsert(
          { email, source: 'landing_email_capture' },
          { onConflict: 'email' }
        );
      } catch (dbError) {
        console.warn('[leads] DB upsert failed (best-effort):', dbError);
      }
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ error: 'Bad request' }, 400);
  }
}

async function handleSentry(request, env) {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  try {
    const envelope = await request.text();
    const headerLine = envelope.split('\n')[0];
    const header = JSON.parse(headerLine);

    if (!header.dsn) {
      return jsonResponse({ error: 'No DSN found in envelope' }, 400);
    }

    const dsn = new URL(header.dsn);
    const projectId = dsn.pathname.replace('/', '');
    const url = 'https://' + dsn.host + '/api/' + projectId + '/envelope/';

    const res = await fetch(url, {
      method: 'POST',
      body: envelope,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    });

    return new Response(null, { status: res.status });
  } catch (err) {
    console.error('[Sentry Tunnel Error]:', err);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}

async function handleAnalytics(request, env) {
  if (request.method === 'GET') {
    return jsonResponse({ status: 'ok' });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json();
    const { session_id, user_id, event_type, event_name, page_path } = body || {};

    if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = await getSupabase(env);
        await supabase.from('analytics_events').insert({
          user_id: user_id ?? null,
          session_id: session_id ?? null,
          event_type: event_type ?? 'page_view',
          event_name: event_name ?? page_path ?? 'unknown',
        });
      } catch (dbError) {
        console.warn('[analytics] DB insert failed (best-effort):', dbError);
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    // Fail silently — analytics should never block UI
    return jsonResponse({ received: true });
  }
}

// ===== MAIN WORKER =====

const ROBOTS_TXT = ${JSON.stringify(robotsTxt)};
const SITEMAP_XML = ${JSON.stringify(sitemapXml)};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve robots.txt and sitemap.xml directly (bypasses env.ASSETS issues)
    if (path === '/robots.txt') {
      return new Response(ROBOTS_TXT, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    if (path === '/sitemap.xml') {
      return new Response(SITEMAP_XML, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Check migrated API routes first
    if (path === '/api/fx/usdt-nok') {
      return handleFxUsdtNok(request, env);
    }
    if (path === '/api/error-report') {
      return handleErrorReport(request, env);
    }
    if (path === '/api/stats') {
      return handleStats(request, env);
    }
    if (path === '/api/leads') {
      return handleLeads(request, env);
    }
    if (path === '/api/sentry') {
      return handleSentry(request, env);
    }
    if (path === '/api/analytics') {
      return handleAnalytics(request, env);
    }

    // Try to serve from static assets
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        // Add cache headers for static assets (Cloudflare CDN optimization)
        const path = url.pathname;
        if (path.startsWith('/_next/static/') || path.startsWith('/images/') || path.startsWith('/fonts/') || path.startsWith('/brand/') || path.startsWith('/icons/') || path.endsWith('.svg') || path.endsWith('.png') || path.endsWith('.webp') || path.endsWith('.ico') || path.endsWith('.woff2') || path.endsWith('.ttf')) {
          const newHeaders = new Headers(assetResponse.headers);
          newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
          newHeaders.set('CF-Cache-Status', 'HIT');
          return new Response(assetResponse.body, {
            status: assetResponse.status,
            statusText: assetResponse.statusText,
            headers: newHeaders,
          });
        }
        return assetResponse;
      }
    } catch {
      // env.ASSETS not available, continue to proxy
    }

    // Proxy to Vercel
    const targetBase = env.VERCEL_APP_URL || FLY_FALLBACK;
    const target = new URL(path + url.search, targetBase);

    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-By', 'cloudflare-pages');
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', url.protocol.slice(0, -1));

    try {
      const response = await fetch(target, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Proxy-Status', 'cloudflare-vercel');
      newHeaders.set('X-Proxy-Target', target.toString());
      newHeaders.delete('x-vercel-id');
      newHeaders.delete('x-vercel-cache');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error('[Worker] Proxy error:', error);
      return jsonResponse({
        error: 'Proxy error',
        path,
        target: target.toString(),
      }, 502);
    }
  },
};
`;
}

const BUILD_DIR = '.vercel/output/static';
const WORKER_DIR = join(BUILD_DIR, '_worker.js');

const ROUTES_JSON = '{"version":1,"include":["/*"],"exclude":[]}';

console.log('☁️  Cloudflare Pages Deploy\n');

// Step 1: Build
console.log('🔨 Step 1: Building for Cloudflare...');
execSync('npm run cf:build', { stdio: 'inherit' });

// Step 2: Remove next-on-pages functions (555MB+) and replace Worker
console.log('🔧 Step 2: Removing next-on-pages functions & replacing Worker...');
const FUNCTIONS_DIR = '.vercel/output/functions';
const DIAGNOSTICS_DIR = '.vercel/output/diagnostics';
if (existsSync(FUNCTIONS_DIR)) {
  rmSync(FUNCTIONS_DIR, { recursive: true, force: true });
  console.log('   ✓ Removed .vercel/output/functions/ (next-on-pages bundle)');
}
if (existsSync(DIAGNOSTICS_DIR)) {
  rmSync(DIAGNOSTICS_DIR, { recursive: true, force: true });
  console.log('   ✓ Removed .vercel/output/diagnostics/');
}
// Read built robots.txt and sitemap.xml for inline serving
let robotsTxt = '';
let sitemapXml = '';
try {
  robotsTxt = readFileSync(join(BUILD_DIR, 'robots.txt'), 'utf8');
  sitemapXml = readFileSync(join(BUILD_DIR, 'sitemap.xml'), 'utf8');
  console.log('   ✓ Read robots.txt (' + robotsTxt.length + ' chars) and sitemap.xml (' + sitemapXml.length + ' chars)');
} catch (e) {
  console.warn('   ⚠ Could not read robots.txt/sitemap.xml:', e.message);
}

const WORKER_CODE = buildWorkerCode(robotsTxt, sitemapXml);

if (existsSync(WORKER_DIR)) {
  rmSync(WORKER_DIR, { recursive: true, force: true });
}
mkdirSync(WORKER_DIR, { recursive: true });
writeFileSync(join(WORKER_DIR, 'index.js'), WORKER_CODE);
writeFileSync(join(BUILD_DIR, '_routes.json'), ROUTES_JSON);
console.log('   ✓ Custom proxy Worker written');
console.log('   ✓ _routes.json updated (all routes → Worker)');

// Step 3: Deploy
console.log('🚀 Step 3: Deploying to Cloudflare Pages...');
const branch = process.argv[2] || 'main';
const branchFlag = branch === 'main' ? '' : ` --branch=${branch}`;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.error('❌ CLOUDFLARE_API_TOKEN is not set');
  process.exit(1);
}
execSync(`npx wrangler pages deploy ${BUILD_DIR}${branchFlag} --skip-caching`, { 
  stdio: 'inherit',
  env: { ...process.env, CLOUDFLARE_API_TOKEN: token }
});

console.log('\n✅ Deploy complete!');
