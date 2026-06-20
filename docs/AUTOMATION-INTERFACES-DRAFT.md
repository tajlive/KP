# Automation Interfaces Inventory — Klarpakke

> Draft for unifying under an "Automatiserings-subagent".  
> Generated: 2026-06-20 | Repo: /Users/taj/klarpakke | Branch: main

## Legend

- **Ready** — callable as-is from another script/MCP/agent
- **Needs wrapper** — works, but needs unified argument parser / return schema / error handling
- **Broken / missing** — known gap or currently non-functional

---

## 1. CLI Scripts

### 1.1 Core automation / orchestration scripts (`scripts/`)

| Interface | Command | Purpose | Inputs | Outputs | Env / Secrets | Readiness |
|---|---|---|---|---|---|---|
| `automation-preflight` | `node scripts/automation-preflight.mjs [--full]` | Verifies cloud readiness, MCP config, optionally MCP connections + Linear | `--full` flag | Exit code + stdout | `CLOUD_READINESS_PROFILE`, `.env.local` | Ready |
| `cloud-readiness` | `node scripts/cloud-readiness.mjs --profile <agent\|deploy\|manual-deploy>` | Checks env completeness per profile | `--profile`, `--environment` | JSON / table stdout | Many env vars (see docs) | Ready |
| `verify-production` | `node scripts/verify-production.mjs` | Smoke tests production domain, redirects, security headers, API health | None | Colored stdout, exit code | None (hits public URLs) | Ready |
| `health-check` | `node scripts/health-check.mjs [api\|supabase\|signals\|trading\|full\|prod]` | Granular health checks | Mode arg | OK/FEIL per check | `.env.local` Supabase vars | Ready |
| `prod-health-gate` | `node scripts/prod-health-gate.mjs` | Production health gate | None | Exit code + JSON | `HEALTH_URL` optional | Ready |
| `health-recovery` | `node scripts/health-recovery.mjs` | Auto-remediation for known failures | None | Actions taken | Supabase, Slack | Needs wrapper |
| `coolify-deploy` | `node scripts/coolify-deploy.mjs` | Triggers Coolify deploy webhook | None | Deploy status | `COOLIFY_DEPLOY_WEBHOOK`, `COOLIFY_TOKEN` | Ready |
| `pre-push` | `node scripts/pre-push.mjs` | Git pre-push gate | None | Exit code | `.env.local` | Ready |
| `agent-bridge` | `node scripts/agent-bridge.mjs [dashboard\|handoff\|status\|sync]` | KIMI ↔ Antigravity (Claude) activity monitor & handoff manager | Subcommand | Dashboard/handoff file | Reads `.kimi/diary.jsonl`, `.mempalace/handoffs` | Ready |
| `kimi-smart-launch` | `node scripts/kimi-smart-launch.mjs ["task"] [--super\|--architect\|--swarm]` | Pre-session context + skill launch | Task string, flags | Brief + launched `kimi` process | `kimi` CLI, `.env.local` | Ready |
| `kimi-self-improve` | `node scripts/kimi-self-improve.mjs` | Post-session analysis of diary | None | Recommendations | `.kimi/diary.jsonl` | Ready |
| `kimi-smart-brief` | `node scripts/kimi-smart-brief.mjs "task"` | Generates pre-start brief | Task string | Markdown brief | MemPalace index | Ready |
| `kimi-mempalace-bridge` | `node scripts/kimi-mempalace-bridge.mjs` | Bridge Kimi CLI ↔ MemPalace | Varies | JSON | `.env.local` | Ready |
| `kimi-cli-wrapper` | `node scripts/kimi-cli-wrapper.ts <tool> [action]` | MCP-style CLI wrapper for db/ci/monitor/deploy | Tool + action | Structured JSON result | `.env.local`, `SLACK_DEPLOY_WEBHOOK` | Ready |
| `swarm-orchestrator` | `node scripts/swarm-orchestrator.mjs <review\|feature\|bugfix\|refactor\|security\|architect> [files]` | Runs multi-agent QA workflows | Workflow type, optional files | JSON report | `kimi` CLI | Ready |

