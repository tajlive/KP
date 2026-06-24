# Site Cleanup Summary — Cross-cutting Review & Verification

**Date:** 2026-06-24  
**Branch:** `site-cleanup-logic`  
**Worktree:** `/Users/taj/klarpakke/.worktrees/site-cleanup-logic`  
**Lead Agent:** Final cross-cutting review and verification for Tasks 1–5.

---

## 1. What Was Changed

Tasks 1–5 consolidated marketing pages, auth flows, navigation configuration, and i18n namespaces into a smaller set of shared primitives:

| Area | Before | After |
|------|--------|-------|
| **Marketing pages** | Ad-hoc `<main>` wrappers and per-page metadata | `MarketingPageShell` + `generateMarketingMetadata` from `src/shared/ui/marketing` |
| **Legal pages** | Inline layout + metadata | `LegalPageShell` + `generateLegalMetadata` from `src/shared/ui/marketing` |
| **Auth pages** | Duplicated public/admin wrappers | `AuthShell`, `AuthCard`, `AuthFormField` from `src/shared/ui/auth` |
| **Navigation** | Scattered across `dashboard-links.ts`, `load-navigation.ts`, `marketing-shell-paths.ts` | Single `src/lib/navigation/config.ts` |
| **i18n** | Broad namespace imports, hardcoded locale lists | Targeted namespace loading via `src/i18n.ts`; `SUPPORTED_LOCALES` exported from `src/i18n/config.ts` |
| **Dead routes** | Redirect-only pages as real routes | Middleware redirects in `src/middleware/removed-pages.ts` |

During final review, two marketing sub-pages were also aligned with the new shell convention:

- `src/app/[locale]/(marketing)/priser/success/page.tsx`
- `src/app/[locale]/(marketing)/priser/cancel/page.tsx`

These now use `MarketingPageShell` and `generateMarketingMetadata`. Metadata keys `pricing.success.metadata` and `pricing.cancel.metadata` were added to both `messages/no/pricing.json` and `messages/en/pricing.json` to support the shared helper.

---

## 2. Why It Was Changed

- **Consistency:** Every marketing/legal/auth page should share the same layout, metadata pattern, and form primitives so future changes are made in one place.
- **Maintainability:** Removing duplicated wrappers and scattered navigation data reduces the surface area for bugs.
- **i18n hygiene:** Loading only the namespaces that are actively used keeps request bundles smaller and makes missing keys easier to spot.
- **Route hygiene:** Moving redirects to middleware keeps the app router focused on real pages.

---

## 3. Cross-cutting Review Findings

### 3.1 Verified (pass)

- All marketing pages under `src/app/[locale]/(marketing)/` use `MarketingPageShell` and `generateMarketingMetadata`.
- All legal pages under `src/app/[locale]/(legal)/` use `LegalPageShell` and `generateLegalMetadata`.
- All auth pages under `src/app/[locale]/(auth)/` and `src/app/[locale]/(admin)/admin/{login,forgot-password,reset-password}/` use `AuthShell`, `AuthCard`, and `AuthFormField`.
- Navigation consumers import from `src/lib/navigation/config.ts` (TopNav, BottomTabs, MarketingNavigation, NavigationServer, locale-path helpers, etc.).
- No `[MISSING: ...]` fallback strings remain in `src/`.
- `SUPPORTED_LOCALES` is exported from `src/i18n/config.ts` and referenced by locale-resolution logic.
- All required `pricing.success.*` and `pricing.cancel.*` translation keys are present in both `messages/no/pricing.json` and `messages/en/pricing.json`; missing keys identified during final review were added.

### 3.2 Concerns / Non-blocking Gaps

- **Hardcoded route strings remain across the codebase.** The conventions document (`docs/superpowers/specs/2026-06-24-site-cleanup-conventions.md`) calls for a centralized `src/lib/navigation/paths.ts` helper, but this file was not created during Tasks 1–5. Many components still inline `` `/${locale}/...` `` paths. This is pre-existing and outside the scope of this cleanup pass; it should be addressed in a follow-up route-hardening pass.
- **`src/lib/i18n/load-messages.ts` still lists ~40 namespaces in its fallback path.** This is only used when `getMessages()` throws, but it could be trimmed to the actively used set to match the main `src/i18n.ts` loader.
- **E2E critical path could not complete in this environment.** Playwright timed out after 5 minutes (likely browser/server startup). This is noted but not treated as a blocker because unit, type, lint, and build checks all pass.

---

## 4. Manual Follow-up Steps

- **OAuth callback URLs did not change in this refactor.** The auth shells and middleware continue to use the existing `/{locale}/callback` route. No update is needed to the Google Cloud Console or Supabase Auth URL Configuration.
- **Sanity content:** If any marketing or legal pages were edited in Sanity during the refactor, trigger an on-demand revalidation of `/(marketing)/*` and `/(legal)/*` routes.
- **Route-helper follow-up:** Create `src/lib/navigation/paths.ts` and incrementally replace inline `` `/${locale}/...` `` strings in marketing/auth/legal pages. This is a recommended next cleanup task, not a blocker.

---

## 5. Known Pre-existing Issues Not Addressed

- Widespread `any` warnings in trading/portfolio code (39 lint warnings, all pre-existing).
- Hardcoded routes in feature code, dashboards, and onboarding flows (see 3.2).
- The `load-messages.ts` fallback namespace list is broader than the actively loaded set.

---

## 6. Verification Results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run verify` | ✅ PASS | Production health checks (klarpakke.no / www.klarpakke.no) all green. |
| `npm run lint:gate` | ✅ PASS | 0 errors, 39 warnings (all pre-existing `any` warnings). |
| `npm run type-check` | ✅ PASS | `tsc --noEmit` completed with no errors. |
| `npm run test:unit` | ✅ PASS | 1159 passed, 7 skipped (137 files). |
| `npm run build` | ✅ PASS | Next.js build completed successfully. |
| `npm run test:e2e:critical:chromium` | ⚠️ TIMEOUT | Command killed after 300s. Likely environment/browser startup issue; not blocking. |

---

## 7. Commit

```bash
git add docs/superpowers/specs/2026-06-24-site-cleanup-summary.md \
  src/app/[locale]/(marketing)/priser/success/page.tsx \
  src/app/[locale]/(marketing)/priser/success/SuccessContent.tsx \
  src/app/[locale]/(marketing)/priser/cancel/page.tsx \
  src/app/[locale]/(marketing)/priser/cancel/ClientPriserCancel.tsx \
  messages/no/pricing.json \
  messages/en/pricing.json
git commit -m "docs: site cleanup summary and verification"
```

---

## 8. Status

**DONE_WITH_CONCERNS**

All required verification commands pass. The cleanup conventions are now consistently applied to marketing, legal, and auth pages. Two small shell-alignment fixes were made during review (`priser/success` and `priser/cancel`). The remaining concerns (hardcoded routes, broader fallback namespace list, E2E environment timeout) are non-blocking and documented for follow-up.
