# Db Testing

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## DB-Backed Smoke Testing (Cloudflare Workers Auth Barrier)

Når API-ruter krever httpOnly cookies og `curl` + Bearer token feiler (Cloudflare Workers `createServerClient` kan ikke lese Authorization-header), bruk dette mønsteret:

1. Opprett minimal test-rad i DB via Supabase MCP
2. Naviger allerede-autentisert browser til detaljsiden
3. Test UI-flyten (klikk, toast, state-endring)
4. Slett test-raden

**Full oppskrift med pitfall:** `references/db-backed-smoke-testing.md`


## Falske positiver i HTML-baserte smoke-tester (2026-07-31)

`scripts/prod-auth-smoke.mjs` ga to alarmer som begge var falske. To mønstre som
gjelder ALL grep-basert testing av Next.js-sider:

1. **Feilstreng-grep treffer i18n JSON-payload, ikke synlig tekst.** `html.includes("Noe gikk galt")` matchet 11 ganger på en side som rendret perfekt — strengene lå i `__next_f`/script-payload (meldinger lastet for klienten). Regel: strip `<script>`-tags FØR du asserter på «synlig» innhold:
   ```js
   const visible = html.replace(/<script[^>]*>.*?<\/script>/gis, "");
   assert(!visible.includes("Noe gikk galt"));
   ```
   Verifiser falske alarmer med samme stripping + sjekk at faktisk sideinnhold (tittel, kort, CTA-er) finnes i synlig del.

2. **`.slice(0, N)` på chunk-listen mister inlined NEXT_PUBLIC-variabler.** Login-siden emitterte 28 chunks; Supabase-URL-en lå i chunk ~20, men smoke-testen sjekket bare de 12 første → falsk «NEXT_PUBLIC ikke inlined»-alarm. Regel: sjekk ALLE unike chunks (`new Set(...)`), aldri et vilkårlig utsnitt — chunk-rekkefølgen er ikke deterministisk.

3. **Playwright-DOM-varianten: `innerText()`, ALDRI `textContent()` for synlig-tekst-asserts.** `textContent()` inkluderer innholdet i `<script>`-tags — Next.js RSC-payloads (`__next_f`-chunks) kan inneholde i18n-nøkkel-aktige strenger → falske «rå nøkkel»-alarmer på perfekte sider. `innerText()` returnerer kun rendret synlig tekst (og ekskluderer `display:none`-innhold). Dedikert regresjonstest: `e2e/smoke/i18n-keys.spec.ts` — 7 sider (`/`, `/trade`, `/dashboard`, `/dashboard/portfolio`, `/dashboard/historikk`, `/priser`, `/kurs`) mot regex `/\b(dashboard|trading|common|portfolio)\.[a-z]+\.[a-zA-Z]+\b/g` på `body.innerText()`. Sider uten locale-prefiks gir 307 → `/no/...` (page.goto følger redirects). Sjekk `page.goto`-responsens status < 400: en 404-side viser ingen rå nøkler og ville ellers passert, men er fortsatt en bug. 4. **nb-NO bruker U+00A0 (non-breaking space) som tusenskiller OG som skille før «kr»** — `toLocaleString("nb-NO")` gir `"64 024,69 kr"` (U+00A0 overalt, ikke ASCII-mellomrom). Regex-asserts på NOK-verdier MÅ bruke `\s` (matcher både U+00A0, U+202F og vanlig space), aldri bokstavelig space eller `[ \u00a0]`-klasser med `?`-quantifier på slutten: `/\d{1,3}(?:\s\d{3})+(?:,\d{2})?\s?kr/` — `[ \u00a0]` + ` ?` feiler fordi tegnet FØR «kr» også er U+00A0. Sjekk koden: `[...s].map(c => c.codePointAt(0).toString(16))` → `a0`. Node og Chromium gir samme separators, men test ALLTID i browser-kontekst før du konkluderer.

 5. **Levende priser = assert FORMAT, aldri snapshot-verdier.** En plan/test som hardkoder «594 633 kr» (BTC-kurs ved skrivetidspunkt) blir stale samme dag — prisen var 595 935,46 kr under kjøring. Valuta-kontrakt-tester må asserte mønsteret (`NNN NNN,NN kr`), ikke en bestemt verdi. Snapshot-verdier er kun gyldige som NEGATIVE asserts («62 000 USDT» skal IKKE vises).

 6. **Global `storageState` (.auth/user.json) er en UTlØPT sesjon for en ANNEN bruker** (tom@klarpakke.no). Tester som må kjøre som en spesifikk testbruker (f.eks. `test+tricky+123@klarpakke.no` for valuta-kontrakt) må overstyre: `test.use({ storageState: { cookies: [], origins: [] } })` + UI-login via `loginWithCredentials(page, email, password)` fra `e2e/helpers/auth.ts`. Uten overstyring arver testen feil brukers (utløpte) cookies.

 7. **«USDT» er lovlig som par-symbol (POL/USDT), ulovlig som pris-enhet.** Assert på PRIS-mønster (`/\d{1,3}(?:[\s.]\d{3})+\s?USDT/` skal IKKE matche), ikke på substring «USDT» — ellers false positive på par-navn og på i18n-JSON-verdier («Minste handelsbeløp er 10 USDT.» ligger i RSC-payload). Kombinér med innerText()-regelen (punkt 3).

 8. **Regresjonsvakt for valuta-kontrakt: `e2e/smoke/currency-contract.spec.ts`** — 2 tester (dashboard + portefølje) mot regex-ene over, kjører mot prod med tricky-brukeren. Full mønster-oppskrift (login-overstyring, regex-er, pitfall rundt ticker-rad med «Bitcoin 595 935,46 kr ±0.7%» — ikke ankre `kr$` på rad-slutt): `references/currency-contract-e2e.md`. Kjør: `npx playwright test e2e/smoke/currency-contract.spec.ts --project=chromium`.

 9. **Playwright finner kun test-filer under `testDir` (e2e/).** Iterasjon/probe-specs i `/tmp` gir «No tests found» — kopiér inn i `e2e/tmp/` (husk å slette etterpå; `e2e/tmp/` er IKKE gitignored) før du kjører.


