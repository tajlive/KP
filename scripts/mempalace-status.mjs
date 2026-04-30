#!/usr/bin/env node
/**
 * 🏛️ MemPalace Status — v3.1.1
 * Viser MemPalace-status ved KIMI-oppstart.
 * Leser .mempalace/kg.json og .kimi/diary.jsonl direkte.
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const kgPath = resolve(root, '.mempalace/kg.json');
const diaryPath = resolve(root, '.kimi/diary.jsonl');

function formatDate(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleString('no-NO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── KG STATUS ───
let entityCount = 0;
let factCount = 0;
let kgAge = 'N/A';

if (existsSync(kgPath)) {
  try {
    const kg = JSON.parse(readFileSync(kgPath, 'utf8'));
    entityCount = Object.keys(kg).length;
    factCount = Object.values(kg).reduce((sum, facts) => sum + (Array.isArray(facts) ? facts.length : 0), 0);
    const stat = statSync(kgPath);
    kgAge = formatDate(stat.mtime);
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

// ─── PRINT ───
console.log('');
console.log('🏛️  MemPalace v3.1.1');
console.log('───────────────────────');
console.log(`  Entities: ${entityCount}  |  Facts: ${factCount}`);
console.log(`  KG last saved: ${kgAge}`);
console.log(`  Diary entries: ${diaryCount}`);
if (lastEntry) {
  const status = lastEntry.status || '?';
  const type = lastEntry.type || '?';
  const task = lastEntry.task || lastEntry.desc || '?';
  const rating = lastEntry.rating ? '★'.repeat(lastEntry.rating) : '';
  console.log(`  Last: [${type}] ${task.slice(0, 40)}${task.length > 40 ? '...' : ''} ${status} ${rating}`);
}
console.log('───────────────────────');
console.log('');
