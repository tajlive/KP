# Implementation Plan: Fix failing `lint:gate` pre-push hook

**Date:** 2026-06-27  
**Scope:** ESLint pre-push gate (`npm run lint:gate`)  
**Goal:** Make the gate pass quickly without manually fixing ~108k legacy issues, while preserving or strengthening code-quality safeguards.

---

## 1. Problem Statement

- `npm run lint:gate` runs `eslint . --max-warnings 100 --cache`.
- It currently reports ~108k problems and fails the pre-push gate.
- The dominant categories are:
  - `@typescript-eslint/no-explicit-any` warnings in source code.
  - Pre-existing `jsx-a11y`, `no-console`, and other warnings.
  - `.chrome-profile/` (live Chrome profile) is not ignored and contains generated extension JS files.

---

## 2. Root-Cause Findings

| Finding | Impact |
|---|---|
| `.chrome-profile/**` is not in ESLint ignores | Generated extension files are linted, adding noise and slowdown. |
| `lint:gate` lints the entire repo | Every legacy `any` warning in untouched files blocks pushes. |
| `max-warnings 100` on full repo | Far below the current baseline, making the gate impossible to satisfy. |
| No changed-files lint script | No pragmatic path to enforce quality only on new/modified code. |

---

## 3. Guiding Principles

1. **Do not weaken safeguards for new code.** The gate must still catch new problems.
2. **Do not ignore `src/` broadly.** Legacy source debt should be tracked, not hidden.
3. **Keep the full-repo lint runnable** for metrics and gradual cleanup.
4. **Make the pre-push gate fast.** Only lint what the push introduces.

---

## 4. Recommended Solution

A **two-layer approach**:

### Layer A — Stop linting generated Chrome profile files
Add `.chrome-profile/**` to the global ignores in `eslint.config.mjs`.

### Layer B — Change `lint:gate` to lint only changed files
Introduce a small Node script (`scripts/lint-changed.mjs`) that:

- Computes the file set `git diff --name-only --diff-filter=ACMRT origin/main...HEAD`.
- Filters to `.js`, `.jsx`, `.ts`, `.tsx`.
- Runs `eslint` on that file list with `--max-warnings 0 --cache`.
- Exits cleanly when no relevant files changed.

Update `package.json` so that `lint:gate` invokes this script, and keep `lint` as the full-repo command for manual/CI reporting.

---

## 5. Files to Modify

### 5.1 `eslint.config.mjs`
Add `.chrome-profile/**` to the global ignores array.

### 5.2 `scripts/lint-changed.mjs` (new)
Create the changed-files lint runner.

### 5.3 `package.json`
Update scripts:

```json
"lint": "eslint . --max-warnings 300 --cache",
"lint:gate": "node scripts/lint-changed.mjs",
"lint:fix": "eslint . --fix --cache",
"lint:full": "eslint . --max-warnings 300 --cache"
```

---

## 6. Implementation Steps

1. Add `.chrome-profile/**` ignore to `eslint.config.mjs`.
2. Create `scripts/lint-changed.mjs`.
3. Update `package.json` scripts.
4. Test locally:
   - On a branch with no changes: `npm run lint:gate` should pass instantly.
   - On a branch with a clean new file: `npm run lint:gate` should lint it with zero warnings allowed.
5. Run `npm run lint:full` to establish a new baseline for tracking.

---

## 7. Validation Checklist

- [ ] `npm run lint:gate` passes on `main` (or any branch with no JS/TS changes).
- [ ] `npm run lint:gate` fails when a changed file has an unhandled `any` or `no-console` error.
- [ ] `npm run lint:full` still reports the full problem set (used for tracking).
- [ ] Pre-push hook completes gate 1.
- [ ] Spaces in filenames are handled correctly.
- [ ] No `.env` or secret files are touched.

---

## 8. Gradual Cleanup Path

| Phase | Action | Success Metric |
|---|---|---|
| 1 | Add `.chrome-profile/**` ignore + changed-files gate | `lint:gate` passes |
| 2 | Run `lint:fix` on `src/features/` legacy files in small PRs | Reduce `lint:full` warnings by 20% |
| 3 | Expand per-file overrides for files with >50 `any` warnings | Track in `.knowledge/tech_debt/lint-cleanup.md` |
| 4 | Lower `lint:full` max-warnings from 300 → 100 → 0 | Full repo lint passes |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| New code quality regressions | Changed-files gate uses `--max-warnings 0`; any warning fails. |
| Developers touching legacy files see many warnings | Allow scoped `eslint-disable-next-line` comments; do not fix unrelated legacy code in feature PRs. |
| `origin/main` missing in shallow clones | Script falls back to `HEAD~1` or exits cleanly. |
| Full-repo lint continues to fail | This is expected and tracked; it does not block pushes. |

---

## 10. Acceptance Criteria

1. `npm run lint:gate` completes in <10 seconds when no JS/TS files changed.
2. `npm run lint:gate` fails if a changed file introduces any new ESLint warning.
3. Full-repo lint remains available via `npm run lint` / `npm run lint:full`.
4. No manual fixing of the ~108k legacy issues is required to unblock pushes.
