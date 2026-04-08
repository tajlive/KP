# Auth Manual PKCE Fix - v3

**Date:** 2026-04-08  
**Problem:** Session expired immediately - API calls return 401  
**Root Cause:** Supabase SSR not setting session cookies properly

## Symptoms
- Login appears successful (reaches dashboard)
- API calls return 401 Unauthorized
- Redirected to login?expired=1
- Console shows MISSING_MESSAGE errors (i18n)

## Root Cause
Supabase SSR client's `exchangeCodeForSession` doesn't properly set cookies  
in the response when called from route handler.

## Fix v3: Manual PKCE Exchange

Bypass Supabase SSR client entirely:

```typescript
// 1. Call Supabase Auth API directly
const exchangeResponse = await fetch(
  `${SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: codeVerifier,
    }),
  }
);

// 2. Set cookies manually
response.cookies.set("sb-access-token", tokenData.access_token, {...});
response.cookies.set("sb-refresh-token", tokenData.refresh_token, {...});
```

## Commit
```
5f8cf01b4 fix(auth): manual PKCE exchange to bypass SSR cookie issues
```

## Test
1. Login with Google
2. Should redirect to dashboard
3. API calls should work (no 401)
4. Refresh should keep session
