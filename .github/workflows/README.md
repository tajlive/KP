# GitHub Actions Workflows — CURRENTLY DISABLED

> ⚠️ **Status 2026-07-01:** GitHub Actions is disabled for the `tajlive-KP` organization due to the `$5` Actions budget with "Stop usage" enabled. All workflows fail with `startup_failure` because zero runners are available.
>
> **Deployment still works via Cloudflare Workers Builds.** Every push to `main` triggers a build that runs `npm run cf:build` and then `npm run cf:deploy:ci`.
>
> The workflow files below are preserved in `archived/` for reference if the budget is increased later.

This directory previously contained CI/CD workflows for Klarpakke. Active deployment and CI are now handled by Cloudflare Workers Builds.

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

## Archived workflows

All GitHub Actions workflows are currently archived/disabled because Actions cannot start:

- `archived/deploy-cloudflare-workers-actions-disabled.yml` — was a manual fallback deploy (workflow_dispatch). Required `CLOUDFLARE_API_TOKEN` plus build vars.
- `archived/purge-cache-actions-disabled.yml` — was a manual Cloudflare cache purge.
- `archived/tool-updater-actions-disabled.yml` — was a weekly KIMI/MemPalace tool update.
- `archived/pr-check-cloudflare-2026-06-25.yml` — was PR lint/type-check/test.

Re-enable by moving a file back to `workflows/` **and** increasing the GitHub Actions budget in the `tajlive-KP` organization settings.
