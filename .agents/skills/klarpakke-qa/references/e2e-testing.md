# E2E Testing

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## Visuell E2E etter UX-deploys (PÅKREVD av Tom 2026-07-23)

Etter enhver deploy som endrer UI/brukerflyt: verifiser VISUELT med browser-verktøyene — ikke bare `curl` statuskoder. Enhetstester + 200-responser er ikke nok; den visuelle runden 2026-07-23 fanget 3 reelle bugs som alle 1380 grønne tester ikke så:

1. Sjekkliste-avhaking som aldri slo til (stille browser-klient-feil — se klarpakke-dashboard-client-auth)
2. Hurtigbeløp 100 kr under API-minimum (10 USDT) — avvist først ved ekte kjøp
3. i18n-streng som alltid rendres i entall men var skrevet i flertall

Rutine: logg inn som testbruker → `browser_navigate` til berørt side → `browser_vision()` med konkret spørsmål om den nye UI-en → klikk gjennom HELE flyten til fullført tilstand (ikke stopp ved første skjermbilde). Testbrukere kan mangle `user_profiles`-rad ("Kunne ikke laste profil") — opprett raden i Supabase og fortsett; det er et dataproblem, ikke en app-bug.

**Vis leveransen, ikke bare endringene (Tom 2026-07-23: "Ser ikke stor forskjell").** UX-arbeid som OG-bilder, PWA-screenshots og EmptyStates er usynligt for en aktiv bruker med data — Tom ser null forskjell i sin egen konto og blir skeptisk. Ved levering av slikt arbeid: produser ferske mobil-screenshots av de FAKTISKE nye tilstandene (inline MEDIA:) og gå gjennom dem visuelt med ham. List opp hva som er nytt vs. før, ikke bare commits.

**Side-for-side review (Tom 2026-07-24: "Side for side, gi meg sjansen til å evaluere").** Ved visuell gjennomgang av flere sider: vis ÉN side om gangen (MEDIA: + 2-3 konkrete evalueringspunkter) og vent på "neste" eller endringsønske — ikke dump alle screenshots samlet. Endringsønsker implementeres og deployes FØR neste side vises.

**Proaktivt eierskap (Tom 2026-07-24: "Alt må fikses uansett... Du burde ha funnet feil før de ble oppdaget nå, følg med bedre").** Som hovedarkitekt skal feil finnes FØR siden presenteres — ikke under presentasjonen. Før hver side vises i side-for-side-review: kjør HELE sjekklisten (5a-5d) + feilmønstrene under på siden selv — placeholder-skanning, engelsk-lekkasje-grep, dupliserte metrikker/CTA-er i samme viewport, 390px-klipping. Presenter siden som ferdig QA-et med funnliste, ikke som utestet utkast.

### Tvinge fram tom-/feil-tilstander med Playwright route-mock

Aktive brukere ser aldri EmptyStates/error states. Tving dem fram klient-side uten å røre prod-data (ferdig script: `scripts/capture-empty-states.js`):

1. Finn hvor komponenten henter data — ofte INTERN API-route (`/api/user/trades`), ikke klient-Supabase. Å mocke `**/rest/v1/**` treffer da ingenting (data hentes server-side).
2. Mock må mathe respons-skjema EKSAKT — inkl. valideringsfelter. Eks: `/api/user/trades` krever `{ ok: true, diagnostic_id: <gyldig UUID>, trades: [], limit: 200 }`. Ugyldig `diagnostic_id` (f.eks. `"mock"`) feiler klient-side zod-validering → komponenten viser ERROR-state, ikke EMPTY-state (forvirrende falsk negativ).
3. Tom-tilstander ligger ofte UNDER folden (stats/beslutningslogg øverst) — scroll til ~55% av dokumenthøyden før screenshot.
4. Mocking av én kilde (trades) kan tømme flere views samtidig (posisjoner deriveres fra trades) — utnytt det.


## DB-sammenlignende E2E-tester (Playwright mot prod + Supabase) — 2026-08-03

Mønster fra `e2e/smoke/pnl-accuracy.spec.ts` (verifiser at Dashboard P&L stemmer med DB innenfor 1 % margin). Regresjonsvakt: `npx playwright test e2e/smoke/pnl-accuracy.spec.ts --project=chromium`.

1. **Playwright laster IKKE `.env.local`/`.env` automatisk** (empirisk verifisert: `URL set: false` i throwaway-spec under `e2e/tmp/`). DB-nøkler (service-role) må lastes eksplisitt i spec-filen:
   ```ts
   import dotenv from "dotenv";
   import path from "path";
   dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
   dotenv.config({ path: path.resolve(process.cwd(), ".env") });
   ```
2. **`user_profiles.email` er NULL for testbrukere** — ikke slå opp bruker-id via `.eq("email", ...)`. Hent den server-verifisert fra den innloggede sesjonen: `page.request.get("/api/auth/me")` → `{ user: { id, email } }` (sesjonen lever i HttpOnly-cookies; ingen localStorage). Verifiser også `user.email === TEST_EMAIL` som identitetsguard.
3. **Live RPC ≠ migrasjonsfil:** prod-`get_dashboard_metrics` (3-args) mangler `archived = false`-filteret fra `20260714070000_rewrite_get_dashboard_metrics.sql`, og `total_pnl = SUM(realized_pnl)` (ikke `calculate_effective_pnl`; win_rate returneres som 0–1-fraksjon). Sjekk ALLTID den faktiske definisjonen — `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='get_dashboard_metrics'` — FØR du skriver sammenligningstester. Migrasjonsfila og prod kan ha drifta fra hverandre (hotfix via SQL-konsoll).
4. **To ulike P&L-definisjoner på samme dashboard:** hero-%-en («Siste endring»-pillen, SimplifiedHero) = `(kontoBalanse − startkapital)/startkapital × 100` der kontoBalanse = SUM(`current_capital_nok`) over AKTIVE paper-sesjoner (fallback `paper_accounts.current_balance`) og startkapital = `paper_accounts.initial_balance` (fallback 100 000) — mens «Total avkastning»-kortet (DashboardPro `stats.totalReturn`) viser RPC `total_pnl` (kun realisert, scopes «all» = `["active","paused","crashed","stopped"]`). Test hver mot sin kilde; aldri hero-% mot `total_pnl` direkte (dimensjonsfeil: % vs NOK).
5. **Naiv first-match av `/[-+]?\d+\.?\d*%/` på hele body er upålitelig** — PriceTicker viser også % (markedsdata) og står FØR hero i DOM-rekkefølgen. Skop til hero-pillen: `page.getByText("Siste endring").locator("..")` (i18n-verdi «Siste endring» i `dashboard.hero.latestChange`), `innerText()` + regex-ekstraksjon.
6. **Margin:** relativ 1 % av DB-verdien MED absolutt-gulv (`Math.max(1, |db| * 0.01)` — 1 pp for %, 1 kr for NOK) — beskytter mot `toFixed(2)`-avrunding når DB-verdien er nær null.
7. **Fersk kontekst per spec:** `test.use({ storageState: { cookies: [], origins: [] } })` — global `.auth/user.json` er en annen/utløpt bruker. RPC-kallet bør gjøres etter UI-ekstraksjon med samme statuses-sett som appens API-kall.

Full oppskrift med test-struktur + pitfall: `references/pnl-accuracy-e2e.md`.


