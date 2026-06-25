# GitHub Support Request — Phantom Workflow Blocking All Actions Runs

**Repository:** `tajlive/KP` (private)  
**Issue:** GitHub Actions is completely blocked by a phantom/deleted workflow registration.  
**Workflow ID:** `260912064`  
**Related GitHub Issue:** #96  
**Date:** 2026-06-25

---

## Summary

Every event in our repository (`push`, `pull_request`, `schedule`, `dependabot`, `repository_dispatch`, `workflow_dispatch`) triggers **only** a phantom workflow and fails immediately with `startup_failure`. None of our legitimate workflows run.

The phantom workflow is a stale backend registration that no longer corresponds to any file in the repository.

---

## Phantom Workflow Details

From the REST API (`GET /repos/tajlive/KP/actions/workflows/260912064`):

```json
{
  "id": 260912064,
  "node_id": "W_kwDORd3l2M4PjTPA",
  "name": "",
  "path": "BuildFailed",
  "state": "deleted",
  "created_at": "2026-04-14T21:15:33.000+02:00",
  "updated_at": "2026-04-14T21:15:33.000+02:00",
  "url": "https://api.github.com/repos/tajlive/KP/actions/workflows/260912064",
  "html_url": "https://github.com/tajlive/KP/blob/main/BuildFailed",
  "badge_url": "https://github.com/tajlive/KP/workflows/BuildFailed/badge.svg"
}
```

Key observations:
- `name` is empty.
- `path` is `BuildFailed` (not a `.github/workflows/*.yml` path).
- `state` is `deleted`.
- The referenced file `https://github.com/tajlive/KP/blob/main/BuildFailed` does **not** exist in any branch.
- `git log --all -- BuildFailed` returns nothing.

---

## Symptoms

1. Every push to `main` creates a workflow run for the phantom workflow.
2. The run fails immediately (`startup_failure`, ~1 second, zero jobs, no runner allocated).
3. Our real workflows (`Deploy to Cloudflare Workers`, `PR Check`, `Tool Updater`, `Dependabot Updates`) do **not** run.
4. New `.github/workflows/*.yml` files are not auto-registered.

Example phantom run behavior:

```bash
gh api repos/tajlive/KP/actions/workflows/260912064/runs --paginate
# Returns ~11 runs, all conclusion: "startup_failure"
```

---

## Attempted Workarounds (None Worked)

We have tried every repo-side fix we could identify:

1. **Deleted all phantom workflow runs**  
   Removed 791+ runs for workflow ID `260912064`. New runs are recreated on every event.

2. **Removed `BuildFailed.yml` from all branches**  
   Confirmed no branch contains `BuildFailed` or `.github/workflows/BuildFailed.yml`.

3. **Disabled and re-enabled GitHub Actions**  
   Settings → Actions → General → Disable → Re-enable. No effect.

4. **Renamed the default branch multiple times**  
   `main` → `main-temp` → `main` → `production` → `main`. Phantom followed the default branch; did not disappear.

5. **Created and removed a placeholder workflow**  
   Added `.github/workflows/BuildFailed.yml` to force re-indexing, then removed it. Phantom persisted.

6. **Tried alternative triggers**  
   `repository_dispatch` events are also captured by the phantom workflow.

7. **Attempted to disable the phantom workflow via API**  
   `PUT /repos/tajlive/KP/actions/workflows/260912064/disable` returns:
   ```json
   { "message": "Unable to disable a workflow that is not active." }
   ```

---

## Request

Please **manually purge the corrupt workflow registration `260912064`** from GitHub's internal Actions registry for repository `tajlive/KP` and reset workflow indexing so that `.github/workflows/*.yml` files are re-indexed correctly.

This matches other reported cases in the GitHub Community:
- `github.com/orgs/community/discussions/197048`
- `github.com/orgs/community/discussions/194540`
- `github.com/orgs/community/discussions/190193`

---

## Impact

- **CI/CD is completely blocked.** Auto-deploy to production (Cloudflare Workers) cannot run.
- **Pull request checks do not run.** We cannot safely merge code via GitHub's standard review flow.
- **Manual deploy is required** until the phantom workflow is removed.

---

## Contact

Please let us know if you need any additional information, logs, or API output.

Repository: `https://github.com/tajlive/KP`  
Issue: `https://github.com/tajlive/KP/issues/94`

Thank you.
