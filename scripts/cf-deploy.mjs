#!/usr/bin/env node
/**
 * Cloudflare Pages Deploy Script
 * 
 * 1. Runs cf:build (pre-build → next-on-pages → post-build)
 * 2. Replaces next-on-pages _worker.js with our lightweight proxy Worker
 * 3. Deploys to Cloudflare Pages
 */

import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const WORKER_CODE = `/**
 * Cloudflare Pages Worker — Static assets + Vercel proxy
 * Serves static files directly, proxies missing routes to Vercel
 */

const VERCEL_FALLBACK = 'https://klarpakke.vercel.app';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // First, try to serve from static assets
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    } catch {
      // env.ASSETS not available, continue to proxy
    }

    // Static asset not found — proxy to Vercel
    const targetBase = env.VERCEL_APP_URL || VERCEL_FALLBACK;
    const target = new URL(url.pathname + url.search, targetBase);

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
      return new Response(
        JSON.stringify({
          error: 'Proxy error',
          path: url.pathname,
          target: target.toString(),
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
`;

const BUILD_DIR = '.vercel/output/static';
const WORKER_DIR = join(BUILD_DIR, '_worker.js');

console.log('☁️  Cloudflare Pages Deploy\n');

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
execSync(`npx wrangler pages deploy ${BUILD_DIR}${branchFlag}`, { stdio: 'inherit' });

console.log('\n✅ Deploy complete!');
