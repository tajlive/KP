#!/usr/bin/env node
/**
 * Node Policy Validator
 * Sikrer at alle GitHub Actions workflows bruker .nvmrc som eneste sannhetskilde
 * for Node-versjon, ikke hardkodede verdier.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const WORKFLOWS_DIR = '.github/workflows';
const ALLOWED_PATTERN = /node-version-file:\s*['"]\.nvmrc['"]/;
const FORBIDDEN_PATTERN = /node-version:\s*(?!\$\{)/; // node-version med literal verdi (ikke variabel)

let exitCode = 0;
const violations = [];

function validateWorkflow(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Sjekk for forbudt pattern: node-version: "xx" eller node-version: 'xx'
    const forbiddenMatch = line.match(/node-version:\s*["'][^"']+["']/);
    if (forbiddenMatch) {
      violations.push({
        file: filePath,
        line: index + 1,
        content: line.trim(),
        message: 'Hardkodet node-version funnet. Bruk node-version-file: ".nvmrc"'
      });
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
      process.exit(0);
    } else {
      console.log(`❌ ${violations.length} brudd på Node-policy funnet:\n`);
      violations.forEach(v => {
        console.log(`   📄 ${v.file}:${v.line}`);
        console.log(`      ${v.content}`);
        console.log(`      ➜ ${v.message}\n`);
      });
      console.log('🔧 Rett feilen ved å endre til:');
      console.log('   node-version-file: \'.nvmrc\'');
      console.log('\n📖 Se .nvmrc for gjeldende Node-versjon (24)');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Feil under validering:', err.message);
    process.exit(1);
  }
}

main();
