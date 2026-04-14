#!/usr/bin/env node
/**
 * Health Check - Sjekker systemstatus
 *
 * Endret 2026-04-14:
 * - Supabase-sjekk bruker nå remote API-kall (ikke lokal Docker)
 * - Docker-sjekk er valgfri og merket [LOCAL_ONLY]
 */

import { execSync } from 'child_process';
import { config as dotenvConfig } from 'dotenv';

// Load .env.local for CI/cloud environments where env vars may not be injected
dotenvConfig({ path: '.env.local' });
dotenvConfig({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

async function checkSupabaseRemote() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Mangler NEXT_PUBLIC_SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    signal: AbortSignal.timeout(15000),
  });
  // 200/204 = OK, 401/403 = API er oppe men krever auth (også gyldig)
  if (![200, 204, 401, 403].includes(response.status)) {
    throw new Error(`HTTP ${response.status} fra Supabase REST API`);
  }
}

async function checkDockerLocal() {
  try {
    execSync('docker ps', { stdio: 'pipe', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

const checks = [
  { name: 'TypeScript', cmd: 'npx tsc --noEmit', timeout: 60000 },
  { name: 'Lint', cmd: 'npm run lint', timeout: 60000 },
];

console.log('🔍 Health Check\n');

let failed = false;

for (const check of checks) {
  process.stdout.write(`${check.name}: `);
  try {
    execSync(check.cmd, { stdio: 'pipe', timeout: check.timeout });
    console.log('✅ OK');
  } catch (e) {
    console.log(`❌ FEIL - ${e.message}`);
    failed = true;
  }
}

// Remote Supabase check
process.stdout.write('Supabase (remote API): ');
try {
  await checkSupabaseRemote();
  console.log('✅ OK');
} catch (e) {
  console.log(`❌ FEIL - ${e.message}`);
  failed = true;
}

// Optional local Docker check
process.stdout.write('Docker [LOCAL_ONLY]: ');
const dockerOk = await checkDockerLocal();
if (dockerOk) {
  console.log('✅ OK');
} else {
  console.log('⚠️  IKKE TILGJENGELIG (ignoreres i CI/cloud)');
}

console.log('\n✅ Health check fullført');
if (failed) {
  process.exitCode = 1;
}
