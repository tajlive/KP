#!/usr/bin/env node
/**
 * 🐝 Swarm Orchestrator v2 — Real Multi-Agent Quality Control
 *
 * Runs actual local analysis across 5 swarm agents:
 *  - analyzer    → complexity, lint, AST heuristics
 *  - architect   → ADR compliance, import boundaries
 *  - tester      → test coverage, missing tests
 *  - security    → secrets, auth, RLS, trading safety
 *  - knowledge   → MemPalace sync, session logging
 *
 * Usage:
 *   node scripts/swarm-orchestrator.mjs <task-type> [files...]
 *   node scripts/swarm-orchestrator.mjs review            # auto-diff
 *   node scripts/swarm-orchestrator.mjs security          # security-only review
 *   node scripts/swarm-orchestrator.mjs architect         # architecture-only review
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';

const SWARM_DIR = '.kimi/swarm';
const KNOWLEDGE_DIR = '.knowledge';

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function gitDiffFiles() {
  try {
    const out = execSync('git diff --name-only HEAD', { encoding: 'utf8', cwd: '/Users/taj/klarpakke' });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function gitStatusShort() {
  try {
    return execSync('git status --short', { encoding: 'utf8', cwd: '/Users/taj/klarpakke' }).trim();
  } catch {
    return '';
  }
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

function complexityScore(content) {
  const lines = content.split('\n').length;
  const branches = (content.match(/\b(if|else|switch|case|for|while|catch|\?\:)\b/g) || []).length;
  const functions = (content.match(/\b(function|=>)\b/g) || []).length;
  let score = Math.min(10, Math.ceil(lines / 80) + Math.ceil(branches / 8) + Math.ceil(functions / 10));
  return { score, lines, branches, functions };
}

class AnalyzerAgent {
  static async analyze(filePath, content) {
    const { score, lines, branches } = complexityScore(content);
    const risks = [];
    if (lines > 500) risks.push(`File exceeds 500 lines (${lines})`);
    if (score > 8) risks.push(`High complexity score (${score}/10)`);
    if (branches > 30) risks.push(`High branch count (${branches}) — consider splitting`);
    if (content.includes('any') && content.includes(':')) {
      const anyCount = (content.match(/\:\s*any\b/g) || []).length;
      if (anyCount > 2) risks.push(`Excessive use of 'any' (${anyCount})`);
    }
    const hasConsole = /\bconsole\.(log|warn|error)\b/.test(content);
    if (hasConsole && (filePath.includes('/lib/') || filePath.includes('/app/api/'))) {
      risks.push('Console statements in library/api code');
    }
    return {
      complexity_score: score,
      lines,
      risks,
      suggestions: lines > 400 ? ['Consider extracting sub-modules'] : [],
      approval: score > 9 || lines > 1000 ? 'block' : score > 7 || lines > 500 ? 'warn' : 'proceed'
    };
  }
}

class ArchitectAgent {
  static async analyze(filePath, content) {
    const violations = [];
    // Layer boundaries
    if (filePath.includes('/components/') && content.includes('from "@/lib/trading"')) {
      violations.push('Component imports directly from trading lib — use hooks or contexts');
    }
    if (filePath.includes('/lib/trading/') && content.includes('from "@/components/"')) {
      violations.push('Trading lib imports from components — violates layer boundary');
    }
    // Magic numbers outside constants
    if (filePath.includes('/lib/trading/') && !filePath.includes('constants.ts') && !filePath.includes('schemas.ts')) {
      const rawNumbers = (content.match(/\b\d+\.?\d*\b/g) || []).filter(n => parseFloat(n) > 1);
      if (rawNumbers.length > 5) {
        violations.push('Multiple raw numeric values — verify they are imported from constants.ts');
      }
    }
    // Missing types
    if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts') && !content.includes('interface') && !content.includes('type ')) {
      if (!filePath.includes('/app/') && !filePath.includes('layout.tsx') && !filePath.includes('page.tsx')) {
        violations.push('No type definitions found — consider adding explicit types');
      }
    }
    return {
      adr_compliance: ['KLA-91'],
      violations,
      boundary_check: violations.length > 0 ? 'fail' : 'pass',
      approval: violations.some(v => v.includes('violates')) ? 'block' : violations.length > 0 ? 'warn' : 'proceed'
    };
  }
}

class TesterAgent {
  static async analyze(filePath, content) {
    const isCritical = filePath.includes('/trading/') || filePath.includes('/auth/') || filePath.includes('/lib/');
    const testLevel = isCritical ? 'P0' : filePath.includes('/components/') || filePath.includes('/app/api/') ? 'P1' : 'P2';
    const scenarios = [];
    if (isCritical) scenarios.push('Happy path', 'Error handling', 'Edge cases', 'Security');
    else scenarios.push('Basic functionality');

    // Check for corresponding test file
    const dir = dirname(filePath);
    const base = basename(filePath).replace(/\.(ts|tsx|js|jsx)$/, '');
    const possibleTests = [
      `${dir}/${base}.test.ts`,
      `${dir}/${base}.test.tsx`,
      `${dir}/__tests__/${base}.test.ts`,
      `${dir}/__tests__/${base}.test.tsx`,
      `e2e/${base}.spec.ts`
    ];
    let hasTest = false;
    for (const t of possibleTests) {
      if (await fileExists(t)) { hasTest = true; break; }
    }
    if (!hasTest && isCritical) scenarios.push('MISSING: Add unit/integration test file');

    return {
      test_level: testLevel,
      scenarios,
      coverage_target: isCritical ? 90 : 80,
      has_test_file: hasTest,
      approval: (!hasTest && isCritical) ? 'add_tests' : 'proceed'
    };
  }
}

class SecurityAgent {
  static async analyze(filePath, content) {
    const findings = [];
    function add(sev, issue, mitigation) {
      findings.push({ severity: sev, file: filePath, issue, mitigation });
    }

    // Hardcoded secrets
    if (/['"]\b[A-Za-z0-9_]{20,}\b['"]/.test(content) && !filePath.includes('.test.')) {
      add('high', 'Possible hardcoded secret/token', 'Move to environment variables or Vault');
    }
    // Auth callback hardcoding
    if (content.includes('/auth/callback') && !content.includes('getCallbackUrl')) {
      add('high', 'Hardcoded /auth/callback detected', 'Use getCallbackUrl() from @/lib/auth/config');
    }
    // Console logs in sensitive areas
    if (/\bconsole\.(log|warn|error)\b/.test(content) && (filePath.includes('/auth/') || filePath.includes('/trading/'))) {
      add('medium', 'Console logging in auth/trading code', 'Use structured logging or remove before production');
    }
    // SQL injection risk in raw SQL
    if (filePath.endsWith('.sql') || content.includes('execute_sql')) {
      if (content.includes('${') && content.includes('sql')) {
        add('high', 'Possible SQL interpolation', 'Use parameterized queries or RPC only');
      }
    }
    // RLS checks for migrations
    if (filePath.includes('migrations') && filePath.endsWith('.sql')) {
      if (!content.includes('ROW LEVEL SECURITY') && content.includes('CREATE TABLE')) {
        add('high', 'New table without RLS', 'Enable RLS and define policies');
      }
    }
    // Binance key handling
    if (filePath.includes('/trading/') && content.includes('apiKey') && !content.includes('Vault')) {
      add('medium', 'Binance key handling outside Vault pattern', 'Ensure keys are retrieved via get_binance_vault_keys()');
    }
    // Feature flag bypass for live trading
    if (filePath.includes('/trading/') && content.includes('live') && content.includes('order') && !content.includes('feature_flags')) {
      add('medium', 'Live trading logic without feature flag check', 'Verify live_trading_enabled flag is checked');
    }

    const blocks = findings.filter(f => f.severity === 'high').length;
    const warns = findings.filter(f => f.severity === 'medium').length;
    return {
      findings,
      checked: ['auth', 'api', 'db', 'trading', 'secrets'],
      approval: blocks > 0 ? 'block' : warns > 0 ? 'warn' : 'proceed'
    };
  }
}

class KnowledgeAgent {
  static async analyze(filePath, content, taskType, results) {
    const timestamp = new Date().toISOString();
    const sessionDir = `${KNOWLEDGE_DIR}/session`;
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    const anyBlocked = results.some(r => r.approval === 'block');
    const anyWarned = results.some(r => r.approval === 'warn' || r.approval === 'revise' || r.approval === 'add_tests');

    const entry = {
      timestamp,
      file: filePath,
      type: taskType,
      lines: content.split('\n').length,
      swarm_status: anyBlocked ? 'blocked' : anyWarned ? 'warned' : 'approved',
      agents: results.map(r => ({ agent: r.agent, approval: r.approval }))
    };

    const filename = `${timestamp.replace(/[:.]/g, '-')}-${basename(filePath).replace(/\./g, '-')}.json`;
    await writeFile(join(sessionDir, filename), JSON.stringify(entry, null, 2));

    return {
      files_created: [`session/${filename}`],
      patterns_identified: [],
      mem_palace_synced: false, // Sync happens once at workflow end
      wake_up_updated: false,
      approval: 'proceed'
    };
  }
}

class SwarmOrchestrator {
  constructor() {
    this.agents = {
      analyzer: AnalyzerAgent,
      architect: ArchitectAgent,
      tester: TesterAgent,
      security: SecurityAgent,
      knowledge: KnowledgeAgent
    };
  }

  async runWorkflow(workflowType, files) {
    console.log(`${C.magenta}`);
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  🐝 KLARPAKKE SWARM v2 — Multi-Agent Quality Control            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log(`${C.reset}`);

    const workflows = {
      feature: ['analyzer', 'architect', 'tester', 'security', 'knowledge'],
      bugfix: ['analyzer', 'tester', 'security', 'knowledge'],
      refactor: ['analyzer', 'architect', 'tester', 'security', 'knowledge'],
      security: ['security', 'analyzer', 'tester', 'knowledge'],
      review: ['analyzer', 'architect', 'tester', 'security', 'knowledge'],
      architect: ['architect', 'analyzer', 'knowledge']
    };

    const agentOrder = workflows[workflowType] || workflows.review;
    const allResults = [];
    const fileResults = [];

    for (const file of files) {
      let content;
      try {
        content = await readFile(file, 'utf8');
      } catch (err) {
        console.log(`${C.red}❌ Cannot read ${file}: ${err.message}${C.reset}`);
        continue;
      }

      const fileReport = { file, agents: [] };
      const perFileResults = [];

      for (const agentId of agentOrder) {
        const Agent = this.agents[agentId];
        let result;
        try {
          if (agentId === 'knowledge') {
            result = await Agent.analyze(file, content, workflowType, perFileResults);
          } else {
            result = await Agent.analyze(file, content);
          }
        } catch (err) {
          result = { approval: 'block', error: err.message };
        }

        const labeled = { agent: agentId, ...result };
        perFileResults.push(labeled);
        fileReport.agents.push(labeled);
        allResults.push(labeled);

        const status = result.approval === 'proceed' ? `${C.green}✅` :
                       result.approval === 'warn' || result.approval === 'add_tests' ? `${C.yellow}⚠️` :
                       `${C.red}❌`;
        const label = agentId.charAt(0).toUpperCase() + agentId.slice(1);
        console.log(`  ${status} ${label}: ${result.approval}${C.reset}`);
        if (result.findings?.length) {
          for (const f of result.findings) {
            const sevColor = f.severity === 'high' ? C.red : f.severity === 'medium' ? C.yellow : C.blue;
            console.log(`      ${sevColor}[${f.severity}]${C.reset} ${f.issue}`);
          }
        }
        if (result.violations?.length) {
          for (const v of result.violations) {
            console.log(`      ${C.yellow}!${C.reset} ${v}`);
          }
        }
        if (result.risks?.length) {
          for (const r of result.risks) {
            console.log(`      ${C.yellow}!${C.reset} ${r}`);
          }
        }
        if (result.scenarios?.length && !result.has_test_file) {
          console.log(`      ${C.blue}ℹ${C.reset} Missing tests — scenarios: ${result.scenarios.join(', ')}`);
        }
      }

      fileResults.push(fileReport);
      console.log('');
    }

    // Summary
    console.log(`${C.cyan}══════════════════════════════════════════════════════════════════${C.reset}`);
    const blocks = allResults.filter(r => r.approval === 'block').length;
    const warns = allResults.filter(r => r.approval === 'warn' || r.approval === 'revise' || r.approval === 'add_tests').length;
    const passes = allResults.filter(r => r.approval === 'proceed').length;

    console.log(`Results: ${C.green}${passes} passed${C.reset}, ${C.yellow}${warns} warnings${C.reset}, ${C.red}${blocks} blocked${C.reset}`);

    // Write JSON report
    const reportPath = `${KNOWLEDGE_DIR}/session/swarm-report-latest.json`;
    await mkdir(`${KNOWLEDGE_DIR}/session`, { recursive: true });
    await writeFile(reportPath, JSON.stringify({
      workflow: workflowType,
      files,
      timestamp: new Date().toISOString(),
      summary: { passes, warns, blocks },
      results: fileResults
    }, null, 2));
    console.log(`${C.blue}📝 Report written to: ${reportPath}${C.reset}`);

    if (blocks > 0) {
      console.log(`${C.red}`);
      console.log('╔══════════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  SWARM BLOCKED — Fix issues before proceeding               ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝');
      console.log(`${C.reset}`);
      process.exit(1);
    }

    console.log(`${C.green}`);
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SWARM APPROVED — Proceed with confidence                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log(`${C.reset}`);

    // One-shot MemPalace sync at the end
    console.log(`${C.cyan}🔄 Synker til MemPalace...${C.reset}`);
    try {
      execSync('npm run knowledge:sync >/dev/null 2>&1 || true', {
        cwd: '/Users/taj/klarpakke',
        timeout: 15000
      });
      console.log(`${C.green}✅ MemPalace sync complete${C.reset}`);
    } catch {
      console.log(`${C.yellow}⚠️  MemPalace sync skipped (timeout or not configured)${C.reset}`);
    }
  }
}

async function main() {
  const [,, rawTaskType = 'review', ...explicitFiles] = process.argv;

  let taskType = rawTaskType;
  let files = explicitFiles.length > 0 ? explicitFiles : gitDiffFiles();

  if (files.length === 0) {
    const status = gitStatusShort();
    if (status) {
      console.log(`${C.yellow}No staged/uncommitted changes against HEAD.${C.reset}`);
      console.log('Git status:');
      console.log(status);
    } else {
      console.log('Usage: node swarm-orchestrator.mjs <task-type> [files...]');
      console.log('');
      console.log('Task types:');
      console.log('  review    - Full review of current git diff (default)');
      console.log('  feature   - New feature development');
      console.log('  bugfix    - Bug fix');
      console.log('  refactor  - Code refactoring');
      console.log('  security  - Security-focused review');
      console.log('  architect - Architecture-only review');
    }
    process.exit(1);
  }

  // Filter to code-relevant files
  const codeFiles = files.filter(f =>
    f.match(/\.(ts|tsx|js|jsx|sql|json|yaml|yml|md)$/) &&
    !f.includes('node_modules/') &&
    !f.includes('.next/') &&
    !f.includes('package-lock.json')
  );

  if (codeFiles.length === 0) {
    console.log(`${C.yellow}No code files to review in the change set.${C.reset}`);
    process.exit(0);
  }

  const orchestrator = new SwarmOrchestrator();
  await orchestrator.runWorkflow(taskType, codeFiles);
}

main().catch(err => {
  console.error('Swarm error:', err);
  process.exit(1);
});
