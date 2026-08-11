#!/usr/bin/env node
/**
 * 🧠 Knowledge Miner - Automatisk utvinning av kunnskap fra kodebasen
 * 
 * Dette scriptet:
 * 1. Skanner kodebasen for TODOs, FIXMEs, og viktige kommentarer
 * 2. Ekstraherer arkitektur-beslutninger fra ADR-filer
 * 3. Logger feilmønstre fra error-tracking
 * 4. Lagrer alt i .knowledge/ for Honcho-indeksering
 */

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const KNOWLEDGE_DIR = '.knowledge';
const PATTERNS_DIR = `${KNOWLEDGE_DIR}/patterns`;
const DECISIONS_DIR = `${KNOWLEDGE_DIR}/decisions`;
const ERRORS_DIR = `${KNOWLEDGE_DIR}/errors`;

// Sikre at mapper finnes
async function ensureDirs() {
  for (const dir of [KNOWLEDGE_DIR, PATTERNS_DIR, DECISIONS_DIR, ERRORS_DIR]) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

// 1. Finn TODOs og FIXMEs i koden
async function extractTodos() {
  console.log('🔍 Skanner for TODOs/FIXMEs...');
  
  try {
    const result = execSync(
      'git grep -n "TODO\\|FIXME\\|XXX\\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" 2>/dev/null | head -50',
      { encoding: 'utf-8', cwd: '/Users/taj/klarpakke' }
    );
    
    if (!result.trim()) return;
    
    const todos = result.split('\n').filter(Boolean).map(line => {
      const [file, rest] = line.split(':');
      const [lineNum, ...textParts] = rest.split(':');
      const text = textParts.join(':').trim();
      return { file, lineNum, text };
    });
    
    const content = `# TODOs og FIXMEs - ${new Date().toISOString().split('T')[0]}

| Fil | Linje | Tekst |
|-----|-------|-------|
${todos.map(t => `| ${t.file} | ${t.lineNum} | ${t.text.slice(0, 60)}${t.text.length > 60 ? '...' : ''} |`).join('\n')}

## Anbefalinger
- TODOs bør ikke være i produksjonskode
- FIXMEs indikerer teknisk gjeld
- Vurder å konvertere til GitHub issues
`;
    
    await writeFile(`${KNOWLEDGE_DIR}/current-todos.md`, content);
    console.log(`   ✅ Fant ${todos.length} TODOs/FIXMEs`);
  } catch (e) {
    console.log('   ℹ️  Ingen TODOs funnet');
  }
}

// 2. Ekstraher ADR-beslutninger
async function extractDecisions() {
  console.log('📋 Ekstraherer arkitektur-beslutninger...');
  
  const adrDir = 'docs/adr';
  if (!existsSync(adrDir)) return;
  
  const files = await readdir(adrDir);
  const adrs = files.filter(f => f.endsWith('.md'));
  
  for (const adr of adrs) {
    const content = await readFile(join(adrDir, adr), 'utf-8');
    const title = content.match(/^# (.+)$/m)?.[1] || adr;
    const date = content.match(/\d{4}-\d{2}-\d{2}/)?.[0] || 'Unknown';
    const decision = content.match(/## Beslutning\s+\n+(.+?)(?=\n##|$)/s)?.[1]?.slice(0, 200) || '';
    
    const output = `# ${title}
**Dato:** ${date}
**Fil:** ${adr}

## Sammendrag
${decision}

## Kontekst
Se full ADR: [${adr}](../../docs/adr/${adr})
`;
    
    const outputName = adr.replace('.md', '.knowledge.md');
    await writeFile(`${DECISIONS_DIR}/${outputName}`, output);
  }
  
  console.log(`   ✅ Prosesserte ${adrs.length} ADR-filer`);
}

// 3. Analyser git-historie for patterns
async function analyzePatterns() {
  console.log('🧩 Analyserer kode-mønstre...');
  
  // Finn mest endrede filer (indikerer viktige/abstrakte komponenter)
  try {
    const hotFiles = execSync(
      'git log --since="3 months ago" --name-only --pretty=format: | grep -E "\\.(ts|tsx|js|mjs)$" | sort | uniq -c | sort -rn | head -20',
      { encoding: 'utf-8', cwd: '/Users/taj/klarpakke' }
    );
    
    const content = `# Hot Files - Mest endrede siste 3 måneder
# Disse filene endres ofte = viktige for prosjektet

| Endringer | Fil |
|-----------|-----|
${hotFiles.split('\n').filter(Boolean).map(line => {
  const [count, ...fileParts] = line.trim().split(/\s+/);
  const file = fileParts.join(' ');
  return `| ${count} | ${file} |`;
}).join('\n')}

## Implikasjoner
- Disse filene er "smell-punkter" i arkitekturen
- Vurder å refaktorere høy-endrings-filer
- God kandidater for tester (mye endring = høy risiko)
`;
    
    await writeFile(`${PATTERNS_DIR}/hot-files.md`, content);
    console.log('   ✅ Analyserte git-historie');
  } catch (e) {
    console.log('   ⚠️  Kunne ikke analysere git-historie');
  }
}

// 4. Detecter arkitektoniske endringer og generer ADR-stubs
async function detectArchitecturalChanges() {
  console.log('🏗️  Sjekker for arkitektoniske endringer...');

  const ADR_DOMAINS = [
    { name: 'Middleware/Routing', pattern: 'src/middleware.ts|src/app/\\[locale\\]/.*middleware|next.config', threshold: 3 },
    { name: 'i18n', pattern: 'messages/.*\\.json|src/i18n|next-intl', threshold: 5 },
    { name: 'Trading Engine', pattern: 'src/lib/trading/|src/lib/auto-trading/|supabase/migrations/.*trading|supabase/migrations/.*bot|supabase/migrations/.*cron', threshold: 3 },
    { name: 'Database Schema', pattern: 'supabase/migrations/.*\\.sql', threshold: 5 },
    { name: 'Auth/Security', pattern: 'src/lib/auth/|src/app/api/auth|src/middleware.*auth', threshold: 3 },
    { name: 'UI/Design System', pattern: 'src/components/.*\\.tsx|tailwind.config|src/app/globals\\.css', threshold: 5 },
  ];

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().split('T')[0];

  for (const domain of ADR_DOMAINS) {
    try {
      const result = execSync(
        `git log --since="${sinceStr}" --name-only --pretty=format: | grep -E "${domain.pattern}" | sort | uniq | wc -l`,
        { encoding: 'utf-8', cwd: '/Users/taj/klarpakke' }
      ).trim();
      const count = parseInt(result, 10) || 0;

      if (count >= domain.threshold) {
        const slug = domain.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const filename = `ADR-${new Date().toISOString().split('T')[0]}-${slug}-auto-stub.md`;
        const filepath = `${DECISIONS_DIR}/${filename}`;

        // Sjekk om det allerede finnes en ny ADR for dette domenet
        const existing = execSync(
          `ls -1 "${DECISIONS_DIR}" | grep -i "${slug}" | grep "$(date +%Y-%m)" | head -1 || true`,
          { encoding: 'utf-8' }
        ).trim();

        if (existing) {
          console.log(`   ℹ️  ${domain.name}: ${count} endringer, ADR finnes allerede (${existing})`);
          continue;
        }

        const content = `# ADR: ${domain.name} Changes — ${new Date().toISOString().split('T')[0]}

## Kontekst
Det har vært ${count} endringer i **${domain.name}** de siste 14 dagene.
Dette indikerer en betydelig arkitektonisk endring.

## Endringer (auto-detect)
<!-- TODO: List konkrete endringer -->
- Se git log: \`git log --since="${sinceStr}" --oneline -- "${domain.pattern}"\`

## Beslutning
<!-- TODO: Dokumenter bevisst arkitekturvalg -->

## Konsekvenser
<!-- TODO: Hva påvirker dette? -->

## Relatert
- Auto-generert av knowledge-miner.mjs
- Mønster: \`${domain.pattern}\`
`;
        await writeFile(filepath, content);
        console.log(`   📝 ADR-stub generert: ${filename} (${count} endringer i ${domain.name})`);
      } else {
        console.log(`   ℹ️  ${domain.name}: ${count} endringer (under threshold ${domain.threshold})`);
      }
    } catch (e) {
      // ignore
    }
  }
}

// 5. Lagre viktige scripts
async function documentScripts() {
  console.log('📜 Dokumenterer viktige scripts...');
  
  const scriptsDir = 'scripts';
  if (!existsSync(scriptsDir)) return;
  
  const files = (await readdir(scriptsDir)).filter(f => 
    f.endsWith('.sh') || f.endsWith('.mjs') || f.endsWith('.ts')
  );
  
  const descriptions = [];
  for (const file of files.slice(0, 30)) { // Begrens til 30
    try {
      const content = await readFile(join(scriptsDir, file), 'utf-8');
      const desc = content.match(/# .+|\/\*\*?\s*.+/)?.[0]?.replace(/^[#/\*\s]+/, '') || '';
      if (desc) {
        descriptions.push({ file, desc: desc.slice(0, 80) });
      }
    } catch (e) {}
  }
  
  const content = `# Scripts Oversikt - ${new Date().toISOString().split('T')[0]}

| Script | Beskrivelse |
|--------|-------------|
${descriptions.map(d => `| ${d.file} | ${d.desc}${d.desc.length >= 80 ? '...' : ''} |`).join('\n')}

## Kategorier
- **Deploy:** *deploy*, *cloudflare*, *prod*
- **Test:** *test*, *e2e*, *playwright*
- **DB:** *supabase*, *migration*, *db*
- **Fix:** *fix*, *repair*, *heal*
`;
  
  await writeFile(`${PATTERNS_DIR}/scripts-overview.md`, content);
  console.log(`   ✅ Dokumenterte ${descriptions.length} scripts`);
}

// Hovedfunksjon
async function main() {
  console.log('🧠 Knowledge Miner - Starter...\n');
  
  await ensureDirs();
  await extractTodos();
  await extractDecisions();
  await analyzePatterns();
  await detectArchitecturalChanges();
  await documentScripts();
  
  console.log('\n✅ Knowledge mining fullført!');
  console.log('📁 Resultater lagret i .knowledge/');
  console.log('🧠 Synkroniserer til Honcho via hermes CLI');
}

main().catch(console.error);
