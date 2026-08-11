#!/usr/bin/env node
/**
 * 🚀 KIMI Smart Launch v3.0 — KIMI Code 0.18.0 Session Orchestrator
 *
 * One command to rule them all:
 *   - Pre-session: Honcho context + skill classification
 *   - Launch: KIMI with optimal skill directory
 *   - Post-session: Self-improve + Honcho sync + verify recommendations
 *
 * Usage:
 *   node scripts/kimi-smart-launch.mjs              # Auto-detect from git
 *   node scripts/kimi-smart-launch.mjs "fix auth"   # One-shot with task
 *   node scripts/kimi-smart-launch.mjs --super      # Force super skill (default)
 *   node scripts/kimi-smart-launch.mjs --architect  # Force architect skill
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
  auth: { name: '🔐 Auth', skillsDir: 'klarpakke-auth', mcp: 'medium' },
  trading: { name: '📈 Trading', skillsDir: 'klarpakke-trading', mcp: 'full' },
  database: { name: '🗄️ Database', skillsDir: 'klarpakke-database', mcp: 'full' },
  frontend: { name: '🎨 Frontend', skillsDir: 'klarpakke-performance', mcp: 'minimal' },
  api: { name: '🔌 API', skillsDir: 'klarpakke-architect', mcp: 'medium' },
  deploy: { name: '🚀 Deploy', skillsDir: 'klarpakke-architect', mcp: 'medium' },
  testing: { name: '🧪 Testing', skillsDir: 'klarpakke-testing', mcp: 'medium' },
  cms: { name: '📝 Sanity', skillsDir: 'klarpakke-architect', mcp: 'medium' },
  mobile: { name: '📱 Mobile', skillsDir: 'klarpakke-performance', mcp: 'medium' },
  general: { name: '🤖 Super', skillsDir: 'klarpakke-super', mcp: 'auto' },
};

const KEYWORDS = {
  auth: ['auth','login','oauth','password','session','guard','jwt','permission','rls','mfa','security','csrf','xss','cookie'],
  trading: ['trading','trade','position','pnl','strategy','bot','order','market','asset','balance','wallet','cron','scheduler'],
  database: ['database','migration','sql','supabase','postgres','table','index','trigger','function','rpc','view','schema'],
  frontend: ['frontend','ui','component','react','nextjs','tailwind','css','page','layout','form','modal','chart','dashboard'],
  api: ['api','endpoint','route','handler','middleware','request','response','server','action','webhook'],
  deploy: ['deploy','fly.io','cloudflare','docker','flyctl','ci','github','action','workflow','build','env','secret','domain','ssl','monitor'],
  testing: ['test','testing','e2e','unit','vitest','playwright','spec','coverage','mock','assert'],
  cms: ['sanity','cms','content','schema','document','groq','studio','webhook','assist'],
  mobile: ['mobile','pwa','responsive','ios','android','lighthouse','viewport','touch'],
};

function log(icon, msg) {
  console.error(`${icon} ${msg}`);
}

function classifyIntent(prompt, modifiedFiles = []) {
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

  // Boost domain scores based on modified files
  const fileBoostPatterns = {
    trading: /trading|auto-trading|bot|strategy|binance/,
    auth: /auth|oauth|session|middleware/,
    database: /migration|supabase|postgres/,
    frontend: /components|page\.tsx|layout/,
    api: /app\/api/,
    testing: /test|spec|e2e|playwright|vitest/,
    deploy: /fly\.io|docker|github|workflow/,
    cms: /sanity|cms|studio/,
  };
  for (const f of modifiedFiles) {
    for (const [domain, pattern] of Object.entries(fileBoostPatterns)) {
      if (pattern.test(f)) scores[domain] = (scores[domain] || 0) + 2;
    }
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

function checkPreviousSession(modifiedFiles) {
  try {
    const sessionDir = resolve(KP_DIR, '.kimi/session-summaries');
    if (!existsSync(sessionDir)) return null;
    const files = execSync(`ls -1t "${sessionDir}" | grep -v current-session | head -10`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    if (!files.length) return null;

    // Look for sessions with overlapping modified files and WIP/NO-GO status
    for (const f of files) {
      const path = resolve(sessionDir, f);
      try {
        const content = readFileSync(path, 'utf-8');
        const hasWip = /status.*WIP|status.*NO-GO/i.test(content);
        if (!hasWip) continue;
        const fileMatch = modifiedFiles.some(mf => content.includes(mf));
        if (fileMatch) {
          return { file: f, content: content.slice(0, 800) + (content.length > 800 ? '\n... [truncated]' : '') };
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return null;
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
  const target = paths[profile] || paths.minimal;
  // Fallback to minimal if target doesn't exist
  if (!existsSync(target)) {
    return paths.minimal;
  }
  return target;
}

function printBanner(text) {
  const line = '═'.repeat(text.length + 4);
  log('', '');
  log('', `╔${line}╗`);
  log('', `║  ${text}  ║`);
  log('', `╚${line}╝`);
  log('', '');
}

function runPreSession(prompt, forcedAgent, forcedMcp) {
  printBanner('🧠 KIMI SMART LAUNCH v3.0');

  const git = fetchGitContext();
  let classification, agent;

  // Auto-detect super agent for large diffs
  let diffStats = { files: 0, lines: 0 };
  try {
    diffStats.files = parseInt(execSync('git diff --name-only | wc -l', { cwd: KP_DIR, encoding: 'utf8' }).trim()) || 0;
    const numstat = execSync('git diff --numstat', { cwd: KP_DIR, encoding: 'utf8' }).trim();
    if (numstat) {
      diffStats.lines = numstat.split('\n').reduce((sum, line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) return sum + (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0);
        return sum;
      }, 0);
    }
  } catch { /* ignore */ }

  if (forcedAgent && AGENTS[forcedAgent]) {
    agent = AGENTS[forcedAgent];
    classification = { domain: forcedAgent, confidence: 10, scores: {} };
    log('🔮', `Agent forced: ${agent.name} (via --${forcedAgent})`);
  } else if (diffStats.files > 10 || diffStats.lines > 200) {
    agent = AGENTS.general;
    classification = { domain: 'general', confidence: 10, scores: {} };
    log('🔮', `Large diff detected (${diffStats.files} files, ${diffStats.lines} lines) → Super Agent`);
  } else {
    classification = classifyIntent(prompt || git.lastCommit || 'general', git.modified);
    agent = AGENTS[classification.domain] || AGENTS.general;
    log('🔮', `Domain detected: ${agent.name} (confidence: ${classification.confidence})`);
  }

  // Session resumption check
  const previousSession = checkPreviousSession(git.modified);
  if (previousSession) {
    log('⏮️', `Previous WIP session found: ${previousSession.file}`);
  }

  // Skriv session-kontekst til fil
  const sessionDir = resolve(KP_DIR, '.kimi/session-summaries');
  if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true });
  const sessionFile = resolve(sessionDir, 'current-session-context.md');

  const sessionContext = `# KIMI Session Context — ${new Date().toISOString()}

## 🎯 Task
${prompt || '(auto-detected from git)'}

## 🧠 Skill
- Domain: ${classification.domain}
- Skill: ${agent.name}
- Skills dir: .kimi/skills/${agent.skillsDir}

## ⚙️ MCP
- Profile: minimal (managed by KIMI Code project config)

## 🔀 Git
- Branch: ${git.branch}
- Commit: ${git.lastCommit}
- Modified: ${git.modified.length} files

${previousSession ? `## ⏮️ Previous Session (WIP/NO-GO)\n\`\`\`\n${previousSession.content}\n\`\`\`\n` : ''}

