# 🔍 Comprehensive Routing Audit — Klarpakke Next.js

**Date:** 2026-05-01  
**Auditor:** KIMI Code CLI (read-only audit)  
**Scope:** `next.config.mjs`, middleware layer, App Router routes, redirects, rewrites, orphaned routes  

---

## 📊 Executive Summary

| Severity | Count | Categories |
|----------|-------|------------|
| 🔴 Critical | 9 | Missing middleware, dead redirect targets, missing pages, broken rewrites |
| 🟡 Warning | 17 | Duplicate redirects, inconsistent routing, orphaned pages, sitemap issues |
| 🔵 Info | 10 | Dev pages, redundant redirects, internal redirects, unused patches |

**Top-line finding:** The project's `middleware.ts` was renamed to `src/proxy.ts` in commit `7d7410c38` under the false assumption that Next.js 16 "deprecates" `middleware.ts`. **Next.js does NOT execute `proxy.ts` as middleware.** This means **all middleware functionality is currently dead** — i18n routing, auth guards, CSP nonce injection, rate limiting, tier gates, onboarding checks, and canonical redirects in `src/middleware/i18n.ts` are not running. The site currently relies entirely on `next.config.mjs` redirects and client-side/server-side page guards.

---

## 🔴 Critical Issues

### C1. MISSING `middleware.ts` — All Middleware Dead
- **What:** Commit `7d7410c38` (2026-04-30) renamed `src/middleware.ts` → `src/proxy.ts` with message "Next.js 16 deprecation". Next.js 16.2.4 **does not** support this — it only executes files literally named `middleware.ts` or `middleware.js`.
- **Location:** `src/proxy.ts` (exists but inactive); `src/middleware.ts` (missing)
- **Impact:**
  - ❌ i18n routing (`/ → /no`) is dead
  - ❌ Auth guards (`PROTECTED_PATHS`, `PUBLIC_PATHS`) are dead
  - ❌ CSP nonce injection is dead
  - ❌ `CANONICAL_REDIRECTS` in `src/middleware/i18n.ts` are dead
  - ❌ Beta removal redirects (`/beta/* → dashboard`) are dead
  - ❌ Tier gates (`/dashboard/trade?mode=live`, `/dashboard/bots`) are dead
  - ❌ Onboarding enforcement is dead
  - ❌ Rate limiting (`handleRateLimit`) is dead
  - ❌ OAuth orphan-code catcher (`handleOAuthRedirect`) is dead
  - ❌ Duplicate-locale fix (`/no/no/* → /no/*`) is dead
- **Recommended fix:** Rename `src/proxy.ts` back to `src/middleware.ts` immediately. Update all comment references from "proxy" to "middleware" in `next.config.mjs`.
- **Severity:** 🔴 **Critical**

---

### C2. Redirect to Deleted Page: `/beta-testing` → `/beta`
- **What:** `next.config.mjs` lines 287–288 redirect `/beta-testing` and `/:locale/beta-testing` → `/beta` and `/:locale/beta`. The `/beta` route was deleted in recent cleanup commits (`2d2b51b45` and `e1d176ecd`).
- **Location:** `next.config.mjs` lines 287–288
- **Impact:** Users hitting old `/beta-testing` links get a 404 after the redirect.
- **Recommended fix:** Update destination to `/:locale/dashboard` (or appropriate fallback).
- **Severity:** 🔴 **Critical**

---

### C3. Missing Page: `/leagues`
- **What:** `/leagues` is listed in:
  - `src/middleware/auth-guard.ts` `PROTECTED_PATHS` (line 22)
  - `src/middleware/auth.ts` `PROTECTED_PATHS` (line 25)
  - `src/middleware/onboarding.ts` `PROTECTED_PATHS` (line 17)
  - `src/shared/layout/LocaleMarketingShell.tsx` `STRIPPED_PATHS_HIDE_MARKETING` (line 26)
  - `src/app/sitemap.ts` (line 12)
  - **No `page.tsx` exists anywhere for `/leagues`.**