**Failure modes observed / documented:**
- `kimi-smart-launch` falls back to `minimal` MCP profile if target config missing.
- `agent-bridge` expects handoff filename patterns `KIMI-*.md` / `ANTIGRAVITY-*.md`.
- `kimi-cli-wrapper` `deploy` action maps to `npm run deploy:preview` / `deploy:prod`, but `package.json` only defines `deploy:coolify`; may need alias update.

### 1.2 Vault scripts (`scripts/vault/`)

| Interface | Command | Purpose | Inputs | Outputs | Env / Secrets | Readiness |
|---|---|---|---|---|---|---|
| `vault:key` | `node scripts/vault/vault-key.mjs` | Load or generate `KLARPAKKE_VAULT_KEY` | None | Key to stdout | `.env.local` | Ready |
| `vault:encrypt` | `npm run vault:encrypt -- <name>` | Encrypt single secret from stdin | Secret name | Encrypted JSON blob | `KLARPAKKE_VAULT_KEY` | Ready |
| `vault:decrypt` | `node scripts/vault/decrypt-secret.mjs <name> '<blob>'` | Decrypt single secret | Name + blob | Plaintext to stdout | `KLARPAKKE_VAULT_KEY` | Ready |
| `vault:sync:env` | `node scripts/vault/sync-env-to-mempalace.mjs [--env-path PATH] [--dry-run]` | Encrypt all `.env.local` secrets into MemPalace KG | Env path, dry-run flag | Exit code + count | `KLARPAKKE_VAULT_KEY` | Ready |
| `vault:sync:mempalace` | `node scripts/vault/sync-mempalace-to-env.mjs [--env-path PATH] --force [--dry-run]` | Restore secrets from MemPalace KG to env file | Env path, `--force`, dry-run | Written file | `KLARPAKKE_VAULT_KEY` | Ready |
| `vault:verify` | `node scripts/vault/verify-round-trip.mjs` | Round-trip encrypt/decrypt verification | None | Passed/failed count | `KLARPAKKE_VAULT_KEY` | Ready |

**Failure modes:**
- `vault:sync:mempalace` refuses to overwrite without `--force`.
- `KLARPAKKE_VAULT_KEY` must be a 64-char hex string; missing key auto-generated and appended to `.env.local`.

### 1.3 External-service CLIs (`scripts/`)

| Interface | Command | Purpose | Inputs | Outputs | Secrets | Readiness |
|---|---|---|---|---|---|---|
| `cloudflare` | `npm run cloudflare -- <test\|zones\|dns\|account\|pages>` | Cloudflare zones, DNS, Pages | Subcommand + args | JSON / stdout | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Ready |
| `stripe` | `npm run stripe -- <test\|prices>` | Stripe balance/price checks | Subcommand | JSON / stdout | `STRIPE_SECRET_KEY` | Ready |
| `linear` | `npm run linear -- <teams\|issues\|create\|update>` | Linear issue CRUD | Subcommand + args | JSON / stdout | `LINEAR_API_KEY` | Ready |
| `vipps` | `npm run vipps -- test` | Vipps token test | None | Token status | `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET` | Ready |
| `cursor` | `npm run cursor -- <test\|me\|agents\|agent\|models\|config>` | Cursor Cloud Agents API | Subcommand + args | JSON / stdout | `CURSOR_API_KEY` | Ready |

### 1.4 Notable utility scripts (partial list)

- `scripts/check-oauth-config.mjs` / `oauth:check` — validates OAuth redirect URIs.
- `scripts/db-lint-gate.mjs` / `db-status-gate.mjs` — migration drift gates.
- `scripts/check-signal-pipeline-health.mjs` / `signals-cron-doctor.mjs` — signal engine health.
- `scripts/create-test-users.js` — E2E test user provisioning.
- `scripts/linear-watchdog-sync.mjs`, `scripts/slack-recovery-thread.mjs` — incident response.
- `scripts/watchdog-auto-repair.mjs` — auto-remediation.
- `scripts/ai-health-report.mjs` — weekly AI health report.
- `scripts/auto-index-maintenance.mjs`, `scripts/optimize-rls-policies.mjs` — DB maintenance.

