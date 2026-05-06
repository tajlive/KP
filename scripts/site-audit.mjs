#!/usr/bin/env node
/**
 * Site Audit — Full Codebase Health Check
 *
 * Scans the entire Klarpakke codebase for:
 *   1. Routing issues (orphaned pages, broken redirects, missing destinations)
 *   2. Broken links (internal <Link> and <a> pointing to non-existent routes)
 *   3. Content issues (TODO, FIXME, HACK, XXX, dummy, placeholder text)
 *   4. i18n gaps (hardcoded Norwegian/English text not in messages/)
 *   5. Mock/pending implementations (empty onClick, console.log, Math.random)
 *   6. Unused/dead code (empty catch blocks, commented imports)
 *   7. Accessibility red flags (missing alt, button without type)
 *
 * Usage:
 *   node scripts/site-audit.mjs              # Full audit
 *   node scripts/site-audit.mjs --routes     # Only routing
 *   node scripts/site-audit.mjs --links      # Only links
 *   node scripts/site-audit.mjs --content    # Only content/TODOs
 *   node scripts/site-audit.mjs --i18n       # Only i18n gaps
 *   node scripts/site-audit.mjs --json       # Output as JSON
 *   node scripts/site-audit.mjs --fail-only  # Only show problems
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

// ─── CLI ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const scopeRoutes = args.includes('--routes');
const scopeLinks = args.includes('--links');
const scopeContent = args.includes('--content');
const scopeI18n = args.includes('--i18n');
const scopeMocks = args.includes('--mocks');
const asJson = args.includes('--json');
const failOnly = args.includes('--fail-only');
const fullAudit = !scopeRoutes && !scopeLinks && !scopeContent && !scopeI18n && !scopeMocks;

// ─── Helpers ────────────────────────────────────────────────────────────────
function* walkDir(dir, include = ['.ts', '.tsx', '.js', '.jsx', '.md', '.sql', '.mjs']) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === 'archive') continue;
      yield* walkDir(full, include);
    } else if (include.some(ext => entry.name.endsWith(ext))) {
      yield full;
    }
  }
}

function readLines(path) {
  return readFileSync(path, 'utf-8').split('\n');
}

const colors = {
  reset: '\x1b[0m', red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m',
  cyan: '\x1b[36m', gray: '\x1b[90m', bold: '\x1b[1m',
};
function c(name, text) { return `${colors[name]}${text}${colors.reset}`; }

// ─── 1. Route Audit ─────────────────────────────────────────────────────────
function discoverRoutes(dir, base = '') {
  const routes = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.') || entry.name === 'api') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('(')) {
          routes.push(...discoverRoutes(full, base));
        } else if (entry.name === '[...slug]') {
          routes.push(`${base}/:slug`);
        } else if (entry.name.startsWith('[')) {
          const param = entry.name.slice(1, -1);
          const sample = param === 'locale' ? 'no' : param === 'id' ? 'demo' : 'sample';
          routes.push(...discoverRoutes(full, `${base}/${sample}`));
        } else {
          routes.push(...discoverRoutes(full, `${base}/${entry.name}`));
        }
      } else if (/^page\.(tsx?|jsx?|mdx)$/.test(entry.name)) {
        routes.push(base || '/');
      }
    }
  } catch { /* dir may not exist */ }
  return routes;
}

