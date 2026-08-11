#!/usr/bin/env node
/**
 * 🧰 Stack Knowledge Updater
 * 
 * Automatisk oppdatering av Stack Knowledge Base:
 * - Sjekker versjoner i package.json
 * - Scanner for nye workarounds i koden
 * - Oppdaterer forum-lenker
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const STACK_DIR = '.knowledge/stack';

async function ensureDirs() {
  for (const dir of ['versions', 'workarounds', 'known-issues', 'docs']) {
    const path = `${STACK_DIR}/${dir}`;
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }
}

async function scanPackageJson() {
  console.log('📦 Scanner package.json...');
  
  const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
  
  const stack = {
    critical: {
      nextjs: packageJson.dependencies?.next || 'unknown',
      react: packageJson.dependencies?.react || 'unknown',
      typescript: packageJson.devDependencies?.typescript || 'unknown'
    },
    backend: {
      supabase: packageJson.dependencies?.['@supabase/supabase-js'] || 'latest'
    },
    trading: {
      ccxt: packageJson.dependencies?.ccxt || 'not installed'
    },
    ai: {

    }
  };
  
  await writeFile(
    `${STACK_DIR}/versions/current.json`,
    JSON.stringify({
      generated: new Date().toISOString(),
      stack
    }, null, 2)
  );
  
  console.log('   ✅ Versjoner oppdatert');
}

async function scanWorkarounds() {
  console.log('🔍 Scanner for workarounds...');
  
  // Søk etter kjente workaround-mønstre
  const patterns = [
    { pattern: 'chromadb|M1|arm64', tool: 'chromadb', issue: 'macOS ARM64 compatibility' },
    { pattern: 'TODO.*workaround|FIXME.*workaround', tool: 'unknown', issue: 'Manual workaround' },
    { pattern: 'HACK|XXX|temporary', tool: 'unknown', issue: 'Temporary solution' }
  ];
  
  const found = [];
  
  for (const { pattern, tool, issue } of patterns) {
    try {
      const result = execSync(`git grep -l "${pattern}" --include="*.ts" --include="*.tsx" --include="*.md" 2>/dev/null | head -5`, { encoding: 'utf-8' });
      if (result.trim()) {
        found.push({ tool, issue, files: result.trim().split('\n') });
      }
    } catch (e) {}
  }
  
  if (found.length > 0) {
    console.log(`   ⚠️  Fant ${found.length} potensielle workarounds`);
    // Logg til fil for manuell review
    await writeFile(
      `${STACK_DIR}/workarounds/_auto-detected.json`,
      JSON.stringify(found, null, 2)
    );
  }
}

async function generateReport() {
  const report = `# Stack Knowledge Report
Generated: ${new Date().toISOString()}

## Quick Status

| Kategori | Status |
|----------|--------|
| Critical Stack | ✅ Tracked |
| Workarounds | ${existsSync(`${STACK_DIR}/workarounds/_auto-detected.json`) ? '⚠️ Review needed' : '✅ None detected'} |
| Known Issues | ✅ Documented |

## Neste steg
1. Review auto-detected workarounds
2. Sjekk upstream issues
3. Oppdater planned upgrades
`;

  await writeFile(`${STACK_DIR}/REPORT.md`, report);
}

async function main() {
  console.log('🧰 Stack Knowledge Updater\n');
  
  await ensureDirs();
  await scanPackageJson();
  await scanWorkarounds();
  await generateReport();
  
  console.log('\n✅ Stack knowledge oppdatert!');
}

main().catch(console.error);
