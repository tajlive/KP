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
import { cpSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// API routes migrated to Cloudflare (handled directly in Worker)
const MIGRATED_API_ROUTES = [
  { pattern: /^\/api\/fx\/usdt-nok$/, handler: 'handleFxUsdtNok' },
];

const WORKER_CODE = `
/**
 * Cloudflare Pages Worker — Static assets + API routes + Vercel proxy
 */

const VERCEL_FALLBACK = 'https://klarpakke.vercel.app';

async function handleFxUsdtNok(request, env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: 'Supabase not configured' }, 500);
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('global_settings')
      .select('usdt_nok_rate,updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const rate = Number(data?.usdt_nok_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return jsonResponse({ error: 'Missing USDT/NOK rate' }, 404);
    }

    return jsonResponse({
      rate,
      updatedAt: data?.updated_at ?? null,
      source: 'global_settings',
    }, 200, {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
    });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Check migrated API routes first
    if (path === '/api/fx/usdt-nok') {
      return handleFxUsdtNok(request, env);
    }

    // Try to serve from static assets
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    } catch {
      // env.ASSETS not available, continue to proxy
    }

    // Proxy to Vercel
    const targetBase = env.VERCEL_APP_URL || VERCEL_FALLBACK;
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

const BUILD_DIR = '.vercel/output/static';
const WORKER_DIR = join(BUILD_DIR, '_worker.js');

console.log('☁️  Cloudflare Pages Deploy\\n');

// Step 1: Build
console.log('🔨 Step 1: Building for Cloudflare...');
execSync('npm run cf:build', { stdio: 'inherit' });

// Step 2: Replace _worker.js with lightweight proxy
console.log('🔧 Step 2: Replacing next-on-pages Worker with lightweight proxy...');
if (existsSync(WORKER_DIR)) {
  rmSync(WORKER_DIR, { recursive: true, force: true });
}
mkdirSync(WORKER_DIR, { recursive: true });
writeFileSync(join(WORKER_DIR, 'index.js'), WORKER_CODE);
console.log('   ✓ Worker replaced');

// Step 3: Deploy
console.log('🚀 Step 3: Deploying to Cloudflare Pages...');
const branch = process.argv[2] || 'main';
const branchFlag = branch === 'main' ? '' : ` --branch=${branch}`;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.error('❌ CLOUDFLARE_API_TOKEN is not set');
  process.exit(1);
}
execSync(`npx wrangler pages deploy ${BUILD_DIR}${branchFlag}`, { 
  stdio: 'inherit',
  env: { ...process.env, CLOUDFLARE_API_TOKEN: token }
});

console.log('\\n✅ Deploy complete!');
