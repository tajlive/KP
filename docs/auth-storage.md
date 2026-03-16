# Auth, storage og cookies (Supabase)

> **Sist oppdatert:** Mars 2026  
> **Formål:** Én kilde til sannhet for hvordan auth/session håndteres i Klarpakke.

---

## Prinsipper

1. **Én browser-klient**  
   All kode som kjører i nettleseren og trenger session (auth) skal bruke **`createClient()` fra `@/lib/utils`** (som re-eksporterer `getSupabaseClient()` fra `@/lib/supabase/client`). Denne klienten bruker `@supabase/ssr` med cookies og `cookieEncoding: 'raw'`.

2. **Ingen direkte `createClient` fra `@supabase/supabase-js` i client-kode**  
   Vanilla Supabase-klient bruker localStorage som standard. Session hos oss ligger i **cookies** (satt av `@supabase/ssr`). Komponenter som importerer `createClient` fra `@supabase/supabase-js` vil ikke se samme session og kan gi feil eller «ikke innlogget» selv om brukeren er logget inn.

3. **cookieEncoding: 'raw' overalt**  
   Både browser-klient (`src/lib/supabase/client.ts`) og alle SSR-klienter (server.ts, auth-guard, API-ruter som bruker createServerClient) bruker **`cookieEncoding: 'raw'`**. Det reduserer risiko for «Invalid UTF-8 sequence» ved korrupt eller ufullstendig base64-data i cookies.

4. **Korrupt session håndteres uten reload-loop**  
   - **Bootstrap:** `clearCorruptSupabaseKeysSync()` i `safe-storage.ts` kalles én gang per page load (f.eks. øverst i AuthProvider). Den renser både **cookies** og localStorage for sb-* / auth-token.
   - **Ved feil:** Ved «Invalid UTF-8» eller annen korrupt auth fanger AuthContext, kaller `clearAllSupabaseStorage({ skipReload: true })` (som nå også renser auth-cookies), og setter session/user til null. Ingen hard reload.

---

## Hvor bruke hva

| Kontekst | Import | Merknad |
|----------|--------|--------|
| **Client Components** (auth, brukerdata) | `createClient` fra `@/lib/utils` | Session fra cookies; PKCE/OAuth fungerer. |
| **Server Components / API** (med bruker-session) | `createServerClient()` eller `await createServerClient()` fra `@/lib/supabase/server` | Alltid med `cookieEncoding: 'raw'` (satt i server.ts). |
| **API / cron / webhooks** (uten bruker, eller service role) | `createClient()` fra `@/lib/supabase/server` (service role) eller `createClient` fra `@supabase/supabase-js` med service role key | Ingen cookies; for jobber som ikke er bruker-knyttet. |

---

## Filer som styrer dette

- **`src/lib/supabase/client.ts`** – Singleton browser-klient; `cookieEncoding: 'raw'`.
- **`src/lib/supabase/server.ts`** – `createClient()` = service role; `createServerClient()` = SSR med cookies og `cookieEncoding: 'raw'`.
- **`src/lib/supabase/safe-storage.ts`** – `clearCorruptSupabaseKeysSync()`, `clearAllSupabaseStorage()`, renser også auth-cookies.
- **`src/components/auth/AuthContext.tsx`** – Kaller bootstrap-rens, fanger korrupt auth og renser uten reload.

---

## Ved ny kode

- **Ny client-side komponent som trenger auth:** Bruk `createClient` fra `@/lib/utils`.
- **Ny API-route som trenger bruker-session:** Bruk `createServerClient` fra `@/lib/supabase/server` (da får du automatisk `cookieEncoding: 'raw'`). Hvis du må kalle `createServerClient` fra `@supabase/ssr` direkte, send med `cookieEncoding: 'raw'`.
