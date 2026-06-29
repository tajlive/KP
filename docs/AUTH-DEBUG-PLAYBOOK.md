# 🔐 Auth Debug Playbook - Klarpakke

> Optimal debugging for "kicked out after login"-problemet

## 🎯 Problemstilling

- Bruker logger inn med Google OAuth
- Blir redirected til dashboard
- Kastes umiddelbart tilbake til login
- React hydration error #418 under callback

## 🛠️ Debug-verktøy (prioritert)

### 1. **Chrome DevTools** (raskt + visuelt) ⭐ ANBEFALT
```bash
# Ingen oppsett nødvendig - bruk nettleser
```

**Steg:**
1. Åpne `https://www.klarpakke.no`
2. F12 → DevTools
3. Gå til **Network** tab → Hak av "Preserve log"
4. Gå til **Application** → **Cookies** → `https://www.klarpakke.no`
5. Logg inn med Google
6. Se etter:
   - `sb-access-token` cookie
   - `sb-refresh-token` cookie
   - **Domain** må være: `.klarpakke.no` (med punktum!)
   - **SameSite**: `None`
   - **Secure**: `true`

**Røde flagg:**
- Domain: `www.klarpakke.no` (uten punktum) = feil
- SameSite: `Lax` eller `Strict` = feil
- Ingen cookies etter callback = kritisk feil

---

### 2. **Playwright MCP** (automatisk testing)

```bash
npm run debug:auth
```

**Hva den gjør:**
- Åpner browser automatisk
- Logger inn med Google
- Tar screenshot ved feil
- Sjekker cookies etter hvert steg
- Tester session persistence etter refresh

**Video/opptak:**
- Lagres i `test-videos/`
- Screenshot: `auth-error.png`

---

### 3. **Curl + Headers** (rask backend-sjekk)

```bash
# Sjekk callback response headers
curl -I "https://www.klarpakke.no/no/auth/callback"

# Forventet: 307 redirect med Location header
# Må ha cache-control for å unngå caching
```

---

### 4. **Supabase MCP** (database/sessions)

```sql
-- Sjekk brukerens siste innlogging
SELECT 
    email,
    last_sign_in_at,
    confirmed_at,
    raw_app_meta_data->>'provider' as provider
FROM auth.users 
WHERE email = 'tomarnejensen@gmail.com';

-- Sjekk aktive sessions
SELECT 
    user_id,
    created_at,
    updated_at
FROM auth.sessions 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'tomarnejensen@gmail.com'
);
```

**Sjekk i Supabase Dashboard:**
- URL: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf
- Gå til: Authentication → Users
- Søk etter: `tomarnejensen@gmail.com`
- Sjekk "Last Sign In"

---

### 5. **Sentry MCP** (error tracking)

```bash
# Manuell sjekk
open https://klarpakke.sentry.io/issues/?query=is%3Aunresolved+auth
```

**Se etter:**
- `AuthApiError`
- `RefreshTokenError`
- Hydration errors (#418)
- Cookie parse errors

---

### 6. **Cloudflare MCP** (deployment logs)

```bash
# Sjekk produksjonslogs
npx wrangler tail --format=pretty

# Eller i Cloudflare Dashboard
open https://dash.cloudflare.com
```

---

## 🔧 Hypoteser & Løsninger

### Hypotese 1: Cookie Domain Mismatch
**Symptom:** Cookies satt på `www.klarpakke.no`, middleware leser fra `klarpakke.no`

**Test:**
```javascript
// I DevTools console
document.cookie.includes('sb-access-token')
```

**Fix:** I `src/lib/supabase/server.ts`:
```typescript
// Sikre at domain alltid er .klarpakke.no (med punktum)
const cookieDomain = '.klarpakke.no'; // Hardkodet, ikke dynamisk
```

### Hypotese 2: SafeStorage rydder for aggressivt
**Symptom:** Session finnes etter callback, men forsvinner på refresh

**Test:** Sjekk localStorage etter login
```javascript
Object.keys(localStorage).filter(k => k.startsWith('sb-'))
```

**Fix:** I `src/features/auth/AuthContext.tsx`:
```typescript
// Kommenter ut eller reduser aggressiviteten
// clearCorruptSupabaseKeysSync();
```

### Hypotese 3: SameSite/Secure settings
**Symptom:** Cookies blir blokkert av browser pga cross-origin

**Test:** DevTools → Console → se etter cookie warnings

**Fix:** Sikre at cookies har:
```typescript
{
  sameSite: 'none',
  secure: true,
  domain: '.klarpakke.no'
}
```

### Hypotese 4: OAuth redirect URI mismatch
**Symptom:** "redirect_uri_mismatch" error i Google popup

**Test:** Sjekk Google Console

**Fix:** Verifiser at følgende er whitelistet i Google Cloud Console:
- `https://www.klarpakke.no/no/auth/callback`
- `https://klarpakke.no/no/auth/callback`

---

## ⚡ Quick Commands

```bash
# Komplett debug-toolkit
npm run debug:auth:full

# Rask header-sjekk
npm run debug:auth:quick

# Playwright automatisk test
npm run debug:auth

# Verifiser OAuth config
npm run verify:google-oauth
```

---

## 📊 Debug-flyt (anbefalt rekkefølge)

1. **Chrome DevTools** (2 min) → Se om cookies settes
2. Hvis cookies IKKE settes → Sjekk **Sentry** for errors
3. Hvis cookies SETTES men forsvinner → Sjekk **SafeStorage**
4. Hvis cookies ser riktig ut → Sjekk **Supabase sessions**
5. Hvis ingenting hjelper → Kjør **Playwright debug**

---

## 🔗 Nyttige Lenker

| Tool | URL |
|------|-----|
| Sentry | https://klarpakke.sentry.io/issues/ |
| Supabase | https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf |
| Cloudflare | https://dash.cloudflare.com |
| Google Console | https://console.cloud.google.com/apis/credentials |

---

## 🆘 Nødløsning

Hvis ingenting fungerer og brukere er blokkert:

```typescript
// Midlertidig fix: Skip onboarding middleware for auth
// I src/middleware.ts
export const config = {
  matcher: [
    // Ekskluder auth paths fra middleware
    '/((?!api|_next|auth|login|innlogging).*)',
  ],
};
```

---

*Sist oppdatert: 2026-04-08*
