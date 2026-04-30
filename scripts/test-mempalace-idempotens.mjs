#!/usr/bin/env node
/**
 * Test: MemPalace Idempotens
 * Verifiserer at dobbel exit-flush er trygg:
 * 1. Første flush: kjører, logger, fjerner ACTIVE_SESSION
 * 2. Andre flush: noop, logger at session allerede er flushed
 * 3. Ingen kræsj, ingen duplikat-operasjoner
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const ACTIVE_SESSION = `${process.env.HOME}/.kimi/ACTIVE_SESSION`;
const LOG_PATH = `${process.env.HOME}/.kimi/logs/mempalace.jsonl`;
const root = '/Users/taj/klarpakke';

let exitCode = 0;

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); exitCode = 1; }

// Cleanup
try { unlinkSync(ACTIVE_SESSION); } catch {}

console.log('\n🧪 Test: MemPalace Idempotens (Double Exit)');
console.log('──────────────────────────');

// Count log lines before
let logLinesBefore = 0;
try {
  const log = readFileSync(LOG_PATH, 'utf8').trim();
  logLinesBefore = log.split('\n').filter(Boolean).length;
} catch {}

// --- FIRST FLUSH ---
writeFileSync(ACTIVE_SESSION, `start_timestamp=${Date.now() - 60000}\nsession_id=kp-test-idem-99999\n`, 'utf8');

let out1;
try {
  out1 = execSync('node scripts/mempalace-exit-flush.mjs', {
    cwd: root, encoding: 'utf8', timeout: 10000,
    env: { ...process.env, MEMPALACE_FLUSH_SOURCE: 'test-idem-1' },
  });
} catch (e) {
  fail(`First flush failed: ${e.message}`);
  process.exit(1);
}

if (!existsSync(ACTIVE_SESSION)) ok('First flush removed ACTIVE_SESSION');
else fail('First flush did NOT remove ACTIVE_SESSION');

if (!out1.includes('NOOP')) ok('First flush was NOT a noop');
else fail('First flush was unexpectedly a noop');

// --- SECOND FLUSH (same session, no ACTIVE_SESSION) ---
let out2;
try {
  out2 = execSync('node scripts/mempalace-exit-flush.mjs', {
    cwd: root, encoding: 'utf8', timeout: 10000,
    env: { ...process.env, MEMPALACE_FLUSH_SOURCE: 'test-idem-2' },
  });
} catch (e) {
  fail(`Second flush failed: ${e.message}`);
  process.exit(1);
}

if (out2.includes('NOOP')) ok('Second flush is NOOP (idempotent)');
else fail('Second flush was NOT a noop');

// --- THIRD FLUSH (completely new session, already flushed before) ---
writeFileSync(ACTIVE_SESSION, `start_timestamp=${Date.now() - 60000}\nsession_id=kp-test-idem-99999\n`, 'utf8');

let out3;
try {
  out3 = execSync('node scripts/mempalace-exit-flush.mjs', {
    cwd: root, encoding: 'utf8', timeout: 10000,
    env: { ...process.env, MEMPALACE_FLUSH_SOURCE: 'test-idem-3' },
  });
} catch (e) {
  fail(`Third flush failed: ${e.message}`);
  process.exit(1);
}

if (!out3.includes('NOOP')) ok('Third flush (re-created marker) runs again');
else fail('Third flush was unexpectedly a noop');

// Verify log has correct entries
let logLinesAfter = 0;
try {
  const log = readFileSync(LOG_PATH, 'utf8').trim();
  logLinesAfter = log.split('\n').filter(Boolean).length;
} catch {}

const newLines = logLinesAfter - logLinesBefore;
if (newLines >= 3) ok(`Log has ${newLines} new entries (first + noop + re-flush)`);
else fail(`Expected >= 3 new log lines, got ${newLines}`);

// Verify all return codes were 0
console.log('──────────────────────────');
console.log(exitCode === 0 ? '✅ All idempotens tests passed' : '❌ Some idempotens tests failed');
console.log('');
process.exit(exitCode);
