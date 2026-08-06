# Misc

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 9. Market API fallback-kjede — Binance blokkert fra Cloudflare Workers (2026-07-27)

**Symptom:** `/api/market/binance-24hr` returnerer 502, priser vises ikke i trading-UI.

**Root cause:** Cloudflare Workers IP er blokkert av Binance. Direkte `fetch("https://api.binance.com/...")` gir 403/451 fra Workers.

**Varig fiks — tre-lags fallback i ALLE market API-ruter:**

```
1. Supabase binance-proxy edge function
2. Direkte Binance API (7 failover-endepunkter: api[1-4], data-api, testnet)
3. DB coin_prices (cachet av cron/sync-prices)
```

**Implementert i:**
- `/api/market/binance-24hr/route.ts` — 24h ticker med change%
- `/api/market/binance-prices/route.ts` — spot-priser (via BinanceMarketDataProvider → CoinGecko)
- `/api/paper-trading/execute/route.ts` — trade execution prisfetch

**Pattern (binance-24hr):**
```typescript
// 1. Proxy (Supabase edge function)
let res = await fetch(BINANCE_PROXY_URL, { method: "POST", body: JSON.stringify({ symbols, type: "24hr" }) });
// 2. Direkte Binance
if (!res?.ok) res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=...`);
// 3. DB fallback
if (!res?.ok) {
  const { data } = await supabase.from("coin_prices").select("symbol, price, price_change_percent_24h").in("symbol", symbols);
  return NextResponse.json({ prices: data, source: "db-cache" });
}
```

**Pattern (binance-prices + paper-execute):**
```typescript
const provider = createBinanceMarketDataProvider(); // proxy → Binance → CoinGecko
try { price = await provider.getPrice(symbol); }
catch {
  // DB fallback
  const { data } = await supabase.from("coin_prices").select("price").eq("symbol", symbol).single();
  if (data?.price) price = Number(data.price);
}
```

**Merk:** DB-prisene er cachet av cron-jobb — kan være inntil 9 dager gamle. Bedre enn 502. `binance-prices`-ruten får live-priser via CoinGecko-fallbacket i BinanceMarketDataProvider.


## 10. Binance proxy — ALLE ruter skal bruke proxy

**Symptom:** `Binance API error: 403 for BTCUSDT` i auto-trade cron eller UI.

**Rotårsak:** Cloudflare Workers IP er blokkert av Binance. Direkte `fetch("https://api.binance.com/...")` returnerer 403.

**Fiks:** ALLE Binance API-kall MÅ gå via `fetchKlinesViaProxy()` fra `@/lib/trading/canonical/market-data/binance-proxy-provider`:

```typescript
// FØR (403):
const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}`);
const data = await res.json();

// ETTER (proxy):
import { fetchKlinesViaProxy } from "@/lib/trading/canonical/market-data/binance-proxy-provider";
const data = await fetchKlinesViaProxy(symbol, "1h", 55);
```

**Audit:** Kjør `grep -rl "api.binance.com" src/app/api/` for å finne ruter som fortsatt bruker direkte API. Disse må fikses til proxy.

**Berørte ruter (fikset 2026-07-21):**
- `/api/cron/ai-engine` — var direkte API, nå proxy
- `/api/cron/feature-loader` — var direkte API, nå proxy
- `/api/cron/sync-prices` — var allerede proxy (fikset tidligere)

---


## 6. Pre-commit gates (8 steg — 2026-07-26)

Pre-commit kjører 8 steg via `.husky/pre-commit`:

| Steg | Hva | Betingelse |
|------|-----|-----------|
| 0 | Auth-redirect guard (Guard-as-Render) | Alltid |
| 1 | Secrets-sjekk (staged filer) | Alltid |
| 2 | Migrasjonsvalidering | Kun når `supabase/migrations/` endret |
| 3 | AST/type-verifisering (ts-morph) | Kun ved kritiske paths |
| 4 | TypeScript-sjekk (tsc --noEmit) | Alltid |
| 5 | Supabase kolonne-guard | Alltid |
| 5b | Browser-supabase guard (KLA-auth) | Alltid |
| 5c | Service-role auth guard | Alltid |
| 5d | i18n-validering (KUN når `messages/` endret) | Betinget |
| 6 | MemPalace auto-capture | Alltid |

