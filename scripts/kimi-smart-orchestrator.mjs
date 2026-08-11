#!/usr/bin/env node
/**
 * 🤖 KIMI Smart Orchestrator v2.0 — KIMI Code 0.18.0
 *
 * Analyserer brukerens prompt, velger riktig skill/MCP-profil,
 * og genererer en "Smart Brief" som limes inn i KIMI ved oppstart.
 *
 * Bruk:
 *   node scripts/kimi-smart-orchestrator.mjs "din oppgave"
 *   # eller via wrapper:
 *   kimi-smart "din oppgave"
 *
 * Output: En brief du limer inn i KIMI, pluss instruksjoner for
 *         agent-valg og MCP-profil.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const home = process.env.HOME || '/Users/taj';

// ─── KONFIGURASJON ───
const AGENTS = {
  auth: {
    skillsDir: '.kimi/skills/klarpakke-auth',
    cmd: 'kimi --skills-dir .kimi/skills/klarpakke-auth',
    patterns: ['auth', 'oauth', 'session', 'login', 'password', 'jwt', 'rls', 'middleware', 'callback', 'supabase auth', 'signin', 'signup'],
    mcp: 'minimal',
    description: '🔐 Auth & Security',
    color: '\x1b[35m'
  },
  trading: {
    skillsDir: '.kimi/skills/klarpakke-trading',
    cmd: 'kimi --skills-dir .kimi/skills/klarpakke-trading',
    patterns: ['trading', 'trade', 'position', 'pnl', 'strategy', 'bot', 'session', 'binance', 'order', 'portfolio', 'grid', 'dca'],
    mcp: 'medium',
    description: '📈 Trading Engine',
    color: '\x1b[32m'
  },
  database: {
    skillsDir: '.kimi/skills/klarpakke-database',
    cmd: 'kimi --skills-dir .kimi/skills/klarpakke-database',
    patterns: ['supabase', 'migration', 'schema', 'sql', 'rpc', 'table', 'index', 'trigger', 'database', 'postgres', 'column', 'function'],
    mcp: 'medium',
    description: '🗄️ Database & Schema',
    color: '\x1b[34m'
  },
  sanity: {
    skillsDir: '.kimi/skills/klarpakke-architect',
    cmd: 'kimi --skills-dir .kimi/skills/klarpakke-architect',
    patterns: ['sanity', 'cms', 'studio', 'groq', 'schema', 'document', 'webhook', 'content', 'portable text'],
    mcp: 'minimal',
    description: '📝 Sanity CMS',
    color: '\x1b[36m'
  },
  testing: {
    skillsDir: '.kimi/skills/klarpakke-testing',
    cmd: 'kimi --skills-dir .kimi/skills/klarpakke-testing',
    patterns: ['test', 'spec', 'e2e', 'playwright', 'vitest', 'lighthouse', 'a11y', 'accessibility', 'coverage', 'bug', 'feil'],
    mcp: 'medium',
    description: '🧪 Testing & QA',
    color: '\x1b[33m'
  },
  frontend: {
    skillsDir: '.kimi/skills/klarpakke-performance',
    cmd: 'kimi --skills-dir .kimi/skills/klarpakke-performance',
    patterns: ['component', 'tsx', 'page', 'layout', 'tailwind', 'css', 'ui', 'design', 'responsive', 'theme', 'hero', 'card'],
    mcp: 'minimal',
    description: '🎨 Frontend & UI',
    color: '\x1b[35m'
  },
  deploy: {
    skillsDir: '.kimi/skills/klarpakke-architect',
    cmd: 'kimi --skills-dir .kimi/skills/klarpakke-architect',
    patterns: ['deploy', 'cloudflare', 'github', 'action', 'workflow', 'ci', 'cd', 'production', 'build', 'pipeline'],
    mcp: 'medium',
    description: '🚀 Deploy & CI/CD',
    color: '\x1b[31m'
  },
  architect: {
    skillsDir: '.kimi/skills/klarpakke-architect',
    cmd: 'kimi --skills-dir .kimi/skills/klarpakke-architect',
    patterns: ['architect', 'design', 'adr', 'pattern', 'refactor', 'structure', 'api contract', 'modernize'],
    mcp: 'full',
    description: '🏗️ Lead Architect',
    color: '\x1b[34m'
  }
};

const DEFAULT_AGENT = 'architect';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(icon, msg) {
  console.error(`${icon} ${msg}`);
}

function normalize(text) {
  return text.toLowerCase()
    .replace(/[æå]/g, 'a')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── 1. PROMPT-KLASSIFISERING ───
function classifyPrompt(prompt) {
  const normalized = normalize(prompt);
  const words = normalized.split(/\s+/);
  const scores = {};

  for (const [agentKey, config] of Object.entries(AGENTS)) {
    scores[agentKey] = 0;
    for (const pattern of config.patterns) {
      const patternWords = pattern.split(/\s+/);
      for (const pw of patternWords) {
        if (words.includes(pw)) scores[agentKey] += 3;
        else if (words.some(w => w.includes(pw) || pw.includes(w) && pw.length > 3)) scores[agentKey] += 1;
      }
      if (normalized.includes(pattern)) scores[agentKey] += 5;
    }
  }

  // Boost fra git-diff
  try {
    const gitFiles = execSync('git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null', { cwd: root, encoding: 'utf8' });
    for (const [agentKey, config] of Object.entries(AGENTS)) {
      for (const pattern of config.patterns) {
        if (gitFiles.toLowerCase().includes(pattern)) scores[agentKey] += 2;
      }
    }
  } catch { /* ignore */ }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];

  if (!best || best[1] === 0) {
    return { agent: DEFAULT_AGENT, confidence: 0, scores, sorted };
  }

  const runnerUp = sorted[1];
  if (runnerUp && best[1] - runnerUp[1] <= 2) {
    return { agent: DEFAULT_AGENT, confidence: best[1], runnerUp: runnerUp[0], scores, sorted };
  }

  return { agent: best[0], confidence: best[1], runnerUp: runnerUp?.[0], scores, sorted };
}


