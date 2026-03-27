#!/usr/bin/env node
/**
 * Node Policy Validator
 * Sikrer at alle GitHub Actions workflows bruker .nvmrc som eneste sannhetskilde
 * for Node-versjon, ikke hardkodede verdier.
 * 
 * Sjekker:
 * 1. Ingen hardkodet node-version (quoted eller unquoted)
 * 2. node-version-file må peke på '.nvmrc'
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const WORKFLOWS_DIR = '.github/workflows';

let exitCode = 0;
const violations = [];

function validateWorkflow(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    
    // Sjekk 1: node-version: (forbudt uansett format)
    // Fanger: node-version: 24, node-version: '24', node-version: "24", node-version: 24.x
    // Unntak: variabler ({{ ) og template uttrykk
    const nodeVersionMatch = line.match(/^(\s*)node-version\s*:\s*(.+)$/);
    if (nodeVersionMatch) {
      const indent = nodeVersionMatch[1];
      const value = nodeVersionMatch[2].trim();
      
      // Tillat kun:
      // - Variabler: ${{ ... }}
      // - Tomme verdier (sjelden, men valid)
      const isVariable = value.startsWith('${{') && value.endsWith('}}');
      const isEmpty = value === '' || value === '~' || value === 'null';
      
      if (!isVariable && !isEmpty) {
        violations.push({
          file: filePath,
          line: lineNum,
          content: line.trim(),
          message: `Hardkodet node-version: "${value}". Bruk kun node-version-file: '.nvmrc'`
        });
      }
    }
    
    // Sjekk 2: node-version-file må peke på .nvmrc
    const nodeVersionFileMatch = line.match(/^(\s*)node-version-file\s*:\s*(.+)$/);
    if (nodeVersionFileMatch) {
      const value = nodeVersionFileMatch[2].trim();
      
      // Fjern quotes hvis present
      const cleanValue = value.replace(/^['"](.+?)['"]$/g, '$1');
      
      if (cleanValue !== '.nvmrc') {
        violations.push({
          file: filePath,
          line: lineNum,
          content: line.trim(),
          message: `Ugyldig node-version-file: "${value}". Må være: '.nvmrc'`
        });
      }
    }
  });
}

function main() {
  console.log('🔍 Validerer Node-policy i GitHub Actions workflows...\n');
  
  try {
    const files = readdirSync(WORKFLOWS_DIR)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
      .map(f => join(WORKFLOWS_DIR, f));
    
    if (files.length === 0) {
      console.log('⚠️  Ingen workflow-filer funnet');
      process.exit(0);
    }
    
    files.forEach(file => validateWorkflow(file));
    
    if (violations.length === 0) {
      console.log('✅ Alle workflows følger Node-policy (.nvmrc-only)');
      console.log(`   Sjekket ${files.length} workflow-filer`);
      console.log('');
      console.log('📋 Policy-oppsummering:');
      console.log('   • Ingen hardkodede node-version verdier');
      console.log('   • node-version-file peker på \'.nvmrc\'');
      process.exit(0);
    } else {
      console.log(`❌ ${violations.length} brudd på Node-policy funnet:\n`);
      violations.forEach((v, i) => {
        console.log(`   ${i + 1}. 📄 ${v.file}:${v.line}`);
        console.log(`      ${v.content}`);
        console.log(`      ➜ ${v.message}\n`);
      });
      console.log('🔧 Rett feilen ved å endre til:');
      console.log('   - name: Setup Node.js');
      console.log('     uses: actions/setup-node@v5');
      console.log('     with:');
      console.log('       node-version-file: \'.nvmrc\'  # ✅ Korrekt');
      console.log('       cache: \'npm\'');
      console.log('');
      console.log('❌ IKKE bruk:');
      console.log('       node-version: \'24\'         # Feil: hardkodet');
      console.log('       node-version: 24             # Feil: hardkodet, unquoted');
      console.log('       node-version: 24.x           # Feil: hardkodet');
      console.log('');
      console.log('📖 Se .nvmrc for gjeldende Node-versjon (24)');
      console.log('📖 Se docs/NODE-POLICY.md for full policy');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Feil under validering:', err.message);
    process.exit(1);
  }
}

main();
