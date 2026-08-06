---
name: klarpakke-operations
description: Drift og vedlikehold av Klarpakke — i18n-validering, timeout-guards,
  CDN purge, K3 OAuth, deploy-rutiner, subagent-strategier, og cron for priser/alarm/auto-healing.
version: 1.5.0
author: Hermes Agent
license: MIT
platforms:
- macos
metadata:
  hermes:
    tags:
    - klarpakke
    - operations
    - i18n
    - deployment
    - maintenance
whenToUse: 'Når bruker ber om drift/vedlikehold: i18n-validering, timeouts, deploy-sjekk.'
---

# Klarpakke Operations

Driftsoppgaver utover standard debug. Disse mønstrene håndterer systematisk vedlikehold og produksjonsstabilitet.

## 📚 Referanser (les når du trenger det)

| Fil | Les når... |
|---|---|
| `references/i18n-workflows.md` | Du jobber med oversettelser/i18n |
| `references/deploy-og-cdn.md` | Du deployer eller purger CDN |
| `references/oauth-og-secrets.md` | Du håndterer OAuth/secrets |
| `references/cron-og-auto-healing.md` | Du setter opp cron/auto-healing |
| `references/subagent-strategier.md` | Du bruker subagenter |
| `references/timeout-guards.md` | Du feilsøker timeouts |
| `references/misc.md` | Diverse andre driftsoppgaver |

---

## 1. i18n — Fullstendig valideringsworkflow

**To valideringsscript (begge må passere):**

## 2. Timeout-guards på API-ruter

**⚠️  REGEL: Aldri auto-rediger TypeScript med regex-scripts. Bruk subagenter.**

**Fremgangsmåte:**
1. Skriv `.hermes/plans/<dato>-timeout-guards.md` med eksakt kode per rute
2. Dispatch `delegate_task` — én subagent per rute (max 4)
3. Verifiser `npx eslint <fil>` → 0 errors
4. Sjekk `git diff` at koden er korrekt (ikke double commas, feil indent)

