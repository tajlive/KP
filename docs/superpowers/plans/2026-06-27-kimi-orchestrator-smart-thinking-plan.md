# KIMI Orchestrator v3.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repository-only orchestrator CLI (`scripts/kimi-orchestrator.mjs`) that generates paste-ready KIMI briefs with mandatory web-search queries, automatic domain/skill selection, and ordered sub-agent plans.

**Architecture:** A single Node.js CLI parses the task, classifies the domain using keyword overlap, expands domain-specific web-search queries, selects sub-agents, and assembles a markdown prompt from a template. Registries (domains, agents, search patterns) live as JSON under `.kimi/orchestrator/` so they are version-controlled and editable without code changes.

**Tech Stack:** Node.js 24, native `fs`, no external runtime dependencies (only `vitest` for tests). Compatible with existing Klarpakke tooling.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `scripts/kimi-orchestrator.mjs` | Main CLI: parse args, load registries, classify, plan, assemble, print. |
| `.kimi/orchestrator/domains.json` | Domain definitions: keywords, skill path, MCP profile, default sub-agents, search patterns. |
| `.kimi/orchestrator/agent-registry.json` | Sub-agent definitions: id, name, when to use, prompt template. |
| `.kimi/orchestrator/templates/default.md` | Default markdown template for the output brief. |
| `scripts/__tests__/kimi-orchestrator.test.mjs` | Vitest tests for domain classifier and prompt assembler. |
| `.kimi/commands.json` | Add `orch` alias. |
| `AGENTS.md` | Add centralized orchestration policy section. |
| `package.json` | Add `scripts.orch:verify` and dev dependency if missing. |

---

## Task 1: Create Domain Registry

**Files:**
- Create: `.kimi/orchestrator/domains.json`

- [ ] **Step 1: Write the domain registry**

```json
{
  "version": "1.0.0",
  "domains": [
    {
      "id": "auth",
      "name": "Auth & Security",
      "keywords": ["auth", "login", "oauth", "session", "jwt", "permission", "refresh", "token", "password", "rls"],
      "skill": ".kimi/skills/klarpakke-auth",
      "mcp_profile": "medium",
      "sub_agents": ["explore", "security", "tester"],
      "search_queries": ["{{task}} Supabase SSR auth", "{{task}} Next.js OAuth best practice 2026", "{{task}} refresh token security"]
    },
    {
      "id": "trading",
      "name": "Trading Engine",
      "keywords": ["trading", "strategy", "bot", "order", "position", "pnl", "binance", "circuit", "breaker"],
      "skill": ".kimi/skills/klarpakke-trading",
      "mcp_profile": "full",
      "sub_agents": ["explore", "architect", "coder", "tester"],
      "search_queries": ["{{task}} trading bot architecture", "{{task}} Binance API best practice", "{{task}} risk management crypto trading"]
    },
    {
      "id": "database",
      "name": "Database & Schema",
      "keywords": ["migration", "sql", "supabase", "postgres", "trigger", "rls", "schema", "index", "function"],
      "skill": ".kimi/skills/klarpakke-database",
      "mcp_profile": "full",
      "sub_agents": ["explore", "architect", "coder", "tester"],
      "search_queries": ["{{task}} Supabase PostgreSQL", "{{task}} database migration best practice", "{{task}} Postgres RLS pattern"]
    },
    {
      "id": "frontend",
      "name": "Frontend & UI",
      "keywords": ["ui", "component", "react", "tailwind", "dashboard", "page", "layout", "lighthouse", "responsive"],
      "skill": ".kimi/skills/klarpakke-performance",
      "mcp_profile": "minimal",
      "sub_agents": ["explore", "coder", "tester"],
      "search_queries": ["{{task}} Next.js React 19", "{{task}} Tailwind best practice", "{{task}} frontend performance 2026"]
    },
    {
      "id": "api",
      "name": "API & Routes",
      "keywords": ["endpoint", "route", "handler", "middleware", "webhook", "api", "rate", "limit"],
      "skill": ".kimi/skills/klarpakke-architect",
      "mcp_profile": "medium",
      "sub_agents": ["explore", "security", "coder", "tester"],
      "search_queries": ["{{task}} Next.js API route", "{{task}} REST API design", "{{task}} webhook security"]
    },
    {
      "id": "deploy",
      "name": "Deploy & Infrastructure",
      "keywords": ["cloudflare", "workers", "wrangler", "ci", "build", "env", "secret", "domain", "deploy", "hosting"],
      "skill": ".kimi/skills/klarpakke-architect",
      "mcp_profile": "medium",
      "sub_agents": ["explore", "architect", "tester"],
      "search_queries": ["{{task}} Cloudflare Workers", "{{task}} Wrangler deploy best practice", "{{task}} CI/CD GitHub Actions"]
    },
    {
      "id": "testing",
      "name": "Testing & QA",
      "keywords": ["test", "e2e", "vitest", "playwright", "coverage", "mock", "assert"],
      "skill": ".kimi/skills/klarpakke-testing",
      "mcp_profile": "medium",
      "sub_agents": ["explore", "coder", "tester"],
      "search_queries": ["{{task}} Vitest best practice", "{{task}} Playwright E2E pattern", "{{task}} testing strategy 2026"]
    },
    {
      "id": "mempalace",
      "name": "Memory & Knowledge",
      "keywords": ["mempalace", "memory", "knowledge", "diary", "handoff", "sync", "kg", "index"],
      "skill": ".kimi/skills/klarpakke-mempalace",
      "mcp_profile": "full",
      "sub_agents": ["explore", "knowledge"],
      "search_queries": ["{{task}} knowledge graph maintenance", "{{task}} MemPalace MCP pattern", "{{task}} AI memory management"]
    },
    {
      "id": "general",
      "name": "General",
      "keywords": ["refactor", "fix", "bug", "optimize", "improve", "clean", "update"],
      "skill": ".kimi/skills/klarpakke-super",
      "mcp_profile": "auto",
      "sub_agents": ["explore", "coder", "tester"],
      "search_queries": ["{{task}} best practice", "{{task}} 2026", "{{task}} common pitfalls"]
    }
  ]
}
```

