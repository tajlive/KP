#!/usr/bin/env node
/**
 * Diagnostikk: verifiser at load-env.mjs laster alle kritiske env-vars korrekt
 * Kjøres med: node scripts/diag-load-env.mjs
 */
import { loadEnvLocal } from './load-env.mjs';

const env = loadEnvLocal();

const keys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'KLARPAKKE_MCP_TOKEN',
  'DATABASE_URL',
  'SUPABASE_PROJECT_REF',
];

console.log('\n=== load-env diagnostikk ===');
let errors = 0;
keys.forEach(k => {
  const v = env[k] || '';
  const hasTrailing = v !== v.trim();
  if (!v) {
    console.log(`  \u274c MANGLER   ${k}`);
    errors++;
  } else if (hasTrailing) {
    console.log(`  \u26a0\ufe0f  TRAILING  ${k} (${v.length} tegn - trim fjerner ${v.length - v.trim().length} tegn)`);
    errors++;
  } else {
    console.log(`  \u2705 OK        ${k} (${v.length} tegn)`);
  }
});
console.log(`\n=== ${errors === 0 ? '\u2705 ALT OK' : `\u274c ${errors} PROBLEM(ER) FUNNET`} ===\n`);
process.exit(errors > 0 ? 1 : 0);