- **Impact:** 404 for users; sitemap references non-existent page; marketing shell logic references non-existent route.
- **Recommended fix:** Either create `src/app/[locale]/(user)/leagues/page.tsx` or remove `/leagues` from all path lists and sitemap.
- **Severity:** 🔴 **Critical**

---

### C4. Missing Page: `/profil`
- **What:** `/profil` is in `src/middleware/auth-guard.ts` `PROTECTED_PATHS` (line 9), but the actual page is `/profile` (`src/app/[locale]/(user)/profile/page.tsx`).
- **Location:** `src/middleware/auth-guard.ts` line 9
- **Impact:** With middleware dead this is moot, but if middleware is restored, `/profil` would be treated as protected while `/profile` (the real page) is also protected. No direct 404 because `/profil` doesn't exist as a route, but the list is inconsistent.
- **Recommended fix:** Remove `/profil` from `PROTECTED_PATHS`; use `/profile` consistently.
- **Severity:** 🔴 **Critical**

---

### C5. Missing Page: `/betaling`
- **What:** `/betaling` is in `src/middleware/auth-guard.ts` `PROTECTED_PATHS` (line 12), but no `page.tsx` exists for it.
- **Location:** `src/middleware/auth-guard.ts` line 12
- **Impact:** Non-existent route marked as protected. No 404 because route doesn't exist, but path lists are divergent.
- **Recommended fix:** Remove `/betaling` from `PROTECTED_PATHS` or create the page.
- **Severity:** 🔴 **Critical**

---

### C6. Missing Page: `/glemt-passord`
- **What:** `/glemt-passord` is in `src/middleware/auth-guard.ts` `PUBLIC_PATHS` (line 33) and `src/middleware/auth.ts` `AUTH_PATHS` (line 36), but no page exists. The actual password-reset page is `/reset-password` (`src/app/[locale]/(auth)/reset-password/page.tsx`).
- **Location:** `src/middleware/auth-guard.ts` line 33; `src/middleware/auth.ts` line 36
- **Impact:** Non-existent route treated as public/auth page. If middleware were active, users redirected to `/glemt-passord` would 404.
- **Recommended fix:** Add a redirect `/glemt-passord → /reset-password` in `next.config.mjs` (or middleware), or remove `/glemt-passord` from path lists.
- **Severity:** 🔴 **Critical**

---

### C7. Missing Page: `/dashboard/bots`
- **What:** `src/middleware/tier-gate.ts` references `/dashboard/bots` as a tier-gated route (`minLevel: 2`), but the actual route is `/dashboard/bot/[session_id]` (singular `bot`, with dynamic param).
- **Location:** `src/middleware/tier-gate.ts` line 17
- **Impact:** Tier gate checks a non-existent path. The actual bot detail pages are ungated.
- **Recommended fix:** Change path to `/dashboard/bot` (prefix match) or add explicit `/dashboard/bots` if a list view is intended.
- **Severity:** 🔴 **Critical**

---

### C8. Broken Rewrite: `/leksjon/:lessonId` → `/leksjon/[lessonId]`
- **What:** `next.config.mjs` line 221 rewrites `/leksjon/:lessonId` to `/leksjon/[lessonId]`. In Next.js App Router, rewrite destinations must match actual filesystem routes. The actual file is at `src/app/[locale]/(academy)/leksjon/[lessonId]/page.tsx` — it requires a locale prefix and is inside a route group.
- **Location:** `next.config.mjs` line 221
- **Impact:** Rewrite likely 404s because `/leksjon/[lessonId]` is not a valid internal path without the `[locale]` segment.
- **Recommended fix:** Remove the rewrite or rewrite to `/:locale/leksjon/:lessonId` if cross-locale access is needed. With `localePrefix: 'always'`, users should access `/no/leksjon/:lessonId` directly.
- **Severity:** 🔴 **Critical**

---

## 🟡 Warning Issues

### W1. Redirects Missing Locale Prefix (Will 404 Without Middleware)
Because `middleware.ts` is missing, routes without `/no/` or `/en/` prefix in their redirect destination will 404 — all App Router pages live under `src/app/[locale]/`.