**i18n-step (5d):** Skipper når ingen `messages/`-filer er staged — unngår unødvendig validering ved rene kodeendringer.

Kjør manuelt: `bash .husky/pre-commit`

**Migrasjonsvalidator — kun flate filer (2026-07-25):** `scripts/validate-migrations.mjs --staged`
reduserer staged migrasjoner til `basename` og leser dem fra flat `supabase/migrations/`. En ny
`.sql`-fil i en UNDERMAPPE (f.eks. `supabase/migrations/v3_0/x.sql`) feiler pre-commit med
"Tom eller ulesbar fil" selv om fila er fin. Regel: nye migrasjoner legges FLAT i
`supabase/migrations/<timestamp>_navn.sql`. Eldre undermapper (`v3_0/`, `_historical/`) er
legacy og røres ikke.

**Service-role auth guard (5c) — dual-klient-mønsteret (2026-08-01):**
`createClient()` fra `@/lib/supabase/server` er SERVICE-ROLE og har ingen bruker-sesjon —
`.auth.getUser()` gir ALLTID null (evig 401 i prod). Nye API-ruter MÅ bruke dual-klient:
```typescript
const response = NextResponse.next();
const authClient = createServerClient(request, response); // auth-sesjon
const { data: { user } } = await authClient.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const db = createClient(); // data — alltid med .eq("user_id", user.id)
```
Pre-commit-hooken blokkerer commit når `createClient()` brukes til `.auth.getUser()`.


## 9b. Manglende API-rute → 200 + HTML (stille break) (2026-08-01)

**Symptom:** Tab/feature i UI-et «fungerer ikke» (Auto-strategi, Pilot, Statistikk), men `curl` på endepunktet gir `200`. Ingen 404, ingen synlig feil i nettverksfanen.

**Rotårsak:** Komponenten kaller en rute som aldri ble opprettet (refaktor/flytting). OpenNext/Next.js fallback returnerer **landing-siden som HTML med HTTP 200** for ukjente `/api/*`-paths — ikke 404 JSON. `res.ok` er true → `data.success` er undefined → UI viser generisk feil eller evig «Laster...» uten melding.

**Diagnose:**
```bash
curl -sS -X POST https://www.klarpakke.no/api/pilot -H "Content-Type: application/json" -d '{"mode":"auto"}' | head -c 120
# {"error":"Unauthorized"} → rute eksisterer (auth ok)
# <!DOCTYPE html>...        → RUTEN FINNES IKKE
```

**Regel:** Etter refaktor som flytter/slår sammen sider: `grep -rn 'fetch("/api/' src/features/` på berørte komponenter og verifiser hver rute med `ls src/app/api/<rute>/route.ts`. HTML-200 er verre enn 404 — den er stille.

**Søstersymptom:** Feature bygget men ALDRI trigget (f.eks. `binance-sync` kopieringsmotor — bygget, men ingen pg_cron/Hermes-cron kalte den). Sjekk alltid: `SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%<feature>%'` — legg til manglende cron med mønster fra eksisterende jobber (`klarpakke_trigger_cron` eller `net.http_post` med CRON_SECRET fra vault), verifiser med `runs_10min`-teller:
```sql
SELECT (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = cron.job.jobid AND status = 'succeeded' AND start_time > NOW() - INTERVAL '10 minutes') FROM cron.job WHERE jobname = 'klarpakke-binance-sync';
```


## 9. Prod-datareparasjon via Management API — sikker UPDATE-prosedyre (2026-07-24)

**Fellen:** Korrektur-UPDATE på 8 USDT-forurensede trades filtrert på `usdt_nok_rate = 9.6` traff OGSÅ en rad som var reparert dagen før (samme rate satt da) — korrekte verdier ble delt på 9.6 og måtte gjenopprettes manuelt. Et verdipredikat på en kolonne du selv har skrevet tidligere er IKKE en stabil identifikator.

