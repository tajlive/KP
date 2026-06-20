#!/usr/bin/env node
/**
 * 🧠 KIMI Smart Brief v2.0 — KIMI Code 0.18.0
 *
 * Genererer et paste-ready pre-start brief for KIMI.
 * Klassifiserer intensjon, velger skill/MCP-profil,
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
    skillsDir: 'klarpakke-auth',
    weight: ['auth','login','oauth','password','session','guard','jwt','permission','rls','mfa','security','csrf','xss','cookie'],
  },
  trading: {
    name: '📈 Trading Engine',
    skillsDir: 'klarpakke-trading',
    weight: ['trading','trade','position','pnl','strategy','bot','order','market','asset','balance','wallet','cron','scheduler'],
  },
  database: {
    name: '🗄️ Database & Migrations',
    skillsDir: 'klarpakke-database',
    weight: ['database','migration','sql','supabase','postgres','table','index','trigger','function','rpc','view','schema','rls'],
  },
  frontend: {
    name: '🎨 Frontend & UI',
    skillsDir: 'klarpakke-performance',
    weight: ['frontend','ui','component','react','nextjs','tailwind','css','page','layout','form','modal','chart','dashboard'],
  },
  api: {
    name: '🔌 API & Backend',
    skillsDir: 'klarpakke-architect',
    weight: ['api','endpoint','route','handler','middleware','request','response','server','action','webhook','rpc'],
  },
  deploy: {
    name: '🚀 Deploy & DevOps',
    skillsDir: 'klarpakke-architect',
    weight: ['deploy','vercel','ci','github','action','workflow','build','env','secret','domain','ssl','monitor'],
  },
  testing: {
    name: '🧪 Testing & QA',
    skillsDir: 'klarpakke-testing',
    weight: ['test','testing','e2e','unit','vitest','playwright','spec','coverage','mock','assert'],
  },
  cms: {
    name: '📝 Sanity CMS',
    skillsDir: 'klarpakke-architect',
    weight: ['sanity','cms','content','schema','document','groq','studio','webhook','assist'],
  },
  mobile: {
    name: '📱 Mobile & PWA',
    skillsDir: 'klarpakke-performance',
    weight: ['mobile','pwa','responsive','ios','android','lighthouse','viewport','touch','sw'],
  },
  general: {
    name: '🤖 General (Architect)',
    skillsDir: 'klarpakke-architect',
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

  // Smart commands relevant for skill
  const smartCommands = {
    auth: ['kimi --skills-dir .kimi/skills/klarpakke-auth', 'npm run oauth:check'],
    trading: ['kimi --skills-dir .kimi/skills/klarpakke-trading', 'npm run cron:verify', 'npm run db:status'],
    database: ['kimi --skills-dir .kimi/skills/klarpakke-database', 'npm run db:validate-migrations', 'npm run db:status'],
    frontend: ['kimi --skills-dir .kimi/skills/klarpakke-performance', 'npm run lint', 'npm run type-check'],
    api: ['kimi --skills-dir .kimi/skills/klarpakke-architect', 'npm run lint:gate', 'npm run test:unit'],
    deploy: ['kimi --skills-dir .kimi/skills/klarpakke-architect', 'npm run deploy:prod', 'npm run health:prod:gate'],
    testing: ['kimi --skills-dir .kimi/skills/klarpakke-testing', 'npm run test:unit', 'npm run test:e2e:critical:chromium'],
    cms: ['kimi --skills-dir .kimi/skills/klarpakke-architect', 'npm run sanity:verify', 'npm run sanity:guard'],
    mobile: ['kimi --skills-dir .kimi/skills/klarpakke-performance', 'npm run test:e2e:critical:chromium'],
    general: ['kimi --skills-dir .kimi/skills/klarpakke-architect', 'npm run verify'],
  };

  const brief = `
# 🤖 KIMI Smart Brief — ${now}

## 🎯 Oppgave
${prompt}

## 🧠 Anbefalt Skill
**${agent.name}** (confidence: ${classification.confidence})
\`\`\`bash
kimi --skills-dir .kimi/skills/${agent.skillsDir}
\`\`\`
${classification.runnerUp ? `\nRunner-up: ${AGENTS[classification.runnerUp]?.name || classification.runnerUp}` : ''}

## ⚙️ MCP-Profil
**${mcpProfile}** (styres av KIMI Code prosjektkonfigurasjon)

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
