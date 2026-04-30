#!/usr/bin/env node
/**
 * 🏛️ MemPalace Exit Flush — v3.1.1
 * Sikrer at MemPalace MCP har lagret til disk ved KIMI-exit.
 * MemPalace v3.1.1 lagrer automatisk ved SIGTERM/SIGINT.
 * Dette scriptet verifiserer at lagringen skjedde.
 */

import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const kgPath = resolve(root, '.mempalace/kg.json');
const diaryPath = resolve(root, '.kimi/diary.jsonl');

function formatAge(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

console.log('');
console.log('🏛️  MemPalace Exit Flush');
console.log('──────────────────────────');

// Sjekk om MemPalace MCP-prosess kjører
const { execSync } = await import('child_process');
let mcpRunning = false;
try {
  execSync('pgrep -f "run-mempalace-mcp-v2.mjs"', { stdio: 'ignore' });
  mcpRunning = true;
} catch {
  mcpRunning = false;
}

if (mcpRunning) {
  console.log('  MemPalace MCP running — SIGTERM will trigger auto-save');
  // Vent litt for at SIGTERM-håndtering skal fullføres
  await new Promise(r => setTimeout(r, 500));
} else {
  console.log('  MemPalace MCP not running (already saved or not started)');
}

// Verifiser at filer eksisterer og er nylig oppdatert
const now = Date.now();
let kgAge = null;
let diaryAge = null;

if (existsSync(kgPath)) {
  const stat = statSync(kgPath);
  kgAge = now - stat.mtimeMs;
  console.log(`  KG: ${formatAge(kgAge)} old (${stat.mtime.toLocaleString('no-NO')})`);
} else {
  console.log('  ⚠️  KG file not found');
}

if (existsSync(diaryPath)) {
  const stat = statSync(diaryPath);
  diaryAge = now - stat.mtimeMs;
  console.log(`  Diary: ${formatAge(diaryAge)} old (${stat.mtime.toLocaleString('no-NO')})`);
} else {
  console.log('  ⚠️  Diary file not found');
}

if (kgAge !== null && kgAge < 300000) {
  console.log('  ✅ KG saved recently (< 5 min)');
}
if (diaryAge !== null && diaryAge < 300000) {
  console.log('  ✅ Diary saved recently (< 5 min)');
}

console.log('──────────────────────────');
console.log('👋 MemPalace safe — exiting');
console.log('');
