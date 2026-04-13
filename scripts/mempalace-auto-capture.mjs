#!/usr/bin/env node
/**
 * 🏛️ MemPalace Auto-Capture
 * Kjører ved commit for å automatisk dokumentere endringer i:
 * - Database (migrations)
 * - i18n (nye/endrede nøkler)
 * - API (nye ruter)
 * - Trading (kritiske filer)
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
    // Hvis vi kjører i en hook, kan vi kanskje ikke lese meldingen ennå,
    // men vi kan prøve å se på siste commit hvis vi er i post-commit,
    // eller bare logge filene hvis vi er i pre-commit.
    return execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'Automatic commit capture';
  }
}

function analyzeChanges(files) {
  const changes = {
    db: files.filter(f => f.startsWith('supabase/migrations/')),
    i18n: files.filter(f => f.includes('messages/') && f.endsWith('.json')),
    api: files.filter(f => f.startsWith('src/app/api/')),
    trading: files.filter(f => f.includes('lib/trading/') || f.includes('features/trading/')),
    scripts: files.filter(f => f.startsWith('scripts/'))
  };

  const types = [];
  if (changes.db.length) types.push('SQL');
  if (changes.i18n.length) types.push('i18n');
  if (changes.api.length) types.push('API');
  if (changes.trading.length) types.push('Trading');
  if (changes.scripts.length) types.push('Scripts');

  return { changes, types: types.join(',') };
}

function capture() {
  const files = getStagedFiles();
  if (files.length === 0) return;

  const { changes, types } = analyzeChanges(files);
  if (!types) return; // Ingenting "interessant" å logge auto

  const msg = getCommitMessage();
  const ts = new Date().toISOString();
  
  const entry = {
    ts,
    type: 'AUTO',
    task: `[${types}] ${msg}`,
    files: files.length,
    status: 'GO',
    rating: 2,
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
