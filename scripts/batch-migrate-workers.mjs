#!/usr/bin/env node
/**
 * Batch-konverterer simple Next.js API routes til Cloudflare Workers
 * 
 * Bruk: node scripts/batch-migrate-workers.mjs
 * 
 * Strategi:
 *   - Routes med Supabase JS (ikke pg) → Cloudflare Workers
 *   - Routes med pg direkte → markeres for manuell konvertering
 *   - Routes > 200 linjer → markeres for Supabase Edge Functions
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, basename } from 'path';
import { execSync } from 'child_process';

const WORKER_TEMPLATE = `/**
 * Cloudflare Worker: {{NAME}}
 * Migrert fra: {{SOURCE}}
 * Dato: {{DATE}}
 * 
 * {{METHODS}}
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CACHE: KVNamespace;
}

{{HELPERS}}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
{{HANDLERS}}
    return new Response(JSON.stringify({ error: 'Not implemented' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
`;

function parseRoute(sourcePath) {
  const content = readFileSync(sourcePath, 'utf-8');
  
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PUT')) methods.push('PUT');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  if (content.includes('export async function PATCH')) methods.push('PATCH');
  
  const hasPg = content.includes('from "pg"') || content.includes("from 'pg'") || content.includes('new Client(');
  const hasSupabaseJs = content.includes('@supabase/supabase-js') || content.includes('@/lib/supabase/server') || content.includes('@/lib/supabase/client');
  const lineCount = content.split('\n').length;
  
  return { methods, hasPg, hasSupabaseJs, lineCount, content };
}

function classifyRoute(parsed) {
  if (parsed.hasPg) return 'supabase-edge-function';
  if (parsed.lineCount > 200) return 'supabase-edge-function';
  if (parsed.methods.length === 0) return 'unknown';
  return 'cloudflare-worker';
}

function generateWorker(sourcePath, parsed) {
  const routeDir = dirname(sourcePath);
  const relativePath = routeDir.replace('src/app/api/', '');
  const workerPath = `functions/api/${relativePath}.ts`;
  
  const handlers = parsed.methods.map(method => {
    return `    if (request.method === '${method}') {\n      // TODO: Implement ${method} handler from ${sourcePath}\n      return new Response(JSON.stringify({ ok: true, method: '${method}' }), {\n        headers: { 'Content-Type': 'application/json' },\n      });\n    }`;
  }).join('\n\n');
  
  const content = WORKER_TEMPLATE
    .replace('{{NAME}}', basename(routeDir))
    .replace('{{SOURCE}}', sourcePath)
    .replace('{{DATE}}', new Date().toISOString().split('T')[0])
    .replace('{{METHODS}}', `Methods: ${parsed.methods.join(', ')}`)
    .replace('{{HELPERS}}', '')
    .replace('{{HANDLERS}}', handlers);
  
  return { workerPath, content };
}

function main() {
  const routes = execSync('find src/app/api -name "route.ts" -o -name "route.tsx"', { encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);
  
  let workersCreated = 0;
  let edgeFuncsMarked = 0;
  let skipped = 0;
  const edgeFuncList = [];
  
  for (const route of routes) {
    // Skip already migrated routes
    if (route.includes('/track/') || route.includes('/health/route.ts') || 
        route.includes('/revalidate/') || route.includes('/fx/') || 
        route.includes('/webhooks/sanity')) {
      skipped++;
      continue;
    }
    
    const parsed = parseRoute(route);
    const classification = classifyRoute(parsed);
    
    if (classification === 'cloudflare-worker') {
      const { workerPath, content } = generateWorker(route, parsed);
      mkdirSync(dirname(workerPath), { recursive: true });
      writeFileSync(workerPath, content);
      workersCreated++;
    } else {
      edgeFuncsMarked++;
      edgeFuncList.push({ route, lines: parsed.lineCount, methods: parsed.methods.join(',') });
    }
  }
  
  console.log('\n📊 Batch Migration Complete');
  console.log('='.repeat(60));
  console.log(`Cloudflare Workers created: ${workersCreated}`);
  console.log(`Supabase Edge Functions (marked): ${edgeFuncsMarked}`);
  console.log(`Already migrated (skipped): ${skipped}`);
  
  if (edgeFuncList.length > 0) {
    console.log('\n🔴 Complex routes requiring manual conversion:');
    edgeFuncList.slice(0, 15).forEach(r => {
      console.log(`  ${r.route} (${r.lines} lines, ${r.methods})`);
    });
  }
  
  // Write migration tracking file
  const tracking = {
    date: new Date().toISOString(),
    totalRoutes: routes.length,
    workersCreated,
    edgeFuncsMarked,
    skipped,
    edgeFuncRoutes: edgeFuncList.map(r => r.route),
  };
  writeFileSync('functions/migration-tracking.json', JSON.stringify(tracking, null, 2));
  console.log('\n✅ Tracking saved to functions/migration-tracking.json');
}

main();
