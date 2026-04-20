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

> Oppdatert: 2026-04-19 | v2.5-minimal for KIMI CLI v1.36.0

### KIMI CLI v1.36.0 endringer (påvirker oss)
- **`max_steps_per_turn` økt til 500** (fra 100) — KIMI kan nå kjøre lengre oppgaver uten avbrudd
- **MCP startup er asynkron** med progress indicators — raskere shell-oppstart
- **`--quiet` flagg** bekreftet for stdin-piping (brukes av `run-kimi-mcp-simple.mjs`)
- **`show_thinking_stream` default true** — thinking vises automatisk

### Profiler
Tre MCP-configurasjoner for ulike arbeidsmodus:

| Profil | Servere | Bruk |
|---|---|---|
| **minimal** | 6 | Daglig koding + Perplexity research |
| **medium** | 9 | Deploy, research, testing |
| **full** | 18 | Alle integrasjoner |

Bytt med: `kimi-mcp [minimal|medium|full|auto]` (script i `~/.kimi/bin/`)

### Kritiske fikser (2026-04-19)
1. **npx → lokale installasjoner**: `playwright`, `chrome-devtools`, `resend` installert i `node_modules`. Sparer 7+ sekunder oppstart.
2. **SyntaxError i 12 wrapper-scripts**: `gracefulExit(...); return;` på modulnivå er ugyldig JS. Fikset til `gracefulExit(...);` (uten `return`).
3. **Broken initialize-respons**: `cloudflare`, `openai`, `binance`, `sanity` returnerte ugyldig MCP-protokoll (manglet `protocolVersion` + `capabilities`). Fikset.
4. **klarpakke MCP fjernet**: Remote Edge Function var treg/ustabil. Bruk `supabase-db` istedenfor.
5. **Perplexity lagt til minimal**: Research-flyt mellom KIMI og Perplexity Desktop krever `perplexity` MCP i aktiv config.

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

## Kjente workarounds

| Problem | Løsning | Dato |
|---|---|---|
| Mempalace timeout på M1 Mac | ChromaDB-problem, kjør manuelt: `npm run mempalace:sync` | 2026-04-18 |
| pg SSL self-signed cert | `ssl: { rejectUnauthorized: false }` i pg.Client | 2026-04-18 |
| REST exec_sql 404 | Funksjonen heter `exec_sql`, ikke `execute_sql` | 2026-04-18 |
| ALTER DATABASE postgres | Permission denied i Supabase — bruk Vault i stedet | 2026-04-18 |
| Vercel Crons følger ikke redirects | Pek crons direkte til `/api/v1/cron/*`, ikke redirect-paths | 2026-04-18 |
