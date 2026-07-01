# Archived GitHub Actions Workflows

These workflows are archived because **GitHub Actions is disabled for the `tajlive-KP` organization** as of 2026-07-01. The `$5` Actions budget with "Stop usage" enabled means zero runners are available, so every workflow fails with `startup_failure`.

CI/CD has moved to **Cloudflare Workers Builds** (Git integration), which still deploys every push to `main`.

## Newly archived (moved 2026-07-01)

- `deploy-cloudflare-workers-actions-disabled.yml` — manual fallback deploy via `workflow_dispatch`.
- `purge-cache-actions-disabled.yml` — manual Cloudflare cache purge.
- `tool-updater-actions-disabled.yml` — weekly KIMI/MemPalace tool update.

## Previously archived

- `deploy.yml` / `deploy-cloudflare-2026-06-25.yml` — replaced by Cloudflare Workers Builds auto-deploy on push to `main`.
- `pr-check.yml` / `pr-check-cloudflare-2026-06-25.yml` — replaced by local checks (`npm run type-check`, `npm run test:unit`, `npm run cf:build`) before push.

## Re-enabling

To use these workflows again:
1. Increase the GitHub Actions budget in `tajlive-KP` organization settings.
2. Move the desired `.yml` file(s) from `archived/` back to `workflows/`.
3. Ensure required secrets and variables are configured in the GitHub repo settings.
