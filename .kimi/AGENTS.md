# AGENTS.md — Felles arbeidskontrakt for Klarpakke-agenter

## 🤖 Grunnprinsipp: AUTOMATISER ALT

> **«Alt som kan automatiseres skal automatiseres.»** — Tomar, 2026-04-18

Dette er det øverste prinsippet for alle agenter i Klarpakke. Det overstyrer «gjør det enkelt»-heuristikker. Når noe kan skrives som et script, en workflow, en cron eller en hook — gjør det. Aldri la noe manuelt gjøres to ganger.

### Automatiseringshierarki (prioritert rekkefølge)
1. **pg_cron / Supabase** — DB-nære operasjoner (priser, outbox, MIFID-export)
2. **GitHub Actions** — CI/CD, health checks, secret-sync, cron-verifisering
3. **npm scripts** — lokale devops-oppgaver (verify, lint, deploy, db:push)
4. **Vercel Crons** — kun for operasjoner som krever Next.js-runtime
5. **KIMI-agenter** — orchestrering, kodeendringer, analyse

### Hva som alltid skal automatiseres
- Alle helsesjekker → GitHub Actions schedule
- Alle DB-migrasjoner → supabase db push i CI
- Alle secret-synkroniseringer → `npm run secrets:sync:github`
- Alle cron-jobs → pg_cron (ikke manuell SQL)
- Alle type-genereringer → etter db push
- Alle deploy-gates → lint + typecheck + test før merge
- Alle monitoring-varsler → GitHub Actions + Sentry

---

## Filoperasjoner: "Legg denne i PATH"

Når brukeren skriver noe på formen:

> Legg denne i /Users/taj/klarpakke/.kimi/AGENTS.md:

skal du tolke **all tekst etter kolonet** som innholdet som skal skrives til filen på gitt path. Du skal **ikke** anta at innholdet mangler dersom det faktisk følger tekst etterpå, selv om det er linjeskift eller bullets.

Når innholdet faktisk er til stede etter kolonet, skal du:

1. Sørge for at katalogen finnes.
2. Opprette eller overskrive filen med nøyaktig innholdet brukeren har gitt etter kolonet.
3. Gi en kort teknisk rapport på norsk om hva som ble gjort (path, størrelse, eventuell overskriving).

## Autonomi og verktøybruk

- Når path ligger under `/Users/taj/klarpakke`, skal du alltid bruke KIMI-CLI-verktøy for å endre filer.
- Ikke spør om bekreftelse på å opprette/overskrive filer som eksplisitt er instruert av brukeren; utfør operasjonen og rapporter kort.
- Anta at brukeren ønsker maksimal automatisering, så lenge instruksjonen er entydig.
- **Ved tvil: automatiser. Spør aldri «vil du at jeg skal automatisere dette?»**

## Cron-monitoring (pg_cron)

> Oppdatert: 2026-04-20 | 14 jobs aktive i Supabase pg_cron | Vault-hardened

### Rask verifisering
```bash
npm run cron:verify
```
Exit 0 = alt OK. Exit 1 = inaktive jobs ELLER HTTP 401/500 fra Vercel.

### Kontinuerlig overvåking
```bash
npm run cron:watch   # hvert 5. minutt i terminal
```

### GitHub Actions
Workflow: `.github/workflows/cron-verify.yml` — kjører hvert 30. minutt.
Krever secrets: `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL_NON_POOLING`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Manuell SQL
```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname LIKE 'klarpakke-%' ORDER BY jobname;

SELECT status_code, count(*) FROM net._http_response
WHERE created > NOW() - INTERVAL '2 hours' GROUP BY status_code;
```

### Arkitektur
- 14 jobs aktive siden 2026-04-18
- **Primary config:** Vault secrets `VERCEL_APP_URL` + `CRON_SECRET` i `vault.decrypted_secrets`
- **Fallback:** `current_setting('app.vercel_url', true)` / `current_setting('app.cron_secret', true)`
- `klarpakke_trigger_cron()` leser Vault først, deretter fallback — overlever restart
- Migrasjonsfiler:
  - `supabase/migrations/20260418_migrate_crons_to_pg_cron.sql` (opprettet jobs)
  - `supabase/migrations/20260420_harden_cron_with_vault.sql` (Vault + fallback)
