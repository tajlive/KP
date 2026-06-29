# GitHub + Supabase + Vercel Optimization Checklist

This checklist captures high-impact settings that must be configured in provider UIs.

## GitHub

- Enable required status checks for `main` when plan allows branch protection:
  - `✅ PR Check / quick-check`
  - `E2E Critical Tests / e2e-critical`
- Require pull request before merge.
- Require linear history and disable force pushes to `main`.
- Set repository secrets:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ACCESS_TOKEN`
  - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `EXCHANGE_ENCRYPTION_SECRET`
- Keep Dependabot enabled for npm and GitHub Actions updates.

## Supabase

- Auth hardening:
  - Enable leaked password protection.
  - Enable at least one MFA factor (TOTP minimum).
- RLS hardening:
  - Avoid `WITH CHECK (true)` on `INSERT`/`UPDATE` for user-owned tables.
  - Use `WITH CHECK (auth.uid() = user_id)` where rows are user-owned.
- Secrets:
  - Keep service-role keys out of client bundles.
  - Rotate service-role key on incident or quarterly cadence.
- Extensions:
  - `pg_net` in `public` is flagged by advisor; current Postgres reports it cannot be moved with `ALTER EXTENSION ... SET SCHEMA`. Handle only with planned maintenance if needed.

## Vercel

- Runtime and build:
  - Node version `24.x` (already configured).
  - Install command `npm ci`.
- Environment variables:
  - Production + Preview values must both be set for:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `EXCHANGE_ENCRYPTION_SECRET`
    - `SENTRY_AUTH_TOKEN` (if release upload enabled)
- Observability:
  - Keep deployment auto-cancel for superseded previews.
  - Monitor failed functions in the Vercel Runtime tab.
- Performance:
  - Use short CDN cache for market and FX APIs (implemented in app routes).

## Verification after changes

- Run CI:
  - `npm run lint`
  - `npm run type-check`
  - `npm run test:unit`
- Run critical E2E:
  - `npm run test:e2e:critical:chromium`
- Confirm production health:
  - `GET /api/health` returns `200` or expected degraded state with diagnostics.

