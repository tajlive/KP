#!/usr/bin/env node
/**
 * Konverterer Next.js API routes til Cloudflare Workers
 * 
 * Bruk:
 *   node scripts/migrate-api-to-workers.mjs src/app/api/track/click/route.ts
 *   node scripts/migrate-api-to-workers.mjs --batch src/app/api/track/*
 * 
 * Strategi:
 *   - Simple routes (GET/POST med basic JSON) → Cloudflare Workers
 *   - Routes med DB-kall → Supabase Edge Functions (via supabase-js)
 *   - Routes med pg direkte → Refaktoreres til Supabase REST RPC
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, basename } from 'path';
import { execSync } from 'child_process';

const TEMPLATE_WORKER = `/**
 * Cloudflare Worker: {{NAME}}
 * Migrert fra: {{SOURCE}}
 * Dato: {{DATE}}
 */

export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
{{HANDLERS}}
    return new Response(JSON.stringify({ error: 'Not implemented yet' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
`;

function parseRoute(sourcePath) {
  const content = readFileSync(sourcePath, 'utf-8');
  
  // Detect HTTP methods
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PUT')) methods.push('PUT');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  if (content.includes('export async function PATCH')) methods.push('PATCH');
  
  // Detect imports
  const hasNextResponse = content.includes('NextResponse');
  const hasPg = content.includes('from "pg"') || content.includes("from 'pg'");
  const hasSupabaseJs = content.includes('@supabase/supabase-js');
  
  // Detect complexity
  const lineCount = content.split('\n').length;
  const hasDbQuery = content.includes('.query(') || content.includes('.rpc(');
  const hasExternalFetch = content.includes('fetch(');
  
  return {
    methods,
    hasNextResponse,
    hasPg,
    hasSupabaseJs,
    lineCount,
    hasDbQuery,
    hasExternalFetch,
    content,
  };
}

function classifyRoute(parsed) {
  // Classification logic
  if (parsed.hasPg && parsed.hasDbQuery) {
    return 'supabase-edge-function'; // Needs Supabase Edge Function (Deno runtime)
  }
  if (parsed.lineCount > 200) {
    return 'supabase-edge-function'; // Complex routes → Edge Functions
  }
  if (parsed.hasSupabaseJs) {
    return 'cloudflare-worker'; // Can use Supabase REST from Worker
  }
  return 'cloudflare-worker'; // Simple routes → Workers
}

function generateWorker(routePath, parsed) {
  const routeDir = dirname(routePath);
  const relativePath = routeDir.replace('src/app/api/', '');
  const workerPath = `functions/api/${relativePath}.ts`;
  
  // Simple handler generation
  const handlers = parsed.methods.map(method => {
    return `    if (request.method === '${method}') {\n      // TODO: Implement ${method} handler\n      return new Response(JSON.stringify({ ok: true, method: '${method}' }), {\n        headers: { 'Content-Type': 'application/json' },\n      });\n    }`;
  }).join('\n\n');
  
  const content = TEMPLATE_WORKER
    .replace('{{NAME}}', basename(routeDir))
    .replace('{{SOURCE}}', routePath)
    .replace('{{DATE}}', new Date().toISOString().split('T')[0])
    .replace('{{HANDLERS}}', handlers);
  
  return { workerPath, content };
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node migrate-api-to-workers.mjs <route.ts>');
    console.log('       node migrate-api-to-workers.mjs --scan');
    process.exit(1);
  }
  
  if (args[0] === '--scan') {
    // Scan all routes and generate migration report
    console.log('🔍 Scanning all API routes...');
    const routes = execSync('find src/app/api -name "route.ts"', { encoding: 'utf-8' })
      .trim().split('\n');
    
    const report = [];
    for (const route of routes) {
      const parsed = parseRoute(route);
      const classification = classifyRoute(parsed);
      report.push({
        route,
        classification,
        methods: parsed.methods.join(','),
        lines: parsed.lineCount,
        hasPg: parsed.hasPg,
      });
    }
    
    // Summary
    const workers = report.filter(r => r.classification === 'cloudflare-worker');
    const edgeFuncs = report.filter(r => r.classification === 'supabase-edge-function');
    
    console.log('\n📊 Migration Report');
    console.log('='.repeat(60));
    console.log(`Total routes: ${report.length}`);
    console.log(`→ Cloudflare Workers: ${workers.length}`);
    console.log(`→ Supabase Edge Functions: ${edgeFuncs.length}`);
    console.log('\n🔴 Complex routes (Edge Functions recommended):');
    edgeFuncs.slice(0, 10).forEach(r => console.log(`  ${r.route} (${r.lines} lines)`));
    console.log('\n🟢 Simple routes (Workers):');
    workers.slice(0, 10).forEach(r => console.log(`  ${r.route} (${r.lines} lines)`));
    
    return;
  }
  
  const sourcePath = args[0];
  console.log(`🔄 Converting: ${sourcePath}`);
  
  const parsed = parseRoute(sourcePath);
  const classification = classifyRoute(parsed);
  
  console.log(`   Classification: ${classification}`);
  console.log(`   Methods: ${parsed.methods.join(', ')}`);
  console.log(`   Lines: ${parsed.lineCount}`);
  
  if (classification === 'cloudflare-worker') {
    const { workerPath, content } = generateWorker(sourcePath, parsed);
    mkdirSync(dirname(workerPath), { recursive: true });
    writeFileSync(workerPath, content);
    console.log(`   ✅ Generated: ${workerPath}`);
  } else {
    console.log(`   ⚠️  Complex route - manual migration required`);
    console.log(`   Recommendation: Move to supabase/functions/`);
  }
}

main();