| Source | Destination | File | Line |
|--------|-------------|------|------|
| `/signup` | `/register` | `next.config.mjs` | 239 |
| `/admin-dashboard` | `/admin` | `next.config.mjs` | 279 |
| `/leaderboard-preview` | `/leaderboard` | `next.config.mjs` | 281 |
| `/super-admin` | `/admin` | `next.config.mjs` | 283 |
| `/signals` | `/dashboard` | `next.config.mjs` | 289 |

- **Recommended fix:** Prefix all destinations with `/no/` (or `/:locale/`) so they resolve to existing `[locale]` routes while middleware is dead. Long-term: restore `middleware.ts`.
- **Severity:** 🟡 **Warning**

---

### W2. Duplicate `/settings` Redirect (Triple Definition)
- **What:** `/settings → profile?tab=settings` is defined in:
  1. `next.config.mjs` line 267 (`/settings → /no/profile?tab=settings`)
  2. `next.config.mjs` line 308 (`/:locale/settings → /:locale/profile?tab=settings`)
  3. `src/middleware/i18n.ts` lines 91–101 (`/settings → /profile?tab=settings`)
  4. `src/proxy.ts` lines 35–45 (`CANONICAL_REDIRECTS` includes `/dashboard/innstillinger` but NOT `/settings`; however proxy.ts lines 21–25 list `PROTECTED_ROUTES` including `/settings`)
- **Impact:** Confusing stack behavior; if middleware were restored, both layers would try to handle `/settings`.
- **Recommended fix:** Keep only the middleware redirect (more flexible with locales). Remove lines 267 and 308 from `next.config.mjs`.
- **Severity:** 🟡 **Warning**

---

### W3. `/konto` Page Exists but Is Unreachable
- **What:** `src/app/[locale]/(user)/konto/page.tsx` exists, but `src/middleware/i18n.ts` line 104 redirects `/konto → /profile?tab=wallet` with 307. Additionally, the page itself (line 19) redirects to `/${locale}/profile?tab=wallet`.
- **Impact:** Double redirect; page file is dead code. The `/konto` route is kept in PROTECTED_PATHS and LocaleMarketingShell but never renders.
- **Recommended fix:** Delete `src/app/[locale]/(user)/konto/page.tsx` and remove `/konto` from PROTECTED_PATHS lists if the redirect is the canonical behavior. Or remove the redirect if `/konto` should be a real page.
- **Severity:** 🟡 **Warning**

---

### W4. Inconsistent Sitemap: `/om-oss` Commented Out for Norwegian
- **What:** `src/app/sitemap.ts` line 13 has `/om-oss` commented out for Norwegian routes, but line 28 includes `/en/om-oss` for English.
- **Location:** `src/app/sitemap.ts` lines 13, 28
- **Impact:** SEO inconsistency; Norwegian `/om-oss` page exists but is excluded from the sitemap.
- **Recommended fix:** Uncomment `/om-oss` in the Norwegian routes array.
- **Severity:** 🟡 **Warning**

---

### W5. Sitemap Includes Non-Existent `/en/help`
- **What:** `src/app/sitemap.ts` line 36 includes `/en/help` in `staticRoutes`, but the actual page is `/hjelp` (Norwegian only, `src/app/[locale]/(marketing)/hjelp/page.tsx`). There is no `/en/help` page.
- **Location:** `src/app/sitemap.ts` line 36
- **Impact:** Search engines may index a 404.
- **Recommended fix:** Remove `/en/help` from the sitemap or create the English help page.
- **Severity:** 🟡 **Warning**

---

### W6. Similar Legacy Paths with Different Redirect Destinations
- **What:** `/autotrade` and `/auto-trade` are very similar legacy paths but have different redirect targets in `next.config.mjs`:
  - `/autotrade` → `/no/dashboard/auto-trade` (line 241)
  - `/auto-trade` → `/no/dashboard/auto-trade` (line 273)
  - `/auto-trading` → `/dashboard/auto-trade` (via `CANONICAL_REDIRECTS` in proxy/i18n)
  - `/auto-trading-ai` → `/dashboard/auto-trade` (via `CANONICAL_REDIRECTS`)
