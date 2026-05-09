#!/usr/bin/env node
/**
 * 🚀 KIMI Smart Launch v2.0 — Complete Session Orchestrator
 *
 * One command to rule them all:
 *   - Pre-session: MemPalace context + agent classification + MCP selection
 *   - Launch: KIMI with optimal agent + MCP profile
 *   - Post-session: Self-improve + MemPalace sync + verify recommendations
 *
 * Usage:
 *   node scripts/kimi-smart-launch.mjs              # Auto-detect from git
 *   node scripts/kimi-smart-launch.mjs "fix auth"   # One-shot with task
 *   node scripts/kimi-smart-launch.mjs --super      # Force super-agent (default)
 *   node scripts/kimi-smart-launch.mjs --architect  # Force architect
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const root = process.cwd();
const home = homedir();
const KP_DIR = root.includes('klarpakke') ? root : '/Users/taj/klarpakke';

// ─── CONFIG ───
const AGENTS = {
  auth: { name: '🔐 Auth', yaml: 'auth-agent.yaml', mcp: 'medium' },
  trading: { name: '📈 Trading', yaml: 'klarpakke-live-trading-trades-agent.yaml', mcp: 'full' },
  database: { name: '🗄️ Database', yaml: 'klarpakke-architect-agent.yaml', mcp: 'full' },
  frontend: { name: '🎨 Frontend', yaml: 'klarpakke-ux-ui-agent.yaml', mcp: 'minimal' },
  api: { name: '🔌 API', yaml: 'klarpakke-architect-agent.yaml', mcp: 'medium' },
  deploy: { name: '🚀 Deploy', yaml: 'klarpakke-architect-agent.yaml', mcp: 'medium' },
  testing: { name: '🧪 Testing', yaml: 'klarpakke-qa-agent.yaml', mcp: 'medium' },
  cms: { name: '📝 Sanity', yaml: 'sanity-agent.yaml', mcp: 'medium' },
  mobile: { name: '📱 Mobile', yaml: 'mobile-check-agent.yaml', mcp: 'medium' },
  general: { name: '🤖 Super', yaml: 'klarpakke-super-agent.yaml', mcp: 'auto' },
};

const KEYWORDS = {
  auth: ['auth','login','oauth','password','session','guard','jwt','permission','rls','mfa','security','csrf','xss','cookie'],
  trading: ['trading','trade','position','pnl','strategy','bot','order','market','asset','balance','wallet','cron','scheduler'],
  database: ['database','migration','sql','supabase','postgres','table','index','trigger','function','rpc','view','schema'],
  frontend: ['frontend','ui','component','react','nextjs','tailwind','css','page','layout','form','modal','chart','dashboard'],
  api: ['api','endpoint','route','handler','middleware','request','response','server','action','webhook'],
  deploy: ['deploy','vercel','ci','github','action','workflow','build','env','secret','domain','ssl','monitor'],
  testing: ['test','testing','e2e','unit','vitest','playwright','spec','coverage','mock','assert'],
  cms: ['sanity','cms','content','schema','document','groq','studio','webhook','assist'],
  mobile: ['mobile','pwa','responsive','ios','android','lighthouse','viewport','touch'],
};

function log(icon, msg) {
  console.error(`${icon} ${msg}`);
}

function classifyIntent(prompt) {
  const words = prompt.toLowerCase().split(/\s+/);
  const scores = {};
  for (const [domain, kws] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const w of words) {
      for (const kw of kws) {
        if (w.includes(kw) || kw.includes(w)) score++;
      }
    }
    scores[domain] = score;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [top, topScore] = sorted[0];
  return { domain: top, confidence: topScore, scores };
}

function fetchGitContext() {
  try {
    const branch = execSync('git branch --show-current', { cwd: KP_DIR, encoding: 'utf8' }).trim();
    const lastCommit = execSync('git log -1 --oneline', { cwd: KP_DIR, encoding: 'utf8' }).trim();
    const modified = execSync('git diff --name-only', { cwd: KP_DIR, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    return { branch, lastCommit, modified };
  } catch {
    return { branch: 'unknown', lastCommit: 'unknown', modified: [] };
  }
}

function fetchMemPalaceBrief(query) {
  try {
    const brief = execSync(
      `node "${KP_DIR}/scripts/kimi-smart-brief.mjs" "${query.replace(/"/g, '\\"')}" 2>&1`,
      { cwd: KP_DIR, encoding: 'utf8', timeout: 5000 }
    );
    return brief;
  } catch (e) {
    return null;
  }
}

function detectMcpProfile() {
  // Sjekk hvilken profil som er aktiv
  try {
    const active = execSync('kimi-mcp status 2>/dev/null || echo "unknown"', { encoding: 'utf8' }).trim();
    if (active.includes('minimal')) return 'minimal';
    if (active.includes('medium')) return 'medium';
    if (active.includes('full')) return 'full';
  } catch { /* ignore */ }
  return 'minimal';
}

