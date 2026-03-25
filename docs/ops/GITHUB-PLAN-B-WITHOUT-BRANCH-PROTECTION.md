# GitHub Plan B (private repo, no branch protection)

GitHub branch protection is not available for this private repository on the current plan.
This document describes a practical “Plan B” so production stays safe anyway.

## What we can still enforce

- CI runs on:
  - PRs to `main` (`✅ PR Check`)
  - pushes to `main` (same workflow)
  - scheduled critical E2E (`E2E Critical Tests`)
- Deploy pipeline runs on pushes to `main` and can verify production after deploy.
- We can make deploy more conservative without blocking merges (because merges can’t be blocked).

## Recommended operating rule

- Never merge to `main` unless `✅ PR Check` is green.
- Treat `E2E Critical Tests` failures as stop-ship (hotfix before next merge).

## Optional hardening (repo changes)

- Make `Deploy` run only after CI signals are green:
  - Change deploy trigger from `push` to `workflow_run` on `✅ PR Check` and/or `E2E Critical Tests`.
  - Tradeoff: slower deploys, but stronger safety without paid GitHub features.
  - Ensure checkout uses the exact `workflow_run.head_sha` so deploy matches the validated commit.

## If you upgrade later

When branch protection becomes available, set:
- Require PR reviews
- Require status checks:
  - `✅ PR Check / quick-check`
  - `E2E Critical Tests / e2e-critical`
- Restrict force pushes to `main`

