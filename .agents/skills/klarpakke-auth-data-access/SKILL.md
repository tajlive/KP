---
name: klarpakke-auth-data-access
description: 'Diagnostiser og fiks Klarpakke-klientens auth/data-feil: anon browser-supabase,
  RLS-feller, fantom-DB-objekter. Bruk ved redirect-loops, falsk ''ingen data'', stille
  tapte lagringer.'
version: 1.0.0
author: Hermes Agent
license: MIT
platforms:
- macos
metadata:
  hermes:
    tags:
    - klarpakke
    - auth
    - supabase
    - rls
    - debugging
whenToUse: Når bruker rapporterer auth/data-feil i Klarpakke-klienten.
---

# Klarpakke Auth & Data-Access

Klasse-skill for Klarpakkes dataaksess-feilmodeller. Overlapper bevisst med `klarpakke-debug-patterns` (N+2/N+3) — denne er den operative håndboken for å FIKSE klassen i bulk (sweeps), ikke bare enkeltfunn.

## Grunnregel (verifisert empirisk 2026-07-24)

Browser-supabase (`createClient()` fra `@/lib/supabase/client` / `@/lib/utils`) er **ALLTID anon** i Klarpakke:
- Auth-cookie er httpOnly, `localStorage` tom, `document.cookie` = kun NEXT_LOCALE
- `supabase.auth.getUser()` → null; `.from(tabell)` → RLS 0 rader
- **FLAKK:** in-memory session overlever client-side navigasjon (router.push), dør ved full reload. Derfor "virket det rett etter login". AuthProvider får aldri initialUser fra server → `useAuth().user` = null etter reload.

**Verifikasjonsprobe (Playwright):** logg inn → sjekk `document.cookie`, `localStorage`, `context.cookies()` (httpOnly-flagg). Definitivt bevis — ikke stol på at "appen virker".

## Konsekvenser per bruksmønster

| Mønster i klient-kode | Faktisk oppførsel | Synlig symptom |
|---|---|---|
| `getUser()` → `router.push(/login)` | Alltid null ved reload | Redirect-loop / falsk utlogging |
| `.from(t).select()` | 0 rader | Falsk "ingen data"/tomme lister |
| `.from(t).update()/upsert()` | Stille 0 rader eller RLS-violation | Lagringer som aldri persisterer |
| `.channel().on(postgres_changes)` | Anon mottar ingenting | Død realtime |
| RPC-kall | Kan være no-op eller 404 | Se fantom-sjekk under |
| `auth.signInWithPassword/getSession/signOut` | **FUNGERER** (in-memory session — dør ved reload) | Behold for login/logout-flyt; JWT kan hentes via `getSession()` og sendes som Bearer til server-ruter |

**Viktig nyansé:** kun `.from()`/`.channel()`/RLS-avhengige kall er brutt. Auth-API-et (`supabase.auth.*`) virker fra browser — ikke "fiks" login/logout ved å flytte dem til server.

## Standard fiks-oppskrift

1. **Server-API først:** GET + whitelistet PATCH med `createServerClient` + `auth.getUser()` + eksplisitt `user_id`-filter. Aldri masse-tilordning av request-body. Sjekk ALLTID eksisterende ruter før du lager nye: `ls src/app/api/<domene>/` (f.eks. `/api/trading/mode`, `/api/binance/keys`, `/api/user/profile` eksisterte allerede).
2. **Guard-filer:** `fetch(url, {credentials:"same-origin"})`; `res.status === 401` → login-redirect. Server-401 = korrekt utlogget-deteksjon.
3. **Skriv:** fetch PATCH mot whitelistet rute. Ta med kolonner RLS-policyer sjekker (upsert: INSERT-policy evalueres FØR ON CONFLICT — `user_id` må med).
4. **Realtime:** fjern døde kanaler, bruk fetch ved mount + `refresh()`.
5. **Døde hooks:** grep konsumenter (imports + barrel + tester) — slett 0-konsument-hooks (YAGNI). `rm` krever samtykke i Hermes — spør via clarify, ikke retry.

## Fantom-avhengigheter (søskenmønster til fantom-kolonner)