- [ ] **Step 2: Validate JSON syntax**

Run: `node --check .kimi/orchestrator/domains.json`
Expected: No output (success).

---

## Task 2: Create Agent Registry

**Files:**
- Create: `.kimi/orchestrator/agent-registry.json`

- [ ] **Step 1: Write the agent registry**

```json
{
  "version": "1.0.0",
  "agents": [
    {
      "id": "explore",
      "name": "Codebase Explorer",
      "when": "Need to locate relevant files or understand existing code before implementing",
      "tool": "Agent subagent_type=explore",
      "prompt_template": "Explore the codebase thoroughly to find all files, functions, and patterns related to: {{task}}. Return: (1) a list of relevant file paths, (2) the key functions/components involved, (3) any existing tests, (4) relevant AGENTS.md rules. Be concise."
    },
    {
      "id": "coder",
      "name": "Implementer",
      "when": "Ready to implement after exploration and planning",
      "tool": "Agent subagent_type=coder",
      "prompt_template": "Implement the following task with minimal, safe changes: {{task}}. Follow the project's existing style, AGENTS.md rules, and the selected skill instructions. After implementation, run relevant tests/verification."
    },
    {
      "id": "security",
      "name": "Security Reviewer",
      "when": "Auth, secrets, OAuth, tokens, or sensitive paths are involved",
      "tool": "Agent subagent_type=coder",
      "prompt_template": "Review the planned or implemented change for security issues: {{task}}. Check: secrets handling, OAuth redirect URIs (use getCallbackUrl), RLS policies, input validation, and dependency vulnerabilities. Report risks and fixes."
    },
    {
      "id": "tester",
      "name": "QA Agent",
      "when": "Implementation touches logic that should be verified",
      "tool": "Agent subagent_type=coder",
      "prompt_template": "Write or verify tests for: {{task}}. Run the relevant test commands (unit, integration, or E2E) and report results. If tests fail, diagnose and fix or escalate."
    },
    {
      "id": "architect",
      "name": "Lead Architect",
      "when": "Large changes, cross-domain impact, or architectural decisions",
      "tool": "Agent subagent_type=plan",
      "prompt_template": "Create or review the architecture plan for: {{task}}. Identify cross-domain effects, risks, rollback strategy, and whether an ADR should be written. Do not implement yet."
    },
    {
      "id": "knowledge",
      "name": "MemPalace Sync",
      "when": "After task completion or when updating memory",
      "tool": "MCP mempalace tools",
      "prompt_template": "Sync memory for task: {{task}}. Run: (1) kg_batch for related facts, (2) write_diary with type/status/rating/tags, (3) auto_tag on the task description. Verify the new knowledge is searchable."
    }
  ]
}
```

