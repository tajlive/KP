#!/usr/bin/env node
/**
 * Dependency Report Generator v1.0
 * Parser npm outdated + npm audit og genererer markdown-rapport.
 * Brukes av dependency-check.yml og ai-health-report.mjs
 */
import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(cmd, timeout = 60000) {
  try {
    return execSync(cmd, { cwd: root, encoding: 'utf8', timeout });
  } catch (e) {
    // npm outdated exit 1 når det finner utdaterte pakker
    if (e.stdout) return e.stdout;
    if (e.stderr) return e.stderr;
    return '';
  }
}

function parseOutdated() {
  const out = run('npm outdated --json');
  if (!out.trim()) return { packages: [], count: 0, major: 0, minor: 0, patch: 0 };
  try {
    const data = JSON.parse(out);
    const packages = Object.entries(data).map(([name, info]) => {
      const current = info.current || 'N/A';
      const wanted = info.wanted || 'N/A';
      const latest = info.latest || 'N/A';
      const type = info.type || 'dependencies';

      // Determine semver bump type
      let bump = 'unknown';
      if (current !== 'N/A' && latest !== 'N/A') {
        const c = current.replace(/^[\^~]/, '').split('.');
        const l = latest.replace(/^[\^~]/, '').split('.');
        if (c[0] !== l[0]) bump = 'major';
        else if (c[1] !== l[1]) bump = 'minor';
        else bump = 'patch';
      }

      return { name, current, wanted, latest, type, bump };
    });

    return {
      packages,
      count: packages.length,
      major: packages.filter(p => p.bump === 'major').length,
      minor: packages.filter(p => p.bump === 'minor').length,
      patch: packages.filter(p => p.bump === 'patch').length,
    };
  } catch {
    return { packages: [], count: 0, major: 0, minor: 0, patch: 0 };
  }
}

function parseAudit() {
  const out = run('npm audit --json');
  if (!out.trim()) return { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
  try {
    const data = JSON.parse(out);
    const vulns = Object.values(data.vulnerabilities || {});
    return {
      critical: vulns.filter(v => v.severity === 'critical').length,
      high: vulns.filter(v => v.severity === 'high').length,
      moderate: vulns.filter(v => v.severity === 'moderate').length,
      low: vulns.filter(v => v.severity === 'low').length,
      total: vulns.length,
    };
  } catch {
    return { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
  }
}

export function generateDependencyReport() {
  const outdated = parseOutdated();
  const audit = parseAudit();

  let md = `# 📦 Dependency Report — ${new Date().toISOString().slice(0, 10)}\n\n`;

  md += `## 🔍 Utdaterte pakker\n\n`;
  md += `| Metrikk | Verdi |\n|---------|-------|\n`;
  md += `| Totalt utdatert | ${outdated.count} |\n`;
  md += `| Major | ${outdated.major} |\n`;
  md += `| Minor | ${outdated.minor} |\n`;
  md += `| Patch | ${outdated.patch} |\n`;

  if (outdated.packages.length > 0) {
    md += `\n### Detaljer\n\n`;
    md += `| Pakke | Type | Current | Latest | Bump |\n`;
    md += `|-------|------|---------|--------|------|\n`;
    for (const p of outdated.packages.slice(0, 50)) {
      const bumpEmoji = p.bump === 'major' ? '🔴' : p.bump === 'minor' ? '🟡' : '🟢';
      md += `| ${p.name} | ${p.type} | ${p.current} | ${p.latest} | ${bumpEmoji} ${p.bump} |\n`;
    }
    if (outdated.packages.length > 50) {
      md += `| ... | | | | (${outdated.packages.length - 50} flere) |\n`;
    }
  }

  md += `\n## 🛡️ Sikkerhet (npm audit)\n\n`;
  md += `| Severity | Count |\n|----------|-------|\n`;
  md += `| 🔴 Critical | ${audit.critical} |\n`;
  md += `| 🟠 High | ${audit.high} |\n`;
  md += `| 🟡 Moderate | ${audit.moderate} |\n`;
  md += `| 🔵 Low | ${audit.low} |\n`;
  md += `| **Total** | **${audit.total}** |\n`;

  md += `\n---\nGenerert av \`scripts/dependency-report.mjs\`\n`;

  return { md, outdated, audit };
}

function main() {
  const { md, outdated, audit } = generateDependencyReport();

  // Print to stdout
  console.log(md);

  // Write to file
  const dir = resolve(root, '.kimi/ai-health-reports');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filename = `dependencies-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(resolve(dir, filename), md);
  console.log(`\n💾 Rapport lagret til .kimi/ai-health-reports/${filename}`);

  // Exit code for CI: 1 if critical vulnerabilities or major outdated
  if (audit.critical > 0 || outdated.major > 10) {
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
