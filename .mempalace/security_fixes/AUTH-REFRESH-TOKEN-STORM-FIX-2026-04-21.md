# Auth Refresh Token Storm Fix — 2026-04-21

## Problem
User experienced infinite retry loop on OAuth callback:
- `400 Invalid Refresh Token: Refresh Token Not Found`
- Escalated to `429 Too Many Requests` (rate limited by Supabase)
- ~40+ failed refresh requests in seconds

## Root Causes Found

1. **Refresh guard NOT wired into active paths**
   - `createRefreshProtectedFetch` (mutex + circuit breaker) existed but was NOT connected to:
     - `src/lib/supabase/client.ts` (browser client)
     - `src/middleware.ts` (active middleware)
   - Only used in legacy files and trading API

2. **Multiple independent refresh triggers**
   - `AuthContext.getSession()` → refreshes expired tokens
   - `AuthHashHandler` → calls `getSession()`
   - Legacy `useAuth()` hook in `src/lib/hooks.ts` → calls `getUser()` + own `onAuthStateChange`
   - Supabase internal `autoRefreshToken: true` timer → background refresh
   - Middleware `getUser()` → auto-refreshes on EVERY page request

3. **Callback page `useRef` guard NOT Strict Mode safe**
   - `useRef(false)` is reset on Strict Mode remount → `exchangeCodeForSession()` runs twice

4. **No circuit breaker = instant retry storm**
   - Every failed refresh triggered another on next render/request
   - No backoff, no deduplication, no cross-tab coordination

## Fixes Applied

| File | Change |
|------|--------|
| `src/lib/supabase/client.ts` | Added `createRefreshProtectedFetch` to `global.fetch`. Set `autoRefreshToken: false` to disable Supabase's internal timer. |
| `src/middleware.ts` | Wired `createRefreshProtectedFetch` into server client's `global.fetch`. |
| `src/app/[locale]/(auth)/callback/page.tsx` | Replaced `useRef` with module-level `Set<string>` — survives Strict Mode double-mounting. |
| `src/lib/hooks.ts` | Removed duplicate `useAuth()` hook (no imports found in codebase). |
| `src/lib/auth/new/AuthContext.tsx` | Added `isMounted` guard to prevent state updates after unmount. |

## How Refresh Guard Works

```
Refresh request
  → Circuit breaker open? (3 failures in 30s) → Return 429 synthetic
  → Cross-tab lock via navigator.locks.request() → Only one tab refreshes
  → If another tab already refreshed → Return cached result
  → Perform fetch → On failure: increment counter, log, cache error
  → On success: reset counter, cache success for 2s
```

## Verification

```bash
npm run lint        # ✅ 0 errors
npm run type-check  # ✅ 0 errors
npm run test:unit -- src/lib/auth  # ✅ 41 passed
npm run build       # ✅ 470 pages, no errors
```

## Deployment Status
- [ ] Deploy to production
- [ ] Monitor Sentry for `REFRESH_TOKEN_FAILED` errors
- [ ] Verify OAuth callback works end-to-end

## References
- Previous fix: `.mempalace/AUTH-REFRESH-TOKEN-RACE-FIX-2026-04-20.md` (addressed "Already Used" race)
- This fix: Addresses "Not Found" + 429 storm
