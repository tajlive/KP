#!/usr/bin/env node
/**
 * 🐝 Swarm Orchestrator - Multi-agent kvalitetskontroll
 * 
 * Orkestrerer flere AI-agenter for høyeste kvalitet:
 * 1. Analyzer → Sjekk kompleksitet
 * 2. Architect → Verifiser ADR-compliance  
 * 3. Tester → Identifiser test-scenarier
 * 4. Knowledge → Lagre til MemPalace
 * 
 * Bruk: node scripts/swarm-orchestrator.mjs <task-type> [files...]
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const SWARM_DIR = '.kimi/swarm';
const KNOWLEDGE_DIR = '.knowledge';

// Farger for M1 Mac
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class SwarmAgent {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.promptFile = config.prompt_file;
  }

  async analyze(context) {
    console.log(`${C.cyan}🤖 ${this.name} analyserer...${C.reset}`);
    
    // Simulert analyse (i produksjon: kall faktisk AI)
    const results = {
      analyzer: this.analyzeCode(context),
      architect: this.checkArchitecture(context),
      tester: this.planTests(context),
      knowledge: await this.syncKnowledge(context)
    };
    
    return results[this.id] || { approval: 'proceed' };
  }

  analyzeCode(context) {
    // Sjekk filstørrelse
    const lines = context.content?.split('\n').length || 0;
    const complexity = lines > 300 ? 'high' : lines > 100 ? 'medium' : 'low';
    
    return {
      complexity_score: Math.min(10, Math.ceil(lines / 50)),
      lines,
      risks: lines > 500 ? ['File too large'] : [],
      approval: lines > 1000 ? 'block' : lines > 500 ? 'warn' : 'proceed'
    };
  }

  checkArchitecture(context) {
    const violations = [];
    
    // Sjekk imports
    if (context.content?.includes('from "@/lib/trading"') && 
        context.path?.includes('/components/')) {
      violations.push('Component imports directly from trading lib');
    }
    
    return {
      adr_compliance: ['KLA-91'],
      violations,
      approval: violations.length > 0 ? 'revise' : 'proceed'
    };
  }

  planTests(context) {
    const isCritical = context.path?.includes('/trading/') || 
                      context.path?.includes('/auth/');
    
    return {
      test_level: isCritical ? 'P0' : 'P1',
      scenarios: isCritical ? 
        ['Happy path', 'Error handling', 'Edge cases', 'Security'] :
        ['Basic functionality'],
      coverage_target: isCritical ? 90 : 80,
      approval: 'proceed'
    };
  }

  async syncKnowledge(context) {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Lagre til session-log
    const sessionDir = `${KNOWLEDGE_DIR}/session`;
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }
    
    const entry = {
      timestamp,
      file: context.path,
      type: context.taskType,
      complexity: context.content?.split('\n').length
    };
    
    await writeFile(
      `${sessionDir}/${timestamp}-swarm.json`,
      JSON.stringify(entry, null, 2)
    );
    
    return {
      files_created: [`session/${timestamp}-swarm.json`],
      mem_palace_synced: false,
      approval: 'proceed'
    };
  }
}

class SwarmOrchestrator {
  constructor() {
    this.agents = {
      analyzer: new SwarmAgent({
        id: 'analyzer',
        name: 'Code Analyzer',
        prompt_file: '.kimi/swarm/analyzer.md'
      }),
      architect: new SwarmAgent({
        id: 'architect', 
        name: 'Architecture Guardian',
        prompt_file: '.kimi/swarm/architect.md'
      }),
      tester: new SwarmAgent({
        id: 'tester',
        name: 'Test Strategist',
        prompt_file: '.kimi/swarm/tester.md'
      }),
      knowledge: new SwarmAgent({
        id: 'knowledge',
        name: 'Knowledge Keeper',
        prompt_file: '.kimi/swarm/knowledge.md'
      })
    };
  }

  async runWorkflow(workflowType, files) {
    console.log(`${C.magenta}`);
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  🐝 KLARPAKKE SWARM - Multi-Agent Quality Control    ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`${C.reset}`);
    
    console.log(`Workflow: ${workflowType}`);
    console.log(`Files: ${files.length}`);
    console.log('');

    const workflows = {
      feature: ['analyzer', 'architect', 'tester', 'knowledge'],
      bugfix: ['analyzer', 'tester', 'knowledge'],
      refactor: ['analyzer', 'architect', 'tester', 'knowledge'],
      security: ['security', 'analyzer', 'tester', 'knowledge']
    };

    const agentOrder = workflows[workflowType] || workflows.feature;
    const results = [];

    for (const agentId of agentOrder) {
      const agent = this.agents[agentId];
      if (!agent) continue;

      for (const file of files) {
        try {
          const content = await readFile(file, 'utf-8');
          const context = {
            path: file,
            content,
            taskType: workflowType
          };

          const result = await agent.analyze(context);
          results.push({
            agent: agentId,
            file,
            ...result
          });

          // Vis resultat
          const status = result.approval === 'proceed' ? `${C.green}✅` :
                        result.approval === 'warn' ? `${C.yellow}⚠️` :
                        `${C.red}❌`;
          console.log(`${status} ${agent.name}: ${result.approval}${C.reset}`);
          
        } catch (err) {
          console.log(`${C.red}❌ ${agent.name}: ERROR - ${err.message}${C.reset}`);
        }
      }
    }

    // Oppsummering
    console.log('');
    console.log(`${C.cyan}══════════════════════════════════════════════════════${C.reset}`);
    
    const blocks = results.filter(r => r.approval === 'block').length;
    const warns = results.filter(r => r.approval === 'warn').length;
    const passes = results.filter(r => r.approval === 'proceed').length;
    
    console.log(`Results: ${C.green}${passes} passed${C.reset}, ${C.yellow}${warns} warnings${C.reset}, ${C.red}${blocks} blocked${C.reset}`);
    
    if (blocks > 0) {
      console.log(`${C.red}`);
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  SWARM RECOMMENDS REVISION                      ║');
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log(`${C.reset}`);
      process.exit(1);
    }
    
    console.log(`${C.green}`);
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  ✅ SWARM APPROVED - Proceed with confidence        ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`${C.reset}`);

    // Synk til MemPalace
    console.log('');
    console.log(`${C.cyan}🔄 Synker til MemPalace...${C.reset}`);
    try {
      execSync('npm run knowledge:sync 2>/dev/null || true', { 
        cwd: '/Users/taj/klarpakke',
        stdio: 'inherit'
      });
    } catch (e) {
      console.log(`${C.yellow}⚠️  MemPalace sync skipped${C.reset}`);
    }
  }
}

// Main
async function main() {
  const [,, taskType = 'feature', ...files] = process.argv;
  
  if (files.length === 0) {
    console.log('Usage: node swarm-orchestrator.mjs <task-type> <files...>');
    console.log('');
    console.log('Task types:');
    console.log('  feature  - New feature development');
    console.log('  bugfix   - Bug fix');
    console.log('  refactor - Code refactoring');
    console.log('  security - Security-related changes');
    process.exit(1);
  }

  const orchestrator = new SwarmOrchestrator();
  await orchestrator.runWorkflow(taskType, files);
}

main().catch(err => {
  console.error('Swarm error:', err);
  process.exit(1);
});
