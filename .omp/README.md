# Klarpakke OMP Configuration

This directory contains the OMP-native project configuration for Klarpakke. It is the primary agent surface; do not add Cursor, Claude, Gemini, Antigravity, or `.agent` routing here.

## Files

- `.omp/config.yml` — Project overlay for OMP 16.3.6 + KIMI K2.7 Code (model roles, thinking level, tool format, concurrency, disabled providers).
- `.omp/RULES.md` — Always-applied sticky rules for every agent turn.
- `.omp/rules/*.md` — Targeted rulebook rules (routing, deploy, trading integrity, secrets).
- `.omp/agents/*.md` — Specialist agents for Cloudflare, Supabase, trading, realtime market data, and trading-cockpit QA.
- `.omp/mcp.json` — Workstation-specific MCP server definitions.
- `.omp/lsp.json` — Language server definitions for the workspace.

## Hierarchy

`.omp/` is the authoritative configuration surface for **OMP sessions**. Files outside this directory are either legacy or parallel sources, and they are **not** edited for OMP-native work.

### Authoritative for OMP sessions

- `.omp/config.yml` — Project overlay: model roles, thinking levels, tool format, concurrency, disabled providers.
- `.omp/RULES.md` — Always-applied sticky rules for every agent turn.
- `.omp/rules/*.md` — Targeted rulebooks (routing, deploy, trading integrity, secrets).
- `.omp/agents/*.md` — Specialist agents for Cloudflare, Supabase, trading, realtime market data, and trading-cockpit QA.
- `.omp/mcp.json` — Workstation-specific MCP server definitions.
- `.omp/lsp.json` — Language server definitions for the workspace.

### Legacy / parallel sources

- `.kimi/MASTER_PROMPT.md` — The original project source of truth. Still contains background, domain context, and constraints. OMP reads it for context, but where it conflicts with `.omp/`, the `.omp/` overlay wins.
- `.kimi/WORKFLOW_RULES.md` — Still governs deploy, production, infrastructure, secrets handling, and emergency procedures. Read before deploy/secrets work.
- `.agent/`, `CLAUDE.md`, Cursor rules, `.cursor/rules` — Legacy / non-OMP discovery. Do not add new files; OMP disables their discovery.

### Rule of thumb

- Make changes in `.omp/` for OMP-native behavior.
- Do **not** edit `.kimi/` files as part of OMP optimization or routing work.
- If `.kimi/MASTER_PROMPT.md` and `.omp/` disagree, prefer `.omp/` for OMP sessions; Main should reconcile any persistent conflict explicitly.

## MCP servers

`.omp/mcp.json` configures the stdio MCP servers used by OMP sessions. The table below is the contract surface.

### Active servers (11)

| Server | Purpose | Required env variables | Notes |
|--------|---------|------------------------|-------|
| `filesystem` | Local file-system access | None (uses root path) | No secrets |
| `supabase-db` | Supabase/Postgres management | `DATABASE_URL` or `POSTGRES_URL` | Loads all `.env.local` vars |
| `sanity` | CMS read/write | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN` (optional `SANITY_API_WRITE_TOKEN`) | Read/write CMS |
| `github` | GitHub API | `GH_PAT` or `GITHUB_TOKEN` | `GH_PAT` is mapped to `GITHUB_TOKEN` |
| `perplexity` | Research search | `PERPLEXITY_API_KEY` | Web search |
| `resend` | Email sending | `RESEND_API_KEY` | Revived via local wrapper |
| `mempalace` | Project knowledge graph | `MEMPALACE_ROOT`, `MEMPALACE_CONFIG` | Shared knowledge server |
| `cloudflare` | Workers, DNS, Pages, cache | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (optional `CLOUDFLARE_ZONE_ID`) | Deploy/infra work |
| `binance` | Market data + trading | `BINANCE_API_KEY`, `BINANCE_API_SECRET` (optional `BINANCE_TESTNET`) | Keys not set locally; tools will fail auth until populated |
| `stripe` | Payments | `STRIPE_SECRET_KEY` | Key not set locally; tools require a real token |
| `chrome` | Browser automation | `MCP_API_KEY` (optional `CHROME_CDP_URL`, `CHROME_MCP_ALLOWLIST`, `CHROME_MCP_PROFILE_MODE`) | Requires `playwright` installed |

### Available but not activated

| Server | Purpose | Required env variables | Notes |
|--------|---------|------------------------|-------|
| `klarpakke` | Remote Supabase Edge Function proxy | `KLARPAKKE_MCP_TOKEN` | Deactivated: placeholder token and endpoint unreachable from this network. Activate when token and network are in place. |

### Workstation-specific paths

The `command` and `args` paths in `.omp/mcp.json` are tied to the current development workstation (`/Users/taj/...`). If you open this repo on another machine, you must regenerate or edit `.omp/mcp.json` so the Node binary and script paths match that environment. The file contains no secrets; only file paths and server metadata.

## When to use which agent

Use the project specialists for their domains; fall back to `klarpakke-coder` for cross-cutting work that spans several domains. Bundled OMP agents (`explore`, `task`, `reviewer`, `plan`) remain available for non-project-specific work.

| Agent | Use for |
|-------|---------|
| `klarpakke-cloudflare-workers-ops` | Cloudflare Workers Builds, Wrangler deploy, `/api/health`, routes, logs, secrets, rollback, and correcting stale Vercel assumptions. |
| `klarpakke-live-trading-integrity` | Trades, sessions, Binance, live/paper parity, tier gates, RLS, trade history, and updating `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`. |
| `klarpakke-trading-realtime-market-data` | Supabase Realtime, `useCockpitRealtime`, websocket auth, heartbeat, crash detection, candles, and Binance 403/fallback. |
| `klarpakke-db-rls-guard` | Supabase schema, migrations, RLS policies, RPC signatures, `search_path`, generated types, and service-role boundaries. |
| `klarpakke-cockpit-qa` | Trading Cockpit `/no/handel`, `/en/handel`, tabs, filters, pagination, analysis charts, raw i18n keys, console/network UI smoke. |
| `klarpakke-coder` | Cross-cutting implementation that touches several subsystems; delegates to the narrow specialists above. |
| `plan` | Architecture, large multi-domain design, or complex decisions. |
| `reviewer` | Code/security review when no custom specialist is needed. |
| `explore` | Read-only codebase mapping. |
| `task` | General bounded worker when no specialist fits. |

Delegation is the default. Only act directly for a single-file edit under ~30 lines, a single command, or a direct explanation.

## LSP servers

`.omp/lsp.json` configures language servers for the workspace:

- `typescript`
- `tailwindcss`
- `eslint`
- `json`
- `css`
- `html`
- `markdown`
- `yaml`

`sql-language-server` is installed but currently crashes on startup due to a `vscode-languageserver-protocol` export conflict, so it is omitted until fixed. All servers use `--stdio`; TypeScript and ESLint run with `NODE_OPTIONS --max-old-space-size=4096`.

## Secrets

Never commit API keys, tokens, or service-role credentials. Keep them in:

- `~/.omp/agent/models.yml` for KIMI API keys
- `.env.local` or your system keychain for project secrets
- Cloudflare Worker secrets / Supabase Edge Function secrets in production