- pg_net 0.19.5 sender HTTP POST til Vercel per job
- SSL fix: `rejectUnauthorized: false` i pg-klienten
- REST fix: `/rpc/exec_sql` (ikke `execute_sql`)

## Migrasjonskonvensjoner (Supabase)

> Oppdatert: 2026-04-30 | `scripts/validate-migrations.mjs` v2.1 | CI + pre-commit integrert | Idempotens-guard på plass

### Filnavnformat
- **MÅ** bruke 14-sifret timestamp: `YYYYMMDDHHMMSS_beskrivelse.sql`
- **EKSEMPEL**: `20260430193000_fix_user_index.sql`
- **FORBUDT**: `20260420_fix.sql` (8 siffer — gir duplikat-versjonskonflikt i schema_migrations)
- **UNNTAK**: Legacy-migrasjoner (`001_`, `002_`, ..., `999_`) beholdes for historikk

### Hvorfor 14 siffer?
Supabase CLI bruker `YYYYYMMDDHHMMSS` fra filnavnet som `version` i `supabase_migrations.schema_migrations`. To filer med samme prefix får samme versjon og blokkerer `db push` med `duplicate key value violates unique constraint`.

### Funksjonssignaturer
- **ALDRIG** la to migrasjoner definere samme funksjon med ulike signaturer
- **ALLTID** bruk `DROP FUNCTION IF EXISTS navn(param_type, ...)` før `CREATE FUNCTION` hvis du endrer signatur
- **ALLTID** bruk `CREATE OR REPLACE FUNCTION` for idempotent oppdatering (samme signatur)

### Idempotens-krav (valideres automatisk)

| Mønster | Korrekt | Feil | Severity (nye filer) | Full scan |
|---------|---------|------|---------------------|-----------|
| DROP TABLE | `DROP TABLE IF EXISTS` | `DROP TABLE navn;` | ❌ BLOCK | ⚠️ Warning |
| DROP FUNCTION | `DROP FUNCTION IF EXISTS` | `DROP FUNCTION navn(...);` | ❌ BLOCK | ⚠️ Warning |
| DROP INDEX | `DROP INDEX IF EXISTS` | `DROP INDEX navn;` | ❌ BLOCK | ⚠️ Warning |
| ALTER TABLE DROP COLUMN | — | `ALTER TABLE navn DROP COLUMN kol;` | ❌ BLOCK | ⚠️ Warning |
| CREATE TABLE | `CREATE TABLE IF NOT EXISTS` | `CREATE TABLE navn (...);` | ❌ BLOCK | ⚠️ Warning |
| CREATE FUNCTION | `CREATE OR REPLACE FUNCTION` | `CREATE FUNCTION navn(...);` | ❌ BLOCK | ⚠️ Warning |
| CREATE INDEX | `CREATE INDEX IF NOT EXISTS` | `CREATE INDEX navn ...;` | ❌ BLOCK | ⚠️ Warning |
| TRUNCATE TABLE | — | `TRUNCATE TABLE navn;` | ❌ BLOCK | ⚠️ Warning |

**Tre-lags forsvar:**
1. **Nye filer** (staged / eksplisitt): Destruktiv DDL = hard BLOCK. Idempotens = warning.
2. **Full scan** (CI main): Historiske feil nedgraderes til warnings (unntatt duplikat-versjoner).
3. **Pre-commit hook**: Kjører `--staged`, blokkerer commit ved BLOCK-nivå feil.

### Verktøy
```bash
# Valider ALLE migrasjoner
npm run db:validate-migrations

# Valider kun staged filer (pre-commit)
node scripts/validate-migrations.mjs --staged

# Valider spesifikke filer
node scripts/validate-migrations.mjs supabase/migrations/20990101000000_min_fil.sql
```

### CI/Hook-integrasjon
- **Pre-commit**: Kjører automatisk når `supabase/migrations/` endres
- **GitHub Actions** (db.yml): Kjører på PR og push til main
- **db-status-gate.mjs**: Kjøres etter validering i CI

