#!/usr/bin/env node
/**
 * 🤖 Auto-Optimizer — Kontinuerlig system-overvåking og optimalisering
 *
 * Analyserer:
 * - Diary patterns (hva feiler, hva tar tid)
 * - Config drift (AGENTS.md vs faktisk config)
 * - Repo health (orphans, duplisering, stale imports)
 * - Build performance (trender over tid)
 * - MemPalace tuning (cross-lingual gaps, cache hit rate)
 *
 * Bruk:
 *   node scripts/auto-optimizer-run.mjs           # Full analyse
 *   node scripts/auto-optimizer-run.mjs --quick   # Kun kritiske sjekker
 *   node scripts/auto-optimizer-run.mjs --diary   # Kun diary
 *   node scripts/auto-optimizer-run.mjs --config  # Kun config
 *   node scripts/auto-optimizer-run.mjs --repo    # Kun repo
 *   node scripts/auto-optimizer-run.mjs --build   # Kun build
 *   node scripts/auto-optimizer-run.mjs --mempalace # Kun mempalace
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const isQuick = args.includes('--quick');
const isDiary = args.includes('--diary');
const isConfig = args.includes('--config');
const isRepo = args.includes('--repo');
const isBuild = args.includes('--build');
const isMempalace = args.includes('--mempalace');
const isFull = !isQuick && !isDiary && !isConfig && !isRepo && !isBuild && !isMempalace;

const reportSections = [];
const fixes = [];
let warnings = 0;
let critical = 0;

function log(section, level, message) {
  reportSections.push({ section, level, message });
  if (level === 'warning') warnings++;
  if (level === 'critical') critical++;
}

// ─── DIARY ANALYSIS ───
function analyzeDiary() {
  const diaryPath = resolve(root, '.kimi/diary.jsonl');
  if (!existsSync(diaryPath)) {
    log('Diary', 'info', 'Ingen diary funnet');
    return;
  }

  const lines = readFileSync(diaryPath, 'utf8').split('\n').filter(Boolean);
  const entries = lines.slice(-200).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  if (entries.length === 0) {
    log('Diary', 'info', 'Ingen parsbare diary-entries');
    return;
  }

  // Count by type
  const typeCounts = {};
  const statusCounts = {};
  const tags = {};
  let totalRating = 0;
  let ratedEntries = 0;

  for (const e of entries) {
    const t = e.type || 'AUTO';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
    const s = e.status || 'GO';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
    (e.tags || []).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; });
    if (e.rating) { totalRating += e.rating; ratedEntries++; }
  }

  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTags = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const avgRating = ratedEntries > 0 ? (totalRating / ratedEntries).toFixed(1) : 'N/A';
  const noGoCount = statusCounts['NO-GO'] || 0;
  const noGoPct = ((noGoCount / entries.length) * 100).toFixed(1);

  log('Diary', 'info', `Analyserte ${entries.length} entries (siste 200)`);
  log('Diary', 'info', `Top typer: ${topTypes.map(([t, c]) => `${t}:${c}`).join(', ')}`);
  log('Diary', 'info', `Top tags: ${topTags.map(([t, c]) => `${t}:${c}`).join(', ')}`);
  log('Diary', 'info', `Gjennomsnittlig rating: ${avgRating}/5 (${ratedEntries} rated)`);

  if (noGoCount > 0) {
    const level = noGoCount > 10 ? 'critical' : 'warning';
    log('Diary', level, `${noGoCount} NO-GO (${noGoPct}%) — sjekk om mønster i feilene`);
  }

  // Detect patterns: same task repeated
  const taskCounts = {};
  for (const e of entries) {
    const task = (e.task || '').toLowerCase().slice(0, 40);
    if (task.length > 10) taskCounts[task] = (taskCounts[task] || 0) + 1;
  }
  const repeatedTasks = Object.entries(taskCounts).filter(([, c]) => c >= 3);
  if (repeatedTasks.length > 0) {
    log('Diary', 'warning', `${repeatedTasks.length} gjentatte oppgaver — vurder automatisering`);
  }
}

// ─── CONFIG DRIFT ───
function analyzeConfig() {
  const issues = [];

  // Check KIMI config
  const configPath = resolve(process.env.HOME || '/Users/taj', '.kimi/config.toml');
  if (existsSync(configPath)) {
    const config = readFileSync(configPath, 'utf8');
    const maxSteps = config.match(/max_steps_per_turn\s*=\s*(\d+)/);
    const ralph = config.match(/max_ralph_iterations\s*=\s*(\d+)/);
    const reserved = config.match(/reserved_context_size\s*=\s*(\d+)/);
    const compaction = config.match(/compaction_trigger_ratio\s*=\s*([\d.]+)/);

    if (!maxSteps || Number(maxSteps[1]) !== 750) {
      issues.push(`max_steps_per_turn = ${maxSteps ? maxSteps[1] : 'mangler'} (forventet 750)`);
    }
    if (!ralph || Number(ralph[1]) !== 2) {
      issues.push(`max_ralph_iterations = ${ralph ? ralph[1] : 'mangler'} (forventet 2)`);
    }
    if (!reserved || Number(reserved[1]) !== 40000) {
      issues.push(`reserved_context_size = ${reserved ? reserved[1] : 'mangler'} (forventet 40000)`);
    }
    if (!compaction || Number(compaction[1]) !== 0.94) {
      issues.push(`compaction_trigger_ratio = ${compaction ? compaction[1] : 'mangler'} (forventet 0.94)`);
    }
  } else {
    issues.push('~/.kimi/config.toml mangler');
  }

  // Check AGENTS.md sync
  const agentsMd = resolve(root, '.kimi/AGENTS.md');
  if (existsSync(agentsMd)) {
    const content = readFileSync(agentsMd, 'utf8');
    // Check for ACTUAL outdated values (not historical mentions)
    // Look for patterns like "reserved_context_size = 45000" or "reserved_context_size=45000"
    const reservedMatch = content.match(/reserved_context_size\s*=\s*(\d+)/);
    if (reservedMatch && Number(reservedMatch[1]) !== 40000) {
      issues.push(`.kimi/AGENTS.md har utdatert reserved_context_size=${reservedMatch[1]} (forventet 40000)`);
    }
    const compactionMatch = content.match(/compaction_trigger_ratio\s*=\s*([\d.]+)/);
    if (compactionMatch && Number(compactionMatch[1]) !== 0.94) {
      issues.push(`.kimi/AGENTS.md har utdatert compaction_trigger_ratio=${compactionMatch[1]} (forventet 0.94)`);
    }
  }

  // Check MCP configs point to v3
  const mcpPaths = [
    resolve(process.env.HOME || '/Users/taj', '.kimi-code/mcp.json'),
    resolve(process.env.HOME || '/Users/taj', '.kimi/mcp.json')
  ];
  for (const mcpPath of mcpPaths) {
    if (!existsSync(mcpPath)) continue;
    const label = mcpPath.replace(resolve(process.env.HOME || '/Users/taj'), '~');
    const mcp = readFileSync(mcpPath, 'utf8');
    if (!mcp.includes('run-mempalace-mcp-v3.mjs')) {
      issues.push(`${label} mangler referanse til MemPalace v3`);
    }
  }

  // Check PATH
  const zshrc = resolve(process.env.HOME || '/Users/taj', '.zshrc');
  if (existsSync(zshrc)) {
    const zsh = readFileSync(zshrc, 'utf8');
    if (!zsh.includes('.kimi/bin')) {
      issues.push('~/.zshrc mangler ~/.kimi/bin i PATH');
    }
  }

  if (issues.length === 0) {
    log('Config', 'info', 'All config synkronisert ✅');
  } else {
    issues.forEach(i => log('Config', 'warning', i));
  }
}

// ─── REPO HEALTH ───
function analyzeRepo() {
  try {
    // Find orphaned .ts/.tsx files (no imports found)
    const srcFiles = execSync('find src -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v ".test." | grep -v ".spec."', { cwd: root, encoding: 'utf8' }).trim().split('\n');

    let orphaned = 0;
    let orphanedWarnings = 0;
    let largeFiles = 0;

    for (const file of srcFiles.slice(0, 200)) {
      if (!file) continue;
      const basename = file.split('/').pop().replace(/\.tsx?$/, '');

      // Get line count first (needed for orphaned level check)
      let lines = 0;
      try {
        lines = Number(execSync(`wc -l < "${file}"`, { cwd: root, encoding: 'utf8' }).trim());
      } catch { /* ignore */ }

      try {
        const imports = execSync(`grep -r "from.*${basename}" src/ --include="*.ts" --include="*.tsx" | wc -l`, { cwd: root, encoding: 'utf8' }).trim();
        // Skip Next.js convention files and type definitions
        const fileName = file.split('/').pop();
        const isNextJsConvention = file.includes('middleware') ||
          file.includes('robots.ts') || file.includes('sitemap.') ||
          fileName === 'opengraph-image.tsx' || fileName === 'opengraph-image.ts' ||
          fileName === 'loading.tsx' || fileName === 'error.tsx' ||
          fileName === 'not-found.tsx' || fileName === 'template.tsx' ||
          fileName === 'default.tsx' || fileName === 'route.ts' || fileName === 'route.tsx';
        const isTypeDefinition = file.endsWith('.d.ts') || file.includes('src/types/');
        const isApiRoute = file.includes('src/app/api/') || file.includes('src/pages/api/');
        // Client components in app router are established Next.js pattern
        const isClientComponent = file.includes('src/app/') && fileName && fileName.includes('Client');
        if (imports === '0' && !file.includes('index') && !file.includes('page') && !file.includes('layout') && !isNextJsConvention && !isTypeDefinition && !isApiRoute) {
          orphaned++;
          // Large files already reported separately; client components are established pattern
          const level = lines > 500 ? 'info' : isClientComponent ? 'info' : 'warning';
          if (level === 'warning') orphanedWarnings++;
          if (orphaned <= 5 || level === 'warning') {
            log('Repo', level, `Potensielt orphaned: ${file} (0 imports)`);
          }
        }
      } catch { /* ignore grep errors */ }

      if (lines > 500) {
        largeFiles++;
        if (largeFiles <= 3) {
          log('Repo', 'info', `Stor fil: ${file} (${lines} linjer)`);
        }
      }
    }

    if (orphanedWarnings > 0) {
      log('Repo', 'warning', `Totalt ${orphaned} potensielt orphaned filer (${orphanedWarnings} krever oppmerksomhet)`);
    } else if (orphaned > 0) {
      log('Repo', 'info', `Totalt ${orphaned} potensielt orphaned filer (alle er info-nivå)`);
    }
    if (largeFiles > 0) {
      log('Repo', 'info', `Totalt ${largeFiles} filer >500 linjer — vurder refactoring`);
    }

    // Check for stale .next/types cache
    const nextTypes = resolve(root, '.next/types');
    if (existsSync(nextTypes)) {
      const typeFiles = readdirSync(nextTypes).filter(f => f.endsWith('.ts'));
      if (typeFiles.length > 50) {
        log('Repo', 'warning', `.next/types har ${typeFiles.length} filer — vurder å tømme cachen`);
      }
    }

  } catch (e) {
    log('Repo', 'info', `Kunne ikke analysere repo: ${e.message}`);
  }
}

