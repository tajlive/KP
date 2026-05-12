#!/usr/bin/env node
/**
 * 📈 Trading Knowledge Miner — Auto-genererer trading-docs fra kode
 *
 * Skanner src/lib/trading/ og genererer .knowledge/trading/auto-generated/
 * dokumentasjon basert på JSDoc og filstruktur.
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';

const TRADING_DIR = 'src/lib/trading';
const OUTPUT_DIR = '.knowledge/trading/auto-generated';

async function extractFileDocs(filepath, filename) {
  const content = await readFile(filepath, 'utf-8');

  // Extract JSDoc or top comment block
  const jsdocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
  const lineCommentMatch = content.match(/^(?:\/\/ .*\n){2,}/);
  const headerComment = jsdocMatch ? jsdocMatch[0] : lineCommentMatch ? lineCommentMatch[0] : '';

  // Extract exported functions
  const exportMatches = [...content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)];
  const exports = exportMatches.map(m => m[1]);

  // Extract key types/interfaces
  const typeMatches = [...content.matchAll(/export\s+(?:type|interface)\s+(\w+)/g)];
  const types = typeMatches.map(m => m[1]);

  // Extract constants
  const constMatches = [...content.matchAll(/export\s+const\s+(\w+)/g)];
  const constants = constMatches.map(m => m[1]);

  return {
    filename,
    headerComment: headerComment.replace(/\/\*\*|\*\/|\*/g, '').replace(/^\s*\*\s?/gm, '').trim(),
    exports,
    types,
    constants,
    hasTests: existsSync(filepath.replace('.ts', '.test.ts')) || existsSync(join(TRADING_DIR, '__tests__', basename(filename))),
  };
}

async function main() {
  console.log('📈 Trading Knowledge Miner\n');

  if (!existsSync(TRADING_DIR)) {
    console.log('❌ Trading directory not found');
    return;
  }

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const files = (await readdir(TRADING_DIR))
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

  const docs = [];
  for (const f of files) {
    const doc = await extractFileDocs(join(TRADING_DIR, f), f);
    docs.push(doc);
  }

  // Generate individual file docs
  for (const doc of docs) {
    const slug = doc.filename.replace('.ts', '');
    const content = `# ${slug}

**Fil:** \`src/lib/trading/${doc.filename}\`
**Tester:** ${doc.hasTests ? '✅ Ja' : '❌ Nei'}

## Beskrivelse
${doc.headerComment || '*Ingen top-level kommentar funnet*'}

## Eksporterte funksjoner
${doc.exports.length ? doc.exports.map(e => `- \`${e}()\``).join('\n') : '*Ingen eksporterte funksjoner*'}

## Typer/Interfaces
${doc.types.length ? doc.types.map(t => `- \`${t}\``).join('\n') : '*Ingen eksporterte typer*'}

## Konstanter
${doc.constants.length ? doc.constants.map(c => `- \`${c}\``).join('\n') : '*Ingen eksporterte konstanter*'}

---
*Auto-generert av trading-knowledge-miner.mjs*
`;
    await writeFile(join(OUTPUT_DIR, `${slug}.md`), content);
  }

  // Generate index
  const indexContent = `# Trading Engine — Auto-generert Dokumentasjon

**Generert:** ${new Date().toISOString().split('T')[0]}
**Kilde:** \`src/lib/trading/\`
**Filer:** ${docs.length}

## Oversikt

| Fil | Funksjoner | Typer | Tester |
|-----|------------|-------|--------|
${docs.map(d => `| [${d.filename.replace('.ts', '')}](${d.filename.replace('.ts', '.md')}) | ${d.exports.length} | ${d.types.length} | ${d.hasTests ? '✅' : '❌'} |`).join('\n')}

## Kjernekomponenter (etter antall eksporter)
${docs.sort((a, b) => b.exports.length - a.exports.length).slice(0, 5).map(d => `- **${d.filename.replace('.ts', '')}** — ${d.exports.length} funksjoner`).join('\n')}

## Mangler testdekning
${docs.filter(d => !d.hasTests).map(d => `- \`${d.filename}\``).join('\n') || '*Alle filer har tester*'}

---
*Auto-generert av trading-knowledge-miner.mjs. Oppdateres manuelt eller via CI.*
`;
  await writeFile(join(OUTPUT_DIR, 'INDEX.md'), indexContent);

  console.log(`   ✅ Generert ${docs.length} trading-docs`);
  console.log(`   📁 Lagret i: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