Kode kan referere DB-objekter som IKKE finnes. Verifiser FØR du stoler på dem:
- **RPC:** `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'` (Mgmt API) — funnet: `mark_notifications_read` finnes ikke → stille no-op.
- **Edge-funksjoner:** `functions.invoke("x")` kan peke på funksjoner som ALDRI er deployet (funnet: `binance-connector`, `connect-exchange`, `run-backtest`). List deployede funksjoner før du stoler på invoke — og sjekk om en kanonisk Next API-rute allerede finnes (`/api/exchanges/connections` POST validerer + krypterer server-side, og erstattet connect-exchange direkte). **Også:** funksjonen kan finnes i repo men mangle action-en kalleren forventer (verifisert 2026-07-25: `binance-connector` hadde aldri `connect`-action — `/api/binance/keys` POST fikk 500; løst ved å omskrive ruta til security-definer RPC `store_binance_keys`, se vault-mønster under).
- **Kolonner — OGSÅ i ORDER BY:** `information_schema.columns` — `database.types.ts` ≠ ground truth. Funnet: `.order("updated_at")` på `ai_agent_stats`, men kolonnen heter `last_updated_at` — latent PostgREST-feil som ville feilet selv med riktig auth. Verifiser select-KOLONNER + order-kolonner + where-kolonner når du porter en query, ikke bare tabellnavnet.
- **CHECK-constraints:** UI-verdier kan avvike fra DB (safe/normal/advanced vs low/medium/high) — mapp i API-ruta.
- **Manglende API-rute (2026-08-01):** klient-komponenter kan fetche ruter som ALDRI ble bygget (`/api/pilot` manglet; AutoStrategyPanel/PilotDashboard/StatsTab kallet den). Prod returnerer 200 med HTML (landing-siden) — VERRE enn 404, fordi `res.ok` er true og ingen feil logges. Diagnose: `curl -sS https://www.klarpakke.no/api/<rute> | head -c 120` → HTML = rute finnes ikke; verifiser `ls src/app/api/<rute>/route.ts`. Etter å ha skrevet en rute: curl uten token → forventet JSON-401, aldri HTML.

## Parallelle duplikat-tabeller (legacy-par)

Klarpakke har tabell-par med overlappende formål og DIVERGERENDE data: `kltbalances` (32 rader, leses av `/api/klt/balance`) vs `user_klt_balances` (48 rader, leses av KLTWallet-komponent); `api_keys` (legacy, kryptert nøkkel klient-"maskert" = viser ciphertext) vs `exchange_connections` (kanonisk, server-kryptering). Regler:
- Velg én kilde per konsument (komponentens eksisterende shape) — IKKE merge/konsolider tabeller midt i en sweep. Flagg divergensen til backlog med radantall.
- Når kanonisk rute finnes (`/api/exchanges/connections`: GET/POST/DELETE), omskriv komponenten til den — også om UI-shapen må adapteres (én rad per exchange, sletting via `?exchange=` ikke `?id=`).
- **ExecutorFactory kilde-prioritet (2026-08-01):** live-executor (tick) MÅ lese nøkler i en FIRE-kilde-kjede. Verifisert i prod: `exchange_connections` (ny kanonisk, kryptert med `EXCHANGE_ENCRYPTION_SECRET`, dekrypter via `decryptExchangeSecret` fra `@/lib/exchanges/secret-crypto`) og `api_keys` var BEGGE TOM — eneste tabellen med faktiske data er `user_binance_keys` (UUID-refs → `decrypt_binance_keys`-RPC mot vault). Kjede i `ExecutorFactory.create` og `canTradeLive` (2026-08-01-fiks): ① `exchange_connections` (is_active + revoked_at is null) ② `api_keys` (kundenes BinanceAPISettings-UI skriver hit: `api_key_encrypted` = klartekst nøkkel + `api_secret_encrypted` = AES-GCM via `decrypt()` fra `lib/crypto` med BINANCE_ENCRYPTION_SECRET) ③ `user_binance_keys` (api_key_id/api_secret_id → vault-RPC) ④ legacy `user_profiles.binance_api_key_id/binance_api_secret_id`. Før fiksen feilet live-handel med "keys not configured" selv for brukeren som faktisk hadde nøkler (de lå i kilde ③ som ingen leste). Sjekk radantall per tabell (`SELECT 'exchange_connections', COUNT(*) ... UNION ALL ...`) FØR du antar hvilken kilde som er kanonisk — "kanonisk i kode" ≠ "har data i prod". ⚠️ `EXCHANGE_ENCRYPTION_SECRET` (ikke `BINANCE_ENCRYPTION_SECRET` — den er legacy-alias) må være satt som Worker-secret, ellers kaster `getExchangeKey()`.