## 📝 Instructions
1. Use skills-dir: .kimi/skills/${agent.skillsDir}
2. Self-correct after >30 lines
3. Memory sync after task
5. End with status block
${previousSession ? '6. ⏮️ Previous session was WIP/NO-GO — consider continuing from where it left off' : ''}

## 💡 Quick Reference
- Verify: node scripts/verify/verify-claims.mjs
- Swarm: npm run swarm:review
`;

  writeFileSync(sessionFile, sessionContext);

  // Print instruksjoner for brukeren
  log('', '');
  log('🚀', 'READY TO LAUNCH KIMI');
  log('   ', `Skill: ${agent.name} (.kimi/skills/${agent.skillsDir})`);
  log('   ', `MCP:   minimal`);
  log('   ', `Context saved to: ${sessionFile}`);
  log('', '');
  log('💡', 'Start KIMI with:');
  log('   ', `kimi --skills-dir .kimi/skills/${agent.skillsDir}`);
  log('   ', '');
  log('💡', 'Or paste the brief above into your existing KIMI session.');
  log('', '');

  return { agent, sessionFile };
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
    let lineCount = 0;
    try {
      const numstat = execSync('git diff --numstat', { cwd: KP_DIR, encoding: 'utf8' }).trim();
      if (numstat) {
        lineCount = numstat.split('\n').reduce((sum, line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            return sum + (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0);
          }
          return sum;
        }, 0);
      }
    } catch { /* ignore */ }

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

function loadSwarmConfig() {
  try {
    const path = resolve(KP_DIR, '.kimi/swarm-config.json');
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch { return null; }
}

function detectWorkflowType(prompt, modifiedFiles) {
  const p = (prompt || '').toLowerCase();
  const hasBugWords = /fix|bug|error|crash|broken|fiks|feil/.test(p);
  const hasRefactorWords = /refactor|rewrite|restructure|omstruktur/.test(p);
  const hasFeatureWords = /feature|implement|add|new|ny|funksjon/.test(p);

  if (hasBugWords) return 'bugfix';
  if (hasRefactorWords) return 'refactor';
  if (hasFeatureWords) return 'feature';

  // Fallback based on modified files count
  if (modifiedFiles && modifiedFiles.length > 5) return 'feature';
  return 'feature';
}

function buildSwarmBrief(swarmConfig, workflowType, prompt, gitContext, session) {
  const workflow = swarmConfig?.swarm?.workflows?.[workflowType] || ['analyzer', 'tester', 'knowledge'];
  const agents = swarmConfig?.swarm?.agents || [];

  let brief = `# 🐝 SWARM BRIEF — ${workflowType.toUpperCase()} WORKFLOW

