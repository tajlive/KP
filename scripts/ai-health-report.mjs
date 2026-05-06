#!/usr/bin/env node
/**
 * AI Health Report Generator v1.1
 * Genererer ukentlig rapport om KIMI+MemPalace-systemets helse
 * Inkluderer nå: dependencies, coverage, client-components
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function readLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').filter(Boolean);
}

function parseDiaryStats() {
  const diaryPath = resolve(root, '.kimi/diary.jsonl');
  const lines = readLines(diaryPath);
  const entries = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  const last7Days = entries.filter(e => {
    const d = new Date(e.ts || e.date);
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });

  const goCount = last7Days.filter(e => e.status === 'GO').length;
  const noGoCount = last7Days.filter(e => e.status === 'NO-GO').length;
  const total = last7Days.length;
  const avgRating = total > 0
    ? (last7Days.reduce((s, e) => s + (e.rating || 0), 0) / total).toFixed(1)
    : 'N/A';

  return { total, goCount, noGoCount, goRate: total > 0 ? Math.round(goCount/total*100) : 0, avgRating };
}

function parseMemPalaceStats() {
  const statusPath = resolve(root, '.mempalace/index-cache-v3.json.gz');
  const kgPath = resolve(root, '.mempalace/kg.json');
  const kgAppendPath = resolve(root, '.mempalace/kg-append.jsonl');

  const kgSize = existsSync(kgPath) ? readLines(kgPath).length : 0;
  const kgAppendSize = existsSync(kgAppendPath) ? readLines(kgAppendPath).length : 0;
  const indexSize = existsSync(statusPath) ? Math.round(readFileSync(statusPath).length / 1024) : 0;

  return { kgEntities: kgSize + kgAppendSize, indexSizeKB: indexSize };
}

function parseTestCoverage() {
  const covPath = resolve(root, 'coverage/coverage-summary.json');
  const cov = readJson(covPath);
  if (!cov || !cov.total) return { pct: 'N/A' };
  return { pct: Math.round(cov.total.statements.pct) };
}

async function getNpmAudit() {
  try {
    const { execSync } = await import('child_process');
    const out = execSync('npm audit --json', { cwd: root, encoding: 'utf8', timeout: 30000 });
    const audit = JSON.parse(out);
    const critical = Object.values(audit.vulnerabilities || {}).filter(v => v.severity === 'critical').length;
    const high = Object.values(audit.vulnerabilities || {}).filter(v => v.severity === 'high').length;
    return { critical, high, total: Object.keys(audit.vulnerabilities || {}).length };
  } catch {
    return { critical: '?', high: '?', total: '?' };
  }
}

async function getTypeCheckStatus() {
  try {
    const { execSync } = await import('child_process');
    execSync('npm run type-check', { cwd: root, encoding: 'utf8', timeout: 120000 });
    return 'PASS';
  } catch {
    return 'FAIL';
  }
}

async function loadDependencyReport() {
  try {
    const { generateDependencyReport } = await import('./dependency-report.mjs');
    return generateDependencyReport();
  } catch {
    return null;
  }
}

async function loadCoverageReport() {
  try {
    const { generateCoverageReport } = await import('./coverage-report.mjs');
    return generateCoverageReport();
  } catch {
    return null;
  }
}

function parseClientComponentStats() {
  const reportPath = resolve(root, '.kimi/ai-health-reports/client-components-report.md');
  if (!existsSync(reportPath)) return { total: '?', safe: '?', refactor: '?', keep: '?' };
  const content = readFileSync(reportPath, 'utf8');
  const totalMatch = content.match(/\*\*Total\*\* \| \*\*(\d+)\*\*/);
  const safeMatch = content.match(/Safe to remove \| (\d+)/);
  const refactorMatch = content.match(/Needs refactor \| (\d+)/);
  const keepMatch = content.match(/Must keep \| (\d+)/);
  return {
    total: totalMatch ? totalMatch[1] : '?',
    safe: safeMatch ? safeMatch[1] : '?',
    refactor: refactorMatch ? refactorMatch[1] : '?',
    keep: keepMatch ? keepMatch[1] : '?',
  };
}

async function generateReport() {
  const diary = parseDiaryStats();
  const mem = parseMemPalaceStats();
  const cov = parseTestCoverage();
  const audit = await getNpmAudit();
  const typeCheck = await getTypeCheckStatus();
  const depReport = await loadDependencyReport();
  const covReport = await loadCoverageReport();
  const clientComp = parseClientComponentStats();

  const outdatedCount = depReport?.outdated?.count ?? '?';
  const outdatedMajor = depReport?.outdated?.major ?? '?';
  const coverageStatements = covReport?.data?.summary?.statements ?? cov.pct;

  const report = `# 🤖 AI Health Report — ${new Date().toISOString().slice(0, 10)}

## 📊 Siste 7 dager
| Metrikk | Verdi |
|---------|-------|
| Oppgaver | ${diary.total} |
| GO-rate | ${diary.goRate}% (${diary.goCount} GO, ${diary.noGoCount} NO-GO) |
| Gj.snitt rating | ${diary.avgRating}/5 |

## 🧠 MemPalace
| Metrikk | Verdi |
|---------|-------|
| KG entities | ${mem.kgEntities} |
| Index cache | ${mem.indexSizeKB} KB |

## 🧪 Kodekvalitet
| Metrikk | Verdi |
|---------|-------|
| Type-check | ${typeCheck} |
| Test coverage | ${coverageStatements}% |
| npm audit (critical/high) | ${audit.critical}/${audit.high} |
| Utdaterte pakker (major) | ${outdatedCount} (${outdatedMajor} major) |
| Client components | ${clientComp.total} (safe: ${clientComp.safe}, refactor: ${clientComp.refactor}) |

## 🎯 Anbefalinger
${diary.goRate < 80 ? '- ⚠️ GO-rate under 80% — sjekk gjentakende feilmønstre i diary\n' : ''}${coverageStatements === 'N/A' || (typeof coverageStatements === 'number' && coverageStatements < 25) ? '- 🔴 Test coverage kritisk lav — prioriter testing-agent\n' : ''}${audit.critical > 0 ? '- 🚨 Kritiske npm-sårbarheter funnet — kjør security-agent\n' : ''}${typeCheck === 'FAIL' ? '- ❌ Type-check feiler — fiks TYPE_DEBT før merge\n' : ''}${typeof outdatedMajor === 'number' && outdatedMajor > 5 ? '- 📦 Mange major-oppdateringer — vurder dependency-check\n' : ''}${typeof clientComp.safe === 'number' && clientComp.safe > 10 ? '- 🧩 Mange client components kan bli Server Components — kjør refactor-script\n' : ''}${diary.goRate >= 80 && (coverageStatements !== 'N/A' && typeof coverageStatements === 'number' && coverageStatements >= 25) && audit.critical === 0 && typeCheck === 'PASS' && typeof outdatedMajor === 'number' && outdatedMajor <= 5 && typeof clientComp.safe === 'number' && clientComp.safe <= 10 ? '- ✅ Alt grønt! Systemet er i god form.\n' : ''}
---
Generert av \`scripts/ai-health-report.mjs\`
`;

  console.log(report);

  // Skriv til fil
  const reportPath = resolve(root, '.kimi/ai-health-reports');
  if (!existsSync(reportPath)) {
    mkdirSync(reportPath, { recursive: true });
  }
  const filename = `report-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(resolve(reportPath, filename), report);
  console.log(`\n💾 Rapport lagret til .kimi/ai-health-reports/${filename}`);
}

generateReport().catch(e => {
  console.error('Feil:', e.message);
  process.exit(1);
});