## Bruker-hemmeligheter → vault.secrets (aldri plaintext-kolonner)

Bruker-API-nøkler (Binance m.fl.) lagres i `vault.secrets`; metadata-tabellen (`user_binance_keys`) holder KUN UUID-referanser (`api_key_id`/`api_secret_id`) + status. Skrivevei = security-definer RPC (`store_binance_keys(p_user_id, p_api_key, p_api_secret, p_is_testnet)` → `vault.create_secret()` ×2 → upsert metadata → slett gamle vault-rader ved rotasjon), `grant execute` KUN til `service_role`, kalt fra Next API-rute med service-role-klient ETTER `getUser()`-sjekk. Lesevei for executor = `decrypt_binance_keys(key_id, secret_id)` (finnes fra før). RLS på metadata-tabellen: `service_role_all` only, `FORCE ROW LEVEL SECURITY`, revoke fra authenticated. Migrasjonsmal: `supabase/migrations/20260704000000_add_user_binance_keys.sql` (tabell) + `20260725000001_store_binance_keys_rpc.sql` (RPC). Aldri gjeninnfør `api_key`/`api_secret`-kolonner — remedieringsmigrasjonen `20260705000006` dropper dem.

## Boolean-felter i PATCH-whitelister

String-only-validering (`typeof value !== "string" → 400`) avviser stille booleans. Når du utvider PATCHABLE_FIELDS med boolean-kolonner (`dismissed_get_started_card`, `high_contrast_mode`), legg til type-bevisst validering (egen BOOLEAN_FIELDS-sett) — ellers feiler klientens PATCH med 400 uten at noen ser det.

## Public sider

Checkout/kurs-sider kan ikke bruke browser-supabase (anon) heller — lag PUBLIC server-rute som kun returnerer publiserte, ikke-sensitive felt (`/api/courses/[id]`: id, title, description, price_nok WHERE is_published). Verifiser route-param-navn mot page-komponenten FØR du feilsøker en redirect (`?course=` vs `?courseId=` — redirect til /priser var korrekt guard, ikke bug).

## Sweep-metodikk (bulk-fiks av 42+ filer)

1. Scan: `node scripts/scan-browser-client.mjs` (i repo) → guard/read/write/realtime-buckets.
2. Rekkefølge: guard (redirect-risiko) → data-les synlige sider → skriv (tillit) → admin/realtime.
3. Per batch: patch import → `const supabase` → bruksblokker (LSP "Cannot find name" mellom patches er transient). `tsc --noEmit` + tester per batch, commit per fase — **`git add` SELEKTIVT per fase-fil, aldri `git add -A`** (drar inn .tmp-e2e-scratch og plan-filer).
4. E2E per berørt side: før/etter-screenshot + persisteringstest (PATCH→GET + DB-verifisering via Mgmt API) for skriv-operasjoner.

## Admin-mønster (Fase 4)

Delt guard-helper `src/lib/admin/require-admin.ts` (`requireAdmin()`): identitet verifiseres via cookie-klient (`createServerClient` → `auth.getUser()` → `isEmailOnServerAdminAllowlist(user.email)`), deretter returneres en **SERVICE-ROLE-klient** (`createClient(url, SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})`) for data-spørringer. Returnerer `{ok:true, supabase, user}` eller `{ok:false, status:401|403|503}` — alle `/api/admin/*`-ruter skal bruke den.

