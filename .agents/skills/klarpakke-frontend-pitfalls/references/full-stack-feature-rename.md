# Full-stack feature rename — DB, API-rute, cron (JokerTrade → Pilot, 2026-08-01)

§17 i SKILL.md dekker UI/i18n/nav-delen av en feature-rename. Denne filen dekker
**resten av isfjellet**: DB-kolonner/funksjoner, API-rutekatalog, genererte types,
og Hermes-cron-scripts. Sjekkliste i rekkefølge — brukt og verifisert på
JokerTrade→Pilot (kommits `9e54d96d5` + `dda573448`).

## 0. Kartlegg ALLE lag før du flytter én fil

```bash
# Kode-referanser (uten tester først — testene følger med, se §17):
grep -rln "jokertrade\|jokerTrade\|JokerTrade\|JOKERTRADE" src/ scripts/ --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.json"
# DB-objekter som refererer navnet (funksjoner, trigger-defs):
psql "$POSTGRES_URL_NON_POOLING" -t -A -c "
  SELECT p.proname FROM pg_proc p WHERE p.prosrc ILIKE '%joker%' OR p.proname ILIKE '%joker%' ORDER BY 1;"
# Kolonner:
psql ... -c "SELECT table_name, column_name FROM information_schema.columns WHERE column_name IN ('joker_trade','joker_explanation') ORDER BY 1;"
# Trigger-bindinger + views + policies:
SELECT tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t WHERE pg_get_triggerdef(t.oid) ILIKE '%joker%';
SELECT viewname FROM pg_views WHERE definition ILIKE '%joker%';
SELECT policyname FROM pg_policies WHERE qual ILIKE '%joker%' OR with_check ILIKE '%joker%';
```

**Fell:** `on_trade_create_event` (AFTER INSERT-trigger på trades) leser de renamede
kolonnene via `NEW.joker_trade`/`NEW.joker_explanation`. Hvis migrasjonen renamer
kolonnene men IKKE oppdaterer funksjonen i samme transaksjon, knekker HVER trade-insert.
Trigger-funksjoner som refererer kolonner MÅ ligge i samme migrasjon.

## 1. API-rutekatalog — `git mv`, ikke kopier

```bash
git mv src/app/api/jokertrade src/app/api/pilot-engine   # bevarer historikk
```

**Fell — navnekollisjon:** `/api/pilot` fantes ALLEREDE som egen route
(sesjon-start, `src/app/api/pilot/route.ts`). Motoren kunne ikke hete `/api/pilot` —
ble `/api/pilot-engine`. Sjekk `ls src/app/api/` FØR du velger nytt navn, og merk at
`/api/pilot/notifications`-kommentarer i koden kan være løgner (se frontend §21/§25:
sjekk med curl om ruten faktisk svarer med JSON).

## 2. DB-migrasjon — kolonner + funksjoner + trigger-funksjon ATOMIC

Én migrasjonsfil, idempotent, data bevares 1:1 (rename, ingen transformasjon):

```sql
ALTER TABLE public.trades RENAME COLUMN joker_trade TO pilot_trade;
ALTER TABLE public.trades RENAME COLUMN joker_explanation TO pilot_explanation;
ALTER FUNCTION public.jokertrade_health_guard() RENAME TO pilot_health_guard;
-- ... osv. + CREATE OR REPLACE av trigger-funksjoner som leser kolonnene
```

**Kritisk rekkefølge:** Koden refererer de NYE kolonnenavnene etter deploy — migrasjon
må kjøres (og deploy av koden som bruker nye navn) i samme vindu. Hvis migrasjonen
kjører FØR deploy fullfører, feiler gammel prod-kode runtime i mellomvinduet
(cron-tick hvert minutt!). Alternativ: pause motor-cronen under vinduet.
Toms regel: **vis SQL-diff FØR migrasjon kjøres** (DB er hellig).

## 3. Genererte types — `database.types.ts` må synkes for hånd

Supabase-genererte types (`src/types/database.types.ts`) har kolonnenavnene på
3+ steder (Insert/Update/Select). Rename alle med `python3`-script (sed er skjørt for
camelCase). Samme fil: `src/types/trading.ts`, `src/lib/trading-api.ts`,
`src/lib/trading/explanations.ts` — søk `grep -rn "joker_trade" src/`.

## 4. Hermes-cron — script-NAVN + URL + jobb-NAVN må oppdateres

- Script: `cp scripts/jokertrade-ping.sh scripts/pilot-ping.sh` + `sed` URL-en
  (`api/jokertrade` → `api/pilot-engine`) + filnavnet i `~/.hermes/scripts/`.
- `cronjob action=list` → finn jobbene som refererer gammelt script/jobb-navn →
  `cronjob action=update` med nytt `script`-navn, `name` og prompt.
