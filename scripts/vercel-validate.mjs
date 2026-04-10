#!/usr/bin/env node
/**
 * Vercel Configuration Validator
 * 
 * Validates vercel.json and next.config.mjs for optimal Vercel deployment.
 * 
 * Usage:
 *   node scripts/vercel-validate.mjs
 *   npm run vercel:validate
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let exitCode = 0;

function log(section, message, type = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
  const color = type === 'error' ? RED : type === 'warning' ? YELLOW : GREEN;
  console.log(`${color}${prefix} [${section}]${RESET} ${message}`);
}

function validateVercelJson() {
  console.log(`\n${BOLD}📋 Validating vercel.json...${RESET}\n`);
  
  const vercelPath = resolve(process.cwd(), 'vercel.json');
  
  if (!existsSync(vercelPath)) {
    log('Config', 'vercel.json not found', 'error');
    return false;
  }
  
  let config;
  try {
    config = JSON.parse(readFileSync(vercelPath, 'utf-8'));
    log('JSON', 'vercel.json is valid JSON');
  } catch (e) {
    log('JSON', `Invalid JSON: ${e.message}`, 'error');
    return false;
  }
  
  // Check required fields
  const checks = [
    { key: 'framework', value: 'nextjs', name: 'Framework' },
    { key: 'buildCommand', value: 'next build', name: 'Build Command' },
    { key: 'regions', required: true, name: 'Regions' },
  ];
  
  for (const check of checks) {
    if (check.required && !config[check.key]) {
      log(check.name, `Missing required field: ${check.key}`, 'error');
      exitCode = 1;
    } else if (check.value && config[check.key] !== check.value) {
      log(check.name, `Expected "${check.value}", got "${config[check.key]}"`, 'warning');
    } else if (config[check.key]) {
      log(check.name, `${config[check.key]}`);
    }
  }
  
  // Check functions configuration
  if (config.functions) {
    log('Functions', `Configured for ${Object.keys(config.functions).length} patterns`);
    
    // Check maxDuration values
    for (const [pattern, settings] of Object.entries(config.functions)) {
      if (settings.maxDuration > 300) {
        log('Functions', `${pattern} has maxDuration > 300s (Pro plan limit)`, 'warning');
      }
    }
  }
  
  // Check crons
  if (config.crons) {
    log('Crons', `${config.crons.length} cron jobs configured`);
  }
  
  // Check caching headers
  if (config.headers) {
    const staticCache = config.headers.find(h => h.source?.includes('_next/static'));
    if (staticCache) {
      log('Cache', 'Static assets caching configured');
    } else {
      log('Cache', 'Missing static assets caching', 'warning');
    }
  }
  
  // Check GitHub integration
  if (config.github?.silent) {
    log('GitHub', 'Silent mode enabled (reduces comment noise)');
  }
  
  return true;
}

function validateNextConfig() {
  console.log(`\n${BOLD}⚙️  Validating next.config.mjs...${RESET}\n`);
  
  const configPath = resolve(process.cwd(), 'next.config.mjs');
  
  if (!existsSync(configPath)) {
    log('Config', 'next.config.mjs not found', 'error');
    return false;
  }
  
  const content = readFileSync(configPath, 'utf-8');
  
  // Check for common optimizations
  const checks = [
    { pattern: /compress:\s*true/, name: 'Compression', recommended: true },
    { pattern: /poweredByHeader:\s*false/, name: 'Powered-By Header', recommended: true },
    { pattern: /productionBrowserSourceMaps:\s*false/, name: 'Source Maps', recommended: true },
    { pattern: /reactCompiler:\s*true/, name: 'React Compiler', recommended: true },
    { pattern: /optimizePackageImports/, name: 'Package Import Optimization', recommended: true },
    { pattern: /memoryBasedWorkersCount:\s*true/, name: 'Memory-Based Workers', recommended: true },
    { pattern: /staticPageGenerationTimeout/, name: 'Static Generation Timeout', recommended: true },
    { pattern: /generateBuildId/, name: 'Build ID Generation', recommended: true },
  ];
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      log(check.name, 'Enabled');
    } else {
      const type = check.recommended ? 'warning' : 'info';
      log(check.name, 'Not configured', type);
      if (check.recommended) exitCode = 1;
    }
  }
  
  // Check for duplicate experimental blocks
  const experimentalMatches = content.match(/experimental:/g);
  if (experimentalMatches && experimentalMatches.length > 1) {
    log('Experimental', `Found ${experimentalMatches.length} experimental blocks (should be 1)`, 'error');
    exitCode = 1;
  }
  
  return true;
}

function validateEnvironment() {
  console.log(`\n${BOLD}🔧 Validating Environment...${RESET}\n`);
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const optional = [
    'NEXT_PUBLIC_SENTRY_DSN',
    'SENTRY_AUTH_TOKEN',
    'VERCEL_TOKEN',
  ];
  
  for (const key of required) {
    if (process.env[key]) {
      log(key, 'Set');
    } else {
      log(key, 'Not set (required for build)', 'error');
      exitCode = 1;
    }
  }
  
  for (const key of optional) {
    if (process.env[key]) {
      log(key, 'Set');
    } else {
      log(key, 'Not set (optional)', 'warning');
    }
  }
}

function printSummary() {
  console.log(`\n${BOLD}📊 Summary${RESET}\n`);
  
  if (exitCode === 0) {
    console.log(`${GREEN}✅ All checks passed!${RESET}`);
    console.log(`\n${BOLD}🚀 Vercel Optimization Tips:${RESET}`);
    console.log('  • Enable Vercel Analytics in dashboard');
    console.log('  • Enable Speed Insights for Core Web Vitals');
    console.log('  • Consider Vercel Pro for prioritized builds');
    console.log('  • Use "npm run vercel:optimize" for detailed recommendations');
  } else {
    console.log(`${RED}❌ Some checks failed. Please review the warnings above.${RESET}`);
  }
}

// Main
console.log(`${BOLD}🚀 Vercel Configuration Validator${RESET}`);
console.log('=====================================\n');

validateVercelJson();
validateNextConfig();
validateEnvironment();
printSummary();

process.exit(exitCode);
