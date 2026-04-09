# 🔐 Auth Issue Diagnosis - 2026-04-08

## Problem
Brukere får "Google login was cancelled or denied" feil etter OAuth-forsøk.

## Root Cause Identified ✅

**Appen er i "In production" men ber om scopes som ikke er godkjent.**

### Bevis
Fra Google Cloud Console:
- ✅ Publishing status: **In production**
- ✅ User type: **External**  
- ⚠️ 0 users / 100 user cap
- ⚠️ Warning: *"If your users are seeing the 'unverified app' screen, it is because your OAuth request includes additional scopes that haven't been approved."*

### Mulige årsaker
1. **Supabase Auth settings** har sensitive scopes konfigurert (`gmail.*`, `drive.*`, etc.)
2. **Tidligere versjon** av appen ba om sensitive scopes og Google har cachet det
3. **Eksplisitte scopes** manglet i koden (brukte default som kan ha endret seg)

## Løsning

### Fix 1: Reduser scopes i koden (Pågår) ✅
La til eksplisitte scopes i `googleAuth.ts`:
```typescript
scopes: 'openid email profile',  // Kun basic info, ingen sensitive
```

### Fix 2: Sjekk Supabase Dashboard
1. Gå til https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/providers
2. Klikk på **Google**
3. Sjekk feltet **"Additional Scopes"**
4. **Fjern** alt som er der (spesielt `gmail.*`, `drive.*`, `calendar.*`)

### Fix 3: Sjekk Google Cloud Console Sensitive Scopes
1. Gå til https://console.cloud.google.com/apis/credentials/consent
2. Klikk **"Edit app"**
3. Sjekk **"Scopes"** seksjonen
4. Fjern eller godkjenn sensitive scopes

## Code Fixes Implementert

### 1. User-Friendly Error Handler
**Fil:** `src/app/[locale]/auth/callback/error-handler.ts`

```typescript
export function handleOAuthError(error: OAuthError): OAuthErrorResult {
  if (error === "access_denied") {
    return {
      error,
      message: "User denied access or app requests unapproved scopes",
      userMessage: "Google-login ble avvist. Appen ber om tilganger som må godkjennes.",
      fixInstructions: [
        "Gå til https://console.cloud.google.com/apis/credentials/consent",
        "Sjekk at alle 'Sensitive scopes' er godkjent (hvis du bruker dem)",
        "ELLER fjern sensitive scopes fra Supabase Dashboard",
        "Kontakt support@klarpakke.no hvis problemet vedvarer"
      ],
      isRetryable: true,
    };
  }
  // ...
}
```

### 2. Oppdatert Login UI med Fix Instruksjoner
**Fil:** `src/app/[locale]/(auth)/login/InnloggingClient.tsx`

Nå viser login-siden:
- Gul/oransje warning box for feil med fix-instruksjoner
- Nummererte steg for hva brukeren kan gjøre
- Direkte linker til Google Cloud Console og Supabase

### 3. Eksplisitte scopes i Google Auth
**Fil:** `src/lib/auth/googleAuth.ts`

```typescript
{
  provider: 'google',
  options: {
    redirectTo: `${origin}/${locale}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    // Eksplisitt bare basic profile - ingen sensitive scopes
    scopes: 'openid email profile',
  },
}
```

## Testing

### Verifiser Fix
```bash
# Kjør OAuth verify
npm run verify:google-oauth

# Test login (etter deploy)
open https://www.klarpakke.no/no/innlogging
```

### Debug Tools
- **Debug UI:** `/no/debug/oauth` (viser OAuth config status)
- **Login med feil:** `/no/innlogging?error=oauth_failed&detail=access_denied`

## Oppsummering

| Komponent | Status |
|-----------|--------|
| Root cause identified | ✅ Unapproved scopes |
| Explicit basic scopes | ✅ `openid email profile` |
| Error handler | ✅ User-friendly messages |
| Fix instructions | ✅ In login UI |
| Documentation | ✅ This file |

## Neste Steg

1. **Umiddelbart:** Sjekk Supabase Dashboard → Auth → Providers → Google → Additional Scopes
2. **Deploy:** Push koden med eksplisitte scopes
3. **Test:** Verifiser at login fungerer
4. **Fallback:** Hvis fortsatt feil, sjekk Google Cloud Console Sensitive Scopes
