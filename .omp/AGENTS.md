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

## Main-agent automation playbook

> For detailed workflow rules, secrets handling, and emergency procedures, see `../.kimi/WORKFLOW_RULES.md`. This section is a quick-reference for routine Main-agent flows only.

### When to delegate vs. do directly

Do the work yourself when **any** of these is true:

- A single-file edit under ~30 lines.
- A direct explanation, investigation, or one-off command.
- The user explicitly asks you to run a command yourself.

Delegate via `task` or the relevant specialist otherwise. Use parallel batches for independent slices; keep Main responsible for final synthesis and verification.

### Standard deploy-verify sequence

1. **Push to GitHub first.**
   ```bash
   git add -A
   git commit -m "type: description"
   git push origin main
   ```
2. **Wait for Cloudflare Workers Builds.** (~2–3 min.)
   ```bash
   npx wrangler deployment list
   ```
3. **Verify production health endpoint.**
   ```bash
   curl -s https://www.klarpakke.no/api/health | jq
   ```
   Confirm `status` is `healthy` and the returned `version` matches the pushed commit.
4. **Verify the relevant subsystem.**
   - Trading/live/paper/history: use MCP/Supabase to inspect `public.trades` / `public.trading_sessions`, or run focused scripts such as `npm run diagnose:signals-traders` / `npm run diagnose:user-trades`.
   - Cockpit UI: use `klarpakke-cockpit-qa` for authenticated smoke of `/no/handel`.
   - Update `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` when verification involves trading integrity.

### Pre-push gates

- **Fast gate (default):** `node scripts/pre-push.mjs` runs type-check, lint gate, i18n, migration validation if staged, unit tests, production build, and mobile fast-check. Skips E2E smoke to stay fast.
- **Full gate:** `node scripts/pre-push.mjs --full` runs the same plus E2E smoke. Use when the change touches routing, auth, trading execution paths, or anything where a full smoke is worth the time.

> Keep the `.husky/pre-push` hook fast: it currently runs `lint:gate`, `type-check`, and `test:unit`. If you change the hook, keep the minimum mandatory gates under ~60s for routine pushes.

### Status reporting cadence

- Report to the user every **1–3 minutes** during long operations (deploy waits, builds, E2E runs, DB migrations, or multi-agent swarms).
- Include what just completed, what is running now, and the next step.
- If blocked, say exactly what is blocking and what you are waiting for.

### Specialist routing map

Use these four agents for their domains; fall back to `klarpakke-coder` for cross-cutting work that spans several domains.

| Agent | Use for |
| ----- | ------- |
| `klarpakke-cloudflare-workers-ops` | Cloudflare Workers Builds, Wrangler deploy, `/api/health`, routes, logs, secrets, rollback, and correcting stale Vercel assumptions. |
| `klarpakke-live-trading-integrity` | Trades, sessions, Binance, live/paper parity, tier gates, RLS, trade history, and updating `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`. |
| `klarpakke-trading-realtime-market-data` | Supabase Realtime, `useCockpitRealtime`, websocket auth, heartbeat, crash detection, candles, and Binance 403/fallback. |
| `klarpakke-db-rls-guard` | Supabase schema, migrations, RLS policies, RPC signatures, `search_path`, generated types, and service-role boundaries. |
| `klarpakke-cleanup-orchestrator` | Post-task / post-deploy verification, roster cleanup, and final status report. Read-and-report only. |

For Trading Cockpit UI/E2E smoke, use `klarpakke-cockpit-qa`. For cross-cutting implementation that touches multiple domains, use `klarpakke-coder` and let it delegate to the narrow specialists above.

## 1. Status triage matrix

| User prompt | Main-agent response |
|-------------|---------------------|
| "hva skjer", "status", "hvordan går det" | 2–3 bullets: current phase, active subagents, next step. No JSON, no roster dump. |
| "følg med", "oppdater meg", "hold meg oppdatert" | Promise a cadence (every 1–3 min), then give an immediate status snapshot. Resume cadence until the task is done or the user stops it. |
| "fiks X", "løs Y", "deploy nå" | Confirm understanding in one sentence, set/update todos, delegate to the right specialist or act directly, and report back when done. |
| User sends a token, API key, password, or other secret | Acknowledge receipt only ("lagret / notert / mottatt"). Do not log it, do not echo it, do not include it in any output. Continue the task using the secret once. |

## 2. Agent lifecycle rules

- **Max 4 concurrent subagents.** Use at most one `task` batch of 4 at a time. If there is more work, queue it or fold it into the current batch.
- **After each parallel batch**, broadcast a brief status to IRC `all`: done / blocked / next step. Keep it to one sentence.
- **When a subagent completes and its result is merged**, send a short status update to the user (what finished, what remains).
- **Parked agents are normal.** Do not message them unless you need them. Main may broadcast `all: done, thank you` at the end of a round to signal cleanup.

## 3. Main-agent checklist

### Before
- Read this `.omp/AGENTS.md` and the relevant specialist agent file under `.omp/agents/`.
- Set/update todos for the task.
- Decide: direct edit (<30 lines or single command) vs. delegate via `task`.

### During
- Report to the user every 1–3 min during long work.
- Coordinate active subagents via IRC; broadcast to `all` after each batch.
- For trading/live/paper/RLS/history/Binance work, keep `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` updated as verification happens.

### After
- Verify behavior or production health (see standard deploy-verify sequence above).
- Push to GitHub if the task produced changes and the user expects a deploy.
- Update `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` when trading integrity was involved.
- Clear completed todos; broadcast a one-sentence cleanup message to IRC `all`.
- Spawn `klarpakke-cleanup-orchestrator` for post-deploy or large post-task verification and roster cleanup.

## 4. Subagent failure handling

- **If a subagent times out or aborts with no output**, Main immediately takes over. Do not wait silently.
- Inspect `git status` and any partial file changes. Decide: complete the work directly, or respawn a narrower, more focused task with tighter instructions.
- **Never say "I am waiting"** without also stating what you are waiting for and for how long.
- **If a task cannot be completed automatically**, state exactly what is missing and drop it. Do not loop indefinitely or pretend to progress.