- [ ] **Step 2: Validate JSON syntax**

Run: `node --check .kimi/orchestrator/agent-registry.json`
Expected: No output (success).

---

## Task 3: Create Default Prompt Template

**Files:**
- Create: `.kimi/orchestrator/templates/default.md`

- [ ] **Step 1: Write the default template**

```markdown
# KIMI Task Brief — generated by kimi-orchestrator

## Task
{{task}}

## Domain & Skill
- Domain: {{domain.name}} ({{domain.id}})
- Skill: `{{domain.skill}}`
- MCP profile: {{domain.mcp_profile}}

## Mandatory Web Search
Run these searches before any implementation:
{{search_queries}}

## Sub-Agent Plan
Execute in order:
{{agents}}

## MemPalace Pre-Flight
Before starting:
1. `search(query="{{task_keywords}}", limit=10)`
2. `recent_context(hours=48)`
3. `kg_query(entity="{{kg_entity}}", depth=2)`

## Rules
- Minimal changes.
- Follow `AGENTS.md` rules (OAuth redirect URIs, PL/pgSQL, caching, secrets).
- End every response with a GO/NO-GO/WIP status block.
- After completion: `kg_batch` + `write_diary` + `auto_tag`.
```

---

## Task 4: Implement Domain Classifier

**Files:**
- Create: `scripts/__tests__/kimi-orchestrator.test.mjs`
- Modify: `scripts/kimi-orchestrator.mjs` (create file in Task 5; this task adds the classifier function)

- [ ] **Step 1: Write the failing test for domain classification**

```javascript
import { describe, it, expect } from 'vitest';
import { classifyDomain } from '../kimi-orchestrator.mjs';

const domains = [
  {
    id: 'auth',
    keywords: ['auth', 'login', 'oauth', 'session', 'jwt', 'permission', 'refresh', 'token']
  },
  {
    id: 'trading',
    keywords: ['trading', 'strategy', 'bot', 'order', 'position', 'pnl']
  },
  {
    id: 'general',
    keywords: ['refactor', 'fix', 'bug', 'optimize']
  }
];

describe('classifyDomain', () => {
  it('selects auth for login timeout task', () => {
    const result = classifyDomain('fiks auth login timeout', domains);
    expect(result.domain.id).toBe('auth');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('selects trading for strategy task', () => {
    const result = classifyDomain('implementer mean reversion strategy', domains);
    expect(result.domain.id).toBe('trading');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('falls back to general when no strong match', () => {
    const result = classifyDomain('oppdater dokumentasjon', domains);
    expect(result.domain.id).toBe('general');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/__tests__/kimi-orchestrator.test.mjs`
Expected: FAIL — `classifyDomain` is not defined or exported.

- [ ] **Step 3: Implement classifyDomain in the orchestrator script**

Add to `scripts/kimi-orchestrator.mjs`:

```javascript
export function classifyDomain(task, domains) {
  const normalizedTask = task.toLowerCase();
  const words = new Set(normalizedTask.split(/\W+/).filter(Boolean));

  let best = { domain: domains.find((d) => d.id === 'general') || domains[0], confidence: 0 };

  for (const domain of domains) {
    const matches = domain.keywords.filter((kw) => words.has(kw.toLowerCase())).length;
    const confidence = matches / Math.max(domain.keywords.length, 1);
    if (confidence > best.confidence) {
      best = { domain, confidence };
    }
  }

  return best;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/__tests__/kimi-orchestrator.test.mjs`
Expected: PASS.

---

## Task 5: Implement Prompt Assembler

**Files:**
- Create: `scripts/kimi-orchestrator.mjs`
- Modify: `scripts/__tests__/kimi-orchestrator.test.mjs`

- [ ] **Step 1: Write the failing test for prompt assembly**

Add to `scripts/__tests__/kimi-orchestrator.test.mjs`:

```javascript
import { assembleBrief } from '../kimi-orchestrator.mjs';

const template = `# Task
{{task}}
# Search
{{search_queries}}
# Agents
{{agents}}`;

const domain = {
  id: 'auth',
  name: 'Auth & Security',
  skill: '.kimi/skills/klarpakke-auth',
  mcp_profile: 'medium',
  search_queries: ['{{task}} Supabase SSR auth'],
  sub_agents: ['explore', 'security']
};

const agents = [
  { id: 'explore', name: 'Codebase Explorer', prompt_template: 'Explore: {{task}}' },
  { id: 'security', name: 'Security Reviewer', prompt_template: 'Review: {{task}}' }
];

describe('assembleBrief', () => {
  it('replaces all placeholders', () => {
    const brief = assembleBrief({
      task: 'fiks auth login timeout',
      domain,
      agents,
      template
    });
    expect(brief).toContain('fiks auth login timeout');
    expect(brief).toContain('Supabase SSR auth');
    expect(brief).toContain('Codebase Explorer');
    expect(brief).toContain('Security Reviewer');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/__tests__/kimi-orchestrator.test.mjs`
Expected: FAIL — `assembleBrief` not defined.

- [ ] **Step 3: Implement assembleBrief**

Add to `scripts/kimi-orchestrator.mjs`:

```javascript
export function assembleBrief({ task, domain, agents, template }) {
  const taskWords = task
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const taskKeywords = taskWords.slice(0, 5).join(' ');
  const kgEntity = domain.id;

  const searchQueries = domain.search_queries
    .map((q) => q.replace(/\{\{task\}\}/g, task))
    .map((q) => `- "${q}"`)
    .join('\n');

  const agentList = agents
    .map(
      (agent, index) =>
        `${index + 1}. **${agent.name}** (${agent.id})\n   - ${agent.prompt_template.replace(
          /\{\{task\}\}/g,
          task
        )}`
    )
    .join('\n');

  return template
    .replace(/\{\{task\}\}/g, task)
    .replace(/\{\{domain\.name\}\}/g, domain.name)
    .replace(/\{\{domain\.id\}\}/g, domain.id)
    .replace(/\{\{domain\.skill\}\}/g, domain.skill)
    .replace(/\{\{domain\.mcp_profile\}\}/g, domain.mcp_profile)
    .replace(/\{\{search_queries\}\}/g, searchQueries)
    .replace(/\{\{agents\}\}/g, agentList)
    .replace(/\{\{task_keywords\}\}/g, taskKeywords)
    .replace(/\{\{kg_entity\}\}/g, kgEntity);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/__tests__/kimi-orchestrator.test.mjs`
Expected: PASS.

---

## Task 6: Implement Main CLI

**Files:**
- Modify: `scripts/kimi-orchestrator.mjs`

- [ ] **Step 1: Add CLI entry point**

Append to `scripts/kimi-orchestrator.mjs`:

```javascript
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORCHESTRATOR_DIR = resolve(__dirname, '..', '.kimi', 'orchestrator');

function loadJson(filename) {
  const path = resolve(ORCHESTRATOR_DIR, filename);
  if (!existsSync(path)) {
    console.error(`Missing registry file: ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadTemplate(name = 'default') {
  const path = resolve(ORCHESTRATOR_DIR, 'templates', `${name}.md`);
  if (!existsSync(path)) {
    console.error(`Missing template: ${path}`);
    process.exit(1);
  }
  return readFileSync(path, 'utf8');
}

function main() {
  const args = process.argv.slice(2);
  const verify = args.includes('--verify');

  if (verify) {
    loadJson('domains.json');
    loadJson('agent-registry.json');
    loadTemplate('default');
    console.log('OK: all registries and templates are valid');
    return;
  }

  const taskIndex = args.findIndex((arg) => !arg.startsWith('--'));
  const task = taskIndex >= 0 ? args[taskIndex] : '';

  if (!task) {
    console.error('Usage: node scripts/kimi-orchestrator.mjs "<task>" [--template=<name>]');
    process.exit(1);
  }

  const templateName = args.find((arg) => arg.startsWith('--template='))?.split('=')[1] || 'default';
  const { domains } = loadJson('domains.json');
  const { agents: agentDefinitions } = loadJson('agent-registry.json');

  const { domain } = classifyDomain(task, domains);
  const selectedAgents = domain.sub_agents
    .map((id) => agentDefinitions.find((a) => a.id === id))
    .filter(Boolean);

  const template = loadTemplate(templateName);
  const brief = assembleBrief({ task, domain, agents: selectedAgents, template });

  console.log(brief);
}

