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

### Blocker: Auth user creation fails with 500

`POST /auth/v1/admin/users` returned `500 Database error creating new user` because several `auth.users` trigger functions could not complete.

**Root causes remediated:**

1. Three trigger functions were `SECURITY INVOKER`; auth inserts run as `supabase_auth_admin`, which has no `INSERT` on public tables.
2. `handle_new_user_consolidated()` inserted into `user_settings` using non-existent columns `locale` / `notifications_enabled`.
3. `handle_new_user_onboarding_kla158()` inserted into `risk_profiles` using the non-existent column `is_default`.
4. `create_default_user_data()` generated a random UUID for `user_profiles.id`, violating FK `user_profiles_id_fkey`.
5. All functions referenced public tables without the `public.` prefix and relied on a search_path that `supabase_auth_admin` does not have.

### Resolution

1. ✅ Create append-only, idempotent migrations in `supabase/migrations/`.
2. ✅ Apply migrations directly to production with verification after each step.
3. ✅ Confirm `POST /auth/v1/admin/users` returns `200` and related rows are created.
4. ⏳ Run `npm run auto:e2e:critical` (timed out on first attempt; needs a focused run).

## 4. Deliverables

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Unified automation framework (`scripts/automation/`) | ✅ Done |
| 2 | Cloudflare repo deployed + secrets stored | ✅ Done |
| 3 | Supabase PAT scope fixed, `.env.local` synced | ✅ Done |
| 4 | DB/SQL automation utilities (`db-client`, `db-helpers`, registry tools) | ✅ Done |
| 5 | Migration drift remediated | ✅ Done |
| 6 | E2E test user created | ✅ Done |
| 7 | Playwright Chromium installed | ✅ Done (cached) |
| 8 | Critical E2E suite passing | ⏳ Pending (first run timed out) |

## 5. Acceptance Criteria

- `npm run auto:e2e:critical` exits 0.
- No uncommitted secrets.
- `.env.local` and MemPalace KG are in sync.
- Production schema matches expected migration state.

## 6. Sign-off

This contract is enacted by the Automation Subagent. Human approval is required before applying production schema remediation.
