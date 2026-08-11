#!/usr/bin/env node
/**
 * 🔬 Repo Optimizer - Full oversikt for KIMI + Honcho
 * 
 * Genererer komplett analyse av kodebasen:
 * - Kodekvalitet metrics
 * - Avhengighets-analyse
 * - Performance hotspots
 * - Sikkerhets-gaps
 * - Optimaliserings-muligheter
 */

import { readFile, readdir, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class RepoAnalyzer {
  constructor() {
    this.metrics = {
      totalFiles: 0,
      totalLines: 0,
      typescriptFiles: 0,
      testFiles: 0,
      dependencies: {},
      hotspots: [],
      issues: []
    };
  }

  async analyze() {
    console.log(`${C.magenta}${C.bold}`);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔬 REPO OPTIMIZER - Full Kodebase Analyse               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`${C.reset}\n`);

    await this.analyzeStructure();
    await this.analyzeDependencies();
    await this.analyzeHotspots();
    await this.analyzeQuality();
    await this.analyzeSecurity();
    await this.generateReport();

    return this.metrics;
  }

  async analyzeStructure() {
    console.log(`${C.cyan}📁 Analyserer struktur...${C.reset}`);
    
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];
    const ignoreDirs = ['node_modules', '.next', '.git', 'dist', 'build', 'coverage'];
    
    const scanDir = async (dir, depth = 0) => {
      if (depth > 5) return; // Limit depth
      
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const path = join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!ignoreDirs.includes(entry.name)) {
              await scanDir(path, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = entry.name.slice(entry.name.lastIndexOf('.'));
            if (extensions.includes(ext)) {
              this.metrics.totalFiles++;
              
              if (ext === '.ts' || ext === '.tsx') {
                this.metrics.typescriptFiles++;
                if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
                  this.metrics.testFiles++;
                }
              }
              
              // Count lines
              try {
                const content = await readFile(path, 'utf-8');
                this.metrics.totalLines += content.split('\n').length;
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    };
    
    await scanDir('.');
    
    console.log(`   ${C.green}✓${C.reset} Filer: ${this.metrics.totalFiles.toLocaleString()}`);
    console.log(`   ${C.green}✓${C.reset} Linjer: ${this.metrics.totalLines.toLocaleString()}`);
    console.log(`   ${C.green}✓${C.reset} TypeScript: ${this.metrics.typescriptFiles}`);
    console.log(`   ${C.green}✓${C.reset} Testfiler: ${this.metrics.testFiles}`);
    console.log();
  }

  async analyzeDependencies() {
    console.log(`${C.cyan}📦 Analyserer avhengigheter...${C.reset}`);
    
    try {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});
      
      this.metrics.dependencies = {
        production: deps.length,
        development: devDeps.length,
        total: deps.length + devDeps.length,
        critical: deps.filter(d => 
          ['next', 'react', 'typescript', '@supabase/supabase-js'].includes(d)
        )
      };
      
      console.log(`   ${C.green}✓${C.reset} Prod: ${this.metrics.dependencies.production}`);
      console.log(`   ${C.green}✓${C.reset} Dev: ${this.metrics.dependencies.development}`);
      console.log(`   ${C.yellow}!${C.reset} Kritiske: ${this.metrics.dependencies.critical.join(', ')}`);
      console.log();
    } catch (e) {
      console.log(`   ${C.red}✗${C.reset} Kunne ikke lese package.json`);
    }
  }

  async analyzeHotspots() {
    console.log(`${C.cyan}🔥 Finner hotspots (mest endrede filer)...${C.reset}`);
    
    try {
      const result = execSync(
        'git log --since="3 months ago" --name-only --pretty=format: | grep -E "\\.(ts|tsx)$" | sort | uniq -c | sort -rn | head -10',
        { encoding: 'utf-8' }
      );
      
      this.metrics.hotspots = result
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [count, ...fileParts] = line.trim().split(/\s+/);
          return { changes: parseInt(count), file: fileParts.join(' ') };
        });
      
      this.metrics.hotspots.forEach((h, i) => {
        const color = i < 3 ? C.red : i < 6 ? C.yellow : C.reset;
        console.log(`   ${color}${h.changes}×${C.reset} ${h.file}`);
      });
      console.log();
    } catch (e) {
      console.log(`   ${C.yellow}!${C.reset} Ingen git-historie tilgjengelig`);
    }
  }

  async analyzeQuality() {
    console.log(`${C.cyan}📊 Kodekvalitet...${C.reset}`);
    
    // Check for common issues
    const issues = [];
    
    // Check TODOs
    try {
      const todos = execSync('git grep -r "TODO\|FIXME\|XXX" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l', { encoding: 'utf-8' });
      const todoCount = parseInt(todos.trim()) || 0;
      if (todoCount > 0) {
        issues.push({ type: 'TODOs/FIXMEs', count: todoCount, severity: 'medium' });
      }
    } catch (e) {}
    
    // Check console.logs
    try {
      const consoles = execSync('git grep -r "console.log\|console.warn" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | wc -l', { encoding: 'utf-8' });
      const consoleCount = parseInt(consoles.trim()) || 0;
      if (consoleCount > 0) {
        issues.push({ type: 'Console statements', count: consoleCount, severity: 'low' });
      }
    } catch (e) {}
    
    // Check any types
    try {
      const anys = execSync('git grep -r ": any" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | wc -l', { encoding: 'utf-8' });
      const anyCount = parseInt(anys.trim()) || 0;
      if (anyCount > 0) {
        issues.push({ type: '"any" types', count: anyCount, severity: 'medium' });
      }
    } catch (e) {}
    
    this.metrics.issues = issues;
    
    issues.forEach(issue => {
      const color = issue.severity === 'high' ? C.red : issue.severity === 'medium' ? C.yellow : C.reset;
      console.log(`   ${color}${issue.count} ${issue.type}${C.reset}`);
    });
    
    if (issues.length === 0) {
      console.log(`   ${C.green}✓ Ingen kvalitetsissues funnet${C.reset}`);
    }
    console.log();
  }

  async analyzeSecurity() {
    console.log(`${C.cyan}🔒 Sikkerhetssjekk...${C.reset}`);
    
    const checks = [];
    
    // Check for .env files
    if (existsSync('.env.local')) {
      checks.push({ name: '.env.local', status: 'exists', risk: 'check_gitignore' });
    }
    
    // Check for secrets in code
    try {
      const secrets = execSync('git grep -r "password\|secret\|token" --include="*.ts" src/ 2>/dev/null | grep -v "process.env" | wc -l', { encoding: 'utf-8' });
      const secretCount = parseInt(secrets.trim()) || 0;
      if (secretCount > 0) {
        checks.push({ name: 'Hardcoded secrets', status: 'found', risk: 'high' });
      }
    } catch (e) {}
    
    // Check RLS
    if (existsSync('supabase/migrations')) {
      checks.push({ name: 'Supabase RLS', status: 'migrations_exist', risk: 'verify_policies' });
    }
    
    checks.forEach(check => {
      const color = check.risk === 'high' ? C.red : check.risk === 'medium' ? C.yellow : C.green;
      console.log(`   ${color}${check.name}: ${check.status}${C.reset}`);
    });
    console.log();
  }

  async generateReport() {
    console.log(`${C.magenta}════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}📊 OPPSUMMERING${C.reset}\n`);
    
    // Health score
    const testRatio = this.metrics.testFiles / (this.metrics.typescriptFiles || 1);
    const healthScore = Math.min(100, Math.round(
      (testRatio * 30) + // 30% for tests
      (this.metrics.issues.length === 0 ? 30 : 20) + // 30% for no issues
      (this.metrics.dependencies.critical.length > 0 ? 20 : 10) + // 20% for deps
      20 // Base
    ));
    
    const healthColor = healthScore >= 80 ? C.green : healthScore >= 60 ? C.yellow : C.red;
    console.log(`${C.bold}Helse-score:${C.reset} ${healthColor}${healthScore}/100${C.reset}\n`);
    
    // Top 5 optimizations
    console.log(`${C.bold}🎯 Topp 5 Optimaliseringer:${C.reset}`);
    
    const recommendations = [];
    
    if (this.metrics.hotspots.length > 0) {
      recommendations.push(`Refactor ${this.metrics.hotspots[0].file} (${this.metrics.hotspots[0].changes} changes)`);
    }
    
    if (this.metrics.issues.find(i => i.type === 'TODOs/FIXMEs')) {
      recommendations.push('Address TODOs/FIXMEs in codebase');
    }
    
    if (testRatio < 0.1) {
      recommendations.push('Increase test coverage (currently ' + Math.round(testRatio * 100) + '%)');
    }
    
    if (this.metrics.totalLines > 100000) {
      recommendations.push('Consider code splitting (100k+ lines)');
    }
    
    recommendations.push('Update Stack Knowledge Base monthly');
    
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    
    console.log(`\n${C.cyan}💡 Kjør detaljert analyse:${C.reset}`);
    console.log(`   npm run repo:analyze:full`);
    console.log(`   npm run swarm:refactor <hotspot-file>`);
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      healthScore,
      recommendations
    };
    
    await writeFile(
      '.knowledge/repo-analysis.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n${C.green}✅ Rapport lagret: .knowledge/repo-analysis.json${C.reset}`);
  }
}

// Run
const analyzer = new RepoAnalyzer();
analyzer.analyze().catch(console.error);
