#!/usr/bin/env node
/**
 * Vercel Optimizer
 * 
 * Analyzes and provides recommendations for optimal Vercel deployment.
 * 
 * Usage:
 *   node scripts/vercel-optimize.mjs
 *   npm run vercel:optimize
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const METRICS = {
  score: 0,
  maxScore: 100,
  recommendations: [],
};

function addRecommendation(priority, message, impact) {
  METRICS.recommendations.push({ priority, message, impact });
}

function printSection(title) {
  console.log(`\n${BOLD}${BLUE}▸ ${title}${RESET}\n`);
}

function printMetric(name, value, status = 'info') {
  const color = status === 'good' ? GREEN : status === 'warning' ? YELLOW : status === 'error' ? RED : CYAN;
  const icon = status === 'good' ? '✓' : status === 'warning' ? '⚠' : status === 'error' ? '✗' : '•';
  console.log(`  ${color}${icon}${RESET} ${name}: ${value}`);
}

function analyzeBuildSize() {
  printSection('Build Size Analysis');
  
  const nextDir = resolve(process.cwd(), '.next');
  if (!existsSync(nextDir)) {
    printMetric('Status', 'No build found - run "npm run build" first', 'warning');
    addRecommendation('high', 'Build the project to analyze output size', 'Faster deploys');
    return;
  }
  
  try {
    // Check static directory size
    const staticDir = join(nextDir, 'static');
    if (existsSync(staticDir)) {
      const staticSize = execSync(`du -sh ${staticDir} 2>/dev/null || echo "N/A"`, { encoding: 'utf-8' }).trim();
      printMetric('Static Assets', staticSize, 'info');
    }
    
    // Check server directory
    const serverDir = join(nextDir, 'server');
    if (existsSync(serverDir)) {
      const serverSize = execSync(`du -sh ${serverDir} 2>/dev/null || echo "N/A"`, { encoding: 'utf-8' }).trim();
      printMetric('Server Bundle', serverSize, 'info');
    }
    
    // Analyze webpack stats if available
    const statsPath = join(nextDir, 'analyze', 'client.html');
    if (existsSync(statsPath)) {
      printMetric('Bundle Analysis', 'Available at .next/analyze/client.html', 'good');
    } else {
      addRecommendation('medium', 'Run "npm run analyze:bundle" to check bundle size', 'Identify bloat');
    }
    
    METRICS.score += 15;
  } catch (e) {
    printMetric('Error', e.message, 'error');
  }
}

function analyzeImageOptimization() {
  printSection('Image Optimization');
  
  const configPath = resolve(process.cwd(), 'next.config.mjs');
  const content = readFileSync(configPath, 'utf-8');
  
  // Check image config
  if (content.includes('unoptimized: false') || !content.includes('unoptimized:')) {
    printMetric('Next.js Image', 'Enabled (Vercel optimized)', 'good');
    METRICS.score += 10;
  } else {
    printMetric('Next.js Image', 'Disabled', 'warning');
    addRecommendation('high', 'Enable Next.js Image optimization', 'Better performance');
  }
  
  // Check formats
  if (content.includes('image/avif')) {
    printMetric('AVIF Format', 'Enabled', 'good');
    METRICS.score += 5;
  } else {
    addRecommendation('medium', 'Add AVIF to image formats', '30% smaller images');
  }
  
  // Check remote patterns
  if (content.includes('remotePatterns')) {
    printMetric('Remote Patterns', 'Configured', 'good');
    METRICS.score += 5;
  }
}

function analyzeCaching() {
  printSection('Caching Strategy');
  
  const vercelPath = resolve(process.cwd(), 'vercel.json');
  const config = JSON.parse(readFileSync(vercelPath, 'utf-8'));
  
  // Check static caching
  const staticHeaders = config.headers?.find(h => h.source?.includes('_next/static'));
  if (staticHeaders) {
    const cacheValue = staticHeaders.headers.find(h => h.key === 'Cache-Control')?.value;
    if (cacheValue?.includes('immutable')) {
      printMetric('Static Cache', '365 days + immutable', 'good');
      METRICS.score += 10;
    } else {
      printMetric('Static Cache', 'Configured but not optimal', 'warning');
    }
  } else {
    printMetric('Static Cache', 'Not configured', 'error');
    addRecommendation('high', 'Add immutable caching for _next/static', 'Better caching');
  }
  
  // Check ISR caching
  const pageHeaders = config.headers?.find(h => h.source?.includes('/(no|en)'));
  if (pageHeaders) {
    const cacheValue = pageHeaders.headers.find(h => h.key === 'Cache-Control')?.value;
    if (cacheValue?.includes('stale-while-revalidate')) {
      printMetric('ISR Cache', 'SWR configured', 'good');
      METRICS.score += 10;
    }
  }
}

function analyzeFunctions() {
  printSection('Server Functions');
  
  const vercelPath = resolve(process.cwd(), 'vercel.json');
  const config = JSON.parse(readFileSync(vercelPath, 'utf-8'));
  
  if (config.functions) {
    const fnCount = Object.keys(config.functions).length;
    printMetric('Configured Functions', fnCount, 'info');
    
    // Check for edge runtime
    const hasEdge = Object.values(config.functions).some(f => f.runtime === 'edge');
    if (hasEdge) {
      printMetric('Edge Runtime', 'Enabled for some functions', 'good');
      METRICS.score += 10;
    }
    
    // Check maxDuration
    const maxDurations = Object.values(config.functions).map(f => f.maxDuration || 10);
    const maxDuration = Math.max(...maxDurations);
    printMetric('Max Duration', `${maxDuration}s`, maxDuration > 30 ? 'warning' : 'good');
    
    if (maxDuration > 300) {
      addRecommendation('high', 'Reduce function maxDuration to 300s (Pro plan limit)', 'Avoid timeouts');
    }
  } else {
    addRecommendation('medium', 'Configure function timeouts for API routes', 'Better control');
  }
}

function analyzeDependencies() {
  printSection('Dependency Analysis');
  
  const packagePath = resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  
  printMetric('Production Dependencies', deps.length, 'info');
  printMetric('Dev Dependencies', devDeps.length, 'info');
  
  // Check for large dependencies
  const largeDeps = ['lodash', 'moment', 'jquery', 'bootstrap'];
  const foundLarge = deps.filter(d => largeDeps.some(ld => d.includes(ld)));
  
  if (foundLarge.length > 0) {
    printMetric('Large Dependencies', foundLarge.join(', '), 'warning');
    addRecommendation('medium', `Consider alternatives to: ${foundLarge.join(', ')}`, 'Smaller bundles');
  } else {
    printMetric('Large Dependencies', 'None detected', 'good');
    METRICS.score += 10;
  }
  
  // Check for modern replacements
  if (deps.includes('moment')) {
    addRecommendation('high', 'Replace moment with date-fns (already in deps)', '-50KB bundle');
  }
}

function analyzeBuildPerformance() {
  printSection('Build Performance');
  
  const configPath = resolve(process.cwd(), 'next.config.mjs');
  const content = readFileSync(configPath, 'utf-8');
  
  // Check for SWC
  if (!content.includes('swcMinify: false')) {
    printMetric('SWC Minifier', 'Enabled (default)', 'good');
    METRICS.score += 10;
  }
  
  // Check for webpack optimizations
  if (content.includes('splitChunks')) {
    printMetric('Code Splitting', 'Configured', 'good');
    METRICS.score += 10;
  }
  
  // Check for React Compiler
  if (content.includes('reactCompiler: true')) {
    printMetric('React Compiler', 'Enabled', 'good');
    METRICS.score += 10;
  } else {
    addRecommendation('medium', 'Enable React Compiler for automatic memoization', 'Better performance');
  }
}

function analyzeVercelFeatures() {
  printSection('Vercel Features');
  
  // Check Analytics
  const layoutPath = resolve(process.cwd(), 'src/app/[locale]/layout.tsx');
  if (existsSync(layoutPath)) {
    const content = readFileSync(layoutPath, 'utf-8');
    
    if (content.includes('@vercel/analytics')) {
      printMetric('Vercel Analytics', 'Installed', 'good');
      METRICS.score += 5;
    } else {
      addRecommendation('low', 'Add @vercel/analytics for usage insights', 'Better tracking');
    }
    
    if (content.includes('@vercel/speed-insights')) {
      printMetric('Speed Insights', 'Installed', 'good');
      METRICS.score += 5;
    } else {
      addRecommendation('low', 'Add @vercel/speed-insights for Core Web Vitals', 'Performance monitoring');
    }
  }
  
  // Check .vercelignore
  const ignorePath = resolve(process.cwd(), '.vercelignore');
  if (existsSync(ignorePath)) {
    printMetric('.vercelignore', 'Exists', 'good');
    METRICS.score += 5;
  } else {
    addRecommendation('medium', 'Create .vercelignore to reduce build size', 'Faster deploys');
  }
}

function printRecommendations() {
  printSection('Recommendations');
  
  if (METRICS.recommendations.length === 0) {
    console.log(`  ${GREEN}✓ No recommendations - your setup is optimized!${RESET}`);
    return;
  }
  
  const priorities = { high: RED, medium: YELLOW, low: CYAN };
  
  // Sort by priority
  const sorted = METRICS.recommendations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
  
  for (const rec of sorted) {
    const color = priorities[rec.priority];
    const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🔵';
    console.log(`  ${icon} ${color}${rec.message}${RESET}`);
    console.log(`     ${CYAN}Impact: ${rec.impact}${RESET}\n`);
  }
}

function printScore() {
  console.log(`\n${BOLD}📈 Optimization Score${RESET}\n`);
  
  const percentage = Math.min(Math.round((METRICS.score / METRICS.maxScore) * 100), 100);
  const color = percentage >= 80 ? GREEN : percentage >= 60 ? YELLOW : RED;
  const status = percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : 'Needs Work';
  
  console.log(`  ${color}${BOLD}${percentage}%${RESET} - ${status}`);
  const filled = Math.floor(percentage / 5);
  const empty = Math.max(0, 20 - filled);
  console.log(`  ${'█'.repeat(filled)}${'░'.repeat(empty)}`);
  
  if (percentage < 80) {
    console.log(`\n  ${CYAN}Run "npm run vercel:validate" for detailed checks${RESET}`);
  }
}

// Main
console.log(`${BOLD}🚀 Vercel Optimizer${RESET}`);
console.log(`${CYAN}Analyzing your Vercel configuration for optimal performance...${RESET}`);

analyzeBuildSize();
analyzeImageOptimization();
analyzeCaching();
analyzeFunctions();
analyzeDependencies();
analyzeBuildPerformance();
analyzeVercelFeatures();

printRecommendations();
printScore();

console.log(`\n${BOLD}📚 Resources${RESET}`);
console.log(`  • Vercel Docs: https://vercel.com/docs`);
console.log(`  • Next.js Optimization: https://nextjs.org/docs/app/building-your-application/optimizing`);
console.log(`  • Web Vitals: https://web.dev/vitals/`);
