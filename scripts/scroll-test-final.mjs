#!/usr/bin/env node
/**
 * FINAL Scroll Test - Production Ready
 * Checks for REAL scroll-blocking issues only
 */

import { glob } from 'glob';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, relative, dirname } from 'path';

const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', BLUE = '\x1b[34m', RESET = '\x1b[0m', BOLD = '\x1b[1m';

const issues = [];

function addIssue(file, line, severity, message, fix) {
  issues.push({ file, line, severity, message, fix });
}

// Only check LAYOUT files (not small UI components)
const LAYOUT_FILES = [
  'DashboardClientLayout.tsx',
  'layout.tsx', 
  'LocaleMarketingShell.tsx',
  'globals.css'
];

function isLayoutFile(path) {
  return LAYOUT_FILES.some(f => path.includes(f));
}

async function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const relPath = relative(process.cwd(), filePath);
  
  // Only check layout files for critical issues
  if (!isLayoutFile(relPath)) return;
  
  // Check 1: html/body overflow:hidden in CSS
  if (relPath.endsWith('.css')) {
    if (/html\s*\{[^}]*overflow[^}]*hidden/s.test(content)) {
      addIssue(relPath, 1, 'CRITICAL', 'html has overflow:hidden', 'Remove it');
    }
    if (/body\s*\{[^}]*overflow[^}]*hidden/s.test(content)) {
      addIssue(relPath, 1, 'CRITICAL', 'body has overflow:hidden', 'Remove it');
    }
    return;
  }
  
  // Check 2: Nested overflow-y-auto (scroll jail)
  const overflows = [...content.matchAll(/overflow-y-auto/g)];
  if (overflows.length > 1) {
    const line = content.substring(0, overflows[1].index).split('\n').length;
    addIssue(relPath, line, 'CRITICAL', `${overflows.length} nested overflow-y-auto`, 'Keep only one');
  }
  
  // Check 3: h-screen + overflow-hidden in layout
  if (/className="[^"]*h-screen[^"]*overflow-hidden/s.test(content) ||
      /className="[^"]*overflow-hidden[^"]*h-screen/s.test(content)) {
    const match = content.match(/h-screen[^"]*overflow-hidden|overflow-hidden[^"]*h-screen/s);
    const line = content.substring(0, match.index).split('\n').length;
    addIssue(relPath, line, 'CRITICAL', 'Layout has h-screen + overflow-hidden', 'Use min-h-screen + overflow-y-auto');
  }
  
  // Check 4: min-h-screen without overflow when flex
  if (/min-h-screen[\s\S]{0,200}flex-1[\s\S]{0,200}(?!overflow-y-auto)/s.test(content) &&
      !content.includes('overflow-y-auto')) {
    addIssue(relPath, 1, 'WARNING', 'Flex layout missing overflow-y-auto', 'Add overflow-y-auto to scroll container');
  }
}

function printReport() {
  console.log('\n' + BOLD + '═'.repeat(60) + RESET);
  console.log(BOLD + '  SCROLL VALIDATION REPORT' + RESET);
  console.log(BOLD + '═'.repeat(60) + RESET + '\n');
  
  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const warnings = issues.filter(i => i.severity === 'WARNING');
  
  if (critical.length === 0 && warnings.length === 0) {
    console.log(GREEN + '✅ No scroll-blocking issues found in layout files!' + RESET);
  } else {
    critical.forEach(i => {
      console.log(`${RED}CRITICAL${RESET}: ${i.file}:${i.line}`);
      console.log(`  ${i.message}`);
      console.log(`  ${BLUE}Fix: ${i.fix}${RESET}\n`);
    });
    warnings.forEach(i => {
      console.log(`${YELLOW}WARNING${RESET}: ${i.file}:${i.line}`);
      console.log(`  ${i.message}`);
      console.log(`  ${BLUE}Fix: ${i.fix}${RESET}\n`);
    });
  }
  
  console.log(BOLD + '═'.repeat(60) + RESET);
  console.log(`Checked: ${LAYOUT_FILES.join(', ')}`);
  console.log(`Critical: ${critical.length}, Warnings: ${warnings.length}`);
  console.log(BOLD + '═'.repeat(60) + RESET + '\n');
  
  return critical.length === 0;
}

async function main() {
  console.log('🔍 Checking layout files for scroll issues...');
  
  const files = await glob('src/**/*.{tsx,css}', { cwd: process.cwd() });
  
  for (const file of files) {
    await checkFile(resolve(process.cwd(), file));
  }
  
  const passed = printReport();
  process.exit(passed ? 0 : 1);
}

main();