- **Impact:** Inconsistent handling; some go through `next.config`, others through (dead) middleware.
- **Recommended fix:** Consolidate all auto-trade aliases into `next.config.mjs` with clear locale-prefixed destinations.
- **Severity:** 🟡 **Warning**

---

### W7. Redundant `/marketplace` Redirect
- **What:** `next.config.mjs` line 264 redirects `/marketplace → /no/marketplace`. With `localePrefix: 'always'` (and working middleware), `/marketplace` would already be redirected to `/no/marketplace` by next-intl middleware.
- **Location:** `next.config.mjs` line 264
- **Impact:** Harmless redundancy, but adds maintenance surface.
- **Recommended fix:** Remove redundant redirect once `middleware.ts` is restored.
- **Severity:** 🟡 **Warning**

---

### W8. `/blog` Redirects to Landing Without Content
- **What:** `next.config.mjs` lines 259–260 redirect `/blog` and `/blog/:path*` to `/no` (temporary 302). No blog pages or content exist.
- **Location:** `next.config.mjs` lines 259–260
- **Impact:** Users following old blog links land on the homepage unexpectedly.
- **Recommended fix:** If blog is permanently removed, use 410 Gone or 301 to `/no`. If planned, keep 302.
- **Severity:** 🟡 **Warning**

---

### W9. Inconsistent Settings Routing
- **What:**
  - `/dashboard/innstillinger` → `/dashboard/settings` (CANONICAL_REDIRECTS in proxy/i18n)
  - `/innstillinger` → `/profile?tab=settings` (middleware i18n.ts line 111)
  - `/settings` → `/profile?tab=settings` (middleware i18n.ts line 91)
- **Impact:** Three different "settings" concepts with divergent destinations. Users may be confused about where to find API/binance settings vs profile settings.
- **Recommended fix:** Document the settings architecture clearly. `/dashboard/settings` = API/Binance; `/profile?tab=settings` = user profile; `/innstillinger` = redirect to profile.
- **Severity:** 🟡 **Warning**

---

### W10. Divergent `PROTECTED_PATHS` Lists
- **What:** Multiple middleware files maintain their own `PROTECTED_PATHS` arrays with different contents:
  - `auth-guard.ts`: 28 paths (includes `/profil`, `/betaling`, `/leagues`, `/live-trading`, etc.)
  - `auth.ts`: 15 paths (includes `/leagues`, `/settings`, excludes `/live-trading`, `/paper-trading`)
  - `onboarding.ts`: 13 paths (excludes `/live-trading`, `/paper-trading`, `/auto-trading-ai`)
- **Impact:** Inconsistent protection behavior. Some routes are protected by one layer but not another.
- **Recommended fix:** Create a single canonical `PROTECTED_PATHS` array in `src/middleware/paths.ts` and import it everywhere.
- **Severity:** 🟡 **Warning**

---

### W11. `CANONICAL_REDIRECTS` Duplicated
- **What:** The exact same `CANONICAL_REDIRECTS` object is defined in both `src/proxy.ts` (lines 35–45) and `src/middleware/i18n.ts` (lines 14–24).
- **Location:** `src/proxy.ts` lines 35–45; `src/middleware/i18n.ts` lines 14–24
- **Impact:** Maintenance risk — updates in one place are forgotten in the other.
- **Recommended fix:** Extract to a shared module (e.g., `src/lib/routing/canonical-redirects.ts`).
- **Severity:** 🟡 **Warning**

---

### W12. `/tradere` Server Redirect but No Navigation Links
- **What:** `src/app/[locale]/(social)/tradere/page.tsx` server-redirects to `/${locale}/copy-trading`. No `href="/tradere"` or `href="/tradere"` links exist in the codebase.
- **Impact:** Orphaned redirect route; it exists only for old bookmarks.
- **Recommended fix:** Keep the redirect (harmless), but document it as a legacy alias.
- **Severity:** 🟡 **Warning**

