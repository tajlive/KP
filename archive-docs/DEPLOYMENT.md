# Deployment Guide

> **Versjon:** 1.0.0  
> **Oppdatert:** 11. februar 2026  
> **For:** Utviklere, DevOps

---

## Overview

**Platform:** Cloudflare Pages  
**Build:** Next.js 15 med OpenNext adapter  
**Database:** Supabase (PostgreSQL)  
**Deploy:** Manuell fra lokal maskin  

---

## Pre-deploy Checklist

```bash
# 1. Kjør full deploy chain lokalt
cd ~/klarpakke
bash scripts/full-deploy.sh
```

Forventet output:
```
✅ DB-tilkobling OK
✅ TypeScript 0 errors
✅ Build success (67 sider)
```

Hvis feil: Se [docs/08-TROUBLESHOOTING.md](docs/08-TROUBLESHOOTING.md)

---

## Deploy Process

### Quick Deploy (Anbefalt)

```bash
bash scripts/beta-full-deploy-local.sh "Din commit melding"
```

### Manual Step-by-Step

```bash
# 1. Stage changes
git add .

# 2. Commit
git commit -m "feat: beskrivelse av endring"

# 3. Push to main
git push origin main

# 4. Deploy to Cloudflare
bash scripts/deploy-cloudflare.sh

# 5. Verify production
bash scripts/verify-production.sh
```

---

## Environment Variables

### Required

| Variable | Description | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Supabase Dashboard |
| `SUPABASE_ACCESS_TOKEN` | For migrations | Supabase Account |
| `CLOUDFLARE_API_TOKEN` | For deploy | Cloudflare Dashboard |
| `CLOUDFLARE_ACCOUNT_ID` | Account identifier | Cloudflare Dashboard |

### Optional

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | For payments |
| `RESEND_API_KEY` | For email |
| `SENTRY_DSN` | Error tracking |

---

## Rollback Procedure

### Quick Rollback

```bash
# Revert last commit
git revert HEAD
git push origin main

# Re-deploy
bash scripts/deploy-cloudflare.sh
```

### Database Rollback

⚠️ **WARNING:** Use with caution!

```bash
# Revert specific migration
bash scripts/rollback.sh 20260201000000
```

---

## Architecture

```
Developer Machine
       │
       │ git commit + push
       ▼
Local Git Repository
       │
       │ bash scripts/deploy-cloudflare.sh
       ▼
Cloudflare Pages
       │
       ▼
www.klarpakke.no
```

---

## Build Configuration

### next.config.js

```javascript
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}
```

### Cloudflare Pages Settings

- **Build command:** `npm run build`
- **Build output:** `dist`
- **Node version:** 20

---

## Monitoring

### Health Check

```bash
curl https://www.klarpakke.no/api/health
```

### Cloudflare Analytics

URL: https://dash.cloudflare.com

Metrics:
- Requests/sec
- Error rate
- Cache hit ratio
- CPU time

### Supabase Dashboard

URL: https://app.supabase.com/project/vuxbjlykgmzskxbclquf

---

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf .next dist
npm run build
```

### Database Migration Fails

```bash
# Check status
supabase migration list

# Repair if needed
supabase migration repair --status applied <timestamp>
```

### Cloudflare Build Fails

1. Check build logs in Cloudflare dashboard
2. Verify environment variables
3. Check Node.js version compatibility

---

## Related

- [docs/04-DEPLOYMENT.md](docs/04-DEPLOYMENT.md) - Detailed docs
- [docs/runbooks/deploy.md](docs/runbooks/deploy.md) - Deploy runbook
- [docs/08-TROUBLESHOOTING.md](docs/08-TROUBLESHOOTING.md) - Common issues