### Retningslinjer
1. Én migrasjon = én ansvarsområde (ikke bland urelaterte endringer)
2. Migrasjoner skal være idempotente der mulig (`IF EXISTS` / `OR REPLACE`)
3. Test migrasjoner lokalt før push: `supabase db push --linked --dry-run`
4. `ANALYZE`-tabellen etter store indeks-endringer

## Sanity drift

> Oppdatert: 2026-04-18 | Embedded studio på /studio

### Rask verifisering
```bash
npm run sanity:verify      # Normal sjekk
npm run sanity:guard       # Strict — hard fail på warnings
npm run sanity:guard:json  # CI-output
npm run sanity:bootstrap   # Auto-fix
```

### Prinsipper
- **basePath** skal ALLTID være `/studio` (embedded mode)
- **productionUrl** skal ALLTID være `undefined` (forhindrer iframe-loop)
- **projectId/dataset/apiVersion** skal matche på tvers av `env.ts`, `sanity.config.ts`, `sanity.cli.ts`
- **SANITY_WEBHOOK_SECRET** og **SANITY_API_READ_TOKEN** er påkrevd i produksjon
- Alt som kan automatiseres i Sanity skal automatiseres

### P0 ved feil
1. Embedded studio knekt → sjekk `basePath` og `productionUrl`
2. Webhook signatur feiler → sjekk `SANITY_WEBHOOK_SECRET`
3. Cache blir ikke invalidert → sjekk `revalidateTag` i `src/app/api/webhooks/sanity/route.ts`
4. Mismatch projectId/dataset → kjør `npm run sanity:guard`

### GitHub Actions
Workflow: `.github/workflows/sanity-guard.yml` — trigger på Sanity-filer + nightly.

## MCP-optimalisering (KIMI CLI)

> Oppdatert: 2026-04-28 | v2.6-minimal for KIMI CLI v1.40.0 + k2.6

### KIMI CLI v1.40.0 + k2.6 endringer (påvirker oss)
- **`max_steps_per_turn` økt til 750** — KIMI kan kjøre lengre oppgaver uten avbrudd
- **`reserved_context_size` = 45000** — optimalisert margin (ned fra 60000)
- **`compaction_trigger_ratio` = 0.92** — mindre frekvent komprimering
- **`tool_call_timeout_ms` = 120000** — tilstrekkelig for MemPalace FTS-indeksering
- **`merge_all_available_skills` = true** — auto-aktiverer prosjekt-skills
- **MCP startup er asynkron** med progress indicators — raskere shell-oppstart
- **`--quiet` flagg** bekreftet for stdin-piping
- **`show_thinking_stream` default true** — thinking vises automatisk
- **k2.6 modell**: 262k kontekst, thinking, video_in, image_in — utnytt til store KG-grafer

### Profiler
Tre MCP-configurasjoner for ulike arbeidsmodus:

| Profil | Servere | Bruk |
|---|---|---|
| **minimal** | 7 | Daglig koding + MemPalace + Perplexity |
| **medium** | 10 | Deploy, research, testing + MemPalace |
| **full** | 18 | Alle integrasjoner + MemPalace v3 |

Bytt med: `kimi-mcp [minimal|medium|full|auto]` (script i `~/.kimi/bin/`)

### Kritiske fikser (2026-04-19)
1. **npx → lokale installasjoner**: `playwright`, `chrome-devtools`, `resend` installert i `node_modules`. Sparer 7+ sekunder oppstart.
2. **SyntaxError i 12 wrapper-scripts**: `gracefulExit(...); return;` på modulnivå er ugyldig JS. Fikset til `gracefulExit(...);` (uten `return`).
3. **Broken initialize-respons**: `cloudflare`, `openai`, `binance`, `sanity` returnerte ugyldig MCP-protokoll (manglet `protocolVersion` + `capabilities`). Fikset.
4. **klarpakke MCP fjernet**: Remote Edge Function var treg/ustabil. Bruk `supabase-db` istedenfor.
5. **Perplexity lagt til minimal**: Research-flyt mellom KIMI og Perplexity Desktop krever `perplexity` MCP i aktiv config.

