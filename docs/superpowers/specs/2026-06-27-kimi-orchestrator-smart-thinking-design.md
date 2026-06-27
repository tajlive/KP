# KIMI Orchestrator v3.0 — Smarter Thinking & Sub-Agent Design

**Date:** 2026-06-27  
**Status:** Draft → Approved  
**Scope:** Repository-only (`/Users/taj/klarpakke`)  
**Goal:** Increase thinking quality and speed by centralizing web-search and sub-agent dispatch for KIMI sessions in the Klarpakke project.

---

## 1. Problem Statement

The project already has rich KIMI/MemPalace infrastructure (8 skills, 16 MemPalace scripts, `AGENTS.md` rules, session hooks), but usage is inconsistent:

- Web search is mandated in `AGENTS.md` but not structurally enforced per task.
- Sub-agents (`explore`, `coder`, `security`, `tester`) are available but selected ad-hoc.
- Skill selection is manual (`kimi --skills-dir .kimi/skills/klarpakke-auth`).
- Each session repeats the same context-gathering steps manually.

We want a single entry point that, given a task description, automatically decides:
1. Which domain / skill to use.
2. Which web searches to run first.
3. Which sub-agents to dispatch.
4. Which MemPalace pre-flight protocol to apply.

---

## 2. Constraints

- **Repository-only changes.** No modifications to the global KIMI CLI installation (`~/.kimi-code/`).
- **KIMI CLI does not expose `Agent` tool programmatically from Node.js.** Therefore the orchestrator is a **prompt generator and task router**, not a runtime scheduler. It produces a paste-ready prompt (or `--instructions`-compatible input) for the user to run in KIMI.
- **Backward compatibility.** Existing `kimi --skills-dir ...` commands and skill files continue to work unchanged.
- **Minimal footprint.** Reuse existing MemPalace diary/KG conventions and existing skill structure.

---

## 3. Architecture

```
User input
    │
    ▼
┌─────────────────────────────────────┐
│ scripts/kimi-orchestrator.mjs       │
│  - parse argv                       │
│  - domain classifier                │
│  - web-search planner               │
│  - agent dispatcher                 │
│  - prompt assembler                 │
└─────────────────────────────────────┘
    │
    ▼
paste-ready KIMI prompt
    │
    ▼
KIMI session with web search + sub-agents + skill
```

### 3.1 Components

| Component | Path | Purpose |
|-----------|------|---------|
| Orchestrator CLI | `scripts/kimi-orchestrator.mjs` | Main entry point. Parses task, loads registries, assembles prompt. |
| Domain registry | `.kimi/orchestrator/domains.json` | Domain definitions, keywords, skill mapping, default MCP profile. |
| Search patterns | `.kimi/orchestrator/search-patterns.json` | Per-domain web-search query templates. |
| Agent registry | `.kimi/orchestrator/agent-registry.json` | Sub-agent definitions (explore, coder, security, tester, architect, knowledge). |
| Prompt templates | `.kimi/orchestrator/templates/*.md` | Output templates (standard, quick, deep-research). |
| AGENTS.md section | `AGENTS.md` | Policy: when to use the orchestrator, web-search-first rule, sub-agent selection guidance. |
| Commands alias | `.kimi/commands.json` | New `orch` alias. |

### 3.2 Domain Registry (example)

```json
{
  "domains": [
    {
      "id": "auth",
      "name": "Auth & Security",
      "keywords": ["auth", "login", "oauth", "session", "jwt", "permission", "refresh", "token"],
      "skill": ".kimi/skills/klarpakke-auth",
      "mcp_profile": "medium",
      "priority_sub_agents": ["explore", "security", "tester"],
      "search_queries": ["{{task}} Supabase SSR auth", "{{task}} Next.js OAuth best practice"]
    }
  ]
}
```

### 3.3 Agent Registry

```json
{
  "agents": [
    {
      "id": "explore",
      "name": "Codebase Explorer",
      "when": "Need to locate relevant files or understand existing code",
      "tool": "Agent subagent_type=explore",
      "prompt_template": "Explore the codebase to find all files related to: {{task}}. Return file paths, key functions, and any relevant patterns."
    },
    {
      "id": "coder",
      "name": "Implementer",
      "when": "Ready to implement after exploration",
      "tool": "Agent subagent_type=coder",
      "prompt_template": "Implement the following task minimally and safely: {{task}}. Follow existing project style and AGENTS.md rules."
    },
    {
      "id": "security",
      "name": "Security Reviewer",
      "when": "Auth, secrets, OAuth, tokens, or sensitive paths involved",
      "tool": "Agent subagent_type=coder (security focus)",
      "prompt_template": "Review the planned or implemented change for security issues: {{task}}. Check secrets handling, OAuth redirect URIs, RLS policies."
    },
    {
      "id": "tester",
      "name": "QA Agent",
      "when": "Implementation touches logic that should be tested",
      "tool": "Agent subagent_type=coder (testing focus)",
      "prompt_template": "Write or verify tests for: {{task}}. Run relevant test commands and report results."
    },
    {
      "id": "architect",
      "name": "Lead Architect",
      "when": "Large changes, cross-domain impact, or architectural decisions",
      "tool": "Agent subagent_type=plan",
      "prompt_template": "Create or review the architecture plan for: {{task}}. Identify risks, cross-domain effects, and rollback strategy."
    },
    {
      "id": "knowledge",
      "name": "MemPalace Sync",
      "when": "After task completion",
      "tool": "MCP mempalace tools",
      "prompt_template": "Sync memory: kg_batch + write_diary + auto_tag for task: {{task}}."
    }
  ]
}
```