---

## 2. MCP Tools

### 2.1 Configuration

- Source of truth: `.cursor/mcp.json`
- Synced to `.kimi/mcp-config.json`, `.mcp/mcp_config.json`, `.claude/mcp.json`, `.perplexity/mcp_config.json` via `npm run mcp:sync`.
- Smoke test: `npm run mcp:smoke` → `scripts/mcp-smoke-test.mjs`.
- All wrapper scripts load `.env.local` via `scripts/load-env.mjs`.

### 2.2 Servers & tools

| Server | Entry | Tools / Functions | Secrets / Env | Readiness |
|---|---|---|---|---|
| **filesystem** | `scripts/run-filesystem-mcp.mjs` | Official `@modelcontextprotocol/server-filesystem` (read/write project root) | None | Ready |
| **supabase-db** | `scripts/run-supabase-mcp.mjs` → `scripts/supabase-mcp-server.mjs` | `execute_sql(query)`, `list_tables(schemas, verbose)`, `apply_migration(name, query)` | `DATABASE_URL` or `POSTGRES_URL` | Ready |
| **sanity** | `scripts/run-sanity-mcp-v2.mjs` | `sanity_query`, `sanity_get_document`, `sanity_get_documents_by_type`, `sanity_create_document`, `sanity_update_document`, `sanity_patch_document`, `sanity_delete_document`, `sanity_publish_document`, `sanity_unpublish_document` | `SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN`, `NEXT_PUBLIC_SANITY_*` | Ready |
| **github** | `scripts/run-github-mcp.mjs` | Official `@modelcontextprotocol/server-github` (issues, PRs, repo) | `GH_PAT` or `GITHUB_TOKEN` | Ready |
| **context7** | `scripts/run-context7-mcp.mjs` | Official `@upstash/context7-mcp` library docs | None | Ready |
| **perplexity** | `scripts/run-perplexity-mcp.mjs` | `perplexity_search(query, model)` | `PERPLEXITY_API_KEY` | Ready |
| **mempalace** | `scripts/run-mempalace-mcp-v3.mjs` | `search`, `semantic_search`, `recent_context`, `kg_query`, `kg_add`, `kg_batch`, `kg_find_path`, `read_diary`, `write_diary`, `get_status`, `get_room_info`, `auto_tag` + resources/prompts | None (local zero-dep) | Ready |
| **kimi (custom)** | `scripts/kimi-mcp-server.ts` | `kimi_prompt`, `kimi_code`, `kimi_db`, `kimi_ci`, `kimi_monitor`, `kimi_deploy` | `kimi` CLI in PATH, `.env.local` | Ready |

### 2.3 MCP bridge / proxy

| Interface | Command | Purpose | Secrets | Readiness |
|---|---|---|---|---|
| `mcp:kimi` | `npm run mcp:kimi` | Custom Kimi MCP over stdio | None | Ready |
| `mcp:kimi:http` | `TRANSPORT=http PORT=3100 npm run mcp:kimi:http` | Native HTTP transport | `MCP_API_KEY` optional | Ready |
| `mcp:kimi:proxy` | `npm run mcp:kimi:proxy` | mcp-proxy SSE/HTTP wrapper | `MCP_API_KEY` | Ready |
| `mcp:bridge:start` | `npm run mcp:bridge:start` | Legacy compiled bridge | None | Needs wrapper |

---

## 3. Internal APIs

Base URL: `https://www.klarpakke.no` (production) / `http://localhost:3000` (dev).

### 3.1 Health & monitoring

| Route | Method | Auth | Purpose | Readiness |
|---|---|---|---|---|
| `/api/health` | GET | None | Full health check (DB, signals, KV, env) | Ready |
| `/api/health/sonar` | GET | None | OAuth/sonar health | Ready |
| `/api/health/oauth` | GET | None | OAuth config health | Ready |
| `/api/health/websocket` | GET | None | WebSocket health | Ready |
| `/api/health/metrics` | GET | None | Metrics health | Ready |
| `/api/cron/health-check` | GET/POST | `CRON_SECRET` | Cron-triggered health polling | Ready |
| `/api/revalidate` | GET | `?secret=REVALIDATE_SECRET` | On-demand ISR revalidation | Ready |