// ─── BUILD TRACKER ───
function analyzeBuild() {
  // Check if .next/build-manifest.json exists and get timestamp
  const manifestPath = resolve(root, '.next/build-manifest.json');
  if (existsSync(manifestPath)) {
    const stat = statSync(manifestPath);
    const hoursAgo = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
    log('Build', 'info', `Siste build: ${hoursAgo.toFixed(1)} timer siden`);

    if (hoursAgo > 48) {
      log('Build', 'warning', `Ingen build på ${hoursAgo.toFixed(0)} timer — kan være stale`);
    }
  }

  // Check package.json for unused scripts
  const pkgPath = resolve(root, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const scripts = Object.keys(pkg.scripts || {});
    const commonScripts = ['dev', 'build', 'start', 'lint', 'type-check', 'test', 'verify'];
    const missing = commonScripts.filter(s => !scripts.includes(s));
    if (missing.length > 0) {
      log('Build', 'warning', `Manglende npm scripts: ${missing.join(', ')}`);
    }
  }
}

// ─── MEMPALACE TUNING ───
function analyzeMempalace() {
  const cachePath = resolve(root, '.mempalace/index-cache-v3.json.gz');
  if (!existsSync(cachePath)) {
    log('MemPalace', 'warning', 'Ingen MemPalace v3 cache funnet — har du restartet KIMI?');
    return;
  }

  const stat = statSync(cachePath);
  const cacheAgeHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
  log('MemPalace', 'info', `Cache: ${(stat.size / 1024 / 1024).toFixed(1)}MB, ${cacheAgeHours.toFixed(1)}t gammel`);

  if (cacheAgeHours > 24) {
    log('MemPalace', 'warning', 'Cache er >24t gammel — vurder rebuild');
  }

  // Check KG size
  const kgPath = resolve(root, '.mempalace/kg.json');
  if (existsSync(kgPath)) {
    const kg = JSON.parse(readFileSync(kgPath, 'utf8'));
    const entities = Object.keys(kg).length;
    log('MemPalace', 'info', `KG: ${entities} entities`);

    if (entities < 50) {
      log('MemPalace', 'warning', `KG har kun ${entities} entities — vurder å fylle på med kg_batch()`);
    }
  }

  // Check diary growth
  const diaryPath = resolve(root, '.kimi/diary.jsonl');
  if (existsSync(diaryPath)) {
    const diaryStat = statSync(diaryPath);
    const diaryMB = diaryStat.size / 1024 / 1024;
    if (diaryMB > 5) {
      log('MemPalace', 'warning', `diary.jsonl er ${diaryMB.toFixed(1)}MB — vurder arkivering`);
    }
  }
}

