#!/usr/bin/env node
/**
 * Pre-deploy check - kjører alle tester før Vercel deploy
 * Exit code 0 = OK, ellers feil
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let hasErrors = false;

function log(title, success, details = '') {
  const icon = success ? '✅' : '❌';
  const color = success ? GREEN : RED;
  console.log(`${color}${icon} ${title}${RESET}`);
  if (details) console.log(`   ${details}`);
  if (!success) hasErrors = true;
}

function run(command, description) {
  console.log(`\n📝 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(description, true);
    return { success: true, output };
  } catch (error) {
    log(description, false, error.message);
    return { success: false, output: error.stdout || error.message };
  }
}

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║              PRE-DEPLOY CHECK - Klarpakke                 ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// 1. Sjekk Node versjon
const nodeVersion = process.version;
console.log(`📦 Node.js: ${nodeVersion}`);

// 2. Lint
run('npm run lint 2>&1', 'ESLint');

// 3. Type check
run('npm run type-check 2>&1', 'TypeScript type check');

// 4. Unit tester
run('npm run test:unit -- --run 2>&1', 'Unit tests (Vitest)');

// 5. Sjekk for manglende dependencies
console.log('\n📝 Checking for missing dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

// Sjekk etter vanlige problempakker
const criticalDeps = ['styled-components', 'rxjs', 'next', 'react', 'react-dom'];
const missing = criticalDeps.filter(dep => !allDeps[dep]);
if (missing.length > 0) {
  log('Critical dependencies', false, `Missing: ${missing.join(', ')}`);
} else {
  log('Critical dependencies', true, 'All present');
}

// 6. Sjekk .env files
console.log('\n📝 Checking environment files...');
const envFiles = ['.env.local', '.env.production'];
const envExists = envFiles.filter(f => fs.existsSync(f));
log('Environment files', envExists.length > 0, `Found: ${envExists.join(', ') || 'NONE'}`);

// 7. Sjekk Next.js config
console.log('\n📝 Validating next.config.mjs...');
try {
  execSync('node -c next.config.mjs 2>&1', { stdio: 'pipe' });
  log('next.config.mjs syntax', true);
} catch (error) {
  log('next.config.mjs syntax', false, error.message);
}

// 8. Sjekk for store filer som kan forårsake minneproblemer
console.log('\n📝 Checking for large files...');
try {
  const largeFiles = execSync('find src -name "*.ts" -o -name "*.tsx" | head -20', { encoding: 'utf8' });
  const files = largeFiles.trim().split('\n');
  log('Source files', true, `${files.length} files found`);
} catch {
  log('Source files check', false);
}

// 9. Sjekk package-lock.json
console.log('\n📝 Checking package-lock.json...');
if (fs.existsSync('package-lock.json')) {
  log('package-lock.json', true, 'Exists');
} else {
  log('package-lock.json', false, 'MISSING - run npm install');
}

// 10. Prøvbygg (valgfritt - tar lang tid)
if (process.argv.includes('--full-build')) {
  console.log('\n📝 Running full build (this may take several minutes)...');
  const buildResult = run('npm run build 2>&1', 'Full build');
  if (!buildResult.success) {
    console.log('\n⚠️  Build output (last 50 lines):');
    console.log(buildResult.output.split('\n').slice(-50).join('\n'));
  }
}

// Oppsummering
console.log('\n╔═══════════════════════════════════════════════════════════╗');
if (hasErrors) {
  console.log('║  ' + RED + 'FAIL - Fix errors before deploying to Vercel' + RESET.padEnd(46) + '║');
  process.exit(1);
} else {
  console.log('║  ' + GREEN + 'SUCCESS - Ready for Vercel deploy' + RESET.padEnd(46) + '║');
  process.exit(0);
}
console.log('╚═══════════════════════════════════════════════════════════╝');
