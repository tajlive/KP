# Archived GitHub Actions Workflows

These workflows are archived because GitHub Actions is blocked by a phantom
workflow (issue #96). CI/CD has moved to Cloudflare Workers Builds.

- `deploy.yml` / `deploy-cloudflare-2026-06-25.yml` — replaced by Cloudflare Workers Builds auto-deploy on push to `main`.
- `pr-check.yml` / `pr-check-cloudflare-2026-06-25.yml` — replaced by the local Husky pre-push hook (`.husky/pre-push`).

See `docs/GITHUB-ACTIONS-TROUBLESHOOTING.md` for details.
