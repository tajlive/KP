# Gap-analyse: Overvåking — hva mangler?

## Dagens overvåking

| Lag | Hva sjekkes | Frekvens |
|-----|------------|----------|
| Health API | DB, trades, Binance, leaderboard, sanity, auth | Per request |
| AI Auto-Healing | Health status → auto-fiks | Hvert 5. min |
| Sentry | JS exceptions, 5% traces | Realtime |
| pg_cron | Hanging sessions, SSL, cron-watchdog | Hver time |
| E2E smoke | 9 tester: health, critical flows, RSC errors, console | CI + hver 6t |

## Hull som ble avdekket i dag

### 1. HTML-strukturvalidering — mangler totalt
Root layout manglet `<html>`-/`<body>`-tag. Sentry injiserte `<meta>` foran DOCTYPE.
→ **Ingen test fanger ugyldig HTML-struktur.**
- Health API sjekker JSON, ikke rendered output
- E2E sjekker konsoll-feil og HTTP-status, men ikke om `<body>` finnes
- RSC smoke sjekker `data-dgst`, ikke grunnleggende HTML-struktur
- **Fiks:** Legg til `<!doctype html>`-sjekk i E2E smoke for ALLE sider

### 2. Data-konsistens på brukervendte tall
- Win rate viste 0.71% (skal være 71%) — `formatWinRateOrDash()` behandlet verdi feil
- totalCapital viste 7M (skal være 88K) — RPC returnerte SUM i stedet for nyeste
- SocialProofBanner viste hardkodet "5.2M kr" — ingen kobling til faktisk data
→ **Ingen test verifiserer at brukervendte tall gir mening.**
- Health API sjekker at Binance fungerer, men ikke om UI-data er konsistente
- E2E tester klikker på knapper, sjekker ikke at tall vises riktig
- **Fiks:** E2E bør hente API-verdi og sammenligne med det som vises på skjermen

### 3. Worker bundle size — pre-deploy gate mangler
- Flere deploy forsøk feilet pga Cloudflare 10 MB limit
→ **Ingen sjekk før deploy om bundle passer innenfor 10 MB.**
- CI bygger, men feiler STILLE ved size limit
- `--no-bundle` fungerer ikke med opennextjs-cloudflare
- **Fiks:** Pre-deploy sjekk: `du -sh .open-next/worker.js && if [ > 9MB ]; then exit 1`

### 4. Build-prosess — ChromaDB krasj urelatert men blokkerer
- KIMI/MemPalace boot laster ChromaDB → SIGSEGV → dreper hele build-prosessen
- Symptom: prosessen henger på "KIMI + MemPalace Activated"
→ **Ingen timeout eller auto-restart av build ved krasj.**
- **Fiks:** Bruk `bash --noprofile --norc` for deploy-kommandoer

### 5. Middleware/routing deploy — mangler i deploy-validering
- Middleware ble opprettet men aldri deployet (10 MB limit)
- Root page returnerte null → blank side
→ **Ingen verifisering av at URL-ruting fungerer etter deploy.**
- Health API kalles, men sjekker ikke at `/` redirecter eller viser innhold
- **Fiks:** Post-deploy sjekk: `curl -s https://www.klarpakke.no/ | head -c 100` må inneholde `<html`

### 6. Hardkodet data i UI — ikke fanget av noen test
- SocialProofBanner: "5.2M kr" + "15+ tradere" var hardkodede strenger
→ **Ingen test verifiserer at data hentes fra API, ikke hardkodes.**
- **Fiks:** Legg til "forbudte hardkodede tall"-monster i lint eller E2E

## Anbefalte tiltak

1. **E2E HTML-struktur:** `expect(page.locator('html')).toBeAttached()` + `expect(page.locator('body')).toBeAttached()` — alle sider
2. **E2E datakonsistens:** Kall API, hent data, sammenlign med rendered tekst
3. **Pre-deploy gate:** `du -sh worker.js > 9MB && exit 1`
4. **Build stability:** `bash --noprofile --norc` som standard for deploy
5. **Post-deploy verifikasjon:** Sjekk DOCTYPE + `<html>` + `<body>` på root-URL
6. **Sentry alarm:** Sett opp alarm i Sentry dashboard for brå økning i errors
7. **Worker size monitor:** Cron som sjekker deployet worker size mot 10 MB grense
