# Signal-Engine Cron Auth Checklist (Permanent Fix)

When `signals:health` repeatedly flips from healthy to stale, the usual root cause is
`pg_cron` not reaching Edge Function `signal-engine` with valid auth.

## 1) Confirm job exists and is active

```sql
select jobid, jobname, schedule, active, command
from cron.job
where jobname in ('signal-engine-5min', 'signal-fallback-seed-5min')
order by jobname;
```

Expected:

- `signal-engine-5min` exists, `active = true`
- `signal-fallback-seed-5min` exists, `active = true` (safety net)

## 2) Inspect last executions (most important)

```sql
select
  j.jobname,
  d.status,
  d.return_message,
  d.start_time,
  d.end_time
from cron.job_run_details d
join cron.job j on j.jobid = d.jobid
where j.jobname in ('signal-engine-5min', 'signal-fallback-seed-5min')
order by d.start_time desc
limit 100;
```

Interpretation:

- `status = succeeded` for `signal-engine-5min` = good
- `401/403` in `return_message` = bad Authorization header/secret
- timeout/network errors = function unreachable from cron

## 3) Verify bot heartbeat directly

```sql
select bot_name, status, last_heartbeat, updated_at, left(coalesce(last_error, ''), 200) as last_error
from public.bot_health
where bot_name = 'signal-engine';
```

Expected:

- `last_heartbeat` updates about every 5 minutes
- `status` should not be `error` repeatedly

## 4) Validate cron HTTP auth pattern

The `signal-engine-5min` command should use:

- URL: `https://<project-ref>.supabase.co/functions/v1/signal-engine`
- Header `Authorization: Bearer <service_role_key>` (from DB setting/vault)

If not, re-apply migration that schedules the job or patch the cron command.

## 5) Immediate recovery (non-destructive)

From repo root:

```bash
npm run signals:doctor
```

This:

- checks stale heartbeat/feed,
- invokes edge `signal-engine` once if stale,
- re-checks and prints before/after.

## 6) Fully automated deploy + health chain

```bash
npm run signals:deploy:pipeline
```

Runs:

- `db:push:all:yes`
- `signals:deploy:edge` (`--use-api`, no local Docker needed)
- `signals:invoke`
- `signals:health`

## 7) Distinguish two different symptoms

- **Stale heartbeat**: scheduler/auth path problem (`signal-engine-5min`)
- **No traders listed in UI**: `trader_profiles.is_public = true` rows missing (data/content issue)
