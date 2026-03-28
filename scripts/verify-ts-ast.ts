#!/usr/bin/env tsx
/**
 * AST/Type Verification Script
 * 
 * Guardrail som hindrer ødelagte TypeScript-patcher ved å verifisere
 * at koden er syntaktisk og typemessig korrekt før commit.
 * 
 * Bruker ts-morph for raskere analyse enn tsc --noEmit ved patching.
 */

import { Project } from 'ts-morph';
import { resolve } from 'path';

const TS_CONFIG_PATH = resolve(process.cwd(), 'tsconfig.json');

async function main(): Promise<void> {
  const startTime = Date.now();
  
  console.log('🔍 [AST Verify] Initialiserer ts-morph...');
  
  const project = new Project({
    tsConfigFilePath: TS_CONFIG_PATH,
    skipAddingFilesFromTsConfig: false,
  });

  console.log('🔍 [AST Verify] Henter pre-emit diagnostics...');
  
  const diagnostics = project.getPreEmitDiagnostics();
  
  const errors = diagnostics.filter(d => {
    const category = d.getCategory?.();
    return category === 1; // DiagnosticCategory.Error = 1
  });
  
  const warnings = diagnostics.filter(d => {
    const category = d.getCategory?.();
    return category === 0; // DiagnosticCategory.Warning = 0
  });

  const duration = Date.now() - startTime;

  if (errors.length > 0) {
    console.error(`\n❌ [AST Verify] ${errors.length} TypeScript-feil funnet (${duration}ms):\n`);
    
    // Kompakt, lesbar output
    for (const diagnostic of errors.slice(0, 20)) {
      const sourceFile = diagnostic.getSourceFile();
      const message = diagnostic.getMessageText();
      const messageStr = typeof message === 'string' ? message : message.getMessageText?.() || String(message);
      
      if (sourceFile) {
        const filePath = sourceFile.getFilePath();
        const line = diagnostic.getLineNumber?.() || '?';
        const shortPath = filePath.replace(process.cwd(), '.');
        console.error(`  ${shortPath}:${line} — ${messageStr}`);
      } else {
        console.error(`  [uten fil] — ${messageStr}`);
      }
    }
    
    if (errors.length > 20) {
      console.error(`  ... og ${errors.length - 20} flere feil`);
    }
    
    console.error('\n💡 Tips: Kjør "npx tsc --noEmit" for full output\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`⚠️  [AST Verify] ${warnings.length} advarsler (ikke blokkerende)`);
  }

  console.log(`✅ [AST Verify] Ingen feil funnet (${duration}ms)`);
  process.exit(0);
}

main().catch((err) => {
  console.error('💥 [AST Verify] Uventet feil:', err);
  process.exit(1);
});