main();
```

- [ ] **Step 2: Run a smoke test**

Run: `node scripts/kimi-orchestrator.mjs "fiks auth login timeout"`
Expected: A complete markdown brief is printed to stdout, including web searches and sub-agent plan.

- [ ] **Step 3: Run verify mode**

Run: `node scripts/kimi-orchestrator.mjs --verify`
Expected: `OK: all registries and templates are valid`

---

## Task 7: Add `orch` Alias to Commands

**Files:**
- Modify: `.kimi/commands.json`

- [ ] **Step 1: Add the alias**

Insert into the `commands` object (e.g., after `super`):

```json
"orch": {
  "description": "Generer KIMI brief med web-søk og sub-agenter",
  "command": "node scripts/kimi-orchestrator.mjs"
}
```

- [ ] **Step 2: Validate JSON syntax**

Run: `node --check .kimi/commands.json`
Expected: No output (success).

---

## Task 8: Add npm Script for Verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add orch:verify script**

Add to the `scripts` section:

```json
"orch:verify": "node scripts/kimi-orchestrator.mjs --verify"
```

- [ ] **Step 2: Validate package.json**

Run: `node --check package.json`
Expected: No output (success).

---

## Task 9: Update AGENTS.md Policy

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Insert new section after "Websearch er alltid på"**

```markdown
## Sentralisert Orkestrering

For oppgaver som ikke er rene lokale filoperasjoner:

1. Kjør `kimi orch '<task>'` for å generere en komplett brief.
2. Følg briefen: web-søk først, deretter sub-agenter i rekkefølge.
3. Velg skill og MCP-profil basert på domene.
4. Logg alltid resultatet i MemPalace etter endt oppgave.
```

- [ ] **Step 2: Sanity check by running orchestrator**

Run: `node scripts/kimi-orchestrator.mjs "fiks auth login timeout" | head -20`
Expected: Brief header and domain section visible.

---

## Task 10: MemPalace Sync

**Files:**
- None (use MCP tools)

- [ ] **Step 1: Add KG facts about orchestrator**

Use `mcp__mempalace__kg_batch` with:

```json
[
  { "subject": "kimi-orchestrator", "predicate": "is_a", "object": "cli-tool" },
  { "subject": "kimi-orchestrator", "predicate": "generates", "object": "kimi-brief" },
  { "subject": "kimi-orchestrator", "predicate": "uses", "object": "web-search" },
  { "subject": "kimi-orchestrator", "predicate": "uses", "object": "sub-agents" },
  { "subject": "kimi-orchestrator", "predicate": "depends_on", "object": "domains-registry" },
  { "subject": "kimi-orchestrator", "predicate": "depends_on", "object": "agent-registry" }
]
```

- [ ] **Step 2: Write diary entry**

Use `mcp__mempalace__write_diary` with:

```json
{
  "type": "FEAT",
  "task": "Designed KIMI Orchestrator v3.0 for smarter thinking and sub-agent dispatch",
  "status": "GO",
  "rating": 4,
  "files": 7,
  "tags": ["kimi", "orchestrator", "web-search", "sub-agents", "mempalace"]
}
```

---

## Task 11: Final Verification

**Files:**
- All of the above

- [ ] **Step 1: Run lint and type-check**

Run: `npm run lint && npm run type-check`
Expected: PASS (orchestrator is `.mjs` so type-check may skip it; lint should pass).

- [ ] **Step 2: Run orch:verify**

Run: `npm run orch:verify`
Expected: `OK: all registries and templates are valid`

- [ ] **Step 3: Run unit tests**

Run: `npx vitest run scripts/__tests__/kimi-orchestrator.test.mjs`
Expected: PASS.

---

## Self-Review

**Spec coverage:**
- Domain classifier → Task 4
- Web-search planner → embedded in domains.json + assembleBrief Task 5
- Agent dispatcher → Task 5/6
- Prompt assembler → Task 5/6
- AGENTS.md update → Task 9
- Commands alias → Task 7
- Testing → Task 4, 6, 11
- MemPalace sync → Task 10

**Placeholder scan:**
- No TBD/TODO.
- All code blocks contain concrete content.
- All commands have expected output.

**Type consistency:**
- `classifyDomain` returns `{ domain, confidence }` consistently.
- `assembleBrief` accepts `{ task, domain, agents, template }` consistently.
- Registry schemas match usage in main CLI.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-27-kimi-orchestrator-smart-thinking-plan.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach do you want?
