#!/usr/bin/env node
/**
 * Test: MemPalace Exit Flush
 * Verifiserer at mempalace-exit-flush.mjs:
 * 1. Verifiserer kg.json og diary.jsonl
 * 2. Fjerner ACTIVE_SESSION
 * 3. Logger til mempalace.jsonl
 * 4. Returnerer 0
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const ACTIVE_SESSION = `${process.env.HOME}/.kimi/ACTIVE_SESSION`;
const LOG_PATH = `${process.env.HOME}/.kimi/logs/mempalace.jsonl`;
const root = '/Users/taj/klarpakke';

let exitCode = 0;

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); exitCode = 1; }

// Ensure ACTIVE_SESSION exists with valid content
writeFileSync(ACTIVE_SESSION, `start_timestamp=${Date.now() - 60000}\nsession_id=kp-test-exit-12345\n`, 'utf8');

// Count log lines before
let logLinesBefore = 0;
try {
  const log = readFileSync(LOG_PATH, 'utf8').trim();
  logLinesBefore = log.split('\n').filter(Boolean).length;
} catch {}

console.log('\n🧪 Test: MemPalace Exit Flush');
console.log('──────────────────────────');

// Run exit flush
let output;
try {
  output = execSync('node scripts/mempalace-exit-flush.mjs', {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, MEMPALACE_FLUSH_SOURCE: 'test-exit' },
  });
} catch (e) {
  fail(`mempalace-exit-flush.mjs failed: ${e.message}`);
  process.exit(1);
}

// Verify ACTIVE_SESSION was removed
if (!existsSync(ACTIVE_SESSION)) ok('ACTIVE_SESSION removed after flush');
else fail('ACTIVE_SESSION still exists after flush');

// Verify output contains status
if (output.includes('MemPalace Exit Flush')) ok('Output contains header');
else fail('Output missing header');

if (output.includes('Status:')) ok('Output contains status');
else fail('Output missing status');

// Verify log was written
let logLinesAfter = 0;
try {
  const log = readFileSync(LOG_PATH, 'utf8').trim();
  logLinesAfter = log.split('\n').filter(Boolean).length;
} catch {}

if (logLinesAfter > logLinesBefore) ok(`Log appended (${logLinesAfter - logLinesBefore} new line)`);
else fail('Log NOT appended');

// Verify last log entry is valid JSON with expected fields
const lastLine = readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean).pop();
try {
  const entry = JSON.parse(lastLine);
  if (entry.phase === 'exit') ok('Log entry has phase=exit');
  else fail(`Log entry has wrong phase: ${entry.phase}`);
  if (entry.session_id === 'kp-test-exit-12345') ok('Log entry has correct session_id');
  else fail(`Log entry has wrong session_id: ${entry.session_id}`);
  if (entry.source === 'test-exit') ok('Log entry has correct source');
  else fail(`Log entry has wrong source: ${entry.source}`);
  if (entry.file_state && entry.file_state.kg_exists !== undefined) ok('Log entry has file_state');
  else fail('Log entry missing file_state');
} catch (e) {
  fail(`Last log line is not valid JSON: ${e.message}`);
}

console.log('──────────────────────────');
console.log(exitCode === 0 ? '✅ All exit tests passed' : '❌ Some exit tests failed');
console.log('');
process.exit(exitCode);