**Standard timeout-mønster:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
try {
  const res = await fetch(url, { ..., signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

**Tidsvalg:** 5s Slack/webhooks, 10s Vipps/Resend/API, 15s Binance.

## 3. CDN cache purge

Etter deploy kan CDN servere gammelt innhold i opptil 24t (stale-while-revalidate).

```bash
bash scripts/purge-cdn.sh
```

Scriptet prøver wrangler token først, faller tilbake til `CLOUDFLARE_API_TOKEN`.

**⚠️ Statiske filer (manifest.json, sw.js) kan forbli edge-cachet SELV etter purge (verifisert 2026-08-01):** manifest.json viste gammel `start_url` (`/no/handel`) etter deploy + purge. Verifiser med cache-buster + no-cache-headere:
```bash
curl -sS "https://www.klarpakke.no/manifest.json?cb=1" -H "Cache-Control: no-cache" | grep -o '"start_url": "[^"]*"'
```
Først svar uten query ga gammel verdi; med `?cb=1` + `no-cache` kom den nye. Konkluder ALDRI "endringen gikk ikke ut" fra én vanlig curl på statisk JSON — sjekk med cache-buster først.

## 4. K3 OAuth token — vedlikehold (2026-07-26 oppdatert)

**Arkitektur:**
- Token i `~/.pi/agent/auth.json` → `kimi-coding.access`
- launchd plist `no.klarpakke.kimi-token-refresh` (hvert 15. min)
- Script: `~/.hermes/scripts/refresh-kimi-token.mjs`
- Hermes bruker OAuth-tokenet via fallback-kjede: `gemini → kimi-coding → openrouter → nous`

**K3-begrensning (2026-07-26):** K3 (k3/k3-256k) fungerer IKKE via Hermes' custom provider — krever `thinking`-parameter som custom provider ikke sender. K2.7 Highspeed (`kimi-for-coding-highspeed`) fungerer via OAuth fallback. For K3 må Pi CLI brukes direkte: `pi` → `/model kimi-coding/k3`.

**Kimi modell-alias:** `/model kimi` → `kimi-for-coding-highspeed` (K2.7, 256K context).

**Feilsøking ved manglende token:**
```bash
find ~/.nvm -name "pi" -type f                           # Finn pi binary
~/.nvm/versions/node/v22.22.1/bin/pi login               # OAuth login
python3 -c "import json; d=json.load(open('/Users/taj/.pi/agent/auth.json')); print('OK' if d.get('kimi-coding',{}).get('access') else 'NO')"
```

## 5. Subagent-strategi for parallelle oppgaver

**Når:** 3+ uavhengige filer endres med samme mønster, eller 3+ uavhengige driftsoppgaver må kjøres samtidig.

**Gjør:**
1. Skriv plan med eksakt kode per fil → `.hermes/plans/`
2. Dispatch `delegate_task` med tasks-array (max 4 samtidig)
3. Etter alle er ferdige: kjør `npx eslint` på alle endrede filer
4. Sjekk `git diff` — subagenter kan lyve om "file written"
5. Bygg og deploy

**4-agent fan-out for driftsoppgaver (2026-07-29):** Ved 4+ uavhengige forbedringer på tvers av domener, dispatcher 4 leaf-agenter parallelt i én `delegate_task` med `tasks`-array. Alle fullfører på ~6 min (vs ~22 min sekvensielt). Oppskrift: A1=cron/scripts, A2=API/alarms, A3=UI/i18n, A4=features/UX. Hver agent får én veldefinert oppgave med eksakte filstier, kontekst, og verktøy.

**Fallgruver:**
- Flere subagenter på SAMME fil → overskriving. Aldri dispatche til samme fil.
- Subagenter rapporterer suksess uten å ha skrevet filen. Verifiser alltid.
- De har ikke `clarify` — all kontekst må sendes i dispatch.

## 7. Client-side Supabase → API med timeout (hengende sider)

**Symptom:** Dashboard/portefølje viser "Laster..." evig. Ingen console-feil. Siden laster aldri data.

**Rotårsak:** `getSupabaseClient()` kaller Supabase direkte fra nettleseren uten timeout. Hvis Supabase er treg eller nettverket er dårlig, henger spørringen evig.

**Fiks:** Bytt til API-endepunkt med server-side timeout:

```typescript
// FØR (henger — ingen timeout):
const supabase = getSupabaseClient();
const { data: profile } = await supabase
  .from("user_profiles")
  .select("paper_balance")
  .eq("id", user.id)
  .single();

// ETTER (timeout-sikker):
const res = await fetch(`/api/user/profile?userId=${user.id}`);
const data = await res.json();
const profile = data.profile;
```

**API-endepunkt-mønster** (`/api/user/profile/route.ts`):
```typescript
const supabasePromise = import("@/lib/supabase/server").then(m => m.createServerClient());
const supabase = await Promise.race([
  supabasePromise,
  new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
]) as Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerClient>>;
```

**Regel:** ALDRI bruk `getSupabaseClient()` for data-fetching i client components. Bruk API-endepunkter med timeout. `getSupabaseClient()` er kun for auth (login/logout/session).

Se `references/client-side-supabase-to-api-migration.md` for fullstendig before/after av hvordan DashboardClient og PortfolioClientPage ble migrert fra direkte Supabase til API med timeout.

---

## 8. Session auto-healing — varig løsning mot fastlåste sesjoner (2026-07-27)

**Symptom:** Bruker rapporterer «JokerTrade er paused» eller «ingenting skjer». Sesjonen har `status = 'paused'` men ingen trade-feil.

**Root cause:**
1. Sesjon opprettes med `status: "active"`, `last_heartbeat: now()`
2. Cron/tick når aldri å prosessere sesjonen → heartbeat forblir stuck
3. `detect_crashed_sessions` (pg_cron, hvert min) setter `crashed` etter 5 min
4. MEN: noen sesjoner blir `paused` uten å gå via `crashed` (manuell pause, circuit breaker)
5. Gammel `recover_crashed_paper_sessions()` håndterte KUN `crashed` — `paused` ble permanent fastlåst

**Varig fiks:**

```sql
-- heal_stale_sessions() — erstatter recover_crashed_paper_sessions()
CREATE OR REPLACE FUNCTION heal_stale_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE healed_count integer;
BEGIN
    WITH healed AS (
        UPDATE trading_sessions
        SET status = 'active', last_heartbeat = NOW(), last_tick_at = NOW(),
            updated_at = NOW(), error_message = NULL, stopped_at = NULL
        WHERE (
            (status = 'paused' AND last_heartbeat < NOW() - INTERVAL '3 minutes')
            OR (status = 'crashed' AND stopped_at IS NULL AND started_at > NOW() - INTERVAL '7 days')
        )
        AND mode = 'paper' AND archived = FALSE
        RETURNING id
    ) SELECT COUNT(*) INTO healed_count FROM healed;
    RETURN healed_count;
END;
$$;
```

Kalles fra `src/app/api/cron/tick/route.ts` og `src/app/api/cron/ai-engine/route.ts`:
```typescript
try { await db.rpc("heal_stale_sessions" as never); } catch { /* best effort */ }
```

**Verifiser:** `SELECT heal_stale_sessions() as healed_count;` — bør returnere >0 første gang.

**Merk:** `as never` cast nødvendig inntil `database.types.ts` regenereres via `mcp__supabase__generate_typescript_types`.

---

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

## 16. Alarmering — Resend alerting med rate-limiting

## 17. Stripe-betaling — prising, Vipps, Workers-konfigurasjon

Se `references/stripe-payments-ops.md` for full arbeidsflyt: three-way price verification
(Stripe ↔ DB ↔ i18n), Vipps-aktivering, NEXT_PUBLIC_-variabler i wrangler.jsonc, og
teste checkout uten nettleser.

## 19. JokerTrade guard + global kill switch (2026-07-31)

Før auto-trading aktiveres for mange brukere: sett opp guard + kill switch.

- `references/jokertrade-guard-killswitch-2026-07-31.md` — komplett SQL + Edge Function + cron + monitor-view.
- `references/jokertrade-monitoring-cron.md` — 30-minutters Hermes cron som sjekker sesjoner, handler, guard-logg og Edge Function.
- Relatert: `klarpakke-currency-pitfalls` (USDT/NOK-blanding), `klarpakke-trading-data-cleanup` (opprydding).

## 22. AI provider cost/quality routing (2026-07-31)

Riktig modell til riktig oppgave i `/api/ai/chat`.

- `references/ai-provider-cost-routing-2026-07-31.md` — klassifisering, planvelger, fallback, nøkler.
- Simple → DeepSeek Flash; complex → Kimi K2.7; architecture → Kimi K3; websearch → Perplexity.