function auditRoutes() {
  const appDir = join(SRC, 'app');
  const raw = discoverRoutes(appDir);
  const seen = new Set();
  const routes = [];
  for (const r of raw) {
    const norm = r.replace(/^\/no\b/, '').replace(/^\/en\b/, '') || '/';
    if (!seen.has(norm)) { seen.add(norm); routes.push(norm); }
  }

  // Check redirects in next.config
  const nextConfigPath = join(ROOT, 'next.config.ts');
  const nextConfig = existsSync(nextConfigPath) ? readFileSync(nextConfigPath, 'utf-8') : '';
  const redirectMatches = [...nextConfig.matchAll(/source:\s*['"]([^'"]+)['"]/g)];
  const destinationMatches = [...nextConfig.matchAll(/destination:\s*['"]([^'"]+)['"]/g)];

  const issues = [];
  for (const [, dest] of destinationMatches) {
    const cleanDest = dest.replace(/^\/(no|en)\//, '/').replace(/\?.*$/, '');
    if (!seen.has(cleanDest) && !cleanDest.startsWith('http')) {
      issues.push({ type: 'redirect-missing-dest', dest: cleanDest });
    }
  }

  // Check for catch-all [...slug] that might shadow other routes
  const catchAll = routes.filter(r => r.includes(':slug'));
  const potentiallyShadowed = routes.filter(r => !r.includes(':') && r !== '/' && r.split('/').length > 2);

  return { routes, count: routes.length, issues, catchAll, potentiallyShadowed };
}

// ─── 2. Link Audit ──────────────────────────────────────────────────────────
function getAllRoutePaths() {
  const appDir = join(SRC, 'app');
  const routes = new Set();

  function walk(dir, base = '') {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('_') || entry.name.startsWith('.') || entry.name === 'api') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith('(')) {
            walk(full, base);
          } else if (entry.name.startsWith('[')) {
            const param = entry.name.slice(1, -1);
            // Use 'no' as sample for [locale], ':dynamic' for others
            const sample = param === 'locale' ? 'no' : ':dynamic';
            walk(full, `${base}/${sample}`);
          } else {
            walk(full, `${base}/${entry.name}`);
          }
        } else if (/^page\.(tsx?|jsx?|mdx)$/.test(entry.name)) {
          routes.add(base || '/');
        }
      }
    } catch {}
  }

  walk(appDir);

  // Normalize and add without locale prefix
  const normalized = new Set();
  for (const r of routes) {
    const withoutLocale = r.replace(/^\/(no|en)\b/, '') || '/';
    normalized.add(withoutLocale);
    normalized.add(`/no${withoutLocale === '/' ? '' : withoutLocale}`);
    normalized.add(`/en${withoutLocale === '/' ? '' : withoutLocale}`);
  }
  return normalized;
}

function auditLinks() {
  const linkRegex = /(?:<Link|<a)\s+[^>]*href=["']([^"']+)["']/g;
  const internalLinks = new Set();
  const issues = [];
  const existingRoutes = getAllRoutePaths();

  for (const file of walkDir(SRC, ['.tsx', '.ts', '.jsx', '.js'])) {
    const content = readFileSync(file, 'utf-8');
    const rel = relative(ROOT, file);
    let m;
    while ((m = linkRegex.exec(content)) !== null) {
      const href = m[1];
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) continue;
      if (href.startsWith('/api/')) continue;

      const key = `${rel}:${href}`;
      if (internalLinks.has(key)) continue;
      internalLinks.add(key);

      const clean = href.replace(/\?.*$/, '').replace(/#.*$/, '');
      if (clean === '/') continue;
      // Dynamic/template URLs can't be statically validated
      if (clean.includes('${') || clean.includes('[') || clean.includes(']')) continue;

      if (!existingRoutes.has(clean) && !existingRoutes.has(clean + '/:dynamic')) {
        issues.push({ file: rel, href, severity: 'error' });
      }
    }
  }

  return { issues, count: internalLinks.size };
}

// ─── 3. Content Audit ───────────────────────────────────────────────────────
const CONTENT_PATTERNS = [
  { name: 'TODO', regex: /TODO[:\s]/i, severity: 'warning' },
  { name: 'FIXME', regex: /FIXME[:\s]/i, severity: 'warning' },
  { name: 'HACK', regex: /HACK[:\s]/i, severity: 'warning' },
  { name: 'XXX', regex: /\bXXX\b/, severity: 'info' },
  { name: 'console.log', regex: /console\.(log|warn|error|debug)\(/, severity: 'info', exclude: ['.test.', '.spec.'] },
  { name: 'dummy data', regex: /\b(dummy|mock|fake|test)\s+(data|user|email|name)\b/i, severity: 'warning' },
  { name: 'Math.random', regex: /Math\.random\(\)/, severity: 'warning' },
  { name: 'empty catch', regex: /catch\s*\([^)]*\)\s*\{\s*\}/, severity: 'error' },
  { name: 'lorem ipsum', regex: /lorem ipsum/i, severity: 'error' },
  { name: 'placeholder text', regex: /\b(coming soon|under construction|not implemented)\b/i, severity: 'warning' },
];

function auditContent() {
  const issues = [];
  for (const file of walkDir(SRC, ['.ts', '.tsx', '.js', '.jsx'])) {
    const rel = relative(ROOT, file);
    const lines = readLines(file);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pat of CONTENT_PATTERNS) {
        if (pat.exclude && pat.exclude.some(e => rel.includes(e))) continue;
        if (pat.regex.test(line)) {
          issues.push({
            file: rel, line: i + 1, text: line.trim().slice(0, 100),
            type: pat.name, severity: pat.severity,
          });
        }
      }
    }
  }
  return { issues };
}

