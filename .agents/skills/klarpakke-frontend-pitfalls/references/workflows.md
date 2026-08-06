# Workflows

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 17. Rename av dypt innebygget feature (f.eks. JokerTrade → Pilot)

**Symptom:** ~40+ filer refererer til feature-navnet på tvers av routes, komponenter, API, i18n, typer, middleware, DB-tabeller.

**Arbeidsflyt (bruk delegate_task for parallell utførelse):**
1. Søk med `grep -rl "GammeltNavn" --include="*.tsx" --include="*.ts" --include="*.json" --include="*.sql" src/ messages/ supabase/`
2. Del opp i 3 parallelle grupper og dispatche via `delegate_task`:
   - **Agent 1:** i18n + metadata + display-tekster (JSON-manipulasjon, e-post, test-forventninger, landing page-tekster)
   - **Agent 2:** Komponentnavn (JokerX → PilotX, oppdater imports overalt i src/)
   - **Agent 3:** Rute-stier + config + types (API-ruter, middleware, APP_SHELL_PATHS, trading-api, types)
3. Etter subagentene er ferdige, verifiser: `grep -r "GammeltNavn" src/ messages/` viser 0 i koden + `curl -s -L localhost:3000/no | tr '<' '\n' | grep -i "gammeltnavn"` viser 0 i rendered HTML
4. For landing page: oppdater i `TradingModesExplainer` MODES-konstanten og i18n-nøklene
5. Oppdater navigasjon: `src/lib/sanity/load-navigation.ts` (hardcodede labels), `src/lib/navigation/config.ts` (key + labelKey + type + sidebar), i18n `navigation.{key}`
6. Oppdater landing page-tekster: `hero.badge` (KLT-forklaring), `hero.trustNote`, `features.{key}.desc`, `metadata.description`

**Pitfalls:**
- **Etter renamet: verifiser at ALLE nav-hrefs peker på EKSISTERENDE route-kataloger.** Observert 2026-08-01: i18n var fullt renamet (brukeren ser «Pilot»), `/jokertrade`-siden redirectet bort, men `src/lib/navigation/config.ts` (AUTH_NAV_CONFIG l. ~118 + DASHBOARD_MORE_NAV l. ~292) pekte på `/pilot` — og `src/app/[locale]/(social)/pilot/` finnes IKKE. Konsekvens: «Pilot»-lenken i Mer-menyen lander på landingssiden (Next.js fallback = **HTTP 200 med HTML**, se §25 — helt stille). Sjekk: `for href in $(grep -o 'href: \"/[a-z-]*\"' src/lib/navigation/config.ts | ...); do find src/app -type d -path "*\[locale\]*$href" || echo "MANGLER: $href"; done` — eller manuelt: `ls src/app/\[locale\]/\(social\)/`. Rask fiks for manglende rute: legg til side som redirecter (samme mønster som `/jokertrade` → `/trade?first=1`).
- URL-ruter (/jokertrade → /dashboard/jokertrade) kan trenge redirects for gamle bokmerker
- DB-tabeller med navnet (copy_trading_follows, etc.) må ikke nødvendigvis endres — bare visningsnavn
- Hardkodede lenker i markdown-filer, README, AGENTS.md og e-poster
- **Metadata description** i i18n inneholder ofte det gamle navnet — ikke glem å oppdatere `metadata.description` i alle språkfiler
- **Sanity CMS cache** — `loadNavigation()` har 60s revalidation; hard reload eller vent kan trengs for å se endringen
- **Tests som sjekker hardkodede strings → ALLTID søk test-filer** — `config.test.ts` sjekker `.key`, `.labelKey` og `href` som hardkodede forventninger. Når `config.ts` oppdateres (phase 1) blir testene stille utdaterte. Etter renamet: `grep -r "GammeltNavn" src/ --include="*.test.*"` og oppdater ALLE test-assertions. Spesielt farlig: `labelKey`-referanser i `DASHBOARD_MORE_NAV`-tester og `key`-sjekker i nav-config-tester. **Kjør ALLTID testene** før du erklærer ferdig.
- **«Fjern X fra toppmeny» er en MULTI-KILDE endring — ikke bare én array** (2026-08-01, Auto-trade-fjerning): en nav-entry kan leve i 3+ konfig-objekter som hver rendres på ulike flater. Sjekk ALLE før du committer:
  - `DASHBOARD_COINBASE_TOP_NAV` (desktop toppmeny, `TopNav.tsx`)
  - `AUTH_MARKETING_PATHS` i `NavAuthState.tsx` (innlogget markedsførings-header — filtrerer `loggedInLinks`; fjern stien der også, ellers vises lenken fortsatt)
  - `FALLBACK_NAVIGATION.loggedInLinks` i `config.ts` (Sanity-fallback når Sanity er nede)
  - `DASHBOARD_TRADING_NAV` / `DASHBOARD_MAIN_NAV` (sidebar — behold hvis funksjonen skal nås derfra, fjern hvis ikke)
  - **Testene som låser disse** (`config.test.ts` har eksakte `toEqual`-arrays for `DASHBOARD_COINBASE_TOP_NAV`, `FALLBACK_NAVIGATION.loggedInLinks`, `AUTH_NAV_CONFIG`) — oppdater i samme commit.
  - Verifiser prod etter deploy: ruten skal gi 200 (hvis redirect finnes) og den fjernede lenken skal ikke stå i rendered HTML (`curl -sL ... | grep -i navn`).