Generated: ${new Date().toISOString()}
Task: ${prompt || '(auto-detected)'}
Workflow: ${workflow.join(' → ')}

## 🔀 Git Context
- Branch: ${gitContext.branch}
- Commit: ${gitContext.lastCommit}
- Modified: ${gitContext.modified.length} files
${gitContext.modified.slice(0, 10).map(f => `- ${f}`).join('\n')}
${gitContext.modified.length > 10 ? `- ... and ${gitContext.modified.length - 10} more` : ''}

## 🎯 Agent Sequence

`;

  for (let i = 0; i < workflow.length; i++) {
    const agentId = workflow[i];
    const agentDef = agents.find(a => a.id === agentId);
    brief += `### Step ${i + 1}: ${agentDef?.name || agentId}
**Role:** ${agentDef?.specialty || 'General analysis'}  
**Trigger:** ${agentDef?.trigger || 'manual'}  
**Action:** `;

    switch (agentId) {
      case 'analyzer':
        brief += 'Analyze the codebase changes. Identify complexity, risks, and files that need attention. Output a concise analysis bullet list.\n';
        break;
      case 'architect':
        brief += 'Review against ADRs and architectural patterns. Flag any violations. Suggest structural improvements.\n';
        break;
      case 'tester':
        brief += 'Identify test gaps. Suggest unit tests, edge cases, and e2e scenarios. Do NOT write tests yet — just plan.\n';
        break;
      case 'security':
        brief += 'Audit for security issues: RLS, auth, secrets, input validation. Flag any concerns.\n';
        break;
      case 'knowledge':
        brief += 'Summarize findings. Save key facts to KG with kg_batch. Write diary entry with write_diary.\n';
        break;
      default:
        brief += 'Execute domain-specific analysis.\n';
    }
    brief += '\n';
  }

  brief += `## ✅ Final Checklist
