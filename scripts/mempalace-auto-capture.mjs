#!/usr/bin/env node
/**
 * 🏛️ MemPalace Auto-Capture v2.0 (2026-05-03)
 * Kjører ved commit for å automatisk dokumentere endringer.
 * Utvidet med routing, cleanup, binance, config, frontend kategorier.
 */

import { execSync } from 'child_process';
import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DIARY_V2 = '.kimi/diary.jsonl';
const AGENT = process.env.MEMPALACE_AGENT || 'auto-capture';

function getStagedFiles() {
  try {
    return execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.length > 0);
  } catch (e) {
    return [];
  }
}

function getCommitMessage() {
  try {
    // I post-commit: les faktisk commit-melding
    // I pre-commit: git log -1 returnerer forrige commit, så sjekk om vi er i pre-commit
    const inPreCommit = process.env.GIT_INDEX_FILE !== undefined;
    if (inPreCommit) {
      return null; // Vil bli erstattet med fil-basert beskrivelse
    }
    return execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function analyzeChanges(files) {
  const changes = {
    db: files.filter(f => f.startsWith('supabase/migrations/')),
    i18n: files.filter(f => f.includes('messages/') && f.endsWith('.json')),
    api: files.filter(f => f.startsWith('src/app/api/')),
    trading: files.filter(f => f.includes('lib/trading/') || f.includes('features/trading/')),
    scripts: files.filter(f => f.startsWith('scripts/')),
    // NYTT v2.0 — kategorier som tidligere falt gjennom:
    routing: files.filter(f =>
      f.includes('middleware/') ||
      f.includes('routing/') ||
      f === 'next.config.mjs' ||
      f === 'next.config.ts' ||
      f.includes('i18n/')
    ),
    cleanup: files.filter(f =>
      f.includes('(beta)') ||
      f.includes('(onboarding)') ||
      f.includes('/archive/') ||
      f.includes('/legacy/')
    ),
    binance: files.filter(f =>
      f.includes('binance') &&
      !f.includes('.test.') &&
      !f.includes('__tests__')
    ),
    config: files.filter(f =>
      f.endsWith('.config.mjs') ||
      f.endsWith('.config.ts') ||
      f.endsWith('.config.js')
    ),
    frontend: files.filter(f =>
      (f.startsWith('src/components/') || f.startsWith('src/features/')) &&
      !f.includes('features/trading/')
    ),
    hooks: files.filter(f => f.startsWith('src/hooks/') || f.startsWith('src/lib/hooks/')),
  };

  const types = [];
  if (changes.db.length) types.push('SQL');
  if (changes.i18n.length) types.push('i18n');
  if (changes.api.length) types.push('API');
  if (changes.trading.length) types.push('Trading');
  if (changes.scripts.length) types.push('Scripts');
  if (changes.routing.length) types.push('Routing');
  if (changes.cleanup.length) types.push('Cleanup');
  if (changes.binance.length) types.push('Binance');
  if (changes.config.length) types.push('Config');
  if (changes.frontend.length) types.push('Frontend');
  if (changes.hooks.length) types.push('Hooks');

  return { changes, types: types.join(',') };
}

function capture() {
  const files = getStagedFiles();
  if (files.length === 0) return;

  const { changes, types } = analyzeChanges(files);
  if (!types) return; // Ingenting "interessant" å logge auto

  let msg = getCommitMessage();
  if (!msg || msg === 'Automatic commit capture') {
    // Pre-commit context: bygg beskrivelse fra filer
    const fileList = files.slice(0, 5).map(f => f.split('/').pop()).join(', ');
    const more = files.length > 5 ? ` +${files.length - 5} more` : '';
    msg = `Auto-capture: ${fileList}${more}`;
  }
  const ts = new Date().toISOString();

  const entry = {
    ts,
    type: 'AUTO',
    task: `[${types}] ${msg}`,
    files: files.length,
    status: 'GO',
    rating: 3, // Pre-commit hook har allerede validert (auth-guard, secrets, TS, lint)
    agent: AGENT,
    meta: {
      staged_files: files,
      categories: types.split(',')
    }
  };

  try {
    mkdirSync(join(process.cwd(), '.kimi'), { recursive: true });
    appendFileSync(join(process.cwd(), DIARY_V2), JSON.stringify(entry) + '\n');
    console.log(`🏛️  MemPalace auto-captured changes in: ${types}`);
  } catch (e) {
    console.error('❌ MemPalace auto-capture failed:', e.message);
  }
}

capture();
