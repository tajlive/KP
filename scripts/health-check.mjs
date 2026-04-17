#!/usr/bin/env node
/**
 * Health Check - Sjekker systemstatus
 *
 * Bruk: node scripts/health-check.mjs [api|supabase|signals|trading|full|prod]
 * Default: full
 *
 * Endret 2026-04-17:
 * - Støtter modus-argumenter for granular health checks
 */

import { execSync } from 'child_process';
import { config as dotenvConfig } from 'dotenv';

// Load .env.local for CI/cloud environments where env vars may not be injected
dotenvConfig({ path: '.env.local' });
dotenvConfig({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const mode = process.argv[2] || 'full';

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
  if (![200, 204, 401, 403].includes(response.status)) {
    throw new Error(`HTTP ${response.status} fra Supabase REST API`);
  }
}

async function checkApiHealth() {
  const baseUrl = process.env.HEALTH_URL || 'http://localhost:3000';
  const url = `${baseUrl.replace(/\/$/, '')}/api/health`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok && response.status !== 401 && response.status !== 403) {
    throw new Error(`HTTP ${response.status} fra ${url}`);
  }
  return response.json();
}

async function checkTradingHealth() {
  const body = await checkApiHealth();
  const ts = body?.checks?.tradingSignals;
  if (ts?.status === 'error') {
    throw new Error(`Trading signals: ${ts.message || 'error'}`);
  }
  if (ts?.status === 'warning') {
    console.log(`⚠️  Trading signals warning: ${ts.message || 'warning'}`);
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

function runCheck(name, fn) {
  return async () => {
    process.stdout.write(`${name}: `);
    try {
      await fn();
      console.log('✅ OK');
      return true;
    } catch (e) {
      console.log(`❌ FEIL - ${e.message}`);
      return false;
    }
  };
}

function execCheck(name, cmd, timeout = 120000) {
  return async () => {
    process.stdout.write(`${name}: `);
    try {
      execSync(cmd, { stdio: 'pipe', timeout });
      console.log('✅ OK');
      return true;
    } catch (e) {
      console.log(`❌ FEIL - ${e.message}`);
      return false;
    }
  };
}

const checkMap = {
  api:      [runCheck('API Health', checkApiHealth)],
  supabase: [runCheck('Supabase Remote', checkSupabaseRemote)],
  signals:  [execCheck('Signal Pipeline', 'node scripts/check-signal-pipeline-health.mjs')],
  trading:  [runCheck('Trading Health', checkTradingHealth)],
  full:     [
    execCheck('TypeScript', 'npx tsc --noEmit', 120000),
    execCheck('Lint', 'npm run lint', 120000),
    runCheck('Supabase Remote', checkSupabaseRemote),
    async () => {
      process.stdout.write('Docker [LOCAL_ONLY]: ');
      const ok = await checkDockerLocal();
      if (ok) {
        console.log('✅ OK');
      } else {
        console.log('⚠️  IKKE TILGJENGELIG (ignoreres i CI/cloud)');
      }
      return true;
    },
  ],
  prod:     [execCheck('Prod Health Gate', 'node scripts/prod-health-gate.mjs', 30000)],
};

console.log(`🔍 Health Check [mode=${mode}]\n`);

const checks = checkMap[mode];
if (!checks) {
  console.error(`Ukjent modus: ${mode}`);
  console.error(`Gyldige moduser: ${Object.keys(checkMap).join(', ')}`);
  process.exit(1);
}

let failed = false;
for (const check of checks) {
  const ok = await check();
  if (!ok) failed = true;
}

console.log('\n✅ Health check fullført');
if (failed) {
  process.exitCode = 1;
}