**Prosedyre for UPDATE/DELETE i prod:**
1. `SELECT id, <relevante kolonner>` først — lagre den eksakte rad-listen (id'er).
2. UPDATE med `WHERE id IN (<id-liste>)` — aldri verdipredikat (`price < X`, `rate = Y`) på kolonner som kan deles av andre rader eller tidligere reparasjoner.
3. Verifiser returnert `UPDATE n` mot forventet antall FØR du gjør mer.
4. `SELECT` etterpå: sjekk intern konsistens per rad (for trades: `quantity × price ≈ total_value`) OG at naborader er urørte.
5. Ved skaleringsreparasjoner (×kurs): bestem retningen ÉN gang og skriv den ned (pris ×9.6 USDT→NOK impliserer quantity ÷9.6 for å bevare total_value). Sjekk én rad manuelt før bulk — gange vs. dele-feil er lett å snu.

**Fallback ved bom:** Ha originalverdiene fra steg 1 — da er gjenoppretting en ny id-basert UPDATE, ikke arkeologi.

**Konsolidering av parallelle tabeller:** Se `references/legacy-table-consolidation.md` — spillebok for "to tabeller, samme domene" (merge med GREATEST, RENAME ikke DROP, sjekk pg_proc/triggere + gjenoppstandelses-endepunkter FOR rename, husk test-imports ved sletting av ruter). Brukt pa KLT-konsolideringen 2026-07-25.

**Supabase auth-config (SMTP/autoconfirm):** Se `references/supabase-auth-config-smtp.md` — Management API PATCH for Resend-SMTP + `mailer_autoconfirm`, med `smtp_port`-som-streng-fellen og ende-til-ende-verifisering via Resend /emails. Satt i prod 2026-07-25.

**Prod-skjema → idempotent migrasjon:** Se `references/prod-skjema-til-migrasjon.md` — spillebok for «tabell finnes i prod men mangler CREATE i repo»: verifiser eksistens mot prod (repo-skanning tar feil begge veier), hent skjema 1:1 (kolonner/constraints/policyer m. qual+with_check/indekser/triggere/relrowsecurity), skriv alt idempotent, gjenskap AS-IS (ingen «forbedringer»), diff-gate før commit. Inkl. duplikat-versjons-fellen (kun FULL validator-kjøring fanger den, ikke --staged) og schema_migrations-sjekk (repo-historikk ≠ prod-historikk). Brukt på KLA-ryddingen 2026-07-25.


## 13. DB-performance indekser — systematisk analyse + migrasjon (2026-07-28)

**Når:** Dashboard-spørringer føles trege, nye spørringsmønstre har dukket opp, eller du skal legge til indekser for trading-tabeller.

**Workflow:**

1. **Kartlegg trege spørringer** (hvis mulig mot prod):
   ```sql
   SELECT query, total_exec_time, calls, mean_exec_time
   FROM pg_stat_statements
   ORDER BY total_exec_time DESC
   LIMIT 20;
   ```

2. **Identifiser faktiske spørringsmønstre** fra koden — ikke gjet. Søk etter `.from("tabell")` i `src/` og `supabase/functions/`:
   ```bash
   grep -rn '\.from("trades\|\.from("trading_sessions\|\.from("paper_trading_sessions' src/ --include='*.ts' --include='*.tsx' | grep -E '\.eq\(|\.order\(|\.select\(' | sort | uniq -c | sort -rn
   ```

3. **Dokumenter eksisterende indekser** (fra skjema-definisjoner i migrasjoner eller `\di`):
   ```sql
   SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('trades', 'trading_sessions', 'paper_trading_sessions') ORDER BY tablename, indexname;
   ```

4. **Match manglende indekser** mot spørringsmønstre:
   - `WHERE user_id = $1 ORDER BY created_at DESC` → `(user_id, created_at DESC)`
   - `WHERE user_id = $1 AND trading_pair = $2 ORDER BY executed_at DESC` → `(user_id, trading_pair, executed_at DESC)`
   - `WHERE status = 'active'`-filter → partiell indeks `WHERE status = 'active'`
   - Globale tidslinjer (`ORDER BY created_at DESC` uten filter) → `(created_at DESC)`

5. **Skriv migrasjon med BEFORE/AFTER-diff** — hver indeks skal ha kommentar om hvilket spørringsmønster den optimaliserer. Legg ved forventet effekt-tabell.

6. **Kjør IKKE** uten Toms godkjenning. Alltid idempotent (`CREATE INDEX IF NOT EXISTS`).

**Fallgruver:**
- `created_at` vs `executed_at` — trades bruker `executed_at` for kronologisk sortering, trading_sessions bruker `created_at`. Sjekk ORDER BY-kolonnen i hver faktiske spørring.
- Partielle indekser (`WHERE status = 'active'`) sparer plass men dekker KUN spørringer med det eksakte filteret. Legg til full indeks i tillegg hvis upartiske spørringer også trenger ytelse.
- `DESC` i kompositt-indekser: bare relevant når kolonnene har blandet sorteringsretning (f.eks. `(user_id ASC, created_at DESC)`). For rene `DESC`-indekser leser PG baklengs like effektivt.
- `CREATE INDEX IF NOT EXISTS` støttes fra PG 9.5+ — bruk det fremfor `DO $$`-blokk for enklere kode.
- Ikke indekser kolonner som aldri brukes i WHERE/ORDER BY/JOIN — ubrukte indekser koster write-performance uten gevinst.

**Se `references/db-performance-indexes-2026-07-28.md` for fullstendig eksempel med trading-tabellene (trades, trading_sessions, paper_trading_sessions, smart_trader_log, user_auto_trading_configs).**


## 10. Norsk tekst i en.json — deteksjonsoppskrift (2026-07-25)

`i18n:validate` sjekker nokkelparitet, IKKE sprak. en.json kan vaere full av norsk uten at noen gate fanger det. To-pass-skanning:

```bash
python3 - <<'EOF'
import json, re
en = json.load(open('messages/en.json')); no = json.load(open('messages/no.json'))
def flat(o, p, out):
    if isinstance(o, dict):
        for k, v in o.items(): flat(v, p + '.' + k if p else k, out)
    else: out[p] = o
E, N = {}, {}; flat(en, '', E); flat(no, '', N)
# Pass 1: en == no identisk (kopiert uten oversettelse) — hovedfunn
same = [(k, E[k]) for k in E if k in N and E[k] == N[k] and isinstance(E[k], str)]
# Pass 2: aeoa + norske stoppeord (fanger delvis oversatte strenger)
aeoa = re.compile(r'[æøåÆØÅ]')
hits = [(k, v) for k, v in E.items() if isinstance(v, str) and aeoa.search(v)]
print('identiske:', len(same), '| aeoa-treff:', len(hits))
EOF
```

Pass 1 gir falske positiver pa spraknoytrale strenger ("Admin", "Region", "Start",
"15 min") — filtrer med norske stoppeord/aeoa. Funn denne runden: 23 strenger i
dashboard/settings/tradingResults/BotWizard. Etter fiks skal pass 2 gi 0 treff.


## 12. Dependabot-PR-er — major-bumps testes FØR merge (2026-07-25)

Toms stående regel: major-versjoner auto-merges ALDRI — test-suiten kjøres mot dem
først; minor/patch avventer hans go. Se `references/dependabot-pr-verifisering.md` —
oppskrift (test-gren på FERSK main, ikke rå `gh pr checkout`) + fallgruver: stale-refs
fantom-diff, PR-tittel kan lyve om landet versjon (`npm ls <pkg>` er sannheten — «0.5→0.6
major» leverte 0.5.18), død dep = null risiko (grep imports), `git branch -D`-opprydding
treffer godkjennings-timeout.


## 11. Sletting av rute bryter tsc (.next/types) og vitest (test-imports) (2026-07-25)

**Symptom A:** `tsc --noEmit` feiler med `Cannot find module '../../src/app/api/.../route.js'` i `.next/types/validator.ts` — ETTER at ruta er slettet. Fiks: `rm -rf .next/types` (stale genererte typer, regenereres ved neste build).

**Symptom B:** Vitest feiler HELE testfila med vite `import-analysis`-feil (`Failed to resolve import "@/app/api/admin/<slettet>/route"`) — 0 tester i fila kjorer, men oppsummeringen viser fortsatt gronne tellinger for resten (`Test Files 1 failed | 179 passed` vs `Tests 1368 passed` — lett å overse). Fiks: FOR sletting, `grep -rn "<rutenavn>" src --include="*.test.*"` — testfiler importerer ruter direkte; fjern import + test-case i samme commit.

**Lekse:** Sletting er en kodeendring med samme gate-krav som tilfoyelser — full test-suite + tsc i samme commit-sloyfe, ikke "testene kjorte for slettingen".


## 14. FACT-AUDIT — Systematisk verifisering av alle påstander på siten

**Trigger:** Bruker ber om fakta-sjekk, eller mistanke om at prod viser feil tall.

**Arbeidsflyt (5 runder, hver avsluttes med deploy + curl):**
1. **Kartlegg:** Søk gjennom hele kodebasen etter hardkodede tall, prosenter, navn. Søk i `messages/`, `src/components/`, `src/features/` etter mønster som `\d+%`, `\d{2,3}%`, kjente falske navn.
2. **Verifiser:** For hvert tall: SQL-spørring mot prod-databasen. `paper_accounts`, `trades`, `user_profiles`, `trading_stats`. Ikke stol på seed-tabeller (`leaderboard_entries`, `leaderboard_bots`).
3. **Fiks:** Endre tall i kildekoden, legg til dynamisk henting der mulig. Oppdater ALLE fire locale-filer (no/en/th/zh) — i18n-valideringen fanger bare struktur, ikke innhold.
4. **Deploy:** `bash scripts/deploy.sh` → vent på Cloudflare.
5. **Verifiser live:** `curl -s https://www.klarpakke.no/api/leaderboard | python3 -c "..."` — sjekk at hvert krav er oppfylt.

**Leaderboard — tre-lags filter (FIKS 1 i alle runder):**
1. **Bot-svarteliste:** Hardkodede AI-genererte navn (Anne Mo, Kari Aas, etc.) — disse er seed-data, ikke ekte brukere.
2. **Testkonto-mønster:** `tom+`, `+sim`, `+verify`, `direct test`, `viking trader` — interne kontoer skal aldri vises offentlig.
3. **Validering:** Ingen HTML-tags, kontrolltegn, emoji, quotes i `display_name`. Minimum 2 tegn, maks 50. Må ha minst 1 ekte trade (`total_trades > 0`).

**Dokumenter:** `.hermes/architecture/k3-handover/FACT-AUDIT.md` — én rad per påstand med `påstand | datakilde | verifisert verdi | dato | status`. 🟢 først når live curl bekrefter.

**Fallgruver:**
- Supabase JS-client støtter IKKE nested joins uten registrert foreign key i schema cache. Bruk separate queries + in-memory join.
- `paper_accounts.user_id` refererer `user_profiles.user_id` (begge peker til `auth.users.id`), ikke `user_profiles.id`.
- `papir_accounts.current_balance` er balance source of truth — beregn `return_pct = (balance - 100000) / 100000 * 100`.
- `trading_stats` har `winning_trades`/`total_trades` — `win_rate = winning_trades / total_trades * 100`.
- CDN-cache kan servere gamle API-responser i opptil 60s (Cache-Control: max-age=60). Vent 1 minutt etter deploy før curl-verifisering.

Se `references/fact-audit-workflow.md` for full eksempel med SQL-spørringer og curl-kommandoer fra denne runden.

Klarpakke har **to forskjellige CRON_SECRET-verdier** som autentiserer forskjellige ting.
De er ikke samme verdi — a forveksle dem gir 401.

| Type | Hvor | Autentiserer |
|------|------|-------------|
| **Vault** | `vault.secrets` i DB (migrasjon 20260420020000) | pg_cron -> Vercel API (via `klarpakke_trigger_cron`) |
| **Edge Function** | `Deno.env.get("CRON_SECRET")` — `.env.local` | Direkte POST til Supabase Edge Functions |

**Pitfall:** Vault-verdien fungerer IKKE mot Edge Functions. Hvis POST til
`/functions/v1/smart-trader-v3` far 401, bruk Edge Function-verdien fra `.env.local`.

Se `references/cron-secret-double-storage.md` for konkrete verdier og eksempel.


## 15. Helseovervåkning — Health metrics endpoint med 30s cache

**Når:** Du trenger live driftstall for trading-subsystemet — aktive sesjoner, siste trades, P&L, feilrate.

**Løsning:** `GET /api/health/metrics` — samlet helse-endpoint med fire parallelle Supabase-queries:

```typescript
// src/lib/trading/health-metrics.ts — uavhengig av route
import { createClient } from "@/lib/supabase/server";

export interface HealthMetricsData {
  timestamp: string;
  db: "ok" | "error";
  activeSessions: number;
  recentTrades: RecentTrade[];
  totalPnl: number;
  errorRate: number;
  avgLatency: number;
  details: { queries: Record<string, { latencyMs: number; ok: boolean }> };
}
```

**Arkitektur:**

- **Lib-laget** (`src/lib/trading/health-metrics.ts`): `getHealthMetrics()` kjører 4 queries i parallell via `timedQuery()` wrapper:
  1. `activeSessions` — `COUNT(*) FROM trading_sessions WHERE status = 'active'`
  2. `recentTrades` — siste 10 trades (trading_pair, side, realized_pnl, status)
  3. `totalPnl24h` — SUM(realized_pnl) siste 24 timer
  4. `errorRate5min` — COUNT(*) FROM bot_health WHERE status='error' siste 5 min

- **Hver query** har 5s timeout via `AbortSignal` og `setTimeout(() => controller.abort(), 5000)`
- **30s in-memory cache** (Map<String, {data, expiry}>) — delt på tvers av alle kall, ingen Redis-avhengighet

- **Route-laget** (`src/app/api/health/metrics/route.ts`):
```typescript
import { getHealthMetrics } from "@/lib/trading/health-metrics";

export async function GET() {
  const data = await getHealthMetrics();
  const status = deriveStatus(data.db, data.details);
  return NextResponse.json({ status, ...data }, {
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
}
```

**Status:** `healthy` = alle queries OK, `degraded` = noen feilet, `unhealthy` = alle feilet.

**Fallgruve:** `abortSignal()` er en Supabase postgrest-js metode, IKKE en standard Fetch API-funksjon. Fungerer kun på Supabase-kjeder med `.abortSignal(signal)`.

### Endpoint-spesifikk 502/503 monitoring

For å overvåke et spesifikt API-endepunkt (f.eks. `/api/paper-trading/execute`)
for 502/503-feil og varsle via Resend, se `references/endpoint-502-503-monitoring.md`.

Pattern: prob endepunktet med en tom body POST (forventer 400 = lever, 502/503 = backend-feil),
logg til `health_check_metrics`, send epost via `sendEmail()`. Sett opp pg_cron med
`net.http_post` + `cron_secret` vault-secret for auth.

**Pitfall:** Vault `cron_secret` er SEPARAT fra Edge Function `CRON_SECRET` i `.env.local`.
Se `cron-secret-double-storage.md`.


## 16. Alarmering — Resend alerting med rate-limiting


## 21. System-audit: «Er alt riktig og optimalisert?» (2026-08-01)

**Trigger:** Tom spør «er alt riktig? alle brukere? alle trade-metoder?» eller før lansering. Svar aldri fra hukommelsen — kjør hele audit-kjeden.

### 1. Cron-audit (en spørring, alle jobber)

```sql
SELECT jobname, schedule, active,
  (SELECT COUNT(*) FROM cron.job_run_details j WHERE j.jobid = cron.job.jobid
     AND status='succeeded' AND start_time > NOW() - INTERVAL '30 minutes') AS suksess_30min,
  (SELECT MAX(start_time) FROM cron.job_run_details j WHERE j.jobid = cron.job.jobid) AS siste
FROM cron.job ORDER BY jobname;
```

**Rød flagg:**
- `suksess_30min = 0` for en jobb som kjører oftere enn hver 30. min → død/feiler
- To jobber med SAME trigger-URL (f.eks. `klarpakke-tick` */5 OG `klarpakke-trading-tick` * * * * * → begge POST `/api/cron/tick`) = **duplikat-cron** (funnet 2026-08-01, fjernet `klarpakke-tick`). Sjekk `command`-kolonnen for samme URL.
- Jobber som bare er `SELECT 1` = død test-jobb (`test-session-role` kjørte hvert minutt, fjernet)
- Fiks via migrasjon: `SELECT cron.unschedule('navn') WHERE EXISTS (...)` — persister i `supabase/migrations/` og kjør samme SQL live.
- **Sjekk git-historikk før du kaller en cron «feilkoblet»**: `signal-engine-5min` peker på `/api/cron/signal-health-selfcheck` MED VILJE (migrasjon 20260622010000 repurposed den til heartbeat-oppdatering etter Workers-migrasjonen). `git log -S "<jobname>" -- supabase/migrations/` viser intensjonen. Den egentlige duplikaten var `klarpakke-signal-health-selfcheck` (*/30) som kalte samme endepunkt — fjernet.
- **Pause av cron — `cron.alter_job`-signatur (2026-08-01):** `cron.alter_job(jobid := …, active := false)` FEILER med 42883 — parameteret heter `job_id`, ikke `jobid`, og signaturen er `alter_job(job_id bigint, schedule text DEFAULT NULL, command text DEFAULT NULL, database text DEFAULT NULL, username text DEFAULT NULL, active boolean DEFAULT NULL)`. Riktig kall: `SELECT cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname='x'), active := false);` Sjekk alltid faktisk signatur med `SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE pronamespace='cron'::regnamespace` før du gjetter.
- **MCP-supabase nede → psql-fallback:** MCP `execute_sql` er flaskehals (rate-limit «unreachable after 3 consecutive failures»). Direkte fallback: `export $(grep -E '^POSTGRES_URL_NON_POOLING=' .env.local | sed 's/#.*//' | xargs) && psql "$POSTGRES_URL_NON_POOLING" -Atq --no-psqlrc -c "<sql>"`. Samme spørringer, ingen MCP-restriksjoner — bruk dette proaktivt ved 3+ MCP-feil.

### 2. Én motor per posisjon (dobbelt-prosessering)

`trading_sessions.smart_trader_enabled=true` gjør at `smart-trader-v3` (edge function) prosesserer sesjonen I TILLEGG til tick-motoren → to motorer, samme posisjon. Audit:

```sql
SELECT smart_trader_enabled, COUNT(*) FROM trading_sessions WHERE status='active' AND mode='paper' GROUP BY 1;
```

DCA/CryptoPilot-sesjoner skal ALLTID ha `false` (tick er eneste kanoniske motor). `smart-trader-v3`-cronen kan stå aktiv men finner aldri sesjoner da.

### 3. Falsk «systemet er dødt»-alarm: `executed_at` vs `created_at`

**Fellen (skjedde 2026-08-01):** «0 handler på 26 timer»-konklusjon var FEIL — spørringen filtrerte på `trades.created_at` i stedet for `executed_at`. trades bruker `executed_at` for kronologisk sortering. Riktig liveness-sjekk:

```sql
-- Handler: BRUK executed_at
SELECT side, status, COUNT(*), MAX(executed_at) FROM trades
WHERE executed_at > NOW() - INTERVAL '24 hours' GROUP BY 1,2;
-- Systemet lever: sjekk trading_sessions.last_tick_at (fersk = tick kjører)
SELECT status, COUNT(*), MAX(last_tick_at) FROM trading_sessions GROUP BY 1;
```

Kombinert bilde: ferske `last_tick_at` + 0 handler kan være KORREKT oppførsel (posisjoner under exit-triggere: DCA +5% TP / −10% SL / trailing). Verifiser mot faktiske posisjoner før du kaller det en bug:
```sql
-- Posisjoner som BØR ha trigget exit men ikke gjorde det:
-- pnl ≥ +5 (TP), pnl ≤ −10 (SL), eller drop fra peak ≥ 3 (trailing) → burde selges
```

### 4. Morgenrapport-verifisering

`~/.hermes/scripts/klarpakke-morgenrapport.sh` er fasit-verktøyet (leser `trading_logs` med `action='signal_guard_blocked'` og `details->>'reason'` — tabellen `signal_guard_blocked` FINNES IKKE; blokkeringene ligger i `trading_logs`). Kjør den manuelt for å bekrefte «0 blokkeringer / 0 krasj / ferske ticks» før du konkluderer om natten.

### 5. AI-signal-pipeline-audit: «AI-motoren kjører, men skriver aldri signaler» (2026-08-01)

**Symptom:** `ai_decision_log` = 0 rader, `trading_signals` siste 24t kun `technical` (seed-fallback), `model_version` tom — til tross for at `klarpakke-ai-engine`-cronen rapporterer success hver kjøring.

**Rotårsak (P1, funnet i audit):** `ai-engine/route.ts` steg 3 (ai_decision_log-insert) brukte kolonnenavn som IKKE finnes i skjemaet (`symbol`, `decision_type`, `sentiment_score`, `analysis_data`, `decision_reason`, `executed_at`) → inserten feilet ALLTID → `continue` hoppet over steg 4–5 (trading_signals-insertene) → ensemble-signaler nådde aldri tick. I tillegg var `SYSTEM_SIGNAL_USER_ID` (6408d389-…) en UUID som ikke finnes i `auth.users` → FK-feil. To uavhengige feil i ÉN observability-insert.

**Audit-sjekk (rask):**
```sql
SELECT COUNT(*), MAX(created_at) FROM ai_decision_log;  -- 0 rader = AI-signaler skrives aldri
SELECT signal_type, COUNT(*), MAX(created_at) FROM trading_signals
WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY 1;  -- kun 'technical' = seed-fallback, ingen ensemble_ai
-- Sjekk FK-mål: SELECT id, email FROM auth.users WHERE id = '<SYSTEM_SIGNAL_USER_ID>';
-- Sjekk faktisk skjema: SELECT column_name FROM information_schema.columns WHERE table_name='ai_decision_log';
```

**Lekser (klasse-nivå):**
1. **Observability-inserts må ALDRI blokkere den kritiske stien** — `ai_decision_log` er legacy-observability; en feil der skal logges og fortsette (`console.error` + fall-through), aldri `continue`/return. Kritisk sti = trading_signals-insertene.
2. **Verifiser kolonnenavn mot `information_schema` FØR du skriver inserts mot ukjente tabeller** — skjemaet forventer `sentiment_value/classification/recommendation/confidence/reasoning`, `strategy_id`, `timestamp`, `adjustments`, `explanation`, `idempotency_key` — ikke det intuitive navnet.
3. **Systembruker-ID-er må finnes i auth.users** — bruk `b0700000-0000-0000-0000-000000000001` (algo1@klarpakke.no), ikke en hardkodet UUID du ikke har verifisert.
4. **Verifiser fiksen mot prod før deploy-konklusjon:** kjør `curl -H "Authorization: Bearer $CRON_SECRET" https://www.klarpakke.no/api/cron/ai-engine` FØR deploy (gir `db_error: Could not find the 'analysis_data' column` i prod = bekrefter diagnosen) og ETTER deploy (skal gi `executed`/`logged` + rader i trading_signals med `signal_type='ensemble_ai'`).
5. **Regresjonstest for best-effort-insert:** mock ai_decision_log til å feile, assert at trading_signals fortsatt skrives (`src/app/api/cron/ai-engine/route.test.ts`). Mock-klienten må returnere `{ error }` fra insert (supabase returnerer error-objekt, ikke throw) og volum-gaten krever mock-candles med 24h-volum > 5M USDT (ellers `skipped_low_volume`).
6. `skipped_low_volume` på illikvide symboler er et BEVISST kvalitetsfilter (volum < 5M USDT 24h), ikke en bug — ikke «fiks» det.

Se `references/ai-signal-pipeline-audit.md` for full diagnose- og fikstranscript.


## 22. AI provider cost/quality routing (2026-07-31)

Riktig modell til riktig oppgave i `/api/ai/chat`.

- `references/ai-provider-cost-routing-2026-07-31.md` — klassifisering, planvelger, fallback, nøkler.
- Simple → DeepSeek Flash; complex → Kimi K2.7; architecture → Kimi K3; websearch → Perplexity.


