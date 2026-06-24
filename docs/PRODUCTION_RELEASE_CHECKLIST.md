# Production Release Checklist

Use this checklist before and after every production deployment.

> **Current hosting stack:** Cloudflare Workers (OpenNext.js + Wrangler) + Supabase.  
> **Auto-deploy status:** GitHub Actions is currently blocked by the phantom `BuildFailed` workflow (issue #94). Deploy manually with `npm run cf:deploy` until GitHub Support resolves the stale workflow registration.

## Pre-Deploy

- [ ] On `main` branch, up to date with `origin/main`
- [ ] `npm run lint:gate` passes
- [ ] `npm run test:unit` passes (all unit tests green)
- [ ] `npm run cf:build` completes successfully locally
- [ ] No new unreviewed errors in GlitchTip
- [ ] Cloudflare / Wrangler environment variables and secrets are up to date (see `docs/ENVIRONMENT.md` and `wrangler.jsonc`)

## Deploy

```bash
# Manual deploy (GitHub Actions auto-deploy is blocked by phantom workflow #94)
npm run cf:deploy

# Equivalent explicit command:
# npm run cf:build && npx wrangler deploy --minify --var APP_VERSION:$(git rev-parse HEAD)
```

## Post-Deploy (within 5 minutes)

- [ ] Health check is green:
  ```bash
  curl -s https://www.klarpakke.no/api/health | jq '.status'
  # Expected: "healthy"
  ```

- [ ] Correct version is deployed:
  ```bash
  curl -s https://www.klarpakke.no/api/health | jq '.version'
  # Should match the latest commit SHA (first 7 chars).
  # If it returns "unknown", the APP_VERSION variable was not injected during deploy.
  ```

- [ ] Critical paths return 200:
  ```bash
  npm run verify
  # Or manually check: /no, /en, /no/innlogging, /no/priser
  ```

- [ ] No new errors in GlitchTip

- [ ] Trading endpoints alive:
  ```bash
  curl -sI https://www.klarpakke.no/api/paper-trading/init | head -1
  # Expected: HTTP/2 401 (auth required = endpoint is alive)
  ```

## If Something Goes Wrong

```bash
# Rollback to the previous Cloudflare Worker version
npx wrangler rollback

# Alternative: redeploy the previous commit
git checkout <previous-commit-sha>
npm run cf:deploy

# Verify rollback worked
curl -s https://www.klarpakke.no/api/health | jq '.'

# Notify team
# Post in #klarpakke-alerts with reason and status
```

See `AGENTS.md` for the full deployment and verification commands.