---

### W13. `/live-trading` Server Redirect but No Navigation Links
- **What:** `src/app/[locale]/live-trading/page.tsx` server-redirects to `/${locale}/paper-trading?mode=live`. No navigation links to `/live-trading` exist.
- **Impact:** Orphaned redirect route.
- **Recommended fix:** Keep for legacy bookmarks, but add a note in route inventory docs.
- **Severity:** 🟡 **Warning**

---

### W14. `/simulator` Redirect Exists but Source Page Deleted
- **What:** `next.config.mjs` lines 291, 307 redirect `/simulator` and `/:locale/simulator` to paper-trading. The `/simulator` page does not exist.
- **Impact:** Redirect is safe but unnecessary if no links point to `/simulator`.
- **Recommended fix:** Verify no external links to `/simulator`; if clean, remove redirect.
- **Severity:** 🟡 **Warning**

---

### W15. `/paper-trading` Rewrite Commented Out
- **What:** `next.config.mjs` lines 244–247 have paper-trading rewrites commented out with note "COMMENTED OUT to fix API routes".
- **Location:** `next.config.mjs` lines 244–247
- **Impact:** Dead code in config file.
- **Recommended fix:** Remove commented block or document why it must stay.
- **Severity:** 🟡 **Warning**

---

### W16. Orphaned Dashboard Pages (No Navigation Links)
The following pages exist but have **no `Link` or `href` references** in UI components (only in `dashboard-links.ts` which may or may not be rendered):

| Route | Status |
|-------|--------|
| `/dashboard/earn` | Exists, no nav links found |
| `/dashboard/guide` | Exists, no nav links found |
| `/dashboard/metrics` | Exists, no nav links found |
| `/dashboard/referral` | Exists, no nav links found |
| `/dashboard/sentry-test` | Exists, no nav links found |
| `/dashboard/strategies` | Exists, no nav links found |
| `/dashboard/tax-report` | Exists, no nav links found |
| `/binance-guide` | Exists, no nav links found |
| `/kalkulator` | Exists, only in sitemap |
| `/akademi/dashboard-guide` | Exists, likely orphaned |

- **Recommended fix:** Either add navigation links, remove the pages, or document them as direct-access-only tools.
- **Severity:** 🟡 **Warning**

---

### W17. `[...slug]` Catch-All May Intercept Redirect Targets
- **What:** `src/app/[locale]/[...slug]/page.tsx` is a Sanity-driven catch-all page. It fetches content by slug and calls `notFound()` if no Sanity document matches.
- **Impact:** If a redirect destination is temporarily missing (e.g., page deleted but redirect not updated), the catch-all may try to handle it and return 404 from Sanity instead of a clearer Next.js 404.
- **Recommended fix:** Not actionable directly, but be aware that catch-all pages mask routing issues.
- **Severity:** 🟡 **Warning**

---

## 🔵 Info Issues

### I1. `/admin` Root Page Internally Redirects
- **What:** `src/app/[locale]/(admin)/admin/page.tsx` redirects server-side to `/${locale}/admin/analytics`.
- **Location:** `src/app/[locale]/(admin)/admin/page.tsx` line 14
- **Impact:** Internal redirect is clean and correct.
- **Severity:** 🔵 **Info**

---

### I2. `/konto` Double Redirect
- **What:** Both `src/middleware/i18n.ts` (line 104) and `src/app/[locale]/(user)/konto/page.tsx` (line 19) redirect `/konto` to profile wallet tab.
- **Impact:** Redundant but harmless.
- **Severity:** 🔵 **Info**

---

### I3. Dev/Debug Pages in Production Codebase
- **What:** The following pages exist in the App Router and are deployable to production:
  - `src/app/[locale]/dev/cds-test/page.tsx`
  - `src/app/[locale]/debug/oauth/page.tsx`
  - `src/app/[locale]/(user)/dashboard/sentry-test/page.tsx`