### 3.2 Admin routes (`/api/admin/*`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/admin/verify` | GET | Supabase Bearer token + admin role | Verify admin access |
| `/api/admin/stats` | GET | Admin | General stats |
| `/api/admin/dashboard/data?period=7d\|30d\|90d\|all` | GET | Admin | Dashboard KPIs |
| `/api/admin/users` | GET | Admin | List users |
| `/api/admin/users/sync` | POST | Admin | Sync users |
| `/api/admin/errors` | GET | Admin | Error list |
| `/api/admin/errors/[id]/resolve` | POST | Admin | Resolve error |
| `/api/admin/cron-trigger` | POST | Admin | Trigger `/api/cron/tick` |
| `/api/admin/campaign/*` | GET | Admin | Campaign stats/recent |
| `/api/admin/funnel/stats` | GET | Admin | Funnel stats |
| `/api/admin/user-tier` | GET | Admin | User tier info |
| `/api/admin/kla130` | GET/POST | Admin | KLA130 ops endpoint |
| `/api/admin/user-paper-balance` | GET/POST | Admin | Paper balance management |
| `/api/admin/stripe-health` | GET | Admin | Stripe health |
| `/api/admin/resend-health` | GET | Admin | Resend health |
| `/api/admin/github-health` | GET | Admin | GitHub health |

### 3.3 Cron engine routes (`/api/cron/*`)

All require `Authorization: Bearer CRON_SECRET` (via `validateCronSecret`).

| Route | Purpose |
|---|---|
| `/api/cron/tick` | Main trading tick engine (paper/live/copy) |
| `/api/cron/signal-health-selfcheck` | Self-heal signal engine via Supabase Edge Function |
| `/api/cron/sync-prices` | Price sync |
| `/api/cron/ai-engine` | AI signal generation |
| `/api/cron/ai-metrics` | AI metrics |
| `/api/cron/binance-sync` | Binance sync |
| `/api/cron/balance-drift-check` | Balance drift monitoring |
| `/api/cron/backtest-live-gap` | Backtest/live gap detection |
| `/api/cron/daily-summary` | Daily summary |
| `/api/cron/keepalive` | Keepalive |
| `/api/cron/update-usdt-nok` | USDT/NOK rate update |
| `/api/cron/trading-tca` | TCA analytics |
| `/api/cron/market-impact` | Market impact |
| `/api/cron/fill-rate-monitor` | Fill-rate monitoring |
| `/api/cron/pl-attribution` | P&L attribution |
| `/api/cron/signal-decay` | Signal decay |
| `/api/cron/adverse-selection` | Adverse selection |
| `/api/cron/feature-loader` | Feature flags |
| `/api/cron/auto-trade` | Auto-trade |
| `/api/cron/twap-execute` | TWAP execution |
| `/api/cron/portfolio-rebalance` | Portfolio rebalance |
| `/api/cron/outbox-recovery` | Outbox recovery |
| `/api/cron/mifid2-export` | MiFID II export |
| `/api/cron/cron-health` | Cron subsystem health |

### 3.4 Trading & AI routes

| Route | Purpose | Auth |
|---|---|---|
| `/api/ai/chat` | AI chat | User session |
| `/api/ai/ensemble` | Ensemble signals | User session |
| `/api/ai/analyze-trade` | Trade analysis | User session |
| `/api/ai/explain-trade` | Trade explanation | User session |
| `/api/ai/explain-strategy` | Strategy explanation | User session |
| `/api/ai/market-brief` | Market brief | User session |
| `/api/ai/sentiment` | Sentiment | User session |
| `/api/ai/insight` | Insight | User session |
| `/api/ai/autopilot/*` | Autopilot activate/pause/resume/rebalance/status | User session |
| `/api/trades`, `/api/trading-sessions`, `/api/paper-trading` | Trading CRUD | User session |
| `/api/copy-trading/*` | Copy trading | User session |
| `/api/market/*`, `/api/market-intelligence` | Market data | Mixed |
| `/api/binance/*` | Binance proxy/keys/test | User session / admin |
| `/api/dashboard/*` | Dashboard data | User session |