- **Fell:** etter deploy av ny route er `/api/jokertrade` borte — cronen som fortsatt
  peker dit får 404 (Next.js svarer 200 med HTML, se frontend §25 → stille feil).
  Oppdater cron FØR eller SAMTIDIG med deploy.

## 5. Backcompat-aliaser — behold gamle verdier i enum/URL

Mønsteret som lot gamle kallere og bokmerker overleve:

```ts
// /api/pilot mode: gammel verdi beholdt i zod-enum, normalisert internt:
mode: z.enum(["auto", "pilot", "joker"]).default("auto"),
const mode = rawMode === "joker" ? "pilot" : rawMode;
// URL-tab-alias i UnifiedTradeTerminal:
else if (tab === "pilot" || tab === "joker") setMode("pilot");
```

## 6. Achievement/annen kode-only identifikator

`joker_master` (AchievementsBadge) var KUN i kode — ingen DB-tabell (verifisert med
`SELECT 1 FROM information_schema.columns WHERE table_name LIKE '%achievement%'`).
Rename til `pilot_master` med label-tekst i samme patch. Verifiser alltid om en
identifikator finnes i DB før du bestemmer om den trenger migrasjon.

## 7. Verifikasjon

```bash
grep -rn "gammeltnavn" src/ scripts/ messages/  # → 0 treff (unntatt bevisste aliaser)
npx tsc --noEmit && npm run test                 # testene flytter med git mv — kjør alltid
# Etter deploy:
curl -sS https://www.klarpakke.no/api/pilot-engine -X POST -H "x-cron-secret: $SECRET" | head -c 200
# → "{..." JSON, ikke "<!DOCTYPE"
```

## 8. DB-funksjonskropper — `pg_get_functiondef()` er ENESTE pålitelige veien (2026-08-01)

To mislykkede migrasjoner denne renamingen før det ble riktig. Lærdommen:

- **`psql -t -A` på `prosrc` wrapper ved ~40 tegn** og sønderdeler SQL midt i ord (`boolea\nn`). Resultatet kan IKKE kjøres.
- **`\copy (SELECT prosrc ...) TO` gir heller ikke ren tekst** — Supabase lagrer prosrc med literal `\n`-sekvenser (0x5c 0x6e), ikke ekte newlines.
- **Kjørbar løsning:** `SELECT pg_get_functiondef('public.fn(args)'::regprocedure)` → ren, komplett CREATE OR REPLACE-SQL. Hent med `-t -A`, gjør tekst-substitusjoner med python (`assert "gammeltnavn" not in ny`), kjør med `psql -v ON_ERROR_STOP=1`.

**Fell — `ALTER FUNCTION ... RENAME` endrer KUN navnet:** prosrc-en refererer fortsatt gamle tabell-/kolonnenavn. Hvis tabellen renames separat (f.eks. `jokertrade_guard_log` → `pilot_guard_log`) bryter funksjonen til kroppen re-created. Gjør tabell-rename + funksjon-CREATE OR REPLACE i ÉN transaksjon, og verifiser umiddelbart med `SELECT public.fn(...)` → `{"ok": true, ...}`.

**Residual-navn-sjekk (fullstendig, alle lag i én spørring):**

```sql
SELECT 'funksjoner', count(*) FROM pg_proc WHERE prosrc ILIKE '%gammeltnavn%'
UNION ALL SELECT 'tabeller', count(*) FROM pg_tables WHERE tablename ILIKE '%gammeltnavn%'
UNION ALL SELECT 'kolonner', count(*) FROM information_schema.columns WHERE column_name ILIKE '%gammeltnavn%'
UNION ALL SELECT 'system_flags', count(*) FROM system_flags WHERE key ILIKE '%gammeltnavn%'
UNION ALL SELECT 'triggere', count(*) FROM pg_trigger WHERE tgname ILIKE '%gammeltnavn%'
UNION ALL SELECT 'views', count(*) FROM pg_views WHERE definition ILIKE '%gammeltnavn%';
```

**Andre feller fra denne renamingen:**
- `ILIKE` er case-insensitiv → kommentarer i prosrc gir falske treff (f.eks. `detect_crashed_sessions` hadde «JokerTrade» kun i en kommentar). Verifiser med `position('navn' in prosrc) > 0` (case-sensitiv) før du konkluderer.
- Guard-infrastruktur kan ha egne tabeller (`jokertrade_guard_log`), kill-switch-nøkler (`system_flags.key`), og trigger-navn (`trg_trade_joker_event`) — disse oppdages kun av residual-sjekken, ikke av `grep` i src/.
- Migrasjon som feiler MIDTVEI etterlater broken state: tabellen var renamet men funksjonene pekte på gammelt navn → kjør funksjonsoppdateringene NÅ, ikke «senere».
- `git add -A` fanger uavhengige untracked filer fra andre økter (LinkedIn-assets etc.) — `git reset HEAD <filer>` før commit, og committ kun rename-relaterte filer.
