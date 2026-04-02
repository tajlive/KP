#!/usr/bin/env node
/**
 * Comprehensive Scroll & CSS Validation Script
 * Checks all pages for scroll-blocking issues, overflow problems, and layout errors
 */

import { glob } from 'glob';
import { readFileSync } from 'fs';
import { resolve, relative } from 'path';

const SRC_DIR = resolve(process.cwd(), 'src');
const APP_DIR = resolve(SRC_DIR, 'app');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const results = {
  critical: [],
  high: [],
  medium: [],
  warning: [],
  info: []
};

function logIssue(severity, file, line, message, fix) {
  const issue = { file, line: line || 1, message, fix };
  const key = severity.toLowerCase();
  if (results[key]) results[key].push(issue);
}

function findLineNumber(content, matchIndex) {
  return content.substring(0, matchIndex).split('\n').length;
}

// Critical patterns that block scroll
const CRITICAL_PATTERNS = [
  {
    name: 'html overflow hidden',
    regex: /html\s*\{[^}]*overflow[^}]*hidden/s,
    message: 'html overflow:hidden blocks ALL page scrolling',
    fix: 'Remove overflow:hidden from html'
  },
  {
    name: 'body overflow hidden',
    regex: /body\s*\{[^}]*overflow[^}]*hidden/s,
    message: 'body overflow:hidden blocks body scrolling',
    fix: 'Remove overflow:hidden from body'
  }
];

// High severity patterns
const HIGH_PATTERNS = [
  {
    name: 'nested overflow containers',
    regex: /overflow-y-auto[\s\S]{0,800}overflow-y-auto/g,
    message: 'Nested overflow-y-auto containers create scroll jail',
    fix: 'Only one container should have overflow-y-auto'
  },
  {
    name: 'h-screen with overflow-hidden',
    regex: /className="[^"]*h-screen[^"]*overflow-hidden|className="[^"]*overflow-hidden[^"]*h-screen/,
    message: 'h-screen + overflow-hidden blocks scroll',
    fix: 'Use min-h-screen or overflow-y-auto'
  },
  {
    name: 'multiple sentry init',
    regex: /Sentry\.init\(\)/g,
    message: 'Multiple Sentry.init() calls detected',
    fix: 'Consolidate to single init in sentry.client.config.ts',
    maxCount: 1
  }
];

// Medium patterns
const MEDIUM_PATTERNS = [
  {
    name: 'flex container without overflow',
    regex: /flex-1[\s\S]{0,300}min-h-0/,
    message: 'Flex container with min-h-0 may need overflow',
    fix: 'Consider adding overflow-y-auto'
  }
];

async function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = relative(process.cwd(), filePath);
  
  // Check critical
  for (const pattern of CRITICAL_PATTERNS) {
    const match = content.match(pattern.regex);
    if (match) {
      const line = findLineNumber(content, match.index);
      logIssue('CRITICAL', relativePath, line, pattern.message, pattern.fix);
    }
  }
  
  // Check high
  for (const pattern of HIGH_PATTERNS) {
    const matches = [...content.matchAll(new RegExp(pattern.regex, 'g'))];
    const count = matches.length;
    
    if (pattern.maxCount && count > pattern.maxCount) {
      logIssue('HIGH', relativePath, 1, `${pattern.message} (${count} found)`, pattern.fix);
    } else if (!pattern.maxCount && count > 0) {
      for (const match of matches) {
        const line = findLineNumber(content, match.index);
        logIssue('HIGH', relativePath, line, pattern.message, pattern.fix);
      }
    }
  }
  
  // Check medium
  for (const pattern of MEDIUM_PATTERNS) {
    const match = content.match(pattern.regex);
    if (match) {
      const line = findLineNumber(content, match.index);
      logIssue('MEDIUM', relativePath, line, pattern.message, pattern.fix);
    }
  }
}

