#!/usr/bin/env node
/**
 * Coverage Report Generator v1.0
 * Parser coverage/coverage-summary.json og genererer:
 * - Per-modul breakdown
 * - Top 10 uncovered files
 * - Trend over tid
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const COV_PATH = resolve(root, 'coverage/coverage-summary.json');
const HISTORY_PATH = resolve(root, '.kimi/coverage-history.jsonl');

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function parseCoverage() {
  const cov = readJson(COV_PATH);
  if (!cov) return null;

  // Total
  const total = cov.total || {};
  const summary = {
    statements: total.statements?.pct ?? 0,
    branches: total.branches?.pct ?? 0,
    functions: total.functions?.pct ?? 0,
    lines: total.lines?.pct ?? 0,
  };

  // Per-modul breakdown
  const modules = {};
  for (const [file, metrics] of Object.entries(cov)) {
    if (file === 'total') continue;
    // Extract module from path: src/features/trading/... -> trading
    const match = file.match(/^src\/(features|app|lib|components|shared)\/([^/]+)/);
    const moduleName = match ? match[2] : 'other';

    if (!modules[moduleName]) {
      modules[moduleName] = { files: 0, statements: [], branches: [], functions: [], lines: [] };
    }
    modules[moduleName].files++;
    modules[moduleName].statements.push(metrics.statements?.pct ?? 0);
    modules[moduleName].branches.push(metrics.branches?.pct ?? 0);
    modules[moduleName].functions.push(metrics.functions?.pct ?? 0);
    modules[moduleName].lines.push(metrics.lines?.pct ?? 0);
  }

  // Calculate averages per module
  const moduleSummary = Object.entries(modules).map(([name, data]) => ({
    name,
    files: data.files,
    statements: Math.round(data.statements.reduce((a, b) => a + b, 0) / data.statements.length),
    branches: Math.round(data.branches.reduce((a, b) => a + b, 0) / data.branches.length),
    functions: Math.round(data.functions.reduce((a, b) => a + b, 0) / data.functions.length),
    lines: Math.round(data.lines.reduce((a, b) => a + b, 0) / data.lines.length),
  })).sort((a, b) => a.statements - b.statements); // Sort by coverage ascending

  // Top 10 uncovered files
  const fileMetrics = Object.entries(cov)
    .filter(([f]) => f !== 'total')
    .map(([file, metrics]) => ({
      file,
      statements: metrics.statements?.pct ?? 0,
      branches: metrics.branches?.pct ?? 0,
    }))
    .filter(f => f.statements < 100) // Only uncovered
    .sort((a, b) => a.statements - b.statements)
    .slice(0, 10);

  return { summary, moduleSummary, fileMetrics };
}

function recordTrend(summary) {
  const entry = {
    ts: new Date().toISOString(),
    statements: summary.statements,
    branches: summary.branches,
    functions: summary.functions,
    lines: summary.lines,
  };

  const dir = dirname(HISTORY_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  appendFileSync(HISTORY_PATH, JSON.stringify(entry) + '\n');
}

function generateMarkdown(data) {
  const { summary, moduleSummary, fileMetrics } = data;
  let md = `# 🧪 Coverage Report — ${new Date().toISOString().slice(0, 10)}\n\n`;

  md += `## 📊 Total\n\n`;
  md += `| Metric | Coverage |\n|--------|----------|\n`;
  md += `| Statements | ${summary.statements}% |\n`;
  md += `| Branches | ${summary.branches}% |\n`;
  md += `| Functions | ${summary.functions}% |\n`;
  md += `| Lines | ${summary.lines}% |\n`;

  md += `\n## 📁 Per-modul\n\n`;
  md += `| Module | Files | Statements | Branches | Functions | Lines |\n`;
  md += `|--------|-------|------------|----------|-----------|-------|\n`;
  for (const m of moduleSummary) {
    const emoji = m.statements < 10 ? '🔴' : m.statements < 25 ? '🟡' : '🟢';
    md += `| ${emoji} ${m.name} | ${m.files} | ${m.statements}% | ${m.branches}% | ${m.functions}% | ${m.lines}% |\n`;
  }

  md += `\n## 🔥 Top 10 Uncovered Files\n\n`;
  md += `| File | Statements | Branches |\n`;
  md += `|------|------------|----------|\n`;
  for (const f of fileMetrics) {
    md += `| ${f.file} | ${f.statements}% | ${f.branches}% |\n`;
  }

  md += `\n---\nGenerert av \`scripts/coverage-report.mjs\`\n`;
  return md;
}

export function generateCoverageReport() {
  const data = parseCoverage();
  if (!data) {
    return { md: '# 🧪 Coverage Report\n\n⚠️ Ingen coverage-data funnet. Kjør `npm run test:coverage` først.\n', data: null };
  }

  // Record trend
  recordTrend(data.summary);

  const md = generateMarkdown(data);
  return { md, data };
}

async function main() {
  const { md, data } = generateCoverageReport();
  console.log(md);

  if (data) {
    const dir = resolve(root, '.kimi/ai-health-reports');
    if (!existsSync(dir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(dir, { recursive: true });
    }
    const filename = `coverage-${new Date().toISOString().slice(0, 10)}.md`;
    writeFileSync(resolve(dir, filename), md);
    console.log(`\n💾 Rapport lagret til .kimi/ai-health-reports/${filename}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
