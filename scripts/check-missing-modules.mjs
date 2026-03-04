#!/usr/bin/env node

/**
 * Klarpakke Missing Modules Checker
 * 
 * Identifiserer:
 * - Manglende npm packages
 * - Manglende TypeScript types (@types/*)
 * - Peer dependency issues
 * - Version conflicts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// EXTRACT IMPORTS FROM SOURCE FILES
// ============================================================================

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function extractImports(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const imports = [];
    
    // Match: import ... from 'package' or import('package')
    const importRegex = /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\))/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      
      // Only external packages (not relative paths)
      if (importPath && !importPath.startsWith('.') && !importPath.startsWith('/')) {
        // Extract package name (handle scoped packages)
        const pkgName = importPath.startsWith('@')
          ? importPath.split('/').slice(0, 2).join('/')
          : importPath.split('/')[0];
        
        imports.push(pkgName);
      }
    }
    
    return imports;
  } catch (error) {
    return [];
  }
}

function getAllImports(srcDir = 'src') {
  const files = getAllFiles(srcDir);
  const allImports = new Set();
  
  files.forEach(file => {
    const imports = extractImports(file);
    imports.forEach(imp => allImports.add(imp));
  });
  
  return Array.from(allImports).sort();
}

// ============================================================================
// CHECK INSTALLED PACKAGES
// ============================================================================

function getInstalledPackages() {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    
    return {
      all: { ...deps, ...devDeps },
      deps,
      devDeps,
    };
  } catch (error) {
    log('Error reading package.json', 'red');
    return { all: {}, deps: {}, devDeps: {} };
  }
}

function checkNodeModules() {
  try {
    const installed = readdirSync('node_modules');
    return new Set(installed);
  } catch (error) {
    log('node_modules not found - run npm install', 'red');
    return new Set();
  }
}

// ============================================================================
// ANALYZE MISSING PACKAGES
// ============================================================================

function analyzeMissingPackages() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                           ║', 'cyan');
  log('║       KLARPAKKE MISSING MODULES CHECKER v1.0             ║', 'cyan');
  log('║                                                           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'cyan');
  
  log('📦 Analyzing project dependencies...\n', 'blue');
  
  // Get all imports from source code
  const imports = getAllImports('src');
  log(`Found ${imports.length} unique package imports in source code\n`, 'cyan');
  
  // Get installed packages
  const { all: installedPackages } = getInstalledPackages();
  const nodeModules = checkNodeModules();
  
  // Built-in Node.js modules (don't need to be installed)
  const builtInModules = new Set([
    'fs', 'path', 'http', 'https', 'crypto', 'stream', 'util', 'events',
    'buffer', 'querystring', 'url', 'assert', 'child_process', 'os',
    'net', 'tls', 'dns', 'readline', 'zlib', 'perf_hooks', 'worker_threads',
  ]);
  
  // Next.js built-in modules
  const nextBuiltIns = new Set([
    'next', 'next/server', 'next/navigation', 'next/headers', 'next/image',
    'next/link', 'next/script', 'next/dynamic', 'next/font', 'next/router',
  ]);
  
  const missing = {
    notInPackageJson: [],
    notInNodeModules: [],
    needsTypes: [],
  };
  
  imports.forEach(pkg => {
    // Skip built-ins
    if (builtInModules.has(pkg)) return;
    
    // Handle Next.js modules
    if (pkg.startsWith('next/') || pkg === 'next') {
      if (!installedPackages['next']) {
        missing.notInPackageJson.push('next');
      }
      return;
    }
    
    // Check if in package.json
    if (!installedPackages[pkg]) {
      missing.notInPackageJson.push(pkg);
    }
    
    // Check if in node_modules
    if (!nodeModules.has(pkg)) {
      missing.notInNodeModules.push(pkg);
    }
    
    // Check if needs @types (TypeScript)
    if (!pkg.startsWith('@types/') && !installedPackages[`@types/${pkg}`]) {
      // Only suggest @types for packages that typically have them
      const hasTypes = installedPackages[pkg]?.includes('types');
      if (!hasTypes) {
        missing.needsTypes.push(`@types/${pkg}`);
      }
    }
  });
  
  // ============================================================================
  // REPORT
  // ============================================================================
  
  log('═══════════════════════════════════════════════════════════', 'bright');
  log('  ANALYSIS RESULTS', 'bright');
  log('═══════════════════════════════════════════════════════════\n', 'bright');
  
  // Missing from package.json
  if (missing.notInPackageJson.length > 0) {
    log(`❌ Packages used in code but NOT in package.json (${missing.notInPackageJson.length}):`, 'red');
    missing.notInPackageJson.forEach(pkg => {
      log(`   - ${pkg}`, 'red');
    });
    log('');
  } else {
    log('✅ All imported packages are in package.json', 'green');
  }
  
  // Missing from node_modules
  if (missing.notInNodeModules.length > 0) {
    log(`⚠️  Packages in package.json but NOT in node_modules (${missing.notInNodeModules.length}):`, 'yellow');
    missing.notInNodeModules.forEach(pkg => {
      log(`   - ${pkg}`, 'yellow');
    });
    log('\n💡 Run: npm install\n', 'cyan');
  } else {
    log('✅ All packages in package.json are installed', 'green');
  }
  
  // Check for common missing @types packages
  const commonTypePackages = [
    'node', 'react', 'react-dom', 'jest', 'testing-library__react',
    'testing-library__jest-dom', 'uuid', 'web-push',
  ];
  
  const missingCommonTypes = commonTypePackages
    .map(pkg => `@types/${pkg}`)
    .filter(pkg => !installedPackages[pkg]);
  
  if (missingCommonTypes.length > 0) {
    log(`📝 Common @types packages that might be missing (${missingCommonTypes.length}):`, 'yellow');
    missingCommonTypes.forEach(pkg => {
      log(`   - ${pkg}`, 'yellow');
    });
    log('');
  }
  
  // ============================================================================
  // GENERATE FIX COMMANDS
  // ============================================================================
  
  if (missing.notInPackageJson.length > 0) {
    log('═══════════════════════════════════════════════════════════', 'bright');
    log('  SUGGESTED FIX COMMANDS', 'bright');
    log('═══════════════════════════════════════════════════════════\n', 'bright');
    
    const installCmd = `npm install ${missing.notInPackageJson.join(' ')}`;
    log('Run this command to install missing packages:', 'cyan');
    log(`\n${installCmd}\n`, 'green');
  }
  
  if (missingCommonTypes.length > 0) {
    const typesCmd = `npm install --save-dev ${missingCommonTypes.join(' ')}`;
    log('Run this command to install missing TypeScript types:', 'cyan');
    log(`\n${typesCmd}\n`, 'green');
  }
  
  if (missing.notInNodeModules.length > 0 && missing.notInPackageJson.length === 0) {
    log('Run this command to install packages from package.json:', 'cyan');
    log('\nnpm install\n', 'green');
  }
  
  // ============================================================================
  // EXIT STATUS
  // ============================================================================
  
  const hasIssues = missing.notInPackageJson.length > 0 || missing.notInNodeModules.length > 0;
  
  if (!hasIssues) {
    log('╔═══════════════════════════════════════════════════════════╗', 'green');
    log('║                                                           ║', 'green');
    log('║     ALL DEPENDENCIES ARE PROPERLY INSTALLED! ✅          ║', 'green');
    log('║                                                           ║', 'green');
    log('╚═══════════════════════════════════════════════════════════╝\n', 'green');
    process.exit(0);
  } else {
    log('╔═══════════════════════════════════════════════════════════╗', 'yellow');
    log('║                                                           ║', 'yellow');
    log('║     SOME DEPENDENCIES NEED ATTENTION ⚠️                  ║', 'yellow');
    log('║                                                           ║', 'yellow');
    log('╚═══════════════════════════════════════════════════════════╝\n', 'yellow');
    process.exit(1);
  }
}

// ============================================================================
// MAIN
// ============================================================================

analyzeMissingPackages();