### 3.5 Webhooks (`/api/webhooks/*`)

| Route | Purpose | Auth |
|---|---|---|
| `/api/webhooks/stripe` | Stripe payment events | Stripe signature |
| `/api/webhooks/resend` | Resend email events | Resend signature |
| `/api/webhooks/sanity` | Sanity CMS webhook | Secret token |

### 3.6 Auth routes (`/api/auth/*`)

| Route | Purpose | Auth |
|---|---|---|
| `/api/auth/diagnose` | Auth diagnostics | Admin/service |
| `/api/auth/vipps-url` | Vipps login URL | Public |

---

## 4. External APIs / Services

| Service | How integrated | Key env vars | Used for automation | Readiness |
|---|---|---|---|---|
| **Supabase** | `@supabase/ssr`, `@supabase/supabase-js`, `pg` pooler, Edge Functions | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL`, `DATABASE_URL` | DB health, migrations, RPC, Edge Function deploy/invoke | Ready |
| **Cloudflare** | CLI `scripts/cloudflare-api.mjs`, DNS/CDN in front of Coolify | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | DNS/Pages management, CDN purge | Ready |
| **Coolify** | Webhook deploy (`scripts/coolify-deploy.mjs`, Woodpecker) | `COOLIFY_DEPLOY_WEBHOOK`, `COOLIFY_TOKEN` | Production deploy trigger | Ready |
| **Binance** | `binance-api-node`, REST + WebSocket, Edge Functions | `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `BINANCE_USE_TESTNET` | Live/paper trade execution, price data | Ready |
| **Stripe** | `stripe` SDK + webhook + Edge Functions | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments, subscriptions, checkout | Ready |
| **Resend** | `resend` SDK + MCP server (formerly) | `RESEND_API_KEY` | Transactional email | Ready |
| **Linear** | `scripts/linear-api.mjs`, `@linear/sdk` | `LINEAR_API_KEY` | Issue tracking, incident automation | Ready |
| **Slack** | Incoming webhooks | `SLACK_WEBHOOK`, `SLACK_DEPLOY_WEBHOOK` | Alerts, deploy notifications | Ready |
| **Perplexity** | Custom MCP server | `PERPLEXITY_API_KEY` | Research | Ready |
| **GitHub** | MCP server + `scripts/sync-github-actions-secrets.mjs` | `GH_PAT` / `GITHUB_TOKEN` | Issues, PRs, secrets sync | Ready |
| **Vipps** | `scripts/vipps-api.mjs`, `/api/auth/vipps-url` | `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `VIPPS_BASE_URL` | Login/payments | Ready |
| **Cursor** | `scripts/cursor-api.mjs` | `CURSOR_API_KEY` | Cloud agents | Ready |
| **GlitchTip** | Sentry-compatible DSN | `NEXT_PUBLIC_GLITCHTIP_DSN` | Error tracking | Ready |
| **Upstash Redis / KV** | `@upstash/redis` | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `KV_REST_*` | Rate limiting, caching, health cache | Ready (optional) |
| **Sanity** | `@sanity/client`, MCP server | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN` | CMS content | Ready |
| **OpenAI / AI SDK** | `ai`, `@ai-sdk/openai` | `OPENAI_API_KEY` | AI features | Ready |
| **Hugging Face** | `@huggingface/inference` | `HF_TOKEN` / inferred | Inference | Ready |

### 4.1 Supabase Edge Functions (`supabase/functions/`)

Key functions for automation:

| Function | Purpose |
|---|---|
| `signal-engine` | Signal generation engine |
| `auto-trade` | Auto trade execution |
| `binance-connector` | Binance connectivity |
| `place-binance-order` | Order placement |
| `sync-binance-trades` | Trade sync |
| `position-monitor` | Position monitoring |
| `ensemble-signals` | Ensemble AI signals |
| `strategy-runner` | Strategy execution |
| `create-checkout-session` / `create-portal-session` | Stripe billing |
| `stripe-webhook` / `stripe-webhook-logger` | Stripe webhook handling |
| `send-notifications` / `welcome-email` / `beta-approval-email` | Email |
| `daily-ops-report` / `weekly-marketing-report` / `cron-weekly-review` / `cron-daily-analysis` | Reporting |
| `post-deploy-check` | Post-deploy health check |
| `migrations-runner` / `apply-migration` / `run-sql` / `exec-sql` | DB ops |
| `klarpakke-mcp` | Remote MCP gateway |
| `api-gateway` | API gateway |

---

## 5. npm Scripts (automation-relevant subset)

| Script | Command | Purpose | Readiness |
|---|---|---|---|
| `verify` | `node scripts/verify-production.mjs` | Production smoke test | Ready |
| `build` / `build:local` | `next build` | Build | Ready |
| `lint` / `lint:gate` / `lint:fix` | `eslint` | Lint | Ready |
| `type-check` | `tsc --noEmit` | Type check | Ready |
| `test:unit` / `test` | `vitest run` | Unit tests | Ready |
| `test:e2e:*` | `playwright test` | E2E suites | Ready |
| `deploy:coolify` | `node scripts/coolify-deploy.mjs` | Trigger Coolify deploy | Ready |
| `health:*` | `node scripts/health-check.mjs ...` | Health checks | Ready |
| `health:prod:gate` | `node scripts/prod-health-gate.mjs` | Prod gate | Ready |
| `verify:prod` | `bash scripts/smoke-prod.sh` | Prod smoke | Ready |
| `db:status` / `db:push` / `db:push:all` / `db:gen-types` / `db:lint` | `supabase` CLI | DB operations | Ready |
| `signals:*` | Various | Signal pipeline | Ready |
| `mempalace:*` | Various | Memory sync/status | Ready |
| `swarm:*` | `node scripts/swarm-orchestrator.mjs` | Swarm QA | Ready |
| `agent:*` / `ask:gemini` / `tell:kimi` | `.kimi/AGENT_ORCHESTRATOR.sh` | Agent orchestration | Ready |
| `mcp:*` | Various | MCP config/bridge/test | Ready |
| `vault:*` | `node scripts/vault/*` | Secrets vault | Ready |
| `secrets:*` | `node scripts/sync-github-actions-secrets.mjs` | GitHub secrets sync | Ready |
| `cloud:*` | `node scripts/cloud-readiness.mjs` | Cloud readiness | Ready |
| `auto:preflight` / `auto:preflight:full` | `node scripts/automation-preflight.mjs` | Automation preflight | Ready |
| `linear:*` / `stripe:*` / `vipps:*` / `cloudflare:*` / `cursor:*` | External service CLIs | Ready |
| `preprod:gate` | Full pre-prod pipeline | CI-like gate | Ready |
| `release` | Lint + type-check + build | Release prep | Ready |

---

## 6. Subagent / Trigger Patterns

### 6.1 Skills (`/.kimi/skills/`)

| Skill | File | Domain | MCP profile |
|---|---|---|---|
| `klarpakke-super` | `SKILL.md` | General / catch-all | auto |
| `klarpakke-architect` | `SKILL.md` | Deploy & architecture | medium |
| `klarpakke-auth` | `SKILL.md` | Auth & security | medium |
| `klarpakke-trading` | `SKILL.md` | Trading engine | full |
| `klarpakke-database` | `SKILL.md` | DB & schema | full |
| `klarpakke-performance` | `SKILL.md` | Frontend & UI | minimal |
| `klarpakke-testing` | `SKILL.md` | Testing & QA | medium |
| `klarpakke-mempalace` | `SKILL.md` | Memory & KG | minimal |

Loaded via `kimi --skills-dir .kimi/skills/<skill>` or aliases in `.kimi/commands.json`.

### 6.2 Swarm configuration

