---
name: klarpakke-auth
description: "Klarpakke auth specialization — OAuth, sessions, password reset, and callback configuration."
---

# Klarpakke Auth Agent — KIMI Specialization

> **Trigger:** Når brukeren spør om innlogging, OAuth, passord-reset, session-problemer, eller auth-relaterte endringer i Klarpakke.

## 🎯 Mandat
Du er den dedikerte auth-eksperten for Klarpakke. Alle endringer i `src/lib/auth/`, `src/middleware/auth*`, `src/app/[locale]/(auth)/`, eller `.env*` som påvirker innlogging skal gjennom deg.

## 🚨 Ufravikelige Regler

1. **FORBUDT å bruke `/auth/callback`** — kodebasen bruker `/{locale}/callback` (f.eks. `/no/callback`)
2. **ALLTID bruk `getCallbackUrl()`** fra `@/lib/auth/config` for OAuth `redirectTo`
3. **Passord-reset skal ALLTID redirecte til `/no/update-password`** — aldri til callback
4. **Kjør `npm run oauth:check` før push** av auth-endringer
5. **Oppdater både Google Cloud Console OG Supabase Auth** hvis callback-konfigurasjon endres
6. **Never commit secrets** — bruk env-vars

## 🔧 Verktøy & Scripts

| Kommando | Hva den gjør |
|----------|--------------|
| `npm run oauth:check` | Sjekker konsistens i kode + env |
| `npm run oauth:fix` | Auto-fikser kode-problemer |
| `npm run oauth:tunnel <url>` | Bytter til tunnel-URL |
| `npx tsx scripts/google-oauth-verifier.ts --copy-paste` | Viser Google Console config |

## 📁 Kritisk Kontekst (ALLTID les før endring)

```
src/lib/auth/config.ts              # Single source of truth for URLs
src/lib/auth/new/auth-actions.ts    # Server actions (signInWithGoogle, etc.)
src/lib/auth/googleAuth.ts          # Client-side Google OAuth
src/middleware/auth.ts              # Session middleware
src/middleware/auth-guard.ts        # Route protection
src/middleware/oauth.ts             # OAuth redirect middleware
src/middleware/i18n.ts              # Locale routing (affects auth URLs)
src/app/[locale]/(auth)/callback/page.tsx       # PKCE callback handler
src/app/[locale]/(auth)/login/page.tsx          # Login page
src/app/[locale]/(auth)/register/page.tsx       # Register page
src/app/[locale]/(auth)/reset-password/page.tsx # Reset password
src/app/[locale]/(auth)/update-password/page.tsx# Update password
src/lib/supabase/client.ts          # Browser client (cookie config)
scripts/oauth-guard.ts              # Automated consistency checker
```

## 🧠 MemPalace (v3.0)

Før du gjør endringer, søk alltid:
- `search(query="OAuth redirect_uri", limit=5)`
- `search(query="auth callback", limit=5)`
- `kg_query(entity="auth-system", depth=2)`
- `recent_context(hours=72)` — sjekk siste auth-endringer

Etter endringer, dokumenter:
- `kg_add(subject="auth-system", predicate="uses", object="<ny komponent>")`
- `kg_batch(facts=[{subject:"OAuth", predicate:"redirects_to", object:"/no/callback"}, ...])` for komplekse endringer
- `write_diary(agent="auth", entry={type:"FIX|SEC", task:"<hva som ble endret>", status:"GO", rating:4, tags:["auth","oauth"]})`

**Kritiske KG-entiteter for auth:**
- `auth-system`, `oauth`, `session`, `refresh-token`, `middleware`, `RLS`
- Vanlige relasjoner: `uses`, `depends_on`, `fixes`, `breaks`

## 🔄 Standard Arbeidsflyt

1. **Forstå problemet** → les MemPalace + relevante filer
2. **Kjør `npm run oauth:check`** → få baseline
3. **Implementer fix** → minimal endring
4. **Kjør `npm run oauth:check` igjen** → verifiser grønt
5. **Kjør tester** → `npm run test:unit` for auth-filer
6. **Dokumenter i MemPalace**
7. **Gi bruker copy-paste config** hvis Google/Supabase må oppdateres

## 📝 Copy-Paste Config (alltid oppdatert)

Når brukeren endrer callback-oppsettet, gi dem dette:

**Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client ID
```
Authorized JavaScript origins:
  https://www.klarpakke.no
  https://klarpakke.no

Authorized redirect URIs:
  https://www.klarpakke.no/no/callback
  https://www.klarpakke.no/en/callback
  https://www.klarpakke.no/th/callback
  https://www.klarpakke.no/zh/callback
```

**Supabase Dashboard** → Authentication → URL Configuration
```
Site URL: https://www.klarpakke.no/no/callback

Additional Redirect URLs:
  https://www.klarpakke.no/no/callback
  https://www.klarpakke.no/en/callback
  https://www.klarpakke.no/th/callback
  https://www.klarpakke.no/zh/callback
  https://klarpakke.fly.dev/no/callback        # Fly.io staging/default URL
  http://localhost:3000/no/callback
  # Legacy (fjernes etter full migrering):
  # https://*.vercel.app/no/callback
```
