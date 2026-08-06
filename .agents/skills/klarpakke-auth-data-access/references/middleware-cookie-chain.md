# Middleware cookie-chain debugging — redirect-loop root causes

## Symptom
All protected pages return 307 redirect to login for an authenticated user (valid session in browser). No 401/403 — just redirect.

## Root causes (check in this order)

### 1. rateLimitMiddleware swallows accumulated cookies

The `chain()` passes the `response` object forward. If any middleware returns a **brand new** `NextResponse.next()` instead of the accumulated response, **all cookies** set by earlier middleware are lost (refreshed Supabase auth tokens, onboarding cookies, tier cookies).

```
correlation → i18n → auth (sets cookies) → rateLimit (NextResponse.next() → cookies lost!) → CSP → cache-control
```

**Fix in `src/middleware/rateLimit.ts`:**
```
BEFORE (cookies lost): if (!matchedPath) return NextResponse.next();
AFTER  (cookies kept): if (!matchedPath) return _response ?? NextResponse.next();
```

**Scan rule:** All middlewares implementing `MiddlewareFn` MUST accept `response?` and return it (or a modification) for non-matching routes. `NextResponse.next()` creates a new response object without cookies.

### 2. sameSite/secure cookie inconsistency across cookie-setters

Klarpakke has **three** places that set Supabase cookies in middleware/routes, all must be consistent:

| File | Function | Cookie setter |
|---|---|---|
| `src/lib/supabase/server.ts` | `createServerClient(request, response)` | `setAll` (middleware path) |
| `src/middleware/auth-guard.ts` | `createSupabaseClient(request, response)` | `setAll` |
| `src/middleware/auth-guard.ts` | `redirectWithCookies(url, request, response)` | Copies cookies to redirect response |

**Pitfall:** `sameSite: "none"` + `secure: true` only works over HTTPS. On localhost (HTTP) some browsers reject these cookies. Use isLocalhost check:
```typescript
const host = request.headers.get("host") || "";
const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
const useSecure = !isLocalhost;

response.cookies.set(name, value, {
  ...options,
  path: "/",
  domain: cookieDomain,
  sameSite: "lax",
  secure: useSecure,
});
```

### 3. redirectWithCookies loses cookie options

`NextResponse.cookies.getAll()` returns only `{ name, value }[]` — NOT options (path, httpOnly, maxAge). When `redirectWithCookies` copies cookies to a new `NextResponse.redirect()`:
- Explicit `path: "/"` must be set (default is the current path, not "/")
- `httpOnly: true` must be set explicitly (security + Supabase expects it)
- `maxAge` is lost — expect refresh cookies to be session-only on redirect

```
BEFORE (options lost via ...cookie spread):
  redirectResponse.cookies.set(cookie.name, cookie.value, {
    ...cookie,  // name/value only, no options
    domain: cookieDomain,
    sameSite: "none",
    secure: true,
  });

AFTER:
  redirectResponse.cookies.set(cookie.name, cookie.value, {
    path: "/",
    domain: cookieDomain,
    sameSite: "lax",
    secure: useSecure,
    httpOnly: true,
  });
```

### 4. Verify all cookie sites are synchronized

```bash
grep -n 'sameSite: "none"' src/middleware/auth-guard.ts src/lib/supabase/server.ts
grep -n 'sameSite: "lax"' src/middleware/auth-guard.ts src/lib/supabase/server.ts
```

If any files still have "none" → convert to "lax" + useSecure. If any files lack isLocalhost check → add it. If any files lack `path: "/"` → add it.

## Ground rules for cookie-setting in middleware

- Use "lax" as sameSite — works on both HTTP and HTTPS, safe for auth cookies
- Use `secure: !isLocalhost` — on localhost (HTTP) secure must be false for cookies to be accepted
- Always set `path: "/"` — otherwise the cookie only applies to the request's path
- Keep `httpOnly: true` for auth cookies (sb-*)
- Keep cookie domain without port — `getCookieDomain` returns `undefined` for `localhost:N` (due to port)
