# Production Release Checklist

Use this checklist before and after every production deployment.

## Pre-Deploy

- [ ] On `main` branch, up to date with remote
- [ ] `npm run lint` passes with 0 warnings
- [ ] `npm run test` passes (all unit tests green)
- [ ] `npm run build` completes successfully locally
- [ ] No new unreviewed Sentry errors from last deploy
- [ ] Environment variables in Vercel are up to date (see `docs/ENVIRONMENT.md`)

## Deploy

```bash
# Option A: Push to main (triggers Vercel auto-deploy)
git push origin main

# Option B: Manual deploy via GitHub Actions
# Go to https://github.com/tajlive/KP/actions → "Manual Deploy" → "production"

# Option C: Vercel CLI
vercel --prod --scope klarpakke
```

## Post-Deploy (within 5 minutes)

- [ ] Health check is green:
  ```bash
  curl -s https://www.klarpakke.no/api/health | jq '.status'
  # Expected: "healthy"
  ```

- [ ] Critical paths return 200:
  ```bash
  npm run verify
  # Or manually check: /no, /en, /no/innlogging, /no/priser
  ```

- [ ] No new errors in Sentry (check https://sentry.io)

- [ ] Correct version deployed:
  ```bash
  curl -s https://www.klarpakke.no/api/health | jq '.version'
  # Should match latest commit SHA (first 7 chars)
  ```

- [ ] Trading endpoints alive:
  ```bash
  curl -sI https://www.klarpakke.no/api/paper-trading/init | head -1
  # Expected: HTTP/2 401 (auth required = endpoint is alive)
  ```

## If Something Goes Wrong

```bash
# Immediate rollback
export VERCEL_TOKEN=<your-token>
./scripts/rollback-deployment.sh

# Verify rollback worked
curl -s https://www.klarpakke.no/api/health | jq '.'

# Notify team
# Post in #klarpakke-alerts with reason and status
```

See `ROLLBACK.md` and `runbook.md` for full incident procedures.
