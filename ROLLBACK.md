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

```bash
export VERCEL_TOKEN=your_token_here
./scripts/rollback-deployment.sh
```

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
# Dry-run test
./scripts/test-rollback.sh
```

## Manual Rollback (if script fails)

```bash
# 1. List deployments
npx vercel@latest ls --token=$VERCEL_TOKEN

# 2. Find previous deployment URL
PREVIOUS_URL=klarpakke-xyz.vercel.app

# 3. Alias to production
npx vercel@latest alias $PREVIOUS_URL www.klarpakke.no --token=$VERCEL_TOKEN --yes

# 4. Verify
curl https://www.klarpakke.no/api/health
```
