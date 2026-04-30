#!/usr/bin/env node
/**
 * Test: MemPalace Startup
 * Verifiserer at mempalace-status.mjs:
 * 1. Printer status
 * 2. Skriver ACTIVE_SESSION med session_id + start_timestamp
 * 3. ACTIVE_SESSION er parsebar
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';

const ACTIVE_SESSION = `${process.env.HOME}/.kimi/ACTIVE_SESSION`;
const root = '/Users/taj/klarpakke';

let exitCode = 0;

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); exitCode = 1; }

// Cleanup any stale marker
try { unlinkSync(ACTIVE_SESSION); } catch {}

console.log('\n🧪 Test: MemPalace Startup');
console.log('──────────────────────────');

// Run status script
let output;
try {
  output = execSync('node scripts/mempalace-status.mjs', { cwd: root, encoding: 'utf8', timeout: 5000 });
} catch (e) {
  fail(`mempalace-status.mjs failed: ${e.message}`);
  process.exit(1);
}

// Verify output contains expected sections
if (output.includes('MemPalace v3.1.1')) ok('Output contains header');
else fail('Output missing header');

if (output.includes('Session:')) ok('Output contains session_id');
else fail('Output missing session_id');

// Verify ACTIVE_SESSION was written
if (existsSync(ACTIVE_SESSION)) {
  ok('ACTIVE_SESSION file created');
  const raw = readFileSync(ACTIVE_SESSION, 'utf8');
  if (raw.includes('start_timestamp=')) ok('ACTIVE_SESSION has start_timestamp');
  else fail('ACTIVE_SESSION missing start_timestamp');
  if (raw.includes('session_id=')) ok('ACTIVE_SESSION has session_id');
  else fail('ACTIVE_SESSION missing session_id');
  if (raw.includes('kp-')) ok('ACTIVE_SESSION has valid session_id format');
  else fail('ACTIVE_SESSION has invalid session_id format');
} else {
  fail('ACTIVE_SESSION file NOT created');
}

console.log('──────────────────────────');
console.log(exitCode === 0 ? '✅ All startup tests passed' : '❌ Some startup tests failed');
console.log('');
process.exit(exitCode);
