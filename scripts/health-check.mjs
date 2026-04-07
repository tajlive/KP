#!/usr/bin/env node
/**
 * Health Check - Sjekker systemstatus
 */

import { execSync } from 'child_process';

const checks = [
  { name: 'TypeScript', cmd: 'npx tsc --noEmit', timeout: 60000 },
  { name: 'Lint', cmd: 'npm run lint', timeout: 60000 },
  { name: 'Supabase', cmd: 'npx supabase status', timeout: 30000 },
];

console.log('🔍 Health Check\n');

for (const check of checks) {
  process.stdout.write(`${check.name}: `);
  try {
    execSync(check.cmd, { stdio: 'pipe', timeout: check.timeout });
    console.log('✅ OK');
  } catch (e) {
    console.log(`❌ FEIL - ${e.message}`);
    process.exitCode = 1;
  }
}

console.log('\n✅ Health check fullført');
