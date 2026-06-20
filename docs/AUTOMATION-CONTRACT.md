# Automation Subagent Contract — Klarpakke

**Date:** 2026-06-20  
**Agent:** Automation Subagent (`scripts/automation/`)  
**Scope:** Automate environment setup, deployment, secrets management, and E2E enablement for the Klarpakke project.

---

## 1. Mandate

The Automation Subagent is authorized to:

1. Read all local secrets from `.env.local` and MemPalace KG.
2. Update `.env.local` when a verified correct value is obtained from an authoritative source.
3. Sync updated `.env.local` to MemPalace KG.
4. Install local dependencies (e.g., Playwright browsers).
5. Build and deploy the Cloudflare Workers project (`klarpakke-cloudflare`).
6. Rotate and store Cloudflare secrets (`BETTER_AUTH_SECRET`) in both Cloudflare and MemPalace.
7. Run health checks and verification commands.
8. Investigate and remediate **environmental** blockers (wrong tokens, missing binaries, misconfigurations).

## 2. Constraints (non-negotiable)

1. **No blind production database migrations.** Production schema changes require a controlled, reviewed, append-only migration remediation branch.
2. **No raw secrets in logs or commits.** All secrets are masked in output and never committed.
3. **Preserve `.env.local` and MemPalace isolation.** The master key `KLARPAKKE_VAULT_KEY` never leaves `.env.local`.
4. **Verify before claiming success.** Every automated step must have a pass/fail check.

## 3. Current Blocker & Resolution Plan

### Blocker: E2E user creation fails

`scripts/create-test-users.js --primary-only` fails with `Database error creating new user` because trigger `on_auth_user_created_kla158` references `public.paper_trading_sessions`, which does not exist in production project `pskhryjzkobytnfwucrb`.

**Root cause:** Migration drift. Migrations exist locally but have not been applied to production in the correct order/state.

### Resolution

1. Generate a drift report comparing local migrations to production schema.
2. Create a controlled remediation branch with **append-only** migrations that add missing objects (starting with `paper_trading_sessions`).
3. Run the remediation against a shadow/clone database first if possible; otherwise apply directly with explicit rollback plan.
4. After schema is consistent, create the E2E test user automatically.
5. Run `npm run auto:e2e:critical`.

## 4. Deliverables

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Unified automation framework (`scripts/automation/`) | ✅ Done |
| 2 | Cloudflare repo deployed + secrets stored | ✅ Done |
| 3 | Supabase PAT scope fixed, `.env.local` synced | ✅ Done |
| 4 | Playwright Chromium installed | ⏳ Pending |
| 5 | Migration drift remediated | ⏳ Pending |
| 6 | E2E test user created | ⏳ Pending |
| 7 | Critical E2E suite passing | ⏳ Pending |

## 5. Acceptance Criteria

- `npm run auto:e2e:critical` exits 0.
- No uncommitted secrets.
- `.env.local` and MemPalace KG are in sync.
- Production schema matches expected migration state.

## 6. Sign-off

This contract is enacted by the Automation Subagent. Human approval is required before applying production schema remediation.