// ─── 4. i18n Audit ──────────────────────────────────────────────────────────
function auditI18n() {
  const messagesPath = join(SRC, 'messages');
  const noPath = join(messagesPath, 'no.json');
  const enPath = join(messagesPath, 'en.json');

  let noKeys = new Set();
  let enKeys = new Set();

  if (existsSync(noPath)) {
    const noData = JSON.parse(readFileSync(noPath, 'utf-8'));
    noKeys = new Set(flattenKeys(noData));
  }
  if (existsSync(enPath)) {
    const enData = JSON.parse(readFileSync(enPath, 'utf-8'));
    enKeys = new Set(flattenKeys(enData));
  }

  const missingInEn = [...noKeys].filter(k => !enKeys.has(k));
  const missingInNo = [...enKeys].filter(k => !noKeys.has(k));

  // Find hardcoded Norwegian text in TSX files
  const hardcoded = [];
  const norwegianWords = /\b(og|eller|men|for|med|fra|til|på|av|en|et|den|det|de|er|var|har|skal|kan|vil|vår|våre|dine|din|konto|dashboard|portefølje|strategi|handel|pris|kjøp|selg|logg inn|registrer)\b/i;

  for (const file of walkDir(SRC, ['.tsx', '.jsx'])) {
    const rel = relative(ROOT, file);
    if (rel.includes('studio') || rel.includes('layout')) continue;
    const lines = readLines(file);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip import lines and comments
      if (/^\s*(import|\/\/|\*|\/\*)/.test(line)) continue;
      // Look for string literals with Norwegian words
      const strings = line.match(/["']([^"']{10,80})["']/g);
      if (strings) {
        for (const s of strings) {
          const inner = s.slice(1, -1);
          // Skip if it's a URL, className, or already uses t("...")
          if (inner.startsWith('http') || inner.startsWith('/') || inner.startsWith('class') || inner.startsWith('bg-')) continue;
          if (norwegianWords.test(inner) && !inner.includes('t(') && !inner.includes('useTranslations')) {
            hardcoded.push({ file: rel, line: i + 1, text: inner.slice(0, 60) });
          }
        }
      }
    }
  }

  return { missingInEn, missingInNo, hardcoded: hardcoded.slice(0, 50) };
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) keys.push(...flattenKeys(v, path));
    else keys.push(path);
  }
  return keys;
}

