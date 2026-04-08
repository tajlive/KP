# Auth Session Expired Fix - v2

**Date:** 2026-04-08  
**Problem:** Session "expired" umiddelbart etter login  
**Root Cause:** PKCE cookie URL-encoded med quotes

## Diagnose

```
PKCE cookie value: %22490b800cb239411f1272dd6d283...
                    ^^^ URL-encoded quotes
```

Supabase SSR klienten forventet ren code_verifier, men fant URL-encoded verdi med quotes.

## Fix v2

```typescript
// 1. Decode URL-encoded value
let rawValue = decodeURIComponent(pkceCookie.value);

// 2. Remove surrounding quotes
if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
  rawValue = rawValue.slice(1, -1);
}

// 3. Re-set cookie med decoded value
response.cookies.set(pkceCookie.name, codeVerifier, {...});

// 4. Pass eksplisitt til exchange
await supabase.auth.exchangeCodeForSession(code, { codeVerifier });
```

## Commit
```
ea6b6eba0 fix(auth): decode PKCE cookie and pass codeVerifier explicitly
```

## Test
1. Gå til https://www.klarpakke.no/login
2. Logg inn med Google (tomarnejensen@gmail.com)
3. Verifiser redirect til dashboard (ikke login?expired=1)

## Monitoring
- Vercel logs: Se etter "🔥 PKCE COOKIE FOUND"
- Sjekk at "🔥 EXCHANGE RESULT" viser success: true
