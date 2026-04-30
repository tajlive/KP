#!/usr/bin/env node
/**
 * 🏛️ MemPalace Status — v3.2.0
 * Viser MemPalace-status ved KIMI-oppstart.
 * Leser .mempalace/kg.json og .kimi/diary.jsonl direkte.
 * Skriver ACTIVE_SESSION med session_id for idempotent exit-flush.
 */

import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const kgPath = resolve(root, '.mempalace/kg.json');
const diaryPath = resolve(root, '.kimi/diary.jsonl');
const activeSession = resolve(process.env.HOME || '/Users/taj', '.kimi/ACTIVE_SESSION');

function formatDate(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleString('no-NO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function nowISO() {
  return new Date().toISOString();
}

// ─── KG STATUS ───
let entityCount = 0;
let factCount = 0;
let kgAge = 'N/A';
let kgSize = 0;

if (existsSync(kgPath)) {
  try {
    const kg = JSON.parse(readFileSync(kgPath, 'utf8'));
    entityCount = Object.keys(kg).length;
    factCount = Object.values(kg).reduce((sum, facts) => sum + (Array.isArray(facts) ? facts.length : 0), 0);
    const stat = statSync(kgPath);
    kgAge = formatDate(stat.mtime);
    kgSize = stat.size;
  } catch (e) {
    // ignore
  }
}

// ─── DIARY STATUS ───
let diaryCount = 0;
let lastEntry = null;

if (existsSync(diaryPath)) {
  try {
    const lines = readFileSync(diaryPath, 'utf8').trim().split('\n').filter(Boolean);
    diaryCount = lines.length;
    if (lines.length > 0) {
      lastEntry = JSON.parse(lines[lines.length - 1]);
    }
  } catch (e) {
    // ignore
  }
}

// ─── SESSION ID ───
const sessionId = `kp-${Date.now()}-${process.pid}`;
try {
  mkdirSync(resolve(activeSession, '..'), { recursive: true });
  writeFileSync(activeSession, `start_timestamp=${Date.now()}\nsession_id=${sessionId}\n`, 'utf8');
} catch {
  // ignore — session tracking is best-effort
}

// ─── PRINT ───
console.log('');
console.log('🏛️  MemPalace v3.1.1');
console.log('───────────────────────');
console.log(`  Entities: ${entityCount}  |  Facts: ${factCount}`);
console.log(`  KG:       ${kgSize.toLocaleString('no-NO')} bytes, saved ${kgAge}`);
console.log(`  Diary:    ${diaryCount} entries`);
if (lastEntry) {
  const status = lastEntry.status || '?';
  const type = lastEntry.type || '?';
  const task = lastEntry.task || lastEntry.desc || '?';
  const rating = lastEntry.rating ? '★'.repeat(lastEntry.rating) : '';
  console.log(`  Last:     [${type}] ${task.slice(0, 40)}${task.length > 40 ? '...' : ''} ${status} ${rating}`);
}
console.log(`  Session:  ${sessionId}`);
console.log('───────────────────────');
console.log('');