---

## 4. Data Flow

1. User runs `kimi orch "fiks auth login timeout"`.
2. CLI parses the task string.
3. Domain classifier scores each domain by keyword overlap and optional synonym expansion (cross-lingual: norsk/english).
4. If confidence < 0.5, CLI falls back to `general` domain and asks user to confirm (or prints ambiguous domains).
5. Web-search planner expands `{{task}}` into 2-4 concrete queries using domain patterns.
6. Agent dispatcher selects sub-agents based on domain defaults + keyword triggers (e.g., `auth` → security, `test` → tester).
7. Prompt assembler loads the appropriate template and injects:
   - Task
   - Selected skill and MCP profile
   - Web-search queries
   - Sub-agent plan (ordered)
   - MemPalace pre-task protocol (`search`, `recent_context`, `kg_query`)
   - Status block requirements
8. Output is printed to stdout (and optionally copied to clipboard via `pbcopy` on macOS).

---

## 5. Output Prompt Format

```markdown
# KIMI Task Brief — generated by kimi-orchestrator

## Task
{{task}}

## Domain & Skill
- Domain: {{domain.name}}
- Skill: `{{domain.skill}}`
- MCP profile: {{domain.mcp_profile}}

## Mandatory Web Search
Run these searches before any implementation:
{{#each search_queries}}
- "{{this}}"
{{/each}}

## Sub-Agent Plan
Execute in order:
{{#each agents}}
1. **{{name}}** ({{id}})
   - When: {{when}}
   - Instruction: {{prompt}}
{{/each}}

## MemPalace Pre-Flight
Before starting:
1. `search(query="{{task_keywords}}", limit=10)`
2. `recent_context(hours=48)`
3. `kg_query(entity="{{kg_entity}}", depth=2)`

## Rules
- Minimal changes.
- Follow `AGENTS.md` rules (OAuth redirect URIs, PL/pgSQL, caching, secrets).
- End every response with GO/NO-GO/WIP status block.
- After completion: `kg_batch` + `write_diary` + `auto_tag`.
```

---

## 6. Integration Points

### 6.1 `AGENTS.md`

Add a new section after "Websearch er alltid på":

```markdown
## Sentralisert Orkestrering

For oppgaver som ikke er rene lokale filoperasjoner:

1. Kjør `kimi orch '<task>'` for å generere en komplett brief.
2. Følg briefen: web-søk først, deretter sub-agenter i rekkefølge.
3. Velg skill og MCP-profil basert på domene.
4. Logg alltid resultatet i MemPalace etter endt oppgave.
```

### 6.2 `.kimi/commands.json`

Add:

```json
"orch": {
  "description": "Generer KIMI brief med web-søk og sub-agenter",
  "command": "node scripts/kimi-orchestrator.mjs"
}
```

### 6.3 Skills

Add optional `orchestrator` frontmatter to each `SKILL.md`:

```yaml
orchestrator:
  domain: auth
  web_search: required
  sub_agents: [explore, security, tester]
  mcp_profile: medium
```

This is metadata only; the orchestrator reads it at runtime to build the registry automatically if `domains.json` is missing or stale.

### 6.4 MemPalace

The orchestrator itself writes a diary entry of type `ANALYSIS` when generating a brief:

```json
{
  "type": "ANALYSIS",
  "task": "Generated orchestrator brief for: {{task}}",
  "status": "GO",
  "rating": 4,
  "files": 0,
  "tags": ["orchestrator", "{{domain}}", "brief"]
}
```

---

## 7. Error Handling

| Situation | Handling |
|-----------|----------|
| Domain confidence < 0.5 | Print top-3 candidate domains and ask user to pick with `--domain` flag. |
| Missing registry file | Auto-seed from skill frontmatter + built-in defaults. |
| Unknown skill path | Print warning, fall back to `klarpakke-super`. |
| No web-search patterns for domain | Use generic patterns with task keywords. |
| Template missing | Use built-in default template. |

---

## 8. Testing

- `npm run orch:verify` — validates JSON registries and skill mappings.
- `node scripts/kimi-orchestrator.mjs --verify` — same, plus dry-run on sample tasks.
- Vitest unit tests for domain classifier in `scripts/__tests__/kimi-orchestrator.test.ts`.
- `scripts/mcp-smoke-test.mjs` extended with orchestrator sanity check.

---

## 9. Rollout Plan

1. Implement `scripts/kimi-orchestrator.mjs` and registries.
2. Add `orch` alias to `.kimi/commands.json`.
3. Update `AGENTS.md` with orchestrator section.
4. Add optional `orchestrator` frontmatter to existing skills.
5. Add tests and verify script.
6. Run `npm run lint && npm run type-check`.
7. Update MemPalace KG with new orchestrator facts.

---

## 10. Success Criteria

- `kimi orch '<task>'` produces a complete, paste-ready brief in < 1s.
- Briefs include at least 2 domain-specific web searches.
- Sub-agent plan is selected automatically based on domain and keywords.
- Existing skill commands still work without changes.
- `npm run orch:verify` passes.

---

## Status: Design Approved

Next step: write implementation plan via `writing-plans` skill.