function getMcpConfigPath(profile) {
  const paths = {
    minimal: `${KP_DIR}/.mcp/mcp_config.json`,
    medium: `${KP_DIR}/.mcp/mcp_config.medium.json`,
    full: `${KP_DIR}/.mcp/mcp_config.full.json`,
  };
  return paths[profile] || paths.minimal;
}

function printBanner(text) {
  const line = '═'.repeat(text.length + 4);
  log('', '');
  log('', `╔${line}╗`);
  log('', `║  ${text}  ║`);
  log('', `╚${line}╝`);
  log('', '');
}

function runPreSession(prompt, forcedAgent) {
  printBanner('🧠 KIMI SMART LAUNCH v2.0');

  const git = fetchGitContext();
  let classification, agent;

  if (forcedAgent && AGENTS[forcedAgent]) {
    agent = AGENTS[forcedAgent];
    classification = { domain: forcedAgent, confidence: 10, scores: {} };
    log('🔮', `Agent forced: ${agent.name} (via --${forcedAgent})`);
  } else {
    classification = classifyIntent(prompt || git.lastCommit || 'general');
    agent = AGENTS[classification.domain] || AGENTS.general;
    log('🔮', `Domain detected: ${agent.name} (confidence: ${classification.confidence})`);
  }

  // MemPalace brief
  log('🧠', 'Fetching MemPalace context...');
  const brief = fetchMemPalaceBrief(prompt || git.lastCommit || 'general');

  // Velg MCP-profil
  const currentMcp = detectMcpProfile();
  const targetMcp = agent.mcp;
  log('⚙️', `MCP Profile: ${currentMcp} → target: ${targetMcp}`);

  if (currentMcp !== targetMcp && targetMcp !== 'auto') {
    log('⚠️', `Run: kimi-mcp ${targetMcp} (before starting KIMI)`);
  }

  // Git-kontekst
  log('🔀', `Branch: ${git.branch} | Last: ${git.lastCommit}`);
  if (git.modified.length > 0) {
    log('📁', `Modified files (${git.modified.length}):`);
    for (const f of git.modified.slice(0, 5)) {
      log('   ', `  - ${f}`);
    }
    if (git.modified.length > 5) log('   ', `  ... and ${git.modified.length - 5} more`);
  }

  // Skriv session-kontekst til fil
  const sessionDir = resolve(KP_DIR, '.kimi/session-summaries');
  if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true });
  const sessionFile = resolve(sessionDir, 'current-session-context.md');

  const sessionContext = `# KIMI Session Context — ${new Date().toISOString()}

## 🎯 Task
${prompt || '(auto-detected from git)'}

## 🧠 Agent
- Domain: ${classification.domain}
- Agent: ${agent.name}
- File: .kimi/agents/${agent.yaml}

## ⚙️ MCP
- Current: ${currentMcp}
- Target: ${targetMcp}

## 🔀 Git
- Branch: ${git.branch}
- Commit: ${git.lastCommit}
- Modified: ${git.modified.length} files

## 📝 Instructions
1. MemPalace search already attempted — results above
2. Use agent: ${agent.yaml}
3. Self-correct after >30 lines
4. Memory sync after task
5. End with status block

## 💡 Quick Reference
- MCP switch: kimi-mcp ${targetMcp}
- Verify: node scripts/verify/verify-claims.mjs
- Swarm: npm run swarm:review
`;

  writeFileSync(sessionFile, sessionContext);

  // Print brief hvis tilgjengelig
  if (brief) {
    log('', '');
    log('📋', '=== MEMPALACE BRIEF ===');
    console.error(brief);
    log('', '=== END BRIEF ===');
  }

  // Print instruksjoner for brukeren
  log('', '');
  log('🚀', 'READY TO LAUNCH KIMI');
  log('   ', `Agent: ${agent.name} (.kimi/agents/${agent.yaml})`);
  log('   ', `MCP:   ${targetMcp} (current: ${currentMcp})`);
  log('   ', `Context saved to: ${sessionFile}`);
  log('', '');
  log('💡', 'Start KIMI with:');
  log('   ', `kimi --agent-file .kimi/agents/${agent.yaml} --mcp-config-file ${getMcpConfigPath(targetMcp)}`);
  log('   ', '');
  log('💡', 'Or paste the brief above into your existing KIMI session.');
  log('', '');

  return { agent, targetMcp, sessionFile };
}

