# Database Automation — Klarpakke Automation Subagent

**Scope:** Reusable Postgres/SQL utilities so the automation framework can inspect and remediate the Supabase database without re-inventing connection code.

---

## Files

| File | Purpose |
|------|---------|
| `scripts/automation/lib/db-client.mjs` | `getDbClient()`, `withDbClient()`, `queryDb()` — IPv4-first, SSL-relaxed, `.env.local`-driven Postgres client |
| `scripts/automation/lib/db-helpers.mjs` | `listAuthUserTriggers()`, `getFunctionSource()`, `hasTablePrivilege()`, `listTableColumns()`, `runSql()` |
| `scripts/automation/tools/db-query.mjs` | CLI/script entrypoint for running a SQL file or raw query |
| `scripts/automation/tool-registry.json` | Registry entries: `db:query`, `db:list_auth_triggers`, `db:inspect_function`, `db:check_privileges`, `db:list_table_columns` |

---

## Loading secrets

All DB automation loads secrets from `.env.local` via `loadEnvLocal()` in `scripts/load-env.mjs`.

Required values (usually via `POSTGRES_URL`):

- `POSTGRES_URL` or `DATABASE_URL` — preferred; parsed for host, port, user, password, database
- `POSTGRES_PASSWORD` — fallback if no connection string

The client always:

1. Sets `dns.setDefaultResultOrder('ipv4first')` before connecting.
2. Forces `family: 4`.
3. Uses `ssl: { rejectUnauthorized: false }` for the Supavisor pooler.

---

## Direct CLI usage

```bash
# Run a migration file
node scripts/automation/tools/db-query.mjs --file supabase/migrations/20260620xxxxxx_fix.sql

# Run raw SQL
node scripts/automation/tools/db-query.mjs "SELECT now()"

# Inspect auth triggers
node scripts/automation/lib/db-helpers.mjs list-auth-triggers

# Inspect a function
node scripts/automation/lib/db-helpers.mjs function-source public handle_new_user_consolidated

# Check privilege
node scripts/automation/lib/db-helpers.mjs check-privilege supabase_auth_admin public.user_settings INSERT

# List columns
node scripts/automation/lib/db-helpers.mjs list-columns public user_settings
```

---

## Automation runner usage

Use `runTool()` from `scripts/automation/lib/tool-runner.mjs`. The runner now supports `overrides.args` for script-type tools.

```javascript
import { runTool } from "./scripts/automation/lib/tool-runner.mjs";

// Run a migration file
await runTool("db:query", { args: ["--file", "supabase/migrations/20260620xxxxxx_fix.sql"] });

// Inspect a specific function
await runTool("db:inspect_function", { args: ["function-source", "public", "handle_new_user_klt"] });

// Check a privilege dynamically
await runTool("db:check_privileges", { args: ["check-privilege", "supabase_auth_admin", "public.risk_profiles", "INSERT"] });
```

Default registry entries provide sensible examples; override `args` to point at any schema/table/function.

---

## Patterns

- **Prefer `POSTGRES_URL`**: It already points at the IPv4 Supavisor pooler (`aws-1-eu-central-1.pooler.supabase.com:6543`). The direct Supabase host (`db.<ref>.supabase.co`) is IPv6-only and unreachable from this environment.
- **Idempotent migrations**: Use `CREATE OR REPLACE FUNCTION` (or `ALTER FUNCTION ... SECURITY DEFINER`) so migrations can be re-applied safely.
- **Security definer + search_path**: When a trigger on `auth.users` runs as `supabase_auth_admin`, SECURITY DEFINER gives it the owner's privileges, but the function still uses the *caller's* `search_path`. Pin it with `ALTER FUNCTION ... SET search_path = public, pg_temp;` if the function references public tables without the `public.` prefix.

---

## Auth trigger incident (2026-06-20)

Symptom: `POST /auth/v1/admin/users` returned `500 Database error creating new user`.

Root causes found and fixed:

1. Three trigger functions were `SECURITY INVOKER`; auth inserts run as `supabase_auth_admin`, which has no `INSERT` on public tables.
2. `handle_new_user_consolidated()` inserted into `user_settings` using non-existent columns `locale` / `notifications_enabled`.
3. `handle_new_user_onboarding_kla158()` inserted into `risk_profiles` using the non-existent column `is_default`.
4. `create_default_user_data()` generated a random UUID for `user_profiles.id`, violating FK `user_profiles_id_fkey`.
5. All functions referenced public tables without the `public.` prefix and relied on a search_path that `supabase_auth_admin` does not have.

Migrations:

- `supabase/migrations/20260620235800_fix_auth_user_triggers.sql`
- `supabase/migrations/20260621000000_fix_onboarding_kla158_risk_profile.sql`
- `supabase/migrations/20260621000500_fix_create_default_user_data_fk.sql`
- `supabase/migrations/20260621001000_set_auth_trigger_search_path.sql`

Verification: `POST /auth/v1/admin/users` returned `200`, and the created user had rows in `user_settings`, `email_preferences`, `risk_profiles`, `paper_trading_sessions`, `trading_sessions`, `kltbalances`, `user_klt_balances`, `onboarding_progress`, and `user_notification_settings`.
