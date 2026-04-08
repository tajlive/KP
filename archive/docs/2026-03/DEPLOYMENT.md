# Klarpakke Deployment Guide

## Quick Deploy to Production

```bash
# 1. Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# 2. Validate environment (locally)
./scripts/validate-env.sh

# 3. Push to trigger automatic deployment
git push origin main

# 4. Monitor deployment
# GitHub Actions: https://github.com/tajlive/KP/actions
# Vercel Dashboard: https://vercel.com (team: klarpakke)
```

## Health Check

Production health: https://www.klarpakke.no/api/health

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-04T21:00:00.000Z",
  "version": "abc1234",
  "checks": {
    "database": { "status": "ok", "latency": 45 },
    "kv": { "status": "ok", "latency": 12 },
    "environment": { "status": "ok" }
  },
  "uptime": 3600
}
```

## Monitoring Setup

### 1. Sentry (Error Tracking)

**Setup:**

1. Go to https://sentry.io
2. Create project "Klarpakke Production"
3. Copy DSN
4. Add to Vercel env vars:

```
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...
```

### 2. UptimeRobot (Uptime Monitoring)

**Setup:**

1. Go to https://uptimerobot.com (free tier)
2. Add HTTP(s) monitor:
   - URL: https://www.klarpakke.no/api/health
   - Interval: 5 minutes
   - Alert Contacts: Your email
3. Set up Slack webhook for alerts (optional)

### 2b. GitHub Actions — prod health + beskjed ved feil

Workflow **Prod health alert** (`.github/workflows/prod-health-alert.yml`) kjører hvert 15. minutt mot `https://www.klarpakke.no/api/health` via `scripts/prod-health-gate.mjs`. Den feiler ved `unhealthy`, database-feil, eller **gamle/manglende trading-signaler** (`tradingSignals` warning/error).

- **Slack / annen webhook:** Legg repository secret `OPS_ALERT_WEBHOOK_URL` (f.eks. [Slack Incoming Webhook](https://api.slack.com/messaging/webhooks)). Ved feil POSTes en kort melding med lenke til Actions-run. **Anbefalt kanal:** `#all-klarpakke` (eller `#kp-ops`) slik at hele teamet ser samme alarm.
- **Uten webhook:** Se **Actions** → feilet run; du kan slå på e-post for mislykkede workflows under GitHub-kontoens notifikasjoner.
- **Lokalt:** `npm run all:klarpakke` = `health:prod:gate` + `verify` (API-helse, signaler, kritiske paths, headers). Enkeltledd: `npm run health:prod:gate` (valgfri `HEALTH_URL=`, `ALERT_STALE_SIGNALS=0` for kun hard feil).

### 3. Vercel Analytics

Already enabled via @vercel/analytics package.

Dashboard: https://vercel.com (team: klarpakke → Analytics)

## Emergency Procedures

### Rollback to Previous Version

```bash
# Export Vercel token
export VERCEL_TOKEN=your_token_here

# Execute rollback
./scripts/rollback-deployment.sh

# Verify rollback
curl https://www.klarpakke.no/api/health | jq '.'
```

### Debug Production Issues

```bash
# View recent logs
vercel logs www.klarpakke.no --scope klarpakke --token=$VERCEL_TOKEN

# Check specific deployment
vercel logs DEPLOYMENT_URL --scope klarpakke --token=$VERCEL_TOKEN

# Real-time logs
vercel logs www.klarpakke.no --scope klarpakke --follow --token=$VERCEL_TOKEN
```

## Common Issues

### Issue: Site returns 500 errors

**Solution:**

1. Check health endpoint: `curl https://www.klarpakke.no/api/health`
2. If unhealthy, check Sentry for errors
3. If database issue, check Supabase status
4. Consider rollback if critical

### Issue: Database connection errors

**Solution:**

1. Verify Supabase env vars in Vercel
2. Check Supabase dashboard for incidents
3. Validate connection pooling limits
4. Rollback if needed

### Issue: Build failures in CI

**Solution:**

1. Check GitHub Actions logs
2. Verify env vars in repository secrets
3. Run `npm run type-check` locally
4. Fix TypeScript errors and push again

## Post-Deployment Checklist

See [docs/PRODUCTION_RELEASE_CHECKLIST.md](docs/PRODUCTION_RELEASE_CHECKLIST.md) for the full checklist.

Quick check after every deployment:

- [ ] `curl -s https://www.klarpakke.no/api/health | jq '.status'` returns "healthy"
- [ ] `npm run verify` passes all critical paths
- [ ] No new errors in Sentry (first 5 minutes)
- [ ] Correct git SHA in health endpoint version field

## Related Documentation

- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) - All environment variables
- [docs/PRODUCTION_RELEASE_CHECKLIST.md](docs/PRODUCTION_RELEASE_CHECKLIST.md) - Full release checklist
- [ROLLBACK.md](ROLLBACK.md) - Emergency rollback procedure
- [runbook.md](runbook.md) - Operational runbook (incident response, daily checks, monitoring)
- [docs/SENTRY_SETUP.md](docs/SENTRY_SETUP.md) - Sentry configuration
- [docs/VERCEL_KV_SETUP.md](docs/VERCEL_KV_SETUP.md) - Vercel KV / Upstash Redis setup
- [docs/AUTO_TRADING.md](docs/AUTO_TRADING.md) - Auto-trading architecture and APIs

## Contact & Escalation

**On-Call Developer:** @tajlive  
**Backup:** @tajlive

**Critical Issues:**

- Post in #klarpakke-alerts Slack channel
- Tag @here for immediate response
- Call on-call developer if no response in 15 min
