# Klarpakke OMP Configuration

This directory contains the OMP-native project configuration for Klarpakke. It is the primary agent surface; do not add Cursor, Claude, Gemini, Antigravity, or `.agent` routing here.

## Files

- `.omp/config.yml` — Project overlay for OMP 16.3.6 + KIMI K2.7 Code (model roles, thinking level, tool format, concurrency, disabled providers).
- `.omp/RULES.md` — Always-applied sticky rules for every agent turn.
- `.omp/rules/*.md` — Targeted rulebook rules (routing, deploy, trading integrity, secrets).
- `.omp/agents/*.md` — Specialist agents for Cloudflare, Supabase, trading, realtime market data, and trading-cockpit QA.
- `.omp/mcp.json` — Workstation-specific MCP server definitions.

## MCP servers

`.omp/mcp.json` configures the following stdio MCP servers used by OMP sessions:

- `filesystem`
- `supabase-db`
- `sanity`
- `github`
- `perplexity`
- `mempalace`

### Workstation-specific paths

The `command` and `args` paths in `.omp/mcp.json` are tied to the current development workstation (`/Users/taj/...`). If you open this repo on another machine, you must regenerate or edit `.omp/mcp.json` so the Node binary and script paths match that environment. The file contains no secrets; only file paths and server metadata.

## Secrets

Never commit API keys, tokens, or service-role credentials. Keep them in:

- `~/.omp/agent/models.yml` for KIMI API keys
- `.env.local` or your system keychain for project secrets
- Cloudflare Worker secrets / Supabase Edge Function secrets in production