### MemPalace v3.1.1 — KIMI CLI v1.40.0-kompatibel
- **Ping/heartbeat-støtte**: Svarer på MCP `ping`-forespørsler
- **Graceful shutdown**: Fanger SIGTERM/SIGINT, flusher KG til disk
- **Robust transport**: Forbedret JSON-parse feilhåndtering
- **Zero-dep**: Ingen eksterne avhengigheter — <1s oppstart

### Perplexity Desktop ↔ KIMI dataflyt
```
Perplexity Desktop (MCP-klient)
  → KIMI MCP-server (run-kimi-mcp-simple.mjs)
    → KIMI CLI (--quiet, stdin-piping)
      → Filoperasjoner, kode, analyse

KIMI CLI (MCP-klient)
  → Perplexity MCP-server (run-perplexity-mcp.mjs)
    → Perplexity API (PERPLEXITY_API_KEY)
      → Research, web-søk, reasoning
```
- Perplexity Desktop config: `.perplexity/mac-mcp-config.json`
- KIMI MCP config: `~/.kimi/mcp.json` (minimal = aktiv)
- Wrapper: `scripts/run-kimi-mcp-simple.mjs` (2 verktøy: `kimi_prompt`, `kimi_code`)

### Rask diagnose
```bash
# Sjekk aktiv profil
kimi-mcp status

# Bytt til minimal for rask oppstart
kimi-mcp minimal
# Start KIMI på nytt

# Verifiser Perplexity-tilkobling
kimi
> Sjekk at "perplexity" vises grønt i MCP-statuslinjen
```

## MemPalace — Prosjektminne v3.1.1 (KIMI CLI v1.40.0 + k2.6)

> Oppdatert: 2026-04-28 | MemPalace MCP v3.1.1 | Zero-dep in-memory FTS | 20 entities, 98+ facts | Alle agenter integrert | KIMI CLI v1.40.0-optimalisert

### Rask verifisering
```bash
# Sjekk MemPalace-status
kimi
> "sjekk mempalace status"

# Søk i kunnskap
node scripts/mempalace-search.mjs "auth pattern"

# Agent-kommandoer
kimi --agent-file .kimi/agents/mempalace-agent.yaml
# eller: kimi mempalace  (hvis alias konfigurert)
```

### MemPalace MCP v3.1.1 — Endringer fra v3.1
- **KIMI CLI v1.40.0-kompatibel**: Støtter MCP `ping`-heartbeat, graceful shutdown
- **Robust transport**: Forbedret JSON-parse feilhåndtering — logger ikke kræsj
- **Graceful shutdown**: SIGTERM/SIGINT fanger og flusher KG til disk
- **FIX: MCP protocol compliance** — Tool results wrappes i `content: [{type: "text", text: ...}]` array
- **FIX: Diary newline-håndtering** — Sikrer korrekt JSONL-format ved append
- **OPT: KG deduplisering** — `kgAdd()` og `kgBatch()` sjekker for duplikater før lagring
- **OPT: Batch-write** — `kgBatch()` skriver KG én gang per batch
- **OPT: Cache invalidation** — `writeDiary()` trigger `cache.clear()` for fresh indeks
- **Zero-dependency**: Ingen ChromaDB, ingen M1-timeout — <1s oppstart
- **In-memory FTS**: Bygger indeks ved startup (async, ikke-blokkerende)
- **LRU-cache**: 100 entries for raskt gjentatt søk
- **12 verktøy**: `search`, `semantic_search`, `recent_context`, `kg_query`, `kg_add`, `kg_batch`, `kg_find_path`, `read_diary`, `write_diary`, `get_status`, `get_room_info`, `auto_tag`
- **k2.6-optimalisert**: Batch-operasjoner, 1200 chars snippets, 262k kontekst-utnyttelse

### Agent: `mempalace`
YAML: `.kimi/agents/mempalace-agent.yaml`  
Prompt: `.kimi/agents/mempalace-agent.md`