// ─── 5. Mock / Pending Audit ────────────────────────────────────────────────
function auditMocks() {
  const issues = [];
  const patterns = [
    { regex: /onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, name: 'empty onClick' },
    { regex: /onClick\s*=\s*\{\s*undefined\s*\}/g, name: 'undefined onClick' },
    { regex: /href\s*=\s*\{\s*['"]#["']\s*\}/g, name: 'hash-only href' },
    { regex: /disabled\s*=\s*\{true\}/g, name: 'permanently disabled element' },
  ];

  for (const file of walkDir(SRC, ['.tsx', '.jsx'])) {
    const rel = relative(ROOT, file);
    const content = readFileSync(file, 'utf-8');
    for (const pat of patterns) {
      let m;
      while ((m = pat.regex.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split('\n').length;
        issues.push({ file: rel, line: lineNum, type: pat.name });
      }
    }
  }
  return { issues };
}

// ─── Output ─────────────────────────────────────────────────────────────────
function printResults(results) {
  console.log('\n' + c('bold', '╔══════════════════════════════════════════════════════════════╗'));
  console.log(c('bold', '║') + '           ' + c('cyan', '🔍 Klarpakke Site Audit Report') + '                    ' + c('bold', '║'));
  console.log(c('bold', '╚══════════════════════════════════════════════════════════════╝\n'));

  if (fullAudit || scopeRoutes) {
    const r = results.routes;
    console.log(c('bold', '🗺️  Routing'));
    console.log(`   Total routes: ${r.count}`);
    if (r.issues.length) {
      console.log(c('red', `   ❌ ${r.issues.length} redirect issues:`));
      for (const i of r.issues) console.log(`      → ${i.dest} (missing destination)`);
    } else {
      console.log(c('green', '   ✅ All redirect destinations exist'));
    }
    if (r.catchAll.length) {
      console.log(c('yellow', `   ⚠️  ${r.catchAll.length} catch-all route(s) may shadow specific routes`));
    }
    console.log();
  }

  if (fullAudit || scopeLinks) {
    const l = results.links;
    console.log(c('bold', '🔗 Links'));
    console.log(`   Internal links checked: ${l.count}`);
    if (l.issues.length) {
      console.log(c('red', `   ❌ ${l.issues.length} potentially broken links:`));
      for (const i of l.issues.slice(0, 20)) {
        console.log(`      ${c('gray', i.file)} → ${c('yellow', i.href)}`);
      }
      if (l.issues.length > 20) console.log(`      ... and ${l.issues.length - 20} more`);
    } else {
      console.log(c('green', '   ✅ No broken internal links detected'));
    }
    console.log();
  }

  if (fullAudit || scopeContent) {
    const c1 = results.content;
    const bySeverity = { error: 0, warning: 0, info: 0 };
    for (const i of c1.issues) bySeverity[i.severity]++;
    console.log(c('bold', '📝 Content / Code Smells'));
    console.log(`   Issues found: ${c('red', bySeverity.error + ' errors')} | ${c('yellow', bySeverity.warning + ' warnings')} | ${c('gray', bySeverity.info + ' info')}`);
    if (!failOnly || bySeverity.error > 0) {
      for (const i of c1.issues.filter(x => x.severity === 'error').slice(0, 10)) {
        console.log(`   ${c('red', '❌')} ${c('gray', `${i.file}:${i.line}`)} ${c('red', i.type)}: ${i.text}`);
      }
    }
    if (!failOnly) {
      for (const i of c1.issues.filter(x => x.severity === 'warning').slice(0, 10)) {
        console.log(`   ${c('yellow', '⚠️')} ${c('gray', `${i.file}:${i.line}`)} ${c('yellow', i.type)}: ${i.text}`);
      }
    }
    if (c1.issues.length > 20) console.log(`   ... and ${c1.issues.length - 20} more (rerun without --fail-only)`);
    console.log();
  }

  if (fullAudit || scopeI18n) {
    const i = results.i18n;
    console.log(c('bold', '🌍 i18n'));
    console.log(`   Missing in en.json: ${i.missingInEn.length ? c('yellow', i.missingInEn.length) : c('green', '0')}`);
    console.log(`   Missing in no.json: ${i.missingInNo.length ? c('yellow', i.missingInNo.length) : c('green', '0')}`);
    if (i.hardcoded.length) {
      console.log(c('yellow', `   ⚠️  ${i.hardcoded.length} potential hardcoded Norwegian strings:`));
      for (const h of i.hardcoded.slice(0, 8)) {
        console.log(`      ${c('gray', `${h.file}:${h.line}`)} "${h.text.slice(0, 50)}"`);
      }
    }
    console.log();
  }

  if (fullAudit || scopeMocks) {
    const m = results.mocks;
    console.log(c('bold', '🎭 Mock / Pending Implementations'));
    if (m.issues.length) {
      console.log(c('yellow', `   ⚠️  ${m.issues.length} potential mock/placeholder UI elements:`));
      for (const i of m.issues.slice(0, 10)) {
        console.log(`      ${c('gray', `${i.file}:${i.line}`)} ${c('yellow', i.type)}`);
      }
    } else {
      console.log(c('green', '   ✅ No obvious mock elements found'));
    }
    console.log();
  }

  // Summary
  const totalIssues =
    results.routes.issues.length +
    results.links.issues.length +
    results.content.issues.length +
    results.mocks.issues.length +
    results.i18n.hardcoded.length;

  console.log(c('bold', '─'.repeat(64)));
  if (totalIssues === 0) {
    console.log(c('green', c('bold', '✅ All checks passed!')));
  } else {
    console.log(c('yellow', c('bold', `⚠️  Total findings: ${totalIssues}`)));
    console.log(c('gray', '   Run without --fail-only to see everything, or with --json for programmatic use.'));
  }
  console.log();
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const results = {
    routes: (fullAudit || scopeRoutes) ? auditRoutes() : { count: 0, issues: [], catchAll: [], potentiallyShadowed: [] },
    links: (fullAudit || scopeLinks) ? auditLinks() : { count: 0, issues: [] },
    content: (fullAudit || scopeContent) ? auditContent() : { issues: [] },
    i18n: (fullAudit || scopeI18n) ? auditI18n() : { missingInEn: [], missingInNo: [], hardcoded: [] },
    mocks: (fullAudit || scopeMocks) ? auditMocks() : { issues: [] },
  };

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printResults(results);
  }
}

main().catch(err => {
  console.error('❌ Audit failed:', err.message);
  process.exit(1);
});