// ─── AUTO-FIXES ───
function applyAutoFixes() {
  // Fix 1: Ensure PATH in .zshrc
  const zshrc = resolve(process.env.HOME || '/Users/taj', '.zshrc');
  if (existsSync(zshrc)) {
    const content = readFileSync(zshrc, 'utf8');
    if (!content.includes('.kimi/bin')) {
      writeFileSync(zshrc, content + '\n# KIMI CLI tools\nexport PATH="$HOME/.kimi/bin:$PATH"\n');
      fixes.push('La til ~/.kimi/bin i PATH (.zshrc)');
    }
  }

  // Fix 2: Remove old uncompressed cache if gzip exists
  const oldCache = resolve(root, '.mempalace/index-cache-v3.json');
  const newCache = resolve(root, '.mempalace/index-cache-v3.json.gz');
  if (existsSync(oldCache) && existsSync(newCache)) {
    try {
      import('fs').then(({ unlinkSync }) => {
        unlinkSync(oldCache);
        fixes.push('Slettet gammel ukomprimert cache (14MB spart)');
      });
    } catch { /* ignore */ }
  }
}

// ─── REPORT GENERATION ───
function generateReport() {
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString().slice(11, 19);

  let md = `# Auto-Optimizer Rapport — ${date} ${time}\n\n`;
  md += `## Oppsummering\n\n`;
  md += `- Kritiske funn: ${critical}\n`;
  md += `- Advarsler: ${warnings}\n`;
  md += `- Auto-fixes: ${fixes.length}\n\n`;

  if (fixes.length > 0) {
    md += `## Auto-Fixes Utført\n\n`;
    fixes.forEach(f => { md += `- ✅ ${f}\n`; });
    md += `\n`;
  }

  const sections = {};
  for (const s of reportSections) {
    if (!sections[s.section]) sections[s.section] = [];
    sections[s.section].push({ level: s.level, message: s.message });
  }

  for (const [name, items] of Object.entries(sections)) {
    md += `## ${name}\n\n`;
    for (const item of items) {
      const icon = item.level === 'critical' ? '🔴' : item.level === 'warning' ? '🟡' : '✅';
      md += `${icon} ${item.message}\n`;
    }
    md += `\n`;
  }

  md += `## Anbefalinger\n\n`;
  if (critical > 0) {
    md += `1. **Prioriter kritiske funn** — disse kan påvirke stabilitet\n`;
  }
  if (warnings > 0) {
    md += `2. **Gå gjennom advarsler** — potensielle forbedringer\n`;
  }
  md += `3. Kjør \`node scripts/verify/run-all.mjs\` for full verifisering\n`;
  md += `4. Vurder \`kimi --agent-file .kimi/agents/auto-optimizer-agent.yaml\` for dypere analyse\n`;

  const reportDir = resolve(root, '.kimi/session-summaries');
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
  const reportPath = resolve(reportDir, `auto-optimizer-${date}.md`);
  writeFileSync(reportPath, md);

  // Also print summary to stderr
  console.error(`\n🤖 Auto-Optimizer — ${date}`);
  console.error(`   Kritiske: ${critical} | Advarsler: ${warnings} | Fixes: ${fixes.length}`);
  console.error(`   Rapport: ${relative(root, reportPath)}`);
  if (critical > 0) console.error(`   ⚠️  Kritiske funn oppdaget!`);

  return reportPath;
}

// ─── MAIN ───
console.error('🤖 Auto-Optimizer starter...');

if (isFull || isDiary || isQuick) analyzeDiary();
if (isFull || isConfig || isQuick) analyzeConfig();
if (isFull || isRepo || isQuick) analyzeRepo();
if (isFull || isBuild || isQuick) analyzeBuild();
if (isFull || isMempalace || isQuick) analyzeMempalace();

applyAutoFixes();
const reportPath = generateReport();

process.exit(critical > 0 ? 1 : warnings > 0 ? 2 : 0);