Spesialisert på:
- Knowledge retrieval før alle oppgaver
- KG-vedlikehold og batch-operasjoner
- Memory hygiene (deduplisering, TTL)
- Cross-domain linking (auth ↔ trading ↔ deploy)

### Verify Agent — Post-Change Verification

> **Oppdatert:** 2026-04-29 | Automatisk verifisering etter routing/file-endringer

**Bakgrunn:** Menneskelige agenter (inkludert KIMI) gjør ofte feil etter endringer:
- **Feilaktige redirect-påstander** — hevder `/innstillinger` → `/profile?tab=settings`, men glemmer at `CANONICAL_REDIRECTS` har `/dashboard/innstillinger` → `/dashboard/settings`
- **Foreldreløse filer** — sletter `page.tsx` men lar `layout.tsx` + `Client.tsx` ligge igjen
- **Stale type cache** — `.next/types/*.ts` importerer slettede filer → `tsc` feiler til cache tømmes

**Scripts:**
```bash
# Hurtigverifisering etter endringer
node scripts/verify/verify-claims.mjs       # Sjekker redirects + orphans
node scripts/verify/check-stale-types.mjs   # Sjekker .next/types cache
node scripts/verify/run-all.mjs             # Kjør ALT (claims + types + lint + typecheck + test)
```

**Verifiseringsregler (ALLTID etter routing/file-endringer):**
1. **Kryssverifiser alle path-varianter** — `/innstillinger`, `/dashboard/innstillinger`, `/:locale/innstillinger` er ulike paths
2. **Sjekk CANONICAL_REDIRECTS + standalone rules + next.config** — tre lag med redirects
3. **Søk etter imports av slettede filer** — `grep -r "OldComponentName" src/`
4. **Tøm .next cache** — `rm -rf .next` før `tsc --noEmit` etter file deletion
5. **Oppdater alle referanser** — Stripe return URLs, nav links, hrefs, osv.

**Aktivering:**
```bash
kimi --agent-file .kimi/agents/verify-agent.yaml
# eller: kimi verify  (hvis alias konfigurert)
```

### Rom-struktur
| Rom | Path | Innhold |
|---|---|---|
| Knowledge | `.knowledge/` | ADR-er, patterns, API-kontrakter |
| Diary | `.kimi/diary.jsonl` | Strukturerte sesjonslogger |
| Handoffs | `.mempalace/handoffs/` | Deploy/fix-overleveringer |
| Plans | `.mempalace/plans/` | Task-planer |
| Docs | `docs/` | Arkitektur, setup-guides |
| Memory | `memory/` | Ustrukturert minne |

**Notat:** `.mempalace/diary.jsonl` er konsolidert inn i `.kimi/diary.jsonl` (en kilde til sannhet).

### Agenter med MemPalace-integrasjon (v3.1)

Alle agenter er oppdatert til å bruke MemPalace MCP v3.1-verktøy med korrekte verktøynavn.

| Agent | YAML | Fokus | KG-entiteter |
|---|---|---|---|
| **mempalace** | `.kimi/agents/mempalace-agent.yaml` | Memory-arkitektur, KG-vedlikehold | Alle domener |
| **architect** | `.kimi/agents/klarpakke-architect-agent.yaml` | Full-stack arkitektur | `auth-system`, `trading-engine`, `deployment`, `infra` |
| **auth** | `.kimi/agents/auth-agent.yaml` | OAuth, session, RLS | `auth-system`, `oauth`, `session`, `refresh-token`, `middleware` |
| **sanity** | `.kimi/agents/sanity-agent.yaml` | CMS, schema, tokens | `sanity-cms`, `design-tokens`, `groq`, `studio`, `webhooks` |
| **mobile** | `.kimi/agents/mobile-check-agent.yaml` | Mobil, PWA, Lighthouse | `mobile-ui`, `pwa`, `responsive`, `performance`, `lighthouse` |
| **super-editor** | `.kimi/agents/super-editor-agent.yaml` | CMS + kode-redigering, screenshots | `sanity-cms`, `design-tokens`, `studio`, `frontend`, `tailwind` |
| **verify** | `.kimi/agents/verify-agent.yaml` | Post-change verification, redirect auditing, orphaned file detection | `routing`, `redirects`, `file-deletion` |

