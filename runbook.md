# Klarpakke Operational Runbook (Production)

**URL:** https://www.klarpakke.no
**Health:** https://www.klarpakke.no/api/health
**Vercel Dashboard:** https://vercel.com (team: klarpakke)
**Sentry:** https://sentry.io (org: elbatt-chatbot, project: klarpakke-production)
**Supabase:** https://supabase.com/dashboard

---

## Daily Health Check

Run every morning or after any deployment:

```bash
# 1. Health endpoint
curl -s https://www.klarpakke.no/api/health | jq '.'
# Expected: {"status":"healthy","checks":{"database":{"status":"ok"},"kv":{"status":"ok"},"environment":{"status":"ok"}}}

# 2. Verify critical paths respond with 200
curl -sI https://www.klarpakke.no/no | head -1
curl -sI https://www.klarpakke.no/no/innlogging | head -1
curl -sI https://www.klarpakke.no/no/priser | head -1
curl -sI https://www.klarpakke.no/en | head -1

# 3. Check Sentry for new errors (last hour)
# → https://sentry.io (check "Issues" tab, sort by "Last Seen")

# 4. Check Vercel deployment status
vercel --scope klarpakke ls klarpakke | head -5
```

## Daily Trading Health Check

```bash
# 1. Verify cron endpoints are being called (check Vercel logs)
vercel --scope klarpakke logs www.klarpakke.no --output short 2>&1 | grep -i cron | head -5

# 2. Check paper trading API
curl -sI https://www.klarpakke.no/api/paper-trading/init | head -1
# Expected: 401 (auth required) — confirms endpoint is alive

# 3. In Supabase Dashboard, spot-check:
#    - paper_trading_sessions: active sessions exist
#    - auto_trading_configs: configs are not all disabled unexpectedly
#    - trading_sessions: no stuck "processing" sessions

# 4. In Sentry, filter for trading errors:
#    - Search: "trading" or "paper" or "auto-trade"
#    - Any new issues = investigate immediately
```

## Incident Response

### P0: Site Down (500 errors, health unhealthy)

1. **Confirm:** `curl -s https://www.klarpakke.no/api/health | jq '.status'`
2. **If unhealthy:** Execute rollback immediately
   ```bash
   export VERCEL_TOKEN=<your-token>
   ./scripts/rollback-deployment.sh
   ```
3. **Verify rollback:** `curl -s https://www.klarpakke.no/api/health | jq '.'`
4. **Notify:** Post in #klarpakke-alerts
5. **Root cause:** Check Sentry, Vercel logs, Supabase status

### P1: Degraded Performance or Partial Outage

1. Check which subsystem is affected (DB, KV, external API)
2. If DB: Check Supabase dashboard for incidents/maintenance
3. If KV: Check Upstash dashboard
4. If Binance API: Check https://www.binance.com/en/support
5. Monitor for 15 min; if not self-resolving, consider rollback

### P2: Trading Issues (no trades executing, wrong prices)

1. Check auto-trading cron: Has `/api/cron/auto-trade` run recently?
2. Check Supabase `auto_trading_configs` for `enabled = true` entries
3. Verify paper trading sessions are not stuck
4. Check Sentry for trading-related errors
5. If needed, manually set `trading_enabled = false` in `system_config` (killswitch)

## Rotating Secrets

### ENCRYPTION_KEY / CRON_SECRET

1. Generate new value: `openssl rand -hex 32`
2. Update in Vercel: `vercel env rm ENCRYPTION_KEY --scope klarpakke` then `vercel env add ENCRYPTION_KEY --scope klarpakke`
3. Redeploy: Push to main or trigger manual deploy
4. Verify health endpoint

### Binance API Keys

1. Generate new keys in Binance Dashboard (enable Spot/Futures, restrict IP)
2. Update in Supabase Vault via Dashboard
3. Re-link user profile connections if needed

### Stripe Webhook Secret

1. Get new secret from Stripe Dashboard → Webhooks
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel env vars
3. Redeploy and test with Stripe CLI: `stripe trigger payment_intent.succeeded`

## Vercel Cron Jobs

Configured in `vercel.json`:

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/keepalive` | Every 5 days at 06:00 | Keep serverless functions warm |
| `/api/cron/update-usdt-nok` | Daily at 06:00 | Update USDT/NOK exchange rate |

Auto-trading cron (if enabled) runs via Supabase pg_cron every 5 minutes.

## Monitoring Dashboards

| Service | URL | What to check |
|---------|-----|---------------|
| Vercel | https://vercel.com (team: klarpakke) | Deployments, logs, analytics |
| Sentry | https://sentry.io | Errors, performance, releases |
| Supabase | https://supabase.com/dashboard | DB health, RLS logs, edge functions |
| UptimeRobot | Configure on https://uptimerobot.com | Uptime for /api/health |

## Contact & Escalation

**On-Call:** @tajlive
**Backup:** @tajlive

**Escalation Procedure:**
1. Check health endpoint and Sentry
2. If P0: Rollback immediately, then investigate
3. Post in #klarpakke-alerts with status update
4. If no response in 15 min: Call on-call developer directly

## Deployment

### Standard Deploy (via Git)

```bash
git checkout main
git pull origin main
# Make changes, commit
git push origin main
# Vercel auto-deploys from main
```

### Manual Deploy (via GitHub Actions)

1. Go to https://github.com/tajlive/KP/actions
2. Select "Manual Deploy"
3. Choose environment: `production`
4. Click "Run workflow"

### Post-Deploy Verification

```bash
npm run verify
# Or manually:
curl -s https://www.klarpakke.no/api/health | jq '.'
```

### Rollback

See [ROLLBACK.md](ROLLBACK.md) for full procedure.

Quick rollback:
```bash
export VERCEL_TOKEN=<token>
./scripts/rollback-deployment.sh
```

Manual rollback:
```bash
# List recent deployments
vercel --scope klarpakke ls klarpakke | head -5
# Alias previous deployment to production
vercel alias <previous-deployment-url> www.klarpakke.no --scope klarpakke
```

## Database Backup

Supabase provides automatic daily backups with point-in-time recovery (PITR) on Pro plans.

- Backups: Supabase Dashboard → Project → Database → Backups
- PITR: Available for restoring to any point within retention window
- The application does NOT run destructive migrations on deploy; schema changes go through `supabase/migrations/` and are applied manually or via `supabase db push`
