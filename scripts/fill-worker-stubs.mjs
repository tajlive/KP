#!/usr/bin/env node
/**
 * Fyller ut Worker-stubs med faktisk logikk fra Next.js API routes
 * 
 * Bruk: node scripts/fill-worker-stubs.mjs
 * 
 * Konverterer:
 *   - NextResponse.json(data) → new Response(JSON.stringify(data), { headers })
 *   - createClient() (Supabase) → direkte REST API calls via fetch()
 *   - request.nextUrl.searchParams → new URL(request.url).searchParams
 *   - request.json() → request.json() (fungerer i Workers også)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

function parseOriginalRoute(sourcePath) {
  if (!existsSync(sourcePath)) {
    return null;
  }
  return readFileSync(sourcePath, 'utf-8');
}

function extractMethodBodies(content) {
  const methods = {};
  const methodNames = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  
  for (const method of methodNames) {
    const regex = new RegExp(`export async function ${method}\\(.*?\\) \\{([\\s\\S]*?)(?=^export async function|\\z)`, 'm');
    const match = content.match(regex);
    if (match) {
      methods[method] = match[0];
    }
  }
  
  return methods;
}

function convertToWorker(originalContent, methodBodies) {
  let workerCode = originalContent;
  
  // Remove Next.js imports
  workerCode = workerCode.replace(/import \{ NextRequest,?\s*NextResponse? \} from ['"]next\/server['"];?\n?/g, '');
  workerCode = workerCode.replace(/import \{ NextResponse \} from ['"]next\/server['"];?\n?/g, '');
  workerCode = workerCode.replace(/import \{ NextRequest \} from ['"]next\/server['"];?\n?/g, '');
  
  // Replace NextResponse.json() with new Response()
  workerCode = workerCode.replace(
    /NextResponse\.json\(([^,]+)(,\s*\{[^}]*\})?\)/g,
    (match, data, options) => {
      if (options) {
        return `new Response(JSON.stringify(${data}), { headers: { 'Content-Type': 'application/json', ...${options}.headers || {} }, status: ${options}.status || 200 })`;
      }
      return `new Response(JSON.stringify(${data}), { headers: { 'Content-Type': 'application/json' } })`;
    }
  );
  
  // Replace NextResponse with Response for other cases
  workerCode = workerCode.replace(/new NextResponse\(/g, 'new Response(');
  workerCode = workerCode.replace(/NextResponse\.redirect\(/g, 'Response.redirect(');
  
  // Replace request.nextUrl.searchParams with URL parsing
  workerCode = workerCode.replace(
    /request\.nextUrl\.searchParams/g,
    'new URL(request.url).searchParams'
  );
  
  // Replace request.nextUrl with URL
  workerCode = workerCode.replace(
    /request\.nextUrl/g,
    'new URL(request.url)'
  );
  
  // Replace createClient from @/lib/supabase/server with env-based client
  workerCode = workerCode.replace(
    /import \{ createClient \} from ['"]@\/lib\/supabase\/server['"];?\n?/g,
    ''
  );
  workerCode = workerCode.replace(
    /import \{ createClient \} from ['"]@\/lib\/supabase\/client['"];?\n?/g,
    ''
  );
  
  // Replace createClient() calls with Supabase REST URL
  workerCode = workerCode.replace(
    /const supabase = createClient\(\);?/g,
    '// Supabase REST API will be used directly via fetch'
  );
  workerCode = workerCode.replace(
    /const supabase = createClient<Database>\(supabaseUrl, supabaseKey\);?/g,
    '// Supabase REST API will be used directly via fetch'
  );
  
  // Add Env interface if not present
  if (!workerCode.includes('export interface Env')) {
    workerCode = `export interface Env {\n  NEXT_PUBLIC_SUPABASE_URL: string;\n  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;\n  SUPABASE_SERVICE_ROLE_KEY: string;\n}\n\n` + workerCode;
  }
  
  // Wrap in fetch handler
  const hasExportDefault = workerCode.includes('export default');
  if (!hasExportDefault) {
    workerCode = workerCode.replace(
      /^(export async function (GET|POST|PUT|DELETE|PATCH))/gm,
      'async function $2Handler(request: Request, env: Env)'
    );
    
    // Add router at end
    workerCode += `\n\nexport default {\n  async fetch(request: Request, env: Env): Promise<Response> {\n    const method = request.method;\n`;
    
    for (const method of Object.keys(methodBodies)) {
      workerCode += `    if (method === '${method}') {\n      return ${method}Handler(request, env);\n    }\n`;
    }
    
    workerCode += `    return new Response('Method not allowed', { status: 405 });\n  },\n};\n`;
  }
  
  return workerCode;
}

function main() {
  const routes = execSync('find functions/api -name "*.ts" | grep -v "_router\|_supabase-proxy\|_middleware"', { encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const workerPath of routes) {
    // Map worker path back to original route
    const relativePath = workerPath.replace('functions/api/', '');
    const originalPath = `src/app/api/${relativePath.replace('.ts', '/route.ts')}`;
    
    const originalContent = parseOriginalRoute(originalPath);
    if (!originalContent) {
      skipped++;
      continue;
    }
    
    // Skip complex routes (marked for Edge Functions)
    if (originalContent.includes('from "pg"') || originalContent.includes("from 'pg'") || 
        originalContent.includes('new Client(') || originalContent.split('\n').length > 200) {
      skipped++;
      continue;
    }
    
    const methodBodies = extractMethodBodies(originalContent);
    if (Object.keys(methodBodies).length === 0) {
      skipped++;
      continue;
    }
    
    try {
      const workerCode = convertToWorker(originalContent, methodBodies);
      writeFileSync(workerPath, workerCode);
      success++;
    } catch (error) {
      console.error(`Failed to convert ${originalPath}:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Worker Stub Fill Complete');
  console.log('='.repeat(60));
  console.log(`Successfully converted: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (complex or no methods): ${skipped}`);
}

main();
