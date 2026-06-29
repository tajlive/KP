# Dependency Health Report

**Generated:** 2026-03-19  
**Scope:** Outdated, deprecated, and vulnerable npm packages

---

## Executive Summary

| Category                     | Count                 | Priority                                  |
| ---------------------------- | --------------------- | ----------------------------------------- |
| **Vulnerabilities**          | 5 (1 moderate, 4 low) | Next.js moderate addressed by patch       |
| **Outdated (patch/minor)**   | 30+                   | Safe to batch-update                      |
| **Deprecated / maintenance** | 0                     | Resolved: node-fetch removed, react-is→19 |

**Recommended first step:** Upgrade `next` to `15.5.13` (patch) to fix HTTP request smuggling.

### Completed (2026-03-19)

- Next.js → 15.5.13 (HTTP request smuggling fix)
- npm update (patch/minor for all in-range deps)
- react-is → 19.2.4 (React 19 alignment)
- node-fetch fjernet; scripts bruker native fetch (Node 22+)

---

## 1. Vulnerabilities

### 1.1 Next.js (moderate) – HTTP request smuggling + disk cache

| Advisory                                                                 | Severity | Affected      | Fix version           |
| ------------------------------------------------------------------------ | -------- | ------------- | --------------------- |
| [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | Moderate | 9.5.0–15.5.12 | **15.5.13**           |
| [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | Moderate | 10.0.0–16.1.6 | **16.1.7** (Next 16+) |

- **HTTP request smuggling:** Fixed in `next@15.5.13` (patch within 15.x).
- **Disk cache exhaustion:** Fixed in `next@16.1.7` (Next 16.x only).

**Action:** Upgrade to `next@15.5.13` now for the smuggling fix. Plan a separate Next 16 upgrade for the disk cache fix.

### 1.2 @lhci/cli (low) – transitive tmp / inquirer

- **Severity:** Low (CVSS 2.5)
- **Chain:** `@lhci/cli` → `inquirer` → `external-editor` → `tmp`
- **Issue:** `tmp` symbolic-link write (GHSA-52f5-9888-hmc6)
- **Usage:** Dev-only (Lighthouse CI: `test:lighthouse`, `test:lighthouse:prod`)

**Action:** Accept low risk for now, or consider moving Lighthouse checks to a separate CI job with isolated deps.

---

## 2. High-Confidence Safe Upgrades

These stay within semver and are safe to apply immediately.

### 2.1 Security patch

| Package  | Current | Target      | Notes                        |
| -------- | ------- | ----------- | ---------------------------- |
| **next** | 15.5.12 | **15.5.13** | Fixes HTTP request smuggling |

### 2.2 Patch/minor (in-range or minor bump)

| Package                                  | Current | Target  | Risk  |
| ---------------------------------------- | ------- | ------- | ----- |
| @sentry/nextjs, @sentry/react            | 10.42.0 | 10.44.0 | Patch |
| @tanstack/react-query                    | 5.90.21 | 5.91.0  | Patch |
| @huggingface/inference                   | 4.13.14 | 4.13.15 | Patch |
| @stripe/stripe-js                        | 8.9.0   | 8.11.0  | Minor |
| @tailwindcss/postcss, tailwindcss        | 4.2.1   | 4.2.2   | Patch |
| framer-motion                            | 12.35.0 | 12.38.0 | Patch |
| openai                                   | 6.27.0  | 6.32.0  | Minor |
| resend                                   | 6.9.3   | 6.9.4   | Patch |
| recharts                                 | 3.7.0   | 3.8.0   | Minor |
| stripe                                   | 20.4.0  | 20.4.1  | Patch |
| zustand                                  | 5.0.11  | 5.0.12  | Patch |
| @typescript-eslint/eslint-plugin, parser | 8.56.1  | 8.57.1  | Patch |
| vitest, @vitest/coverage-v8              | 4.0.18  | 4.1.0   | Minor |
| eslint                                   | 9.39.3  | 9.39.4  | Patch |
| eslint-config-next                       | 15.5.12 | 15.5.13 | Patch |
| lucide-react                             | 0.563.0 | 0.577.0 | Minor |
| react-resizable-panels                   | 4.7.1   | 4.7.3   | Patch |
| csv-parse                                | 6.1.0   | 6.2.0   | Minor |
| knip                                     | 5.85.0  | 5.88.0  | Minor |
| allure-commandline                       | 2.37.0  | 2.38.0  | Minor |
| @next/bundle-analyzer                    | 16.1.6  | 16.2.0  | Minor |

---

## 3. Likely Breaking Changes (defer or plan migration)

| Package                    | Current | Latest | Notes                                                                                       |
| -------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------- |
| **next**                   | 15.5.12 | 16.2.0 | Major: React 19 compat, routing changes, turbopack default. Needed for GHSA-3x4c-7xq6-9pq8. |
| **eslint**                 | 9.39.x  | 10.0.3 | Major: flat config changes, new rules.                                                      |
| **node-fetch**             | 2.7.0   | 3.3.2  | Major: ESM-only, different API. Node 22 has native `fetch`.                                 |
| **@types/node**            | 20.19.x | 25.5.0 | Major: Node 25 types; runtime mål er Node 24.x (`engines`).                                 |
| **@vercel/analytics**      | 1.6.1   | 2.0.1  | Major: check migration guide.                                                               |
| **@vercel/speed-insights** | 1.3.1   | 2.0.0  | Major: check migration guide.                                                               |
| **@vitejs/plugin-react**   | 5.1.4   | 6.0.1  | Major: Vitest 6.x ecosystem.                                                                |
| **jsdom**                  | 28.1.0  | 29.0.0 | Major: API changes.                                                                         |
| **react-is**               | 18.3.1  | 19.2.4 | Align with React 19 (peer dep).                                                             |

---

## 4. Deprecated / Maintenance Mode

### 4.1 node-fetch 2.x

- **Status:** Maintenance-only; no new features.
- **Issue:** Uses deprecated `punycode` via `whatwg-url@5.x` → deprecation warnings on Node 21+.
- **Usage:** `scripts/verify-production.mjs`. `scripts/bootstrap.js` er arkivert.
- **Action:** Replace with native `fetch` (Node 22). Minimal code change and no dependency.

### 4.2 react-is 18.x with React 19

- **Status:** Mismatch; React 19 uses `react-is@19.x`.
- **Action:** Add `react-is@^19` or rely on React’s peer resolution.

---

## 5. Proposed Update Plan

### Phase 1: Security patch (immediate)

```bash
npm install next@15.5.13
```

- Fixes GHSA-ggv3-7p47-pfv8 (HTTP request smuggling).
- Stays on Next 15.x; low risk.

### Phase 2: Safe patch/minor batch

```bash
npm update
```

Or target specific packages:

```bash
npm update @sentry/nextjs @sentry/react @tanstack/react-query \
  framer-motion openai resend recharts stripe zustand \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  vitest @vitest/coverage-v8 eslint eslint-config-next \
  tailwindcss @tailwindcss/postcss lucide-react \
  react-resizable-panels csv-parse knip allure-commandline
```

### Phase 3: Replace node-fetch with native fetch

1. `scripts/verify-production.mjs`: `import fetch from "node-fetch"` → use global `fetch`.
2. Remove `node-fetch` from `package.json` dependencies.
   (`scripts/bootstrap.js` er arkivert og trenger ikke oppdatering.)

### Phase 4: Deferred (breaking changes)

- **Next 16.1.7+:** Plan migration for disk cache fix; review Next 16 changelog and migration guide.
- **ESLint 10:** Align with flat config and rule changes.
- **@vercel/analytics / @vercel/speed-insights 2.x:** Follow Vercel migration docs.

---

## 6. Dependabot Alignment

`.github/dependabot.yml` is configured with:

- **Schedule:** Monthly (Mondays 09:00 Europe/Oslo)
- **Scope:** Patch + minor only; major updates ignored
- **Grouping:** Production and dev deps

Phase 1 and 2 align with this policy. Phase 3 (removing node-fetch) and Phase 4 (Next 16, ESLint 10, etc.) are outside Dependabot’s automatic scope and should be done manually.

---

## 7. Completed Updates (2026-03-19)

- **next**: 15.5.12 → 15.5.13 (security: HTTP request smuggling fix)
- **node-fetch**: Removed; scripts now use native `fetch` (Node 22+)
- **react-is**: 18.3.1 → 19.2.4 (React 19 compatibility)
- **Batch**: `npm update` applied for all in-range patch/minor updates

---

## 8. Commands Reference

```bash
# Check vulnerabilities
npm audit

# Check outdated (respects semver ranges)
npm outdated

# Apply Phase 1
npm install next@15.5.13

# Apply Phase 2 (all in-range updates)
npm update

# Security-only audit (fails on moderate+)
npm run test:security   # = npm audit --audit-level=moderate
```
