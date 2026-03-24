# Signal + Copy automation runbook

## Source of truth

- Scheduler: Supabase pg_cron.
- Monitor safety-net: GitHub Actions.
- Production domain: `https://www.klarpakke.no` (Cloudbase/Cloudflare DNS).

## Scheduled jobs (Supabase)

- `signal-engine-5min`
- `signal-fallback-seed-5min`
- `signal-health-selfcheck-10min`

`signal-health-selfcheck-10min` calls:

- `GET /api/cron/signal-health-selfcheck`

Auth:

- `Authorization: Bearer <CRON_SECRET>` from `app.settings.cron_secret`.

## Threshold policy

- stale: 20 min
- critical: 40 min
- incident: 60 min

## Auto-heal flow

1. Selfcheck reads `bot_health`.
2. If stale/missing heartbeat -> invokes `signal-engine` once.
3. Re-checks heartbeat after short delay.
4. Returns `ok=false` if still stale (triggers alerts/escalation).

## CI safety-net

Workflow: `.github/workflows/prod-health-alert.yml`

- runs every 15 min
- executes `scripts/prod-health-gate.mjs`
- sends webhook on failure (`OPS_ALERT_WEBHOOK_URL`)
- optional Linear incident via `scripts/create-linear-incident.mjs`

Required GitHub secrets:

- `OPS_ALERT_WEBHOOK_URL` (optional but recommended)
- `LINEAR_API_KEY` (optional)
- `LINEAR_TEAM_ID` (optional)

## Domain guard (Cloudbase/Cloudflare)

Nightly checks should verify:

- DNS records still resolve `www.klarpakke.no` correctly.
- TLS valid.
- `/api/health` returns JSON.

Any domain drift should open critical incident.

## Manual break-glass commands

- `npm run signals:health`
- `npm run signals:doctor`
- `npm run signals:invoke`

Use manual invoke only when self-heal did not recover automatically.
