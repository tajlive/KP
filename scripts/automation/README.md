# Klarpakke Automation Subagent

A unified automation layer that lets subagents execute CLI scripts, npm scripts, internal APIs, and (registry-only for now) MCP tools. Results are persisted to MemPalace, and the subagent returns three follow-up questions after each task.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Parent agent / User                                        │
│   ── dispatches task ──▶ run-automation-task.mjs            │
│   ◀── result + 3 questions ──                               │
│   ── answers ──▶ save-automation-feedback.mjs               │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  tool-registry.json   tool-runner.mjs    mempalace-context.mjs
        │                   │                   │
        ▼                   ▼                   ▼
  CLI / npm / API    execute commands     load/save MemPalace
```

## Files

| File | Purpose |
|------|---------|
| `tool-registry.json` | Declarative registry of all automatable tools/workflows |
| `run-automation-task.mjs` | Single-task runner — loads context, executes, saves, asks |
| `save-automation-feedback.mjs` | Saves the 3 user answers to MemPalace |
| `lib/tool-runner.mjs` | Executes npm, CLI, script, API and MCP tools |
| `lib/mempalace-context.mjs` | Loads recent diary/KG and persists results |
| `tasks/*.json` | Example task definitions |

## Quick start

Run a predefined task:

```bash
npm run auto:task -- scripts/automation/tasks/vault-verify.json
```

Or pipe a task via stdin:

```bash
echo '{
  "taskId": "auto-lint-001",
  "name": "Run lint gate",
  "steps": ["npm:lint:gate"]
}' | npm run auto:task -- -
```

Run a workflow:

```bash
echo '{
  "taskId": "auto-ci-001",
  "name": "CI gate",
  "workflow": "ci-gate"
}' | npm run auto:task -- -
```

## Task JSON schema

```json
{
  "taskId": "unique-id",
  "name": "Human-readable name",
  "description": "Optional longer description",
  "tags": ["tag1", "tag2"],
  "contextQueries": ["keywords", "for", "memPalace", "search"],
  "contextEntities": ["entity1", "entity2"],
  "continueOnError": false,
  "steps": ["npm:lint:gate", "npm:type-check"],
  "workflow": "ci-gate",
  "questions": [
    "Er du fornøyd med resultatet?",
    "Skal jeg fortsette med neste steg?",
    "Noe jeg skal huske til neste gang?"
  ]
}
```

Either `steps` or `workflow` must be provided. `steps` takes precedence.

## Tool types

| Type | Registry field | Example |
|------|----------------|---------|
| npm | `type: "npm"`, `command: "npm run ..."` | `npm:test:unit` |
| cli | `type: "cli"`, `command: "npx ..."` | `cli:playwright:install:chromium` |
| script | `type: "script"`, `path`, `args` | `script:health-check` |
| api | `type: "api"`, `method`, `url`, `headers` | `api:health` |
| mcp | `type: "mcp"`, `server`, `tool` | `mcp:mempalace:search` |

## Workflows

Workflows are named sequences of tools defined in `tool-registry.json`:

- `ci-gate`: lint → type-check → unit tests → build
- `e2e-critical`: install Chromium → prepare test users → critical E2E
- `deploy-pipeline`: lint → type-check → unit tests → build → deploy → health gate

## Security

- `.env.local` is loaded automatically via `scripts/load-env.mjs`.
- Secrets are masked in stdout/stderr output.
- `.env.local` and `.mempalace/kg.json` are never committed.

## MCP status

MCP tools are listed in the registry for discovery, but direct invocation requires an MCP client library and is **not yet implemented** in `tool-runner.mjs`. For MemPalace operations, the subagent uses direct file access instead.

## Feedback loop

After each task, `run-automation-task.mjs` prints a JSON result with `questions`. Save the answers:

```bash
echo '[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]' > /tmp/answers.json

npm run auto:feedback -- <taskId> /tmp/answers.json
```
