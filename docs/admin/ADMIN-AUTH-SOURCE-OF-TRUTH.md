# Admin-autorisasjon — kilde og bruk

## Server (kanonisk)

- **`verifyAdminAccess()`** — `src/lib/admin/verify-admin-access.ts`  
  Innlogget bruker via Supabase SSR (`createServerClient` + `cookies()`). Tilgang hvis **`user_profiles.role === 'admin'`** eller e-post er på server-allowlisten.

- **Allowliste** — `src/lib/admin/admin-allowlist.server.ts`  
  `ADMIN_EMAIL_FALLBACK` (delt med klient) **+** `process.env.ADMIN_EMAIL_ALLOWLIST` (kommaseparert, case-insensitive).

- **Bearer-token API** (f.eks. `/api/admin/verify`, `/api/admin/errors`): samme logikk med `isEmailOnServerAdminAllowlist` + rolle, etter `auth.getUser(token)`.

## Klient (kun UX / tidlig gate)

- **`isEmailInAdminFallbackList()`** — `src/lib/admin/admin-allowlist.shared.ts`  
  Matcher **kun** innebygd fallback (ikke env). Brukere som kun finnes i `ADMIN_EMAIL_ALLOWLIST` må ha `role=admin` i DB **eller** passere server-sjekk på API-kall.

## Migrering fra spredte lister

Nye admin-endepunkter skal **ikke** duplisere e-post-lister. Kall `verifyAdminAccess()` eller `isEmailOnServerAdminAllowlist` etter kontekst.
