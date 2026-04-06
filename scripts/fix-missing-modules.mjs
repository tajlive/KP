#!/usr/bin/env node

/**
 * Auto-installer for Klarpakke Missing Modules
 * 
 * Basert på package.json og vanlige patterns i Next.js-prosjekter
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(cmd, description) {
  log(`\n${description}...`, 'cyan');
  try {
    execSync(cmd, { stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'yellow');
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
log('║                                                           ║', 'cyan');
log('║       KLARPAKKE AUTO-FIX MISSING MODULES                 ║', 'cyan');
log('║                                                           ║', 'cyan');
log('╚═══════════════════════════════════════════════════════════╝\n', 'cyan');

// Read package.json to check what's already there
const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

const tasks = [];

// Essential TypeScript types
const essentialTypes = [
  '@types/node',
  '@types/react',
  '@types/react-dom',
];

essentialTypes.forEach(pkg => {
  if (!allDeps[pkg]) {
    tasks.push({
      type: 'dev',
      packages: [pkg],
      description: `Installing ${pkg}`,
    });
  }
});

// Execute installations
if (tasks.length === 0) {
  log('✅ All essential packages are already installed!', 'green');
} else {
  log(`\n📦 Found ${tasks.length} packages to install\n`, 'blue');
  
  const devPackages = tasks.filter(t => t.type === 'dev').flatMap(t => t.packages);
  const prodPackages = tasks.filter(t => t.type === 'prod').flatMap(t => t.packages);
  
  if (devPackages.length > 0) {
    execCommand(
      `npm install --save-dev ${devPackages.join(' ')}`,
      'Installing dev dependencies'
    );
  }
  
  if (prodPackages.length > 0) {
    execCommand(
      `npm install ${prodPackages.join(' ')}`,
      'Installing production dependencies'
    );
  }
}

// Finally, ensure all packages from package.json are installed
execCommand('npm install', 'Ensuring all package.json dependencies are installed');

log('\n╔═══════════════════════════════════════════════════════════╗', 'green');
log('║                                                           ║', 'green');
log('║     AUTO-FIX COMPLETED! ✅                                ║', 'green');
log('║                                                           ║', 'green');
log('║     Run: npm run build (to verify)                       ║', 'green');
log('║                                                           ║', 'green');
log('╚═══════════════════════════════════════════════════════════╝\n', 'green');