After all steps:
1. Run: \`npm run lint:gate && npm run type-check\`
2. Run: \`npm run test:unit\`
3. If >3 files changed: \`node scripts/verify/verify-claims.mjs\`
4. Save learnings: \`kg_batch\` + \`write_diary\`

## 💡 How to Use This Brief
This is a multi-agent workflow. You can either:
- **Option A:** Execute all steps yourself (recommended for speed)
- **Option B:** Run the relevant domain skill, e.g. \`kimi --skills-dir .kimi/skills/klarpakke-architect\`
`;

  return brief;
}

function runSwarmWorkflow(prompt, forcedMcp) {
  const git = fetchGitContext();
  const workflowType = detectWorkflowType(prompt, git.modified);
  const swarmConfig = loadSwarmConfig();

  printBanner('🐝 SWARM WORKFLOW');
  log('🔮', `Workflow detected: ${workflowType}`);
  log('🐝', `Agents: ${(swarmConfig?.swarm?.workflows?.[workflowType] || []).join(' → ')}`);

  const sessionDir = resolve(KP_DIR, '.kimi/session-summaries');
  if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true });

  const brief = buildSwarmBrief(swarmConfig, workflowType, prompt, git, null);
  const swarmFile = resolve(sessionDir, 'swarm-brief.md');
  writeFileSync(swarmFile, brief);

  log('', '');
  log('📋', '=== SWARM BRIEF ===');
  console.error(brief);
  log('', '=== END BRIEF ===');
  log('', '');
  log('💾', `Swarm brief saved to: ${swarmFile}`);
  log('💡', 'Paste this brief into KIMI, or run a relevant domain skill from .kimi/skills/klarpakke-*');

  return { swarmFile, workflowType };
}

function launchKimi(agent, mcpProfile, swarmMode = false, swarmFile = null) {
  const skillsDir = resolve(KP_DIR, '.kimi/skills', agent.skillsDir);

  const args = [
    '--skills-dir', skillsDir,
    '--work-dir', KP_DIR,
  ];

  if (swarmFile && existsSync(swarmFile)) {
    args.push('--context-file', swarmFile);
  }

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
  const flags = { super: false, architect: false, auth: false, autoLaunch: false, swarm: false };
  let prompt = '';
  let forcedMcp = null;

  for (const arg of args) {
    if (arg === '--super') flags.super = true;
    else if (arg === '--architect') flags.architect = true;
    else if (arg === '--auth') flags.auth = true;
    else if (arg === '--launch') flags.autoLaunch = true;
    else if (arg === '--swarm') flags.swarm = true;
    else if (arg.startsWith('--mcp=')) forcedMcp = arg.split('=')[1];
    else prompt += arg + ' ';
  }
  prompt = prompt.trim();

  // Swarm mode
  if (flags.swarm) {
    const swarmResult = runSwarmWorkflow(prompt, forcedMcp);
    if (flags.autoLaunch) {
      log('🚀', 'Swarm mode: launching with super agent + swarm brief');
      launchKimi(AGENTS.general, forcedMcp || 'auto', true, swarmResult.swarmFile);
    } else {
      log('ℹ️', 'Swarm brief generated. Re-run with --launch --swarm to start KIMI with brief');
    }
    return;
  }

  // Resolve forced agent
  const forcedAgent = flags.architect ? 'database' : flags.auth ? 'auth' : flags.super ? 'general' : null;

  // Pre-session
  const session = runPreSession(prompt, forcedAgent, forcedMcp);

  // Hvis --launch flagg, start KIMI automatisk
  if (flags.autoLaunch) {
    launchKimi(session.agent, 'minimal');
  } else {
    log('ℹ️', 'Pre-session complete. Start KIMI manually or re-run with --launch');
  }
}

main();
