# Deployment

> **Versjon:** 1.0.0  
> **Oppdatert:** 2026-02-10  
> **For:** DevOps, administratorer

---

## Overview

- **Platform:** Cloudflare Pages
- **Build:** OpenNext adapter
- **CI/CD:** GitHub Actions
- **Auto-deploy:** On push to `main`

---

## Production Deploy Process

### 1. Pre-deploy Checklist

```bash
# Run full deploy chain locally
cd ~/klarpakke
bash scripts/full-deploy.sh
```

Expected output:
```
✅ DB-tilkobling OK
✅ TypeScript 0 errors
✅ Build success (67 sider)
```

If any step fails:
- See [TROUBLESHOOTING.md](08-TROUBLESHOOTING.md)
- Fix issues before proceeding

---

### 2. Commit and Push

```bash
# Stage changes
git add .

# Commit with conventional commit format
git commit -m "feat: beskrivelse av endring"

# Push to main (triggers deploy)
git push origin main
```

Commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `chore:` - Maintenance
- `refactor:` - Code refactoring

---

### 3. Monitor CI/CD Pipeline

**GitHub Actions URL:** https://github.com/tajlive/KP/actions

Pipeline stages:

| Stage | Duration | Description |
|-------|----------|-------------|
| db:migrate | ~2 min | Run Supabase migrations |
| test:secrets | ~1 min | Check for hardcoded secrets |
| verify:type-check | ~2 min | TypeScript compilation |
| verify:lint | ~1 min | ESLint checks |
| build | ~3 min | Next.js build |
| deploy:verify | ~1 min | Verify Cloudflare trigger |
| smoke:test | ~2 min | Basic health checks |

**Total time:** ~10-12 minutes

---

### 4. Verify Production

```bash
# Automated verification
bash scripts/verify-production.sh
```

Expected output:
```
✅ https://www.klarpakke.no - 200 OK
✅ https://www.klarpakke.no/no/dashboard - 302
✅ Health endpoint - OK
```

Manual verification:
1. Visit https://www.klarpakke.no
2. Check console for errors (F12)
3. Test navigation
4. Verify admin login works

---

## Environment Variables

### GitHub Actions Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_ACCESS_TOKEN` | ✅ | From https://app.supabase.com/account/tokens |
| `SUPABASE_PROJECT_ID` | ✅ | vuxbjlykgmzskxbclquf |
| `CLOUDFLARE_API_TOKEN` | ❌ | For cache purge (optional) |
| `CLOUDFLARE_ZONE_ID` | ❌ | For cache purge (optional) |
| `SENTRY_DSN` | ❌ | Error tracking (optional) |

### Local Development

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Never commit `.env.local` to Git.

---

## Rollback Procedure

### Quick Rollback (Revert Commit)

```bash
# Identify bad commit
git log --oneline -10

# Revert
git revert <commit-hash>
git push origin main
```

### Database Rollback

⚠️ **WARNING:** Use with caution!

```bash
# Revert specific migration
bash scripts/rollback.sh 20260201000000
```

See [runbooks/rollback.md](runbooks/rollback.md) for full procedure.

---

## Architecture

```
Developer Machine
       │
       │ git push origin main
       ▼
GitHub Actions Workflow
       │
       ├─ database ─────────┐
       ├─ verify ───────────┤
       ├─ build ────────────┤
       └─ deploy ───────────┘
                            │
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
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
```

### open-next.config.ts

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/kv-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
```

---

## Monitoring

### Health Endpoint

```bash
curl https://www.klarpakke.no/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T12:00:00Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 45
    }
  }
}
```

### Cloudflare Analytics

URL: https://dash.cloudflare.com

Metrics to watch:
- Requests/sec
- Error rate
- Cache hit ratio
- CPU time

### Supabase Dashboard

URL: https://app.supabase.com/project/vuxbjlykgmzskxbclquf

Metrics:
- Database connections
- Query performance
- RLS policy violations

---

## Troubleshooting

### Build Fails

```bash
# Check TypeScript
npm run type-check

# Check locally
npm run build

# Clear cache
rm -rf .next
npm run build
```

### Database Migration Fails

```bash
# Check migration status
supabase migration list

# Repair if needed
supabase migration repair --status applied <timestamp>
```

### Cloudflare Build Fails

1. Check build logs in Cloudflare dashboard
2. Verify environment variables are set
3. Check for Node.js version compatibility

---

## Related

- [runbooks/deploy.md](runbooks/deploy.md) - Detailed deploy runbook
- [runbooks/rollback.md](runbooks/rollback.md) - Rollback procedures
- [TROUBLESHOOTING.md](08-TROUBLESHOOTING.md) - Common issues
