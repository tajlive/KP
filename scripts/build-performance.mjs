#!/usr/bin/env node
/**
 * Build Performance Tracker v1.0
 * Logger bygg-tid og størrelse til trend-fil.
 * Bruk: node scripts/build-performance.mjs [build-output.json]
 */
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const HISTORY_PATH = resolve(root, '.kimi/build-performance.jsonl');

function getBuildDuration() {
  // Try to read from Next.js build trace
  const tracePath = resolve(root, '.next/trace');
  if (!existsSync(tracePath)) return null;
  try {
    const trace = readFileSync(tracePath, 'utf8').split('\n').filter(Boolean);
    // Find the last line with duration info
    for (let i = trace.length - 1; i >= 0; i--) {
      const line = trace[i];
      if (line.includes('duration')) {
        const match = line.match(/"duration":\s*(\d+)/);
        if (match) return Math.round(parseInt(match[1]) / 1000);
      }
    }
  } catch { /* ignore */ }
  return null;
}

function getBundleSize() {
  try {
    const { execSync } = await import('child_process');
    const out = execSync('du -sh .next/static', { cwd: root, encoding: 'utf8' });
    const match = out.match(/([\d.]+[KMGT]?)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function main() {
  const buildDuration = getBuildDuration();
  const bundleSize = await getBundleSize();

  const entry = {
    ts: new Date().toISOString(),
    durationSeconds: buildDuration,
    bundleSize,
  };

  appendFileSync(HISTORY_PATH, JSON.stringify(entry) + '\n');

  console.log(`📊 Build performance logged:`);
  console.log(`   Duration: ${buildDuration ? buildDuration + 's' : 'N/A'}`);
  console.log(`   Bundle: ${bundleSize || 'N/A'}`);
  console.log(`   History: ${HISTORY_PATH}`);
}

main().catch(e => {
  console.error('Feil:', e.message);
  process.exit(1);
});
