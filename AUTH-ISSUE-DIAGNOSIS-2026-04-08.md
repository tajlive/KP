# 🔐 Auth Issue Diagnosis - 2026-04-08

## Problem
Brukere blir kastet ut umiddelbart etter Google OAuth login.  
Feilmelding: `PKCE code verifier not found in storage`

## Debugging Utført

### 1. PKCE Cookie Analysis ✅

```
Cookie name:     sb-vuxbjlykgmzskxbclquf-auth-token-code-verifier
Cookie domain:   .klarpakke.no  ✅ (riktig - med punktum)
Cookie path:     /              ✅
SameSite:        None           ✅
Secure:          true           ✅
```

**Funn:** Cookie blir satt riktig av Supabase auth klienten.

### 2. Callback Route Analysis ⚠️

**Redirect chain:**
```
/no/auth/callback?code=xxx  
  → 307 → /auth/callback?code=xxx
  → 307 → /no/innlogging?error=exchange_failed
```

**Problem:** PKCE code-verifier cookien finnes, men `exchangeCodeForSession` kan ikke finne den.

### 3. Potensiell Årsak: Cookie Handling i createServerClient

I `src/lib/supabase/server.ts`:
```typescript
// createServerClient for route handlers
cookies: {
  getAll: () => request.cookies.getAll(),  // Leser fra request
  setAll: (cookiesToSet) => { ... }        // Setter på response
}
```

I `src/app/[locale]/auth/callback/route.ts`:
```typescript
// Cookie leses her:
const pkceCookie = allCookies.find((c) => c.name.includes("code-verifier"));
console.log("pkceCookieName:", pkceCookie?.name || "NONE");  // Viser cookie!

// Men exchangeCodeForSession kalles uten å bruke den:
const { data, error } = await supabase.auth.exchangeCodeForSession(code);
// ^ Denne feiler fordi den ikke finner code-verifier i "storage"
```

## Hypoteser

### H1: Supabase SSR leser ikke cookies riktig under exchange
`@supabase/ssr` sin `exchangeCodeForSession` skal automatisk finne code-verifier fra cookies via `getAll()`, men dette fungerer ikke.

### H2: Cookie går tapt i redirect fra /no/auth/callback til /auth/callback
Redirect chain kan miste cookies hvis domain/path ikke matcher nøyaktig.

### H3: Cookie encoding issue
Cookie verdien er URL-encoded (`%22...`), kanskje Supabase ikke decoder riktig?

## Anbefalte Fixes

### Fix 1: Eksplisitt PKCE handling i callback
```typescript
// I src/app/[locale]/auth/callback/route.ts
const codeVerifier = pkceCookie?.value;

const { data, error } = await supabase.auth.exchangeCodeForSession(code, {
  // Noen versjoner av Supabase støtter dette:
  codeVerifier: codeVerifier?.replace(/^"|"$/g, ''), // fjern quotes
});
```

### Fix 2: Unngå redirect i callback
Sjekk om `/no/auth/callback` kan håndtere exchange direkte uten å redirecte til `/auth/callback`.

### Fix 3: Debug cookie lesing
Legg til ekstra logging for å se hva `request.cookies.getAll()` faktisk returnerer:
```typescript
console.log("All cookies:", allCookies.map(c => ({ name: c.name, domain: c.domain })));
console.log("PKCE cookie:", pkceCookie);
```

## Nødstest

Kjør manuell test:
```bash
node scripts/debug-real-login.mjs
```

Dette åpner browser og logger all network activity under faktisk login.

## Oppsummering

| Komponent | Status |
|-----------|--------|
| PKCE cookie satt | ✅ Ja |
| Cookie domain | ✅ .klarpakke.no |
| Cookie sendt til callback | ❌ Usikker |
| exchangeCodeForSession | ❌ Feiler |
| Session etablert | ❌ Nei |

**Mest sannsynlig årsak:**  
Enten går cookien tapt i redirect-chain, eller så leser ikke Supabase SSR klienten cookien riktig under `exchangeCodeForSession`.

**Neste steg:**  
1. Kjør manuell login test (`debug-real-login.mjs`)
2. Verifiser at cookie faktisk sendes med til callback
3. Hvis ja: Debug Supabase SSR cookie reading
4. Hvis nei: Fiks cookie domain/path i redirect chain