- **JSON nøkkel rename ≠ value rename** — `"jokerTrade": "JokerTrade"` → `"pilot": "Pilot"` krever nøkkel-OG-verdi-endring. Sed er skjørt for camelCase JSON-nøkler. Bruk Python `re.sub` eller skriv en temp .py-fil. `execute_code` er ofte blokkert i subagent/cron → fallback til `write_file` + `terminal`. Verifiser alltid med `python3 -c "import json; json.load(open('fil'))"` at JSON forblir gyldig.
- **`execute_code` blokkert i subagent-kontekst** — når du kjører som subagent, kan `execute_code` feile med `BLOCKED`. Skriv temp .py-fil via `write_file`, kjør med `terminal`, slett med `rm`.
- **Filer med `[locale]` i stien** — glob-mønster i `search_files` matcher ikke `[locale]` fordi firkantparenteser har spesiell glob-betydning. Bruk `find src/app -name "<filnavn>"` via `terminal`. Det samme gjelder `read_file` og `patch` — finn den ekte stien med `find` først.
- **ESLint feiler på bracket-stier** — `npx eslint "src/app/[locale]/..."` → skallet tolker `[...]` som glob. Bruk `find ... -exec npx eslint {} \;` eller utelat bracket-filer (patch har syntaks-sjekk).

**Hele isfjellet (DB-kolonner, API-rutekatalog, database.types.ts, Hermes-cron, backcompat-aliaser):** Se `references/full-stack-feature-rename.md` — sjekkliste verifisert på JokerTrade→Pilot (2026-08-01). Nøkkelregler: `git mv` for API-rutekatalog (sjekk navnekollisjon med `/api/pilot` som allerede fantes); DB-migrasjon må rename kolonner + trigger-funksjoner (`on_trade_create_event` leser `NEW.joker_trade`!) ATOMIC i samme transaksjon, og koden deployes i samme vindu (pause motor-cronen ellers); vis SQL-diff FØR migrasjon (Toms DB-regel); oppdater Hermes-cron script-NAVN + URL samtidig (ellers 404 → stille 200-med-HTML per §25); beholde gamle enum/URL-verdier som aliaser (`tab=joker` → `pilot`). **Funksjonskropper i DB (prosrc) kan IKKE leses med `psql -t -A` (40-tegns wrapping) eller `\copy` (literal `\n`) — bruk `pg_get_functiondef()` for ren kjørbar SQL, og husk at `ALTER FUNCTION ... RENAME` ikke oppdaterer kroppens tabell-/kolonne-referanser (se ref §8).**