- Config: `.kimi/swarm-config.json`
- Agents: `analyzer`, `architect`, `tester`, `security`, `knowledge`
- Workflows: `feature`, `bugfix`, `refactor`, `security`, `architect`, `review`
- Trigger command: `npm run swarm:<workflow>` → `scripts/swarm-orchestrator.mjs`

### 6.3 Agent orchestrator

- Script: `.kimi/AGENT_ORCHESTRATOR.sh`
- Modes: `plan`, `execute`, `swarm`, `handoff`, `status`
- Plans written to `.mempalace/plans/TASK-*.md`
- Handoffs written to `.mempalace/handoffs/HANDOFF-*.md`
- Diary at `.mempalace/kimi_sessions/orchestrator.log`

### 6.4 Command aliases

- Config: `.kimi/commands.json`
- Provides `kimi health`, `kimi verify`, `kimi build`, `kimi deploy`, `kimi prod`, `kimi swarm:*`, etc.
- Some aliases reference legacy commands (e.g. `deploy:prod`, `preview` with `flyctl`) that no longer exist in `package.json` — may need cleanup.

### 6.5 CI/CD triggers

| Trigger | File | What runs |
|---|---|---|
| PR to `main` | `.woodpecker/pr-check.yml` | install → type-check → lint → unit tests → build |
| Push to `main` | `.woodpecker/deploy.yml` | install → build → Coolify webhook → health check with commit verification |

### 6.6 Hooks / automation triggers

| Hook | Location | Trigger |
|---|---|---|
| Husky pre-commit | `.husky/` | `npm run pre-commit` |
| lint-staged | `package.json` | ESLint + Prettier on staged files |
| SessionEnd MemPalace flush | `~/.kimi/hooks/mempalace-smart-exit.sh` | KIMI session end |
| `prebuild` | `package.json` | `npm run i18n:validate` |
| `predeploy` | `package.json` | type-check + build |

---

## 7. Gaps & Recommendations for the "Automatiserings-subagent"

| # | Gap | Suggested fix |
|---|---|---|
| 1 | No single unified dispatch interface | Create `scripts/automation-subagent.mjs` that accepts a JSON task and routes to CLI/MCP/API |
| 2 | `kimi-cli-wrapper.ts` deploy maps to non-existent `deploy:preview`/`deploy:prod` | Align with `deploy:coolify` or add preview/prod aliases |
| 3 | `.kimi/commands.json` contains legacy Fly.io / Vercel commands | Audit and remove stale aliases |
| 4 | External service CLIs return ad-hoc stdout formats | Standardize to JSON schema across `cloudflare`, `stripe`, `linear`, `vipps`, `cursor` |
| 5 | Cron routes need `CRON_SECRET` — no rotation tooling | Add secret rotation script / vault integration |
| 6 | No unified status dashboard for automation | Extend `agent-bridge` or create a new `automation-status` route |
| 7 | MCP servers are stdio-based; no persistent daemon | Consider `mcp:kimi:http` as a long-lived service for agent use |
| 8 | Health checks mix local + remote concerns | Split `health-check.mjs` into local-dev vs prod-watchdog modes |
| 9 | Skill activation is manual | Hook `kimi-smart-launch` classification into automation dispatch |
| 10 | No canonical task result schema | Define JSON schema for task inputs/outputs across scripts |

---

## Appendix A: Environment variables required for full automation

See also `docs/SECRETS-INVENTORY.md`, `.env.example`, and `.env-templates/`.

- **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL`
- **Deploy:** `COOLIFY_DEPLOY_WEBHOOK`, `COOLIFY_TOKEN`
- **Monitoring:** `CRON_SECRET`, `REVALIDATE_SECRET`, `SLACK_WEBHOOK`, `SLACK_DEPLOY_WEBHOOK`
- **External APIs:** `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `LINEAR_API_KEY`, `CLOUDFLARE_API_TOKEN`, `GITHUB_TOKEN`/`GH_PAT`, `PERPLEXITY_API_KEY`, `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `CURSOR_API_KEY`
- **CMS:** `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN`
- **Vault:** `KLARPAKKE_VAULT_KEY`
- **Optional:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_GLITCHTIP_DSN`, `OPENAI_API_KEY`