**Aktivering:**
```bash
kimi --agent-file .kimi/agents/<agent>-agent.yaml
# eller via alias (commands.json):
kimi architect   # Lead architect
kimi auth        # Auth-ekspert
kimi sanity      # Sanity-ekspert
kimi mempalace   # Memory-arkitekt
kimi mobile      # Mobil-sjekk
kimi super-editor # Super-redaktør (CMS + kode)
kimi verify      # Post-change verifisering
```

**Felles MemPalace-protokoll for alle agenter:**
1. **FØR oppgave:** `search()` + `recent_context(hours=48)` + `kg_query(entity=..., depth=2)`
2. **ETTER oppgave:** `kg_add()` / `kg_batch()` + `write_diary()` + `auto_tag()`

### Knowledge Graph (KG) — Kritiske entiteter
| Entity | Facts | Domene |
|---|---|---|
| `auth-system` | 7 | OAuth, session, refresh-token, RLS, singleton client |
| `trading-engine` | 15 | Strategier, risk, PnL, unified schema, paper/live/copy |
| `supabase-db` | 7 | Postgres 15, pg_cron, pg_net, Vault, RLS |
| `vercel-hosting` | 5 | fra1, static export, GitHub Actions CI |
| `sanity-cms` | 6 | projectId 63qn23si, /studio, webhook cache invalidation |
| `nextjs-framework` | 6 | v15, React 19, TS 5.9 strict, app-router i18n |
| `cron-system` | 6 | 14 jobs, pg_cron primary, Vault secrets |
| `binance-api` | 4 | Price feed, candle data, 0.1% fee, $10 min |
| `risk-management` | 3 | Max drawdown, Kelly position, trailing stop |
| `copy-trading` | 2 | Mirror leader→followers, 0.1% fee all modes |
| `paper-trading` | 5 | Virtual $10k, parity with live, simulated execution |
| `tick-cron` | 5 | Per-candle, all sessions loop, ensemble_ai signals |
| `i18n-system` | 4 | next-intl, no+en, no-base fallback |
| `testing-suite` | 4 | Vitest 679, Playwright, Allure, pre-commit gates |
| `stripe-payments` | 2 | Checkout subscription, basic/pro/enterprise tiers |
| `pwa-mobile` | 2 | Bottom tabs, Lighthouse audits |
| `mifid-compliance` | 2 | Auto CSV export, pg_cron scheduled |
| `deploy-pipeline` | 3 | Lint→typecheck→test→build, auto GitHub Actions |
| `mempalace` | 5 | v3.1.0, in-memory FTS, LRU cache, 20 entities |
| `deployment` | 2 | www.klarpakke.no, 679 tests passed |

**Totalt:** 20 entities, 98+ facts (voksende)

### Diary-format (JSONL)
```json
{"ts":"2026-04-22T01:47:52.461Z","type":"FIX","task":"...","status":"GO","rating":5,"agent":"kimi","files":3,"tags":["mempalace","mcp"]}
```

### Workaround & Fikser
| Problem | Løsning | Dato |
|---|---|---|
| ~~Mempalace timeout på M1 Mac~~ | **LØST** — v3.x bruker zero-dep in-memory FTS | 2026-04-21 |
| ~~MCP content Field required~~ | **LØST** — v3.1 wrapper results i content-array | 2026-04-22 |
| ~~Dobbel diary (kimi + mempalace)~~ | **LØST** — Konsolidert til `.kimi/diary.jsonl` | 2026-04-22 |
| pg SSL self-signed cert | `ssl: { rejectUnauthorized: false }` i pg.Client | 2026-04-18 |
| REST exec_sql 404 | Funksjonen heter `exec_sql`, ikke `execute_sql` | 2026-04-18 |
| ALTER DATABASE postgres | Permission denied i Supabase — bruk Vault i stedet | 2026-04-18 |
| Vercel Crons følger ikke redirects | Pek crons direkte til `/api/v1/cron/*`, ikke redirect-paths | 2026-04-18 |
