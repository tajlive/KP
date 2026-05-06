#!/usr/bin/env node
/**
 * CI Client Component Gate v1.0
 * Sjekker at antall client components ikke øker med mer enn threshold per PR.
 * Bruk i CI: node scripts/ci-client-component-gate.mjs --threshold=5
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const THRESHOLD = parseInt(process.argv.find(a => a.startsWith('--threshold='))?.split('=')[1] || '5');
const HISTORY_PATH = resolve(root, '.kimi/client-component-history.jsonl');

function countClientComponents() {
  const { globSync } = require('glob');
  const files = globSync('src/**/*.{ts,tsx}', {
    ignore: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    cwd: root,
  });

  let count = 0;
  for (const file of files) {
    const content = readFileSync(resolve(root, file), 'utf-8');
    if (content.includes('"use client"') || content.includes("'use client'")) {
      count++;
    }
  }
  return count;
}

function getPreviousCount() {
  if (!existsSync(HISTORY_PATH)) return null;
  const lines = readFileSync(HISTORY_PATH, 'utf8').split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  try {
    const last = JSON.parse(lines[lines.length - 1]);
    return last.count;
  } catch {
    return null;
  }
}

function recordCount(count) {
  const { appendFileSync } = require('fs');
  const entry = { ts: new Date().toISOString(), count };
  appendFileSync(HISTORY_PATH, JSON.stringify(entry) + '\n');
}

function main() {
  const current = countClientComponents();
  const previous = getPreviousCount();

  console.log(`🔍 Client components: ${current}`);
  if (previous !== null) {
    const delta = current - previous;
    console.log(`   Previous: ${previous} (Δ ${delta > 0 ? '+' : ''}${delta})`);

    if (delta > THRESHOLD) {
      console.error(`\n❌ FAIL: Client components increased by ${delta} (threshold: ${THRESHOLD})`);
      console.error(`   Please review your PR for unnecessary "use client" directives.`);
      process.exit(1);
    }

    if (delta <= 0) {
      console.log(`\n✅ PASS: Client components stable or reduced.`);
    } else {
      console.log(`\n✅ PASS: Client components increased by ${delta} (within threshold).`);
    }
  } else {
    console.log(`   No previous count found. Recording baseline.`);
  }

  recordCount(current);
}

main();
