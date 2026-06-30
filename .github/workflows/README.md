# GitHub Actions Workflows

This directory contains the CI/CD workflows for Klarpakke.

## Primary deploy: Cloudflare Workers Builds

Production is auto-deployed via **Cloudflare Workers Builds** (Git integration). Every push to `main` triggers a build that runs `npm run cf:build` and then `npm run cf:deploy:ci`.

- Trigger name: `Deploy default branch`
- Production URL: `https://www.klarpakke.no`
- Build configuration is managed by `scripts/setup-workers-builds.mjs`

To inspect or repair the Workers Builds trigger:

```bash
export CLOUDFLARE_API_TOKEN=<token>
export CLOUDFLARE_ACCOUNT_ID=80d5b1d56a3e907150ba7348b6182894
export GH_PAT=<github-token>
node scripts/setup-workers-builds.mjs --env-file .env.local
```

## Fallback deploy: GitHub Actions

`.github/workflows/deploy-cloudflare-workers.yml` is a **manual fallback** triggered via `workflow_dispatch`. Use it when Workers Builds is disabled, stuck, or needs to be bypassed for a hotfix.

Required secrets:

- `CLOUDFLARE_API_TOKEN` — Wrangler deploy token
- `NEXT_PUBLIC_SUPABASE_URL` — public Supabase URL (stored as secret for historical reasons)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase anon key (stored as secret for historical reasons)

Required vars:

- `NEXT_PUBLIC_APP_URL` — e.g. `https://www.klarpakke.no`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `NEXT_PUBLIC_GLITCHTIP_DSN` — optional

`NEXT_TELEMETRY_DISABLED` is hardcoded to `"1"` in the workflow.

## PR checks

`.github/workflows/pr-check.yml` runs lint, type-check, and unit tests on pull requests to `main`. It is currently archived; see `archived/README.md` for history.

## Other workflows

- `purge-cache.yml` — purges Cloudflare cache manually.