function runPostSession() {
  log('', '');
  printBanner('🔄 POST-SESSION ANALYSIS');

  // Self-improve
  try {
    execSync(`node "${KP_DIR}/scripts/kimi-self-improve.mjs" 2>&1`, {
      cwd: KP_DIR, stdio: 'inherit', timeout: 10000
    });
  } catch { /* ignore */ }

  // Git-diff analyse
  try {
    const fileCount = parseInt(execSync('git diff --name-only | wc -l', { cwd: KP_DIR, encoding: 'utf8' }).trim()) || 0;
    const lineCount = parseInt(execSync('git diff --numstat | awk "{sum+=$1+$2} END {print sum+0}"', { cwd: KP_DIR, encoding: 'utf8' }).trim()) || 0;

    if (fileCount > 0) {
      log('📊', `Changes: ${fileCount} files, ${lineCount} lines`);
      if (fileCount > 3 || lineCount > 50) {
        log('⚠️',  'Recommended: node scripts/verify/verify-claims.mjs');
      }
      if (fileCount > 5 || lineCount > 100) {
        log('🐝',  'Recommended: npm run swarm:review');
      }
      log('✅', 'Recommended: npm run lint && npm run type-check && npm run test:unit');
    }
  } catch { /* ignore */ }
}

function launchKimi(agent, mcpProfile) {
  const agentPath = resolve(KP_DIR, '.kimi/agents', agent.yaml);
  const mcpPath = getMcpConfigPath(mcpProfile);

  const args = [
    '--agent-file', agentPath,
    '--mcp-config-file', mcpPath,
    '--work-dir', KP_DIR,
  ];

  log('🚀', `Launching: kimi ${args.join(' ')}`);
  log('', '');

  const child = spawn('kimi', args, {
    stdio: 'inherit',
    cwd: KP_DIR,
    env: { ...process.env, KIMI_SMART_LAUNCH: '1' }
  });

  child.on('exit', (code) => {
    runPostSession();
    process.exit(code || 0);
  });
}

// ─── MAIN ───
function main() {
  const args = process.argv.slice(2);
  const flags = { super: false, architect: false, auth: false, autoLaunch: false };
  let prompt = '';

  for (const arg of args) {
    if (arg === '--super') flags.super = true;
    else if (arg === '--architect') flags.architect = true;
    else if (arg === '--auth') flags.auth = true;
    else if (arg === '--launch') flags.autoLaunch = true;
    else prompt += arg + ' ';
  }
  prompt = prompt.trim();

  // Resolve forced agent
  const forcedAgent = flags.architect ? 'database' : flags.auth ? 'auth' : flags.super ? 'general' : null;

  // Pre-session
  const session = runPreSession(prompt, forcedAgent);

  // Hvis --launch flagg, start KIMI automatisk
  if (flags.autoLaunch) {
    launchKimi(session.agent, session.targetMcp);
  } else {
    log('ℹ️', 'Pre-session complete. Start KIMI manually or re-run with --launch');
  }
}

main();
