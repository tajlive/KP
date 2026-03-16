# 📘 Cloudflare Pages Deployment Guide

## Overview

Klarpakke is deployed on **Cloudflare Pages** - a global edge network with 300+ locations worldwide. This provides:

- **Zero hosting costs** - $0/month
- **Global CDN** - Content served from nearest edge location
- **Auto-scaling** - Handles any traffic without configuration
- **Instant deployments** - Push to main = live in seconds
- **Unlimited bandwidth** - No rate limits or overages

## Architecture

```
User → www.klarpakke.no
       ↓
   Cloudflare DNS
       ↓
   Cloudflare CDN (300+ locations)
       ↓
   Cloudflare Pages (static hosting)
       ↓
   Cloudflare Workers (API/AI inference)
       ↓
   Supabase (PostgreSQL)
```

## Build & Deploy

### Prerequisites

- Node.js 20+
- Cloudflare account with API token
- Wrangler CLI configured

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### Build for Cloudflare Pages

```bash
npm run pages:build
```

This command:
1. Runs `@cloudflare/next-on-pages` to convert Next.js app
2. Executes `scripts/fix-cloudflare-routes.sh` to fix routing

### Deploy to Production

```bash
npm run pages:deploy
```

Or simply push to `main` branch - GitHub Actions handles the rest!

## Configuration

### Headers (`public/_headers`)

Security headers applied to all pages:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: ...
```

### Routing

Routing is handled via file structure:

```
.vercel/output/static/
├── index.html          # Root redirect to /no/
├── no/
│   └── index.html      # Norwegian locale
├── en/
│   └── index.html      # English locale
└── ...
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| TTFB | < 500ms | ~300ms |
| FCP | < 1.5s | ~1.2s |
| LCP | < 2.5s | ~2.1s |
| Lighthouse | > 90 | 95+ |

## Security

All pages include:

- ✅ HSTS (1 year + preload)
- ✅ Content Security Policy (CSP)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection
- ✅ Referrer-Policy
- ✅ Permissions-Policy

## Monitoring

### Client-Side Monitoring

The app includes lightweight client-side monitoring that tracks:
- Unhandled errors
- Performance metrics (Web Vitals)
- Navigation timing

Data is sent to `/api/monitoring` endpoint.

### Health Checks

```bash
# Check monitoring endpoint
curl https://www.klarpakke.no/api/monitoring

# Check security headers
curl -I https://www.klarpakke.no/no/
```

## Troubleshooting

### 404 on /no

**Cause:** `no.html` and `no/` directory conflict

**Fix:**
```bash
# Rebuild and ensure post-build script runs
npm run pages:build
# Verify no.html was removed
ls .vercel/output/static/no.html # Should not exist
ls .vercel/output/static/no/index.html # Should exist
```

### Redirect Loop

**Cause:** Conflicting `_redirects` file

**Fix:**
```bash
# Remove _redirects
rm .vercel/output/static/_redirects
# Re-deploy
npm run pages:deploy
```

### Build Failures

**Check Node.js version:**
```bash
node --version # Should be 20+
```

**Clear cache and reinstall:**
```bash
rm -rf .next .vercel/output node_modules
npm install
npm run pages:build
```

### TypeScript Errors

Build ignores TypeScript errors (`ignoreBuildErrors: true`), but you should fix them:

```bash
npm run type-check
```

## GitHub Actions

The workflow (`.github/workflows/deploy-production.yml`) includes:

1. **Security checks** - npm audit, secret scanning
2. **Database migrations** - Auto-run Supabase migrations
3. **Build** - Build for Cloudflare Pages
4. **Deploy** - Deploy to production
5. **Verification** - Test main routes and headers
6. **Notifications** - Slack alerts

## Environment Variables

Required secrets in GitHub:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `SUPABASE_ACCESS_TOKEN` - Supabase access token
- `SUPABASE_DB_PASSWORD` - Supabase database password
- `SLACK_WEBHOOK_URL` - Slack notifications (optional)

## Migration from Vercel

If migrating from Vercel:

1. Update DNS to point to Cloudflare Pages
2. Update `next.config.mjs` (remove Vercel-specific settings)
3. Test thoroughly before switching DNS
4. Monitor for 48 hours after migration

## Support

- **GitHub Issues:** https://github.com/tajlive/KP/issues
- **Email:** support@klarpakke.no
- **Status:** https://www.cloudflarestatus.com/

## Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
