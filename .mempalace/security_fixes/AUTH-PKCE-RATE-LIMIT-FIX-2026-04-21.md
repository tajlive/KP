# Auth PKCE Rate Limit Fix — 2026-04-21

## Problem (NEW — distinct from refresh-token storm)

User reports:
```
vuxbjlykgmzskxbclquf.supabase.co/auth/v1/token?grant_type=pkce:1
  Failed to load resource: the server responded with a status of 429 ()
[AuthHashHandler] OAuth error: Request rate limit reached null
```

This is **NOT** the same as the `grant_type=refresh_token` 429 storm fixed earlier today.
This is PKCE code-exchange rate limiting: `supabase.auth.exchangeCodeForSession(code)` is being called too many times with the same code, and Supabase throttles it.

## Root Causes

### 1. Callback page `useRef(false)` guard NOT Strict Mode safe
`src/app/[locale]/(auth)/callback/page.tsx` used `useRef(false)` to prevent double-execution.
- In React Strict Mode (dev), component remounts → ref resets → `exchangeCodeForSession()` runs **twice**
- In production, remounts from Suspense boundaries or parent re-renders also reset the ref
- Each call hits `POST /auth/v1/token?grant_type=pkce` with the same code

### 2. `useEffect` dependency array included `searchParams`
`[router, searchParams, locale]` — `searchParams` can theoretically change reference on re-render, triggering the effect again.

### 3. `AuthHashHandler` runs ON the callback page
`AuthHashHandler` is rendered in `src/app/[locale]/layout.tsx` on ALL pages, including `/callback`.
- It checks `searchParams.get("error")` — when Supabase redirects back with `?error=...`, AuthHashHandler logs it
- It does NOT call `exchangeCodeForSession`, but its presence on the callback page is unnecessary and confusing

### 4. No cross-reload deduplication
Even with a module-level guard, a full page reload would clear it, allowing the same code to be exchanged again.

## Fixes Applied

| File | Change |
|------|--------|
| `src/app/[locale]/(auth)/callback/page.tsx` | **Triple guard** against duplicate PKCE exchange: (1) module-level `Set<string>`, (2) `sessionStorage` key, (3) `useEffect` with empty deps + `window.location.search` read inline. Removed `searchParams` from deps. |
| `src/lib/auth/new/AuthHashHandler.tsx` | Added early return if `window.location.pathname.includes("/callback")` — lets callback page handle auth exclusively. |

## Triple Guard Explained

```
Callback page mounts
  → Read code from window.location.search (stable, no ref changes)
  → Build cacheKey: "<code>-<pathname>"
  → Check module-level Set — already handled? → skip
  → Check sessionStorage — already handled? → skip
  → Add to both Set and sessionStorage
  → Call exchangeCodeForSession(code) — ONCE per code per tab session
```

## How This Differs from Refresh-Token Storm

| Aspect | Refresh-token storm | PKCE rate limit |
|--------|---------------------|-----------------|
| Endpoint | `POST /token?grant_type=refresh_token` | `POST /token?grant_type=pkce` |
| Trigger | Invalid/expired refresh token | Same auth code exchanged multiple times |
| Count | 40+ requests in seconds | 2-5 requests (Supabase PKCE limit is low) |
| Fix | Circuit breaker + mutex + autoRefreshToken:false | Deduplication guard on callback page |

## Verification

```bash
npm run lint        # ✅ 0 errors
npm run type-check  # ✅ 0 errors
npm run test:unit -- src/lib/auth  # ✅ 41 passed
```

## Deployment Status
- [ ] Deploy to production
- [ ] Test OAuth end-to-end (Google login → callback → dashboard)
- [ ] Verify no 429 on `grant_type=pkce` in browser Network tab

## References
- Refresh-token storm fix: `.mempalace/security_fixes/AUTH-REFRESH-TOKEN-STORM-FIX-2026-04-21.md`
- Supabase PKCE docs: https://supabase.com/docs/guides/auth/server-side/pkce