- **⚠️ Anon-klient-etter-verifisering-fellen (verifisert 2026-07-25):** returneres cookie-klienten (bruker-JWT) som data-klient, filtrerer RLS STILLE bort andre brukeres rader — admin-students-lista ga 1 rad (seg selv) med 200 OK. Autoriserings-sjekk og data-tilgang er to separate steg: verifiser identitet med bruker-kontekst, spør med service-role etterpå. Symptom: admin-API "virker" men lister er ufullstendige; 401/403-testmatrisen avslører det IKKE (auth-laget er korrekt) — verifiser radantall mot DB for en admin-rute som lister andre brukere.
- **Admin-login:** rolle-sjekk via anon `.from("user_profiles")` brød stille → admin logget inn og ble øyeblikkelig logget ut igjen. Fiks: etter `signInWithPassword`, hent `getSession().access_token` og kall `/api/admin/verify` med `Authorization: Bearer`.
- **Sikkerhetshull-klassen:** grep API-ruter som bruker `SUPABASE_SERVICE_ROLE_KEY` UTEN `getUser()`/allowlist — `/api/admin/dashboard/data` eksponerte service-role-data åpent. Legg `requireAdmin()` øverst (etter env/503-sjekk, se felle under).
- **Admin-aktivitetsfeeder:** realtime INSERT-channel (anon) har aldri virket → poll en "recent"-rute (60s) og diff på id (`knownIds: Set`) for å syntetisere nye feed-items.
- **GoTrue admin-API feiler i Workers (verifisert 2026-07-25):** `auth.admin.listUsers()` fra service-role-klient kaster i Cloudflare Workers — feilobjektet er bare `{"url":".../auth/v1/admin/users"}`, mens PostgREST mot samme host virker fint. For data som krever `auth.users` (epost o.l.): lag **security-definer RPC** i stedet (mal: `references/gotrue-workers-rpc.md`) og kall via `auth.supabase.rpc("navn", {...})`.
- **Kolonne-eksistens ≠ befolket kolonne:** `user_profiles.email` FINNES, men er kun befolket for 3/43 rader (epost bor i `auth.users`) — admin-feeden viste `null` for nesten alle. Fantom-sjekken (information_schema) fanger ikke dette: verifiser `count(kolonne)` mot `count(*)` før en admin-feed/liste bygger på en kolonne som "ser ut til å finnes".

## Evig-401-fellen: `createClient` ≠ `createServerClient` i `@/lib/supabase/server` (2026-07-25)

I `src/lib/supabase/server.ts` er `createClient()` **service-role UTEN bruker-sesjon** (`persistSession:false`, ingen cookies). En rute som importerer `createClient` og kaller `auth.getUser()` for autentisering får **alltid null → alltid 401** — i prod, for alle brukere, stille. Rotårsak i `/api/klt/balance` og `/api/email/send` — begge hadde ALDRI virket i prod (KLT-visning + transaksjons-e-poster døde uten spor).

**Korrekt dual-klient-mønster** (8+ etablerede ruter, f.eks. `/api/portfolio/summary`, `/api/binance/keys`):
```typescript
import { createServerClient, createClient } from "@/lib/supabase/server";
const authClient = await createServerClient();          // cookie-basert → auth.getUser()
const { data: { user } } = await authClient.auth.getUser();
if (!user) return 401;
const supabase = createClient();                         // service-role → data (RLS-bypass)
```

**Deteksjons-grep for hele klassen:**
```bash
grep -rln 'createClient } from "@/lib/supabase/server"' src/app/api | \
  while read f; do grep -L "createServerClient" "$f"; done
```
Filer uten `createServerClient` som likevel kaller `auth.getUser()` = brutt. (Filer MED begge er normalt korrekte — verifiser at getUser kalles på SSR-klienten.)

**Verifisering i prod:** E2E-login i browser → `fetch('/api/<rute>', {credentials:'same-origin'})` via browser_console. 401 mens ANDRE autentiserte ruter gir 200 med samme sesjon = denne fellen (ikke sesjonsproblem). Importen er lett å overse i review fordi `createClient`-navnet ser ut som standard-klienten fra `@/lib/supabase/client` — det er det IKKE.

**Søsken-lekse (r6-diagnose samme dag):** data-anomali kan være HISTORISK rest etter allerede-fikset bug. Før dyp rotårsaksjakt: E2E-verifiser at flyten VIRKER nå, og sammenlign `created_at`/tidsstempel på anomale rader mot commit-dato for fiksen (`git log -- <fil>`). Alle anomalier eldre enn fiksen = legacy-data, ikke aktiv bug.

## RLS-fellen — `useAuth().user` er null på en side der brukeren ER innlogget

**Symptom (2026-07-27):** Bruker er innlogget på `/dashboard`, navigerer til `/jokertrade` — `useAuth().user` er null i `JokerTradeClient`. Siden viser login-prompt, ikke trading-dashboard. Ingen redirect-loop, bare en side som konsekvent viser "logg inn" for en allerede innlogget bruker.

**Rotårsak:** Siden er IKKE i `PROTECTED_PATHS` i `src/middleware/auth.ts`. Middleware sender ikke auth-kontekst (Supabase sesjons-cookies) til ruter utenfor listen — `useAuth()` får null fordi auth-konteksten aldri ble initiert for den routen. Ruten fungerer fint for uinnloggede (HTTP 200) men viser feil tilstand for innloggede.

