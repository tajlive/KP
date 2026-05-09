#!/usr/bin/env node
/**
 * 🔄 KIMI Self-Improvement Loop
 *
 * Analyserer siste KIMI-økt fra diary, identifiserer patterns,
 * og oppdaterer MemPalace med lessons learned.
 *
 * Kjøres automatisk via post-task.sh etter hver økt.
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const diaryPath = resolve(root, '.kimi/diary.jsonl');
const summaryDir = resolve(root, '.kimi/session-summaries');
const outputPath = resolve(summaryDir, 'self-improve-latest.txt');

const outputLines = [];

function log(level, msg) {
  const icons = { info: 'ℹ️', warn: '⚠️', success: '✅', error: '❌', think: '🧠' };
  const line = `${icons[level] || '•'} ${msg}`;
  console.error(line);
  outputLines.push(line);
}

function saveOutput() {
  try {
    import('fs').then(fs => {
      fs.mkdirSync(summaryDir, { recursive: true });
      fs.writeFileSync(outputPath, outputLines.join('\n') + '\n', 'utf8');
    }).catch(() => {});
  } catch (e) {
    console.error(`• Failed to save self-improve output: ${e.message}`);
  }
}

function main() {
  if (!existsSync(diaryPath)) {
    log('warn', 'Ingen diary funnet');
    return;
  }

  const lines = readFileSync(diaryPath, 'utf8').split('\n').filter(Boolean);
  if (lines.length === 0) {
    log('warn', 'Tom diary');
    return;
  }

  // Parse siste 10 entries
  const entries = lines.slice(-10).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  if (entries.length === 0) return;

  const last = entries[entries.length - 1];

  log('think', `Analyserer siste økt: ${last.task?.slice(0, 50) || 'ukjent'}...`);

  // ─── 1. NO-GO ANALYSE ───
  const noGoEntries = entries.filter(e => e.status === 'NO-GO');
  if (noGoEntries.length > 0) {
    log('warn', `${noGoEntries.length} NO-GO i siste 10 økter`);
    for (const e of noGoEntries) {
      const lesson = `${e.type || 'TASK'}: ${e.task?.slice(0, 80)} → NO-GO`;
      log('error', `  ${lesson}`);

      // Lagre til error_patterns
      try {
        execSync(
          `node scripts/mempalace-search.mjs "${lesson.replace(/"/g, '\\"')}" 2>/dev/null || true`,
          { cwd: root, timeout: 2000 }
        );
      } catch { /* ignore */ }
    }
  }

  // ─── 2. LAV RATING ANALYSE ───
  const lowRated = entries.filter(e => e.rating && e.rating <= 2);
  if (lowRated.length > 0) {
    log('warn', `${lowRated.length} lavt ratede økter (≤2/5)`);
  }

  // ─── 3. GJENTATTE OPPGAVER ───
  const taskCounts = {};
  for (const e of entries) {
    const key = (e.task || '').toLowerCase().slice(0, 30);
    if (key.length > 5) taskCounts[key] = (taskCounts[key] || 0) + 1;
  }
  const repeated = Object.entries(taskCounts).filter(([, c]) => c >= 2);
  if (repeated.length > 0) {
    log('think', `${repeated.length} gjentatte oppgaver — vurder automatisering:`);
    for (const [task, count] of repeated) {
      log('info', `  "${task}..." → ${count} ganger`);
    }
  }

  // ─── 4. AGENT-EFFEKTIVITET ───
  const agentStats = {};
  for (const e of entries) {
    const agent = e.tags?.find(t => t.includes('agent')) || 'default';
    if (!agentStats[agent]) agentStats[agent] = { total: 0, go: 0, rating: 0, rated: 0 };
    agentStats[agent].total++;
    if (e.status === 'GO') agentStats[agent].go++;
    if (e.rating) {
      agentStats[agent].rating += e.rating;
      agentStats[agent].rated++;
    }
  }

  log('info', 'Agent-effektivitet (siste 10):');
  for (const [agent, stats] of Object.entries(agentStats)) {
    const rate = stats.total > 0 ? Math.round((stats.go / stats.total) * 100) : 0;
    const avgRating = stats.rated > 0 ? (stats.rating / stats.rated).toFixed(1) : 'N/A';
    log('info', `  ${agent}: ${rate}% GO, ${avgRating}/5 avg`);
  }

  // ─── 5. ANBEFALINGER ───
  const recommendations = [];

  if (noGoEntries.length >= 2) {
    recommendations.push('Hyppige NO-GO → vurder å kjøre verify-agent før endringer');
  }
  if (repeated.length >= 2) {
    recommendations.push('Gjentatte oppgaver → vurder å automatisere med script/workflow');
  }
  if (lowRated.length >= 2) {
    recommendations.push('Lave ratings → vurder om oppgaver er for store (bryt ned)');
  }

  if (recommendations.length > 0) {
    log('think', 'Self-Improvement Anbefalinger:');
    for (const r of recommendations) {
      log('success', `  → ${r}`);
    }
  } else {
    log('success', 'Ingen problemer identifisert — keep it up! 🚀');
  }

  saveOutput();
}

main();
