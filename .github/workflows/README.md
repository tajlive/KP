# GitHub Actions Workflows

This directory contains the CI/CD workflows for Klarpakke. They run on GitHub Actions and deploy to Cloudflare Workers via Wrangler.

## Workflows

### `deploy.yml`

- **Trigger:** Push to `main`
- **Job:** `build-and-deploy`
- **What it does:**
  1. Checks out the repository
  2. Sets up Node.js using the version in `.nvmrc`
  3. Installs dependencies with `npm ci`
  4. Runs `npm run type-check`
  5. Runs `npm run test:unit`
  6. Builds the app with `npm run cf:build`
  7. Deploys to Cloudflare Workers with `npx wrangler deploy --minify --var APP_VERSION:${{ github.sha }}`
  8. Polls `https://www.klarpakke.no/api/health` until the deployed version is live

### `pr-check.yml`

- **Trigger:** Pull request to `main`
- **Job:** `check`
- **What it does:**
  1. Checks out the PR branch
  2. Sets up Node.js using the version in `.nvmrc`
  3. Installs dependencies with `npm ci`
  4. Runs `npm run lint:gate`
  5. Runs `npm run type-check`
  6. Runs `npm run test:unit`

## Configuration

The workflows read public configuration from GitHub `vars` and secrets from GitHub `secrets`.

Required secrets:

- `CLOUDFLARE_API_TOKEN` — Used by Wrangler to deploy the Worker

Required vars (used by both workflows):

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `NEXT_PUBLIC_GLITCHTIP_DSN`

`NEXT_TELEMETRY_DISABLED` is hardcoded to `"1"` in both workflows.