- **Impact:** Low risk if unlinked, but they are buildable and reachable by direct URL.
- **Recommended fix:** Consider guarding with `process.env.NODE_ENV === 'development'` or moving to a separate route group.
- **Severity:** 🔵 **Info**

---

### I4. `next.config.patch.mjs` Not Imported
- **What:** `next.config.patch.mjs` exists and exports `cacheConfig`, but is not imported or used in `next.config.mjs`.
- **Location:** `next.config.patch.mjs`
- **Impact:** Dead file.
- **Recommended fix:** Delete or integrate into `next.config.mjs`.
- **Severity:** 🔵 **Info**

---

### I5. Vercel JSON Redirect: `klarpakke.no` → `www.klarpakke.no`
- **What:** `vercel.json` has a `www` canonical redirect for `klarpakke.no`.
- **Location:** `vercel.json` redirects array
- **Impact:** Correct SEO practice.
- **Severity:** 🔵 **Info**

---

### I6. `trailingSlash: undefined` in `next.config.mjs`
- **What:** Explicitly set to `undefined` with comment "Let Next.js handle it automatically".
- **Impact:** Fine for Vercel, but be aware that trailing slashes can cause duplicate content if not normalized elsewhere.
- **Severity:** 🔵 **Info**

---

### I7. `/api/paper-trading/:path*` Rewrite is Self-Referential
- **What:** `next.config.mjs` line 219 rewrites `/api/paper-trading/:path*` to itself.
- **Location:** `next.config.mjs` line 219
- **Impact:** No-op rewrite; harmless but unnecessary.
- **Recommended fix:** Remove self-referential rewrite.
- **Severity:** 🔵 **Info**

---

### I8. Commented API v1 Redirects in `next.config.mjs`
- **What:** Lines 297–304 contain commented-out API redirects with note "Kept as comments for documentation until old route files are removed."
- **Impact:** Documentation-only comments in config.
- **Recommended fix:** Remove old route files and delete comments.
- **Severity:** 🔵 **Info**

---

### I9. Multiple `/admin/*` Subpages Exist but Are Unlinked
- **What:** Admin routes like `/admin/ab-tests`, `/admin/campaign`, `/admin/monetization`, `/admin/sync-status`, `/admin/system`, `/admin/v2` exist but no `href` links to them were found in the codebase. Admin navigation may be hardcoded elsewhere or accessed via direct URL.
- **Impact:** Not a bug if admin nav is separate; worth verifying.
- **Severity:** 🔵 **Info**

---

### I10. `ROUTING-AUDIT-REPORT.md` Is Stale
- **What:** `ROUTING-AUDIT-REPORT.md` (dated 2026-04-08) documents a fix for duplicate `/innlogging` redirects. That fix is still in place, but the report does not cover the missing `middleware.ts` or recent beta cleanup.
- **Recommended fix:** Archive old report or update it; keep `ROUTING_AUDIT.md` as the current source of truth.
- **Severity:** 🔵 **Info**

---

## 📋 Full Route Inventory

### App Router Pages (`src/app/[locale]/...`) — 95 routes found