function buildSmartBrief(prompt, classification) {
  const agent = AGENTS[classification.agent];
  const lines = [];

  lines.push(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  lines.push(`${agent?.color || ''}${BOLD}  🤖 KIMI SMART BRIEF  ${RESET}`);
  lines.push(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  lines.push('');

  // Oppgave
  lines.push(`${BOLD}🎯 Oppgave:${RESET} ${prompt}`);
  lines.push('');

  // Anbefalt agent
  lines.push(`${BOLD}🤖 Anbefalt Agent:${RESET} ${agent?.description || classification.agent}`);
  lines.push(`   ${BOLD}Kommando:${RESET} ${agent?.cmd || 'kimi'}`);
  lines.push(`   ${BOLD}MCP-profil:${RESET} ${agent?.mcp || 'minimal'}`);
  lines.push(`   ${BOLD}Konfidens:${RESET} ${classification.confidence}/30`);
  if (classification.runnerUp) {
    lines.push(`   ${BOLD}Runner-up:${RESET} ${AGENTS[classification.runnerUp]?.description || classification.runnerUp}`);
  }
  lines.push('');

  // Andre agent-score
  lines.push(`${BOLD}📊 Agent-scores:${RESET}`);
  for (const [key, score] of classification.sorted.slice(0, 5)) {
    if (score === 0) continue;
    const cfg = AGENTS[key];
    const marker = key === classification.agent ? '→' : ' ';
    lines.push(`   ${marker} ${cfg?.description || key}: ${score}`);
  }
  lines.push('');

  // Git-kontekst
  try {
    const branch = execSync('git branch --show-current 2>/dev/null', { cwd: root, encoding: 'utf8' }).trim();
    const lastCommit = execSync('git log -1 --pretty=%s 2>/dev/null', { cwd: root, encoding: 'utf8' }).trim();
    const modified = execSync('git diff --name-only 2>/dev/null | head -8', { cwd: root, encoding: 'utf8' }).trim();

    lines.push(`${BOLD}📁 Git Kontekst:${RESET}`);
    lines.push(`   Branch: ${branch}`);
    lines.push(`   Siste: ${lastCommit}`);
    if (modified) {
      lines.push(`   Endret:`);
      for (const f of modified.split('\n').filter(Boolean)) {
        lines.push(`     • ${f}`);
      }
    }
    lines.push('');
  } catch { /* ignore */ }

  // Kritiske regler
  try {
    const agentsMd = readFileSync(resolve(root, '.kimi/AGENTS.md'), 'utf8');
    const rulesMatch = agentsMd.match(/## [^\n]*?(Regler?|Rules?)[^\n]*\n([\s\S]{0,800})/i);
    if (rulesMatch) {
      lines.push(`${BOLD}📋 Kritiske Regler (fra AGENTS.md):${RESET}`);
      const ruleLines = rulesMatch[2].split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('|')).slice(0, 8);
      for (const rl of ruleLines) {
        lines.push(`   ${rl.trim()}`);
      }
      lines.push('');
    }
  } catch { /* ignore */ }

  // Siste auto-optimizer
  try {
    const reportFile = execSync('ls -t .kimi/session-summaries/auto-optimizer-*.md 2>/dev/null | head -1', { cwd: root, encoding: 'utf8' }).trim();
    if (reportFile) {
      const report = readFileSync(resolve(root, reportFile), 'utf8');
      const summary = report.match(/- Kritiske funn: (\d+).*?- Advarsler: (\d+)/s);
      if (summary) {
        lines.push(`${BOLD}📋 Siste Auto-Optimizer:${RESET} ${summary[1]} kritiske, ${summary[2]} advarsler`);
        lines.push('');
      }
    }
  } catch { /* ignore */ }

  lines.push(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  lines.push('');
  lines.push(`${BOLD}💡 Neste steg:${RESET}`);
  lines.push(`   1. Kopier briefen over (eller referer @.kimi/session-summaries/smart-context-latest.md)`);
  lines.push(`   2. Start KIMI med: ${agent?.cmd || 'kimi'}`);
  lines.push(`   3. Lim inn briefen + din oppgave`);
  lines.push('');

  return lines.join('\n');
}

// ─── 4. HOVEDFUNKSJON ───
function main() {
  const prompt = process.argv.slice(2).join(' ');

  if (!prompt) {
    console.error('❌ Ingen prompt gitt. Bruk: kimi-smart "din oppgave"');
    process.exit(1);
  }

  const classification = classifyPrompt(prompt);
  const brief = buildSmartBrief(prompt, classification);

  // Skriv brief til stdout OG til fil
  console.log(brief);

  // Lagre til fil
  const contextDir = resolve(root, '.kimi', 'session-summaries');
  if (!existsSync(contextDir)) mkdirSync(contextDir, { recursive: true });

  const timestamp = Date.now();
  const contextPath = resolve(contextDir, `smart-context-${timestamp}.md`);
  const latestPath = resolve(contextDir, 'smart-context-latest.md');

  writeFileSync(contextPath, brief);
  writeFileSync(latestPath, brief);

  console.error(`\n✅ Brief lagret: .kimi/session-summaries/smart-context-latest.md`);

  // Logg valgt MCP-profil (KIMI Code 0.18.0 bruker prosjektets MCP-konfigurasjon)
  const agent = AGENTS[classification.agent];
  if (agent?.mcp) {
    console.error(`ℹ️ MCP-profil: ${agent.mcp} (styres av KIMI Code prosjektkonfigurasjon)`);
  }
}

main();