**Fiks:** Legg ruten i `src/middleware/auth.ts` `PROTECTED_PATHS` OG i `src/middleware/onboarding.ts` `PROTECTED_PATHS` (disse er to separate lister som må holdes synkronisert — onboarding-sjekken har sin egen kopi). Etter deploy: `useAuth()` returnerer `{user, loading}` korrekt.

**Sjekk allerede fikset:** `grep "/<rute>" src/middleware/auth.ts src/middleware/onboarding.ts` — er den i begge listene? Hvis ikke → legg til.

**Deteksjon:** `curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no/<rute>` gir 200 — det betyr IKKE at auth virker. Siden er public, men `useAuth()` får ikke sesjonen. Verifiser med `computer_use` i en innlogget browser-sesjon: fang skjermbildet og sjekk om komponenten viser login-prompt eller autentisert innhold.

## Pre-commit-guard (systematisk forebygging)

`scripts/guard-browser-supabase.mjs` + `scripts/browser-supabase-allowlist.txt` (kalt fra `.husky/pre-commit`): blokkerer NYE "use client"-filer med `.from(`/`.channel(`; allowlisten = dagens gjenstående syndere (skal krympes, aldri vokse — 29 ved innføring). Regex-felle: `\.from\(` alene matcher `Array.from(` — bruk `\.from\(['"]|\.channel\(['"]`. `--all`-modus rapporterer allowlist-helse (aktive vs stale).

**Service-role auth-guard (2026-08-01):** pre-commit har i tillegg en service-role-guard som BLOKKERER commit hvis en API-rute importerer `createClient` fra `@/lib/supabase/server` (service-role) og kaller `.auth.getUser()` — det ga evig 401 på `/api/klt/balance` og `/api/email/send`; fanget også ny `/api/pilot` ved commit. Unntak kan legges i `scripts/service-role-auth-allowlist.txt` (med begrunnelse). Ny rute som trenger bruker-auth: bruk dual-klient-mønsteret (se Evig-401-seksjonen).

## Feller

- **Herding av eksisterende rute bryter dens tester:** da `requireAdmin()` ble lagt på `/api/admin/dashboard/data`, krasjet ruta FØR env-sjekken (test forventet 503 ved manglende `NEXT_PUBLIC_SUPABASE_URL`). Regel: env/503-sjekker FØR auth-guard, og kjør ruta sin eksisterende testfil umiddelbart etter herding — ikke vent på full suite.
- **Polling-konvertering av realtime:** behold komponentens eksisterende oppdateringslogikk (f.eks. `router.refresh()`, visibility-pause) og bytt kun trigger-kilden til `setInterval`. For UI-state som realtime-payloaden bar (f.eks. `nextExpectedActionAt`), mapp fra API-responsens felter — ikke lag ny fetch-logikk.
- **write_file/patch-maskering:** innhold som ligner secrets maskeres til `***` — OGSÅ i patch-verktøyet når old/new_string inneholder `apiKey: ""`-aktige mønstre (komma kan forsvinne → syntaksfeil). LSP-diagnostics i tool-resultatet avslører det — les fila, fiks med patch, kjør tsc. Sjekk ALLTID diagnostics etter skriving i kode med API-nøkkel-aktige identifikatorer.
- **"Ser riktig ut"-fellen:** mock-data/defaults kan skjule at siden er brutt (0 rader → default-verdier). Verifiser mot DB, ikke UI.
- **`as never`-cast:** `database.types.ts` mangler Update-shape for flere tabeller (f.eks. notifications) — cast er etablert mønster i kodebasen.

## Referanser

- `references/browser-client-sweep.md` — sweep-detaljer, bucket-tall, per-filtype-oppskrift, funnliste, verktøyfeller
- `references/fase-4-admin-guard.md` — admin auth-matrise (401/403/200), service-role-etter-verifisering-fellen, herding vs eksisterende rute-tester, realtime→polling-detaljer, guard-regex
- `references/gotrue-workers-rpc.md` — security-definer RPC-mal for auth.users-joins (GoTrue admin-API brutt i Workers), grant/revoke-blokk, migrasjonsplassering
- `references/paper-account-sync-bug.md` — paper_accounts.current_balance oppdateres IKKE ved trades; sessions-sporet kapital men globalkonto forblir frosset
- `references/middleware-cookie-chain.md` — redirect-loop debugging: rateLimitMiddleware, sameSite/secure, cookie-ops
