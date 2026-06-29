# Emergency Rollback Procedure

## When to Rollback

Rollback immediately if:

- ❌ Site is completely down (500 errors)
- ❌ Authentication is broken
- ❌ Database connection failures
- ❌ Critical security vulnerability discovered
- ❌ Data corruption detected

## Rollback Steps

### 1. Confirm Emergency

```bash
# Check health
curl https://www.klarpakke.no/api/health

# If status is "unhealthy", proceed with rollback
```

### 2. Execute Rollback

For Cloudflare Workers, redeploy the last known good commit:

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
git checkout <last-good-commit>
npm run cf:deploy
```

Or use the Cloudflare Dashboard:
- Workers & Pages → klarpakke → Deployments
- Select the previous deployment and click "Rollback"

### 3. Verify Rollback

```bash
# Check health again
curl https://www.klarpakke.no/api/health | jq '.'

# Test critical paths
# - Login: https://www.klarpakke.no/no/innlogging
# - Dashboard: https://www.klarpakke.no/no/dashboard
```

### 4. Communicate

Post in #klarpakke-alerts:

```
🚨 ROLLBACK EXECUTED

Reason: [brief description]
From: [bad deployment URL]
To: [previous deployment URL]
Status: [health check status]
Action Required: [what needs to be fixed]
```

### 5. Post-Rollback

- [ ] Identify root cause
- [ ] Create hotfix branch if needed
- [ ] Test fix thoroughly before re-deploying
- [ ] Update incident log

## Rollback Testing

Test rollback procedure monthly:

```bash
# Verify you can build and deploy a known good commit
git checkout main
npm run cf:build
```

## Manual Rollback (if automated deploy fails)

```bash
# 1. List recent deployments in Cloudflare Dashboard
#    https://dash.cloudflare.com → Workers & Pages → klarpakke

# 2. Find previous deployment

# 3. Roll back via Wrangler CLI
npx wrangler rollback

# 4. Verify
curl https://www.klarpakke.no/api/health
```
