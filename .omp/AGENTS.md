# Klarpakke OMP Project Context

This repository is operated with **OMP only**. Do not rely on Cursor, Antigravity, Claude, Gemini, Copilot, `.cursor/rules`, `.claude`, or `.agent` discovery for future sessions.

## Source of truth

Read and follow the project master prompt before substantive work:

@../.kimi/MASTER_PROMPT.md

Read the workflow rules before deployment, production, infrastructure, or agent/config changes:

@../.kimi/WORKFLOW_RULES.md

## OMP-native operating model

- Project-specific instructions live in `.omp/AGENTS.md` and `.omp/RULES.md`.
- Project-specific OMP task agents live in `.omp/agents/*.md`.
- Project-specific OMP rules live in `.omp/rules/*.md`.
- `.omp/config.yml` disables non-OMP discovery providers so stale Cursor/Claude/Gemini/Copilot/.agent rules do not steer new OMP sessions.
- Do not add new Cursor/Claude/Gemini/Antigravity config. Migrate relevant behavior into `.omp/` instead.
- Keep secrets out of `.omp/`; use environment variables, MCP auth, Supabase, Wrangler, or stored OMP auth.

## Chief architect routing defaults

- Larger tasks: Main agent decides architecture, then uses OMP `task` subagents only for bounded implementation, verification, or investigation.
- Trading/live/paper/RLS/history/Binance/session work: use OMP-native trading integrity rules and agents.
- Deploy/production/Cloudflare/OpenNext/Wrangler work: use `klarpakke-cloudflare-workers-ops`.
- Trading Cockpit UI smoke and E2E: use `klarpakke-cockpit-qa`.
- Existing bundled OMP agents (`explore`, `task`, `reviewer`, `oracle`, `designer`, `librarian`) remain available for non-project-specific work.
