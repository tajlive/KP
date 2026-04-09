# 🔐 OAuth Fix Complete - 2026-04-09

## Problem Identifisert

Google OAuth login feilet med `access_denied` eller "unverified app" advarsel for brukere.

## Root Cause

Det var **to inkonsistente kodebaner** for Google OAuth:

1. **`src/lib/auth/googleAuth.ts`** → `signInWithGoogle()`
   - ✅ Hadde eksplisitte scopes: `'openid email profile'`
   - Brukes kun av debug-siden `/no/debug/oauth`

2. **`src/lib/auth/utils.ts`** → `signInWithOAuth()` 
   - ❌ Brukte `OAUTH_CONFIG['google']` som **IKKE** hadde scopes definert
   - Brukes av **hovedinnloggingen** (`UnifiedAuthButton.tsx`)

Dette betydde at vanlige brukere som klikket "Logg inn med Google" på innloggingssiden fikk forespørselen sendt **uten eksplisitte scopes**, noe som fikk Google til å bruke default scopes - potensielt inkludert sensitive scopes som ikke var godkjent.

## Fix Implementert

### 1. Kodefix ✅

**Fil:** `src/lib/auth/config.ts`

```typescript
export const OAUTH_CONFIG = {
  google: {
    // CRITICAL: Eksplisitte basic scopes for å unngå "unverified app" feil
    scopes: "openid email profile",  // ← LAGT TIL
    queryParams: {
      access_type: "offline",
      prompt: "consent",
    },
  },
  // ...
};
```

**Resultat:** Begge kodebaner har nå identiske, eksplisitte scopes.

### 2. Manuell Verifikasjon Nødvendig 🔧

Selv med kodefiksen, kan det være konfigurasjon i Supabase Dashboard eller Google Cloud Console som overstyrer koden:

#### Sjekk A: Supabase Dashboard

1. Gå til: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/providers
2. Klikk på **Google**
3. Sjekk feltet **"Additional Scopes"**
4. **Fjern** alt som er der (spesielt `gmail.*`, `drive.*`, `calendar.*`)
5. Lagre endringer

#### Sjekk B: Google Cloud Console

1. Gå til: https://console.cloud.google.com/apis/credentials/consent
2. Sjekk **"Publishing Status"** øverst:
   - Skal være: **"In production"** ✅
   - Hvis "Testing": Klikk "PUBLISH APP"
3. Klikk **"Edit app"**
4. Gå til **"Scopes"** seksjonen
5. Fjern alle **Sensitive Scopes** hvis de ikke er nødvendige
6. Hvis sensitive scopes trengs: Må gjennom Google's verifiseringsprosess

## Verifikasjon

### Etter deploy, test følgende:

```bash
# 1. Deploy til produksjon
git add -A && git commit -m "fix: eksplisitte OAuth scopes for Google login" && git push origin main

# 2. Vent på Vercel deploy (~2-3 min)

# 3. Test i produksjon
open https://www.klarpakke.no/no/innlogging
```

### Test-scenarioer:

1. **Normal login:** Klikk "Fortsett med Google" → Skal fungere
2. **Debug info:** Gå til `/no/debug/oauth` → Sjekk at scopes vises riktig
3. **Feilhåndtering:** Avbryt login → Skal vise brukervennlig feilmelding

## Hvis Problemet Fortsetter

Hvis brukere fortsatt får "access_denied" etter denne fiksen:

1. **Google har cachet gamle scopes**
   - Løsning: Vent 1-2 timer, eller be brukeren tømme cookies
   
2. **Supabase "Additional Scopes" overstyrer koden**
   - Løsning: Dobbeltsjekk Supabase Dashboard (se Sjekk A ovenfor)
   
3. **Google Cloud Console har sensitive scopes konfigurert**
   - Løsning: Fjern sensitive scopes (se Sjekk B ovenfor)

## Oppsummering

| Komponent | Status | Kommentar |
|-----------|--------|-----------|
| Kodefix (scopes) | ✅ Fikset | `OAUTH_CONFIG['google'].scopes` lagt til |
| Supabase Dashboard | 🟡 Sjekk manuelt | "Additional Scopes" må være tom |
| Google Cloud Console | 🟡 Sjekk manuelt | Ingen sensitive scopes uten godkjenning |
| Testing | 🟡 Etter deploy | Verifiser med reell Google-konto |

## Relaterte Filer

- `src/lib/auth/config.ts` - OAUTH_CONFIG med scopes
- `src/lib/auth/googleAuth.ts` - signInWithGoogle()
- `src/lib/auth/utils.ts` - signInWithOAuth()
- `src/features/auth/UnifiedAuthButton.tsx` - UI som bruker signInWithOAuth
- `AUTH-ISSUE-DIAGNOSIS-2026-04-08.md` - Tidligere diagnose

## Referanser

- [Google OAuth Scopes Documentation](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Supabase Auth Google Provider](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth "Unverified App" Help](https://support.google.com/cloud/answer/7454865)
