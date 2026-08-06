# Database Errors

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## N+2. Browser-supabase er ALLTID anon — falsk «utlogget»/«ingen data» (2026-07-24)

**Symptom:** Innlogget bruker redirectes til /innlogging, eller ser «Ingen profil funnet»/tomme lister til tross for at data finnes.

**Rotårsak:** Auth-cookien er httpOnly → `createClient()` (browser) har ingen session → `supabase.auth.getUser()` = null og `.from(tabell)` kjører som **anon** → RLS gir 0 rader. Komponenter som bruker dette til auth-guard (f.eks. ProfileTab → `router.push('/innlogging')`) lager redirect-loops (innloggingssiden sender innlogget bruker til /dashboard). Komponenter som bruker det til data (f.eks. useProfile) viser falsk «ingen data».

**Fiks:** Auth + brukerdata KUN via /api-ruter (`createServerClient` + `getUser()` + eksplisitt `user_id`-filter). ALDRI `router.push` basert på browser-`getUser()`. 49 filer med browser-klient i backlog — samme bugklasse.

**Diagnose:** Playwright `response.request().redirectedFrom()`-kjeden viser hele loopen (307 /login → /dashboard).