async function checkSpecificFiles() {
  const checks = [
    {
      path: 'src/app/globals.css',
      checks: [
        { regex: /html\s*\{[^}]*overflow-x-hidden/, severity: 'WARNING', msg: 'html overflow-x-hidden may block scroll on Safari' }
      ]
    },
    {
      path: 'src/app/[locale]/(user)/dashboard/DashboardClientLayout.tsx',
      checks: [
        { regex: /overflow-y-auto.*overflow-y-auto/s, severity: 'CRITICAL', msg: 'Nested overflow-y-auto in dashboard' },
        { regex: /className="[^"]*min-h-screen[^"]*flex[^"]*flex-col[^"]*"/, severity: 'INFO', msg: 'Dashboard uses flex layout (verify scroll works)' }
      ]
    }
  ];
  
  for (const check of checks) {
    try {
      const content = readFileSync(check.path, 'utf-8');
      for (const rule of check.checks) {
        if (rule.regex.test(content)) {
          logIssue(rule.severity, check.path, 1, rule.msg, 'Review layout structure');
        }
      }
    } catch (e) {
      logIssue('WARNING', check.path, 1, 'Could not read file for validation', 'Check file exists');
    }
  }
}

function printResults() {
  console.log('\n' + BOLD + '='.repeat(70) + RESET);
  console.log(BOLD + '  SCROLL & CSS VALIDATION REPORT' + RESET);
  console.log(BOLD + '='.repeat(70) + RESET + '\n');
  
  let total = 0;
  
  // Critical
  if (results.critical.length > 0) {
    console.log(RED + BOLD + 'CRITICAL (' + results.critical.length + '):' + RESET);
    for (const issue of results.critical) {
      console.log(`  ${RED}✗ ${issue.file}:${issue.line}${RESET}`);
      console.log(`    ${issue.message}`);
      console.log(`    ${CYAN}Fix: ${issue.fix}${RESET}\n`);
    }
    total += results.critical.length;
  }
  
  // High
  if (results.high.length > 0) {
    console.log(YELLOW + BOLD + 'HIGH (' + results.high.length + '):' + RESET);
    for (const issue of results.high) {
      console.log(`  ${YELLOW}⚠ ${issue.file}:${issue.line}${RESET}`);
      console.log(`    ${issue.message}`);
      console.log(`    ${CYAN}Fix: ${issue.fix}${RESET}\n`);
    }
    total += results.high.length;
  }
  
  // Medium
  if (results.medium.length > 0) {
    console.log(BLUE + BOLD + 'MEDIUM (' + results.medium.length + '):' + RESET);
    for (const issue of results.medium) {
      console.log(`  ${BLUE}! ${issue.file}:${issue.line}${RESET}`);
      console.log(`    ${issue.message}`);
      console.log(`    ${CYAN}Fix: ${issue.fix}${RESET}\n`);
    }
    total += results.medium.length;
  }
  
  // Warning
  if (results.warning.length > 0) {
    console.log(BOLD + 'WARNINGS (' + results.warning.length + '):' + RESET);
    for (const issue of results.warning) {
      console.log(`  • ${issue.file}:${issue.line}`);
      console.log(`    ${issue.message}\n`);
    }
    total += results.warning.length;
  }
  
  // Summary
  console.log(BOLD + '='.repeat(70) + RESET);
  if (total === 0) {
    console.log(GREEN + BOLD + '✓ All checks passed! No scroll-blocking issues found.' + RESET);
  } else {
    console.log(`${BOLD}Total issues: ${total}${RESET} (${results.critical.length} critical, ${results.high.length} high, ${results.medium.length} medium, ${results.warning.length} warnings)`);
  }
  console.log(BOLD + '='.repeat(70) + RESET + '\n');
  
  return total === 0;
}

async function main() {
  console.log('🔍 Scanning for scroll-blocking CSS issues...\n');
  
  // Find all TSX files in app directory
  const files = await glob('src/app/**/*.{tsx,css}', { cwd: process.cwd() });
  
  // Scan each file
  for (const file of files) {
    await scanFile(resolve(process.cwd(), file));
  }
  
  // Check specific known-problematic files
  await checkSpecificFiles();
  
  // Print results
  const passed = printResults();
  
  // Exit with error code if critical/high issues found
  if (results.critical.length > 0 || results.high.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
