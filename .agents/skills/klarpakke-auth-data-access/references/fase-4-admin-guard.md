# Fase 4 — admin-guard + service-role-fellen (2026-07-25)

Sesjonsdetaljer for `klarpakke-auth-data-access` → Admin-mønster. Commits: `72fc5c87f` (admin + realtime), `a5fada77d` (service-role-fiks).

## Auth-matrise verifisert i prod (5 ruter)

Ruter: `/api/admin/recent-signups`, `/api/admin/students` (GET/PATCH), `/api/admin/beta-signups`, `/api/admin/cta-analytics`, `/api/admin/dashboard/data`.

| Klient | Forventet | Faktisk |
|---|---|---|
| Uautentisert (curl) | 401 | ✅ 5/5 |
| Innlogget ikke-admin (test+tricky) | 403 | ✅ 5/5 |
| Admin (tomarnejensen, i ADMIN_EMAIL_FALLBACK) | 200 | ✅ 5/5 |

`dashboard/data` var tidligere helt åpen (service-role uten auth) — nå lukket.

## Service-role-fellen (viktigste lærdom)

Første versjon av `requireAdmin` returnerte cookie-klienten (createServerClient, bruker-JWT) som data-klient. Auth-matrisen over var HELT GRØNN — men `/api/admin/students` ga 1 rad (admin seg selv) fordi RLS på user_profiles filtrerer bort andre brukere. **200 + korrekt auth ≠ korrekte data.** Oppdaget fordi radantallet virket lavt; bekreftet mot Management API.

Fiks (`a5fada77d`): to klienter — cookie-klient KUN til `auth.getUser()`, service-role-klient (`SUPABASE_SERVICE_ROLE_KEY`, `persistSession:false`) til data. Test: admin-ruter som lister andre brukeres rader må verifiseres med radantall mot DB, ikke bare statuskoder.

## Herding av eksisterende rute vs dens tester

`/api/admin/dashboard/data` hadde test (`src/app/api/admin/__tests__/admin-routes-auth.test.ts`, 18 tester) som forventet **503 ved manglende NEXT_PUBLIC_SUPABASE_URL**. Da `requireAdmin()` ble lagt øverst krasjet ruta i `createServerClient` (undefined.trim()) FØR env-sjekken → testfeil. Rekkefølge i ruta: env/null-sjekk → 503 → requireAdmin → logikk.

## Realtime → polling (3 komponenter denne runden)

- `PaperTradingList`: channel → 20s `setInterval` m/ visibility-pause (beholdt eksisterende visibility-logikk, byttet kun trigger).
- `PaperTrading`: channel → 20s `fetchSessionData`-intervall.
- `BotStatusDashboard`: channel (user_strategies UPDATE) → 30s polling av eksisterende `/api/dashboard/bot-status` — API-et gir `activeStrategy.nextActionAt` + `nextActionDescription` (fra `last_status_message`), som mappes til samme UI-state (`realtimeData.lastStatusMessage`, `botStatus.nextActionTime`). Død hjelper `mapUserStrategiesPayload` fjernet; `use-realtime.ts` (delt hook, 5 konsumenter) fikk KLA-auth-advarsel i docblock i stedet for omskriving.

Totalt 8 døde realtime-channels erstattet m/ polling i sweepen. Skikkelig server-push = eget redesign.

## Pre-commit-guard

`scripts/guard-browser-supabase.mjs` (node, kjøres fra `.husky/pre-commit` steg 5b): blokkerer NYE "use client"-filer med `.from('`/`.channel('`; allowlist `scripts/browser-supabase-allowlist.txt` (29 filer ved innføring — skal krympes, aldri vokse). Regex: `\.from\(['"]|\.channel\(['"]` — `\.from\(` alene matcher `Array.from(` (falske positiver i 20+ filer). `--all` rapporterer allowlist-helse (aktive vs stale).

Gjenstående allowlist-syndere funnet av guarden UT over rapportens 77-filers scan (grep-regexen i scan var snevrere): ClientAdminAnalytics, ClientAdminSystem, BinanceAPISettings, NotificationSettings, CourseList, OrderHistory, lib/hooks.ts, useSubscription, usePushNotifications, WaitlistForm, SystemStatus — kandidater for neste sweep-runde.
