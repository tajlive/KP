#!/usr/bin/env node
/**
 * 🧠 KIMI Smart Brief v1.1
 *
 * Genererer et paste-ready pre-start brief for KIMI.
 * Klassifiserer intensjon, velger agent/MCP-profil,
 * henter MemPalace-kontekst, og outputter markdown.
 *
 * Bruk: node scripts/kimi-smart-brief.mjs "din oppgave her"
 *       node scripts/kimi-smart-brief.mjs  # auto-detect fra git
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();

const AGENTS = {
  auth: {
    name: '🔐 Auth & Security',
    yaml: 'auth-agent.yaml',
    weight: ['auth','login','oauth','password','session','guard','jwt','permission','rls','mfa','security','csrf','xss','cookie'],
  },
  trading: {
    name: '📈 Trading Engine',
    yaml: 'klarpakke-live-trading-trades-agent.yaml',
    weight: ['trading','trade','position','pnl','strategy','bot','order','market','asset','balance','wallet','cron','scheduler'],
  },
  database: {
    name: '🗄️ Database & Migrations',
    yaml: 'klarpakke-architect-agent.yaml',
    weight: ['database','migration','sql','supabase','postgres','table','index','trigger','function','rpc','view','schema','rls'],
  },
  frontend: {
    name: '🎨 Frontend & UI',
    yaml: 'klarpakke-ux-ui-agent.yaml',
    weight: ['frontend','ui','component','react','nextjs','tailwind','css','page','layout','form','modal','chart','dashboard'],
  },
  api: {
    name: '🔌 API & Backend',
    yaml: 'klarpakke-architect-agent.yaml',
    weight: ['api','endpoint','route','handler','middleware','request','response','server','action','webhook','rpc'],
  },
  deploy: {
    name: '🚀 Deploy & DevOps',
    yaml: 'klarpakke-architect-agent.yaml',
    weight: ['deploy','vercel','ci','github','action','workflow','build','env','secret','domain','ssl','monitor'],
  },
  testing: {
    name: '🧪 Testing & QA',
    yaml: 'klarpakke-qa-agent.yaml',
    weight: ['test','testing','e2e','unit','vitest','playwright','spec','coverage','mock','assert'],
  },
  cms: {
    name: '📝 Sanity CMS',
    yaml: 'sanity-agent.yaml',
    weight: ['sanity','cms','content','schema','document','groq','studio','webhook','assist'],
  },
  mobile: {
    name: '📱 Mobile & PWA',
    yaml: 'mobile-check-agent.yaml',
    weight: ['mobile','pwa','responsive','ios','android','lighthouse','viewport','touch','sw'],
  },
  general: {
    name: '🤖 General (Architect)',
    yaml: 'klarpakke-architect-agent.yaml',
    weight: ['refactor','fix','bug','error','clean','optimize','improve','update','remove','delete','add','create'],
  },
};

const MCP_PROFILES = {
  auth: 'medium',
  trading: 'full',
  database: 'full',
  frontend: 'minimal',
  api: 'medium',
  deploy: 'medium',
  testing: 'medium',
  cms: 'medium',
  mobile: 'medium',
  general: 'auto',
};

function classifyIntent(prompt) {
  const words = prompt.toLowerCase().split(/\s+/);
  const scores = {};

  for (const [key, agent] of Object.entries(AGENTS)) {
    let score = 0;
    for (const w of words) {
      for (const kw of agent.weight) {
        if (w.includes(kw) || kw.includes(w)) score++;
      }
    }
    scores[key] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topKey, topScore] = sorted[0];
  const runnerUp = sorted[1];

  return {
    agent: topKey,
    confidence: topScore,
    runnerUp: runnerUp && runnerUp[1] > 0 ? runnerUp[0] : null,
    scores: Object.fromEntries(sorted),
  };
}

function fetchGitContext() {
  try {
    const branch = execSync('git branch --show-current', { cwd: root, encoding: 'utf8' }).trim();
    const lastCommit = execSync('git log -1 --oneline', { cwd: root, encoding: 'utf8' }).trim();
    const modified = execSync('git diff --name-only', { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);

    return { branch, lastCommit, modified, untracked };
  } catch {
    return { branch: 'unknown', lastCommit: 'unknown', modified: [], untracked: [] };
  }
}

function fetchMemPalaceContext(query) {
  try {
    const result = execSync(
      `node scripts/run-mempalace-mcp-v3.mjs query "${query.replace(/"/g, '\\"')}" 2>/dev/null || true`,
      { cwd: root, encoding: 'utf8', timeout: 3000 }
    );
    return result.trim() || null;
  } catch {
    return null;
  }
}

function generateBrief(prompt) {
  const git = fetchGitContext();
  const classification = classifyIntent(prompt);
  const agent = AGENTS[classification.agent];
  const mcpProfile = MCP_PROFILES[classification.agent];

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // MemPalace context
  let memContext = '';
  try {
    const mp = fetchMemPalaceContext(prompt);
    if (mp) memContext = mp;
  } catch { /* ignore */ }

  // Smart commands relevant for agent
  const smartCommands = {
    auth: ['kimi auth', 'npm run oauth:check'],
    trading: ['npm run cron:verify', 'npm run db:status'],
    database: ['npm run db:validate-migrations', 'npm run db:status'],
    frontend: ['npm run lint', 'npm run type-check'],
    api: ['npm run lint:gate', 'npm run test:unit'],
    deploy: ['npm run deploy:prod', 'npm run health:prod:gate'],
    testing: ['npm run test:unit', 'npm run test:e2e:critical:chromium'],
    cms: ['npm run sanity:verify', 'npm run sanity:guard'],
    mobile: ['npm run test:e2e:critical:chromium'],
    general: ['npm run verify'],
  };

  const brief = `
# 🤖 KIMI Smart Brief — ${now}

## 🎯 Oppgave
${prompt}

## 🧠 Anbefalt Agent
**${agent.name}** (confidence: ${classification.confidence})
\`\`\`bash
kimi --agent-file .kimi/agents/${agent.yaml}
# eller alias: kimi ${classification.agent}
\`\`\`
${classification.runnerUp ? `\nRunner-up: ${AGENTS[classification.runnerUp]?.name || classification.runnerUp}` : ''}

## ⚙️ MCP-Profil
**${mcpProfile}** — bytt med: \`kimi-mcp ${mcpProfile}\`

## 🔀 Git Kontekst
- Branch: **${git.branch}**
- Siste commit: \`${git.lastCommit}\`
- Endrede filer (${git.modified.length}):${git.modified.length ? '\n  - ' + git.modified.join('\n  - ') : ' ingen'}
- Untracked (${git.untracked.length}):${git.untracked.length ? '\n  - ' + git.untracked.join('\n  - ') : ' ingen'}

${memContext ? `## 🧠 MemPalace Kontekst\n${memContext}\n` : ''}

## ⚡ Smarte Kommandoer
\`\`\`bash
${(smartCommands[classification.agent] || []).join('\n')}
\`\`\`

## 📝 Klar til KIMI
Lim dette inn i KIMI for optimal kontekst.
---
`;

  // Save to session summaries
  const summariesDir = resolve(root, '.kimi/session-summaries');
  if (!existsSync(summariesDir)) mkdirSync(summariesDir, { recursive: true });
  const ts = Date.now();
  writeFileSync(resolve(summariesDir, `smart-context-${ts}.md`), brief);

  return brief;
}

// ─── MAIN ───
const prompt = process.argv.slice(2).join(' ').trim();

if (!prompt) {
  console.error('Usage: kimi-smart-brief "din oppgave her"');
  console.error('   or: kimi-smart-brief     # auto-detect (ikke implementert ennå)');
  process.exit(1);
}

const brief = generateBrief(prompt);
console.log(brief);
