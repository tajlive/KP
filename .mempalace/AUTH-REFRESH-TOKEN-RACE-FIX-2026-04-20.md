# Auth Refresh Token Race Condition Fix - 2026-04-20

## Problem

**Feil:** `AuthApiError: Invalid Refresh Token: Already Used`

Supabase refresh tokens er **single-use**. Når én klientinstans bruker den, blir den ugyldig for alle andre. Klarpakke hadde flere klientinstanser som kjempet om samme token, noe som førte til race conditions og auth-krasj.

## Rotårsaker Identifisert

| # | Problem | Konsekvens |
|---|---------|------------|
| 1 | **To browser-klienter**: `@supabase/ssr` (client.ts) OG `@supabase/supabase-js` (supabase.ts) | Begge lagrer/leser tokens fra ulike steder (cookies vs localStorage). En refresher, den andre prøver med samme gamle token → feil |
| 2 | **useAuth** (hooks.ts) lytter på gammel klient, mens AuthContext bruker ny | Uavhengige `onAuthStateChange`-kanaler. De synkroniserer ikke tokens. |
| 3 | **Eksplisitt `refreshSession()`** i api/client.ts | Kolliderer med `@supabase/ssr`s interne auto-refresh. Begge prøver å bruke samme refresh token samtidig. |
| 4 | **AuthHashHandler + `detectSessionInUrl: true`** | Dobbelt hash-parsing. Supabase prosesserer hash, deretter AuthHashHandler prøver å parse samme hash manuelt. |
| 5 | **Middleware kaller `getUser()`** uten refresh-guard | Ved utgått token trigger hver request en refresh. Kan føre til refresh-storm ved mange samtidige requests. |

## Fikser Implementert

### 1. Fjernet gammel proxy-klient i `src/lib/supabase.ts`
- Slettet `@supabase/supabase-js` proxy-klient (`supabase` export)
- Slettet `createAdminClient()` (ubrukt)
- Beholdt re-eksport av `getSupabaseClient`, `createClient`, `createServerClient` for bakoverkompatibilitet

### 2. Oppdatert imports til `@supabase/ssr`-singleton
- `src/lib/hooks.ts` — `useAuth` bruker nå `getSupabaseClient()` fra `@/lib/supabase/client`
- `src/lib/trading.ts` — bruker nå `getSupabaseClient()` fra `@/lib/supabase/client`
- `src/features/signals/SignalTable.tsx` — bruker nå `getSupabaseClient()` fra `@/lib/supabase/client`

### 3. Fjernet eksplisitt `refreshSession()` i `src/lib/api/client.ts`
- `checkAuth()` bruker nå kun `getSession()` — `@supabase/ssr` håndterer refresh automatisk
- Fjernet manuell expiry-sjekk og `refreshSession()`-kall

### 4. Konsolidert hash-håndtering
- `src/lib/supabase/client.ts`: `detectSessionInUrl: false`
- `AuthHashHandler` håndterer all hash-parsing og session-opprettelse

### 5. Middleware
- Fortsatt bruk av `getUser()` i middleware (anbefalt av Supabase for sikker validering)
- Overvåk for refresh-storm ved høy trafikk

## Verifisering

```bash
npm run lint
npm run type-check
```

## Referanser

- Supabase docs: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase auth refresh token behavior: https://github.com/supabase/gotrue-js/issues/###
- Tidligere auth-arbeid: se `OAUTH-DEBUG-HISTORY-2026-04-09.md`, `OAUTH-SESSION-404-FIX-2026-04-08.md`

---
**Agent:** KIMI CLI
**Dato:** 2026-04-20
**Status:** ✅ Implementert
**Type:** AUTH_FIX, RACE_CONDITION
**Prioritet:** P0 (Production Critical)