| Route Group | Routes |
|-------------|--------|
| `(academy)` | `/akademi`, `/akademi/dashboard-guide`, `/kurs`, `/kurs/[moduleSlug]`, `/kurs/[moduleSlug]/leksjon/[lessonSlug]`, `/kurs/grunnleggende/leksjon/introduksjon-til-krypto`, `/kurs/strategi/leksjon/dollar-cost-averaging`, `/leksjon/[lessonId]` |
| `(admin)` | `/admin`, `/admin/ab-tests`, `/admin/analytics`, `/admin/auto-trading`, `/admin/auto-trading/sessions`, `/admin/campaign`, `/admin/forgot-password`, `/admin/login`, `/admin/monetization`, `/admin/reset-password`, `/admin/settings`, `/admin/students`, `/admin/sync-status`, `/admin/system`, `/admin/users`, `/admin/v2` |
| `(auth)` | `/callback`, `/login`, `/register`, `/reset-password`, `/update-password` |
| `(commerce)` | `/checkout`, `/checkout/success`, `/marketplace` |
| `(legal)` | `/personvern`, `/vilkar` |
| `(marketing)` | `/binance-guide`, `/hjelp`, `/kalkulator`, `/kontakt`, `/om-oss`, `/priser`, `/priser/cancel`, `/priser/success` |
| `(onboarding)` | `/interessetest`, `/onboarding`, `/onboarding/step1-welcome`, `/onboarding/step3-trading-mode`, `/onboarding/step4-binance`, `/onboarding/step5-complete`, `/quiz`, `/velg-strategi`, `/velkommen`, `/verify` |
| `(social)` | `/copy-trading`, `/copy-trading/discover`, `/copy-trading/traders/[id]`, `/leaderboard`, `/tradere` |
| `(user)` | `/dashboard`, `/dashboard/ai`, `/dashboard/asset/[symbol]`, `/dashboard/auto-trade`, `/dashboard/bot/[session_id]`, `/dashboard/earn`, `/dashboard/guide`, `/dashboard/metrics`, `/dashboard/portfolio`, `/dashboard/referral`, `/dashboard/resultater`, `/dashboard/sentry-test`, `/dashboard/settings`, `/dashboard/strategies`, `/dashboard/tax-report`, `/dashboard/trade`, `/handelshistorikk`, `/konto`, `/profile`, `/varsler`, `/varsler/innstillinger` |
| Ungrouped | `/[...slug]`, `/admin/deploy`, `/admin/health`, `/admin/marketing/ctas`, `/admin/monitor`, `/debug/oauth`, `/dev/cds-test`, `/feil/ikke-funnet`, `/feil/ingen-tilgang`, `/feil/serverfeil`, `/funding-arbitrage`, `/live-trading`, `/paper-trading` |

### Root-Level Pages (outside `[locale]`)
- `src/app/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/studio/[[...tool]]/page.tsx`

---

## ✅ Recommended Action Plan

### Immediate (P0 — Before Next Deploy)
1. **Restore `middleware.ts`:** Rename `src/proxy.ts` → `src/middleware.ts`. Update comment references in `next.config.mjs`.
2. **Fix dead redirect:** Change `/beta-testing` destination from `/beta` to `/dashboard`.
3. **Fix missing locale prefixes:** Update `/signup`, `/admin-dashboard`, `/leaderboard-preview`, `/super-admin`, `/signals` redirect destinations to include `/no/` prefix.
4. **Fix broken rewrite:** Remove or correct `/leksjon/:lessonId` rewrite.

### Short-Term (P1 — This Week)
5. **Audit path lists:** Create `src/middleware/paths.ts` with single canonical `PROTECTED_PATHS`, `PUBLIC_PATHS`, `AUTH_PATHS`.
6. **Remove dead routes from path lists:** Delete `/profil`, `/betaling`, `/glemt-passord`, `/leagues` from all `PROTECTED_PATHS`/`PUBLIC_PATHS` unless pages are created.
7. **Fix `/dashboard/bots` tier gate:** Change to `/dashboard/bot`.
8. **Deduplicate `CANONICAL_REDIRECTS`:** Extract to shared module.
9. **Fix sitemap:** Uncomment `/om-oss` for Norwegian; remove `/en/help`.
10. **Delete or document orphaned pages:** Decide fate of `/dashboard/earn`, `/dashboard/guide`, `/dashboard/metrics`, `/dashboard/referral`, `/dashboard/sentry-test`, `/dashboard/strategies`, `/dashboard/tax-report`, `/binance-guide`, `/kalkulator`.

### Maintenance (P2 — Next Sprint)
11. **Run `node scripts/verify/modules/routing.mjs`** after fixes to validate all redirects.
12. **Archive stale docs:** Update or delete `ROUTING-AUDIT-REPORT.md` and `docs/architecture/ROUTE-INVENTORY-2026.md`.
13. **Delete `next.config.patch.mjs`** if unused.
14. **Add integration tests** for critical redirects (auth, i18n, beta).

---

*Audit generated by KIMI Code CLI. Do NOT edit this file manually unless updating findings.*
