# Optimalisering av Klarpakke via MCP — Handlingsplan

> **For Hermes:** Utfør steg for steg. Hver MCP-brukssak er uavhengig og kan kjøres parallelt.

**Mål:** Utnytt 221+ MCP-verktøy for å automatisere drift, forbedre kodekvalitet, overvåke ytelse, og eliminere manuelle rutiner i Klarpakke.

**Arkitektur:** Alle MCP-servere er allerede konfigurert. Denne planen definerer konkrete bruksmønstre — hva Hermes skal gjøre MED verktøyene, ikke hvordan de settes opp.

---

## 1. Cloudflare MCP — Automatisert drift og infrastruktur

### Mål: Eliminere manuelle deploy-steg, overvåke ytelse, automatisere secrets

### 1.1 Automatisk deploy-pipeline via Cloudflare Workers

**Nåværende:** `bash scripts/deploy.sh` (manuell, 2-stegs bygg)

**Optimalisert:** Hermes deployer direkte via Cloudflare MCP:
- Bygg lokalt (`npm run cf:build`)
- Deploy via `mcp__cloudflare__worker_deploy` med assets upload
- Verifiser via `mcp__cloudflare__analytics_get`

**Verktøy:** `worker_deploy`, `worker_get`, `route_list`, `analytics_get`

### 1.2 Edge-cache-optimalisering

**Mål:** Reduser lastetid for `/` (landing page) fra ~0.5s til <0.2s.

**Metode:**
- Analyser cache-hit ratio via `analytics_get`  
- Konfigurer cache-regler via `route_list` → oppdater
- Bruk Workers AI for edge-side rendering av statisk innhold

**Verktøy:** `analytics_get`, `route_list`, `ai_inference`

### 1.3 Automatisk secrets-rotasjon

**Mål:** Roter Cloudflare-secrets hver 90. dag via cron.

**Metode:**
- `cronjob create` — ukentlig sjekk av secret-alder
- `secret_list` → `secret_put` med nye verdier
- Synkroniser til Supabase Edge Function env

**Verktøy:** `secret_list`, `secret_put`, `secret_delete`

### 1.4 D1-database overvåking

**Mål:** Automatisk helsesjekk av D1-databasen.

**Metode:**
- `d1_query` — kjør `SELECT count(*) FROM trades` daglig
- `analytics_get` — spor query-ytelse
- Varsle via Resend ved anomalier

**Verktøy:** `d1_query`, `d1_list`, `analytics_get`

### 1.5 Workers AI-integrasjon

**Mål:** Bruk Cloudflare Workers AI for:
- Automatisk oversettelse av i18n-strenger (norsk ↔ engelsk → tysk)
- Spam-deteksjon på support-meldinger
- Tekstoppsummering av lange handelslogger

**Verktøy:** `ai_inference`, `ai_models_list`

---

## 2. GitHub MCP — Kodekvalitet og PR-automasjon

### Mål: Automatisk PR-review, issue-triaging, kodesøk

### 2.1 PR-review-bot

**Mål:** Automatisk kodegjennomgang på alle nye PR-er.

**Metode:**
- `search_pull_requests` — finn åpne PR-er
- `get_pull_request_diff` — hent diff
- Analyser diff (lint, sikkerhet, arkitektur)
- `create_pull_request_review` — post inline kommentarer
- `merge_pull_request` hvis alle sjekker passerer

**Verktøy:** `search_pull_requests`, `get_pull_request_diff`, `create_pull_request_review`, `merge_pull_request`

### 2.2 Automatisk issue-triaging

**Mål:** Kategoriser og prioriter nye issues automatisk.

**Metode:**
- `search_issues` — finn ulabellede issues
- Klassifiser (bug/feature/docs/question)
- `update_issue` — sett labels, assignee, prioritet
- Svar med relevant kontekst

**Verktøy:** `search_issues`, `update_issue`, `create_issue_comment`

### 2.3 Kodebase-søk og refaktorering

**Mål:** Finn død kode, duplisering, utdaterte mønstre.

**Metode:**
- `search_code` — søk etter `console.log`, `TODO`, `FIXME`, deprecated API-kall
- `search_repositories` — finn lignende prosjekter for inspirasjon
- Generer refaktorerings-PR automatisk

**Verktøy:** `search_code`, `search_repositories`, `get_file_contents`

---

## 3. Supabase MCP — Database og Edge Functions

### Mål: Automatisk schema-validering, type-generering, spørringsoptimalisering

### 3.1 Automatisk type-generering ved schema-endringer

**Mål:** Hold `database.types.ts` i sync med DB-schema.

**Metode:**
- `list_migrations` — sjekk nye migrasjoner
- `generate_typescript_types` — generer nye typer
- Commit + PR automatisk

**Verktøy:** `list_migrations`, `generate_typescript_types`, `list_tables`

### 3.2 Query-ytelse optimalisering

**Mål:** Identifiser trege spørringer og foreslå indekser.

**Metode:**
- `execute_sql` — kjør `EXPLAIN ANALYZE` på ofte brukte spørringer
- `get_advisors` (performance) — sjekk anbefalinger
- `apply_migration` — legg til manglende indekser

**Verktøy:** `execute_sql`, `get_advisors`, `apply_migration`

### 3.3 Edge Function-helsesjekk

**Mål:** Overvåk Edge Functions for feil og responstid.

**Metode:**
- `list_edge_functions` — få oversikt
- `get_edge_function` — sjekk kode for sikkerhetshull
- `get_logs` (edge-function) — analyser feil
- `deploy_edge_function` — deploy fikser automatisk

**Verktøy:** `list_edge_functions`, `get_edge_function`, `get_logs`, `deploy_edge_function`

### 3.4 Sikkerhets-revisjon

**Mål:** Kjør `get_advisors(security)` ukentlig — fiks RLS-hull, permission-feil.

**Verktøy:** `get_advisors`, `apply_migration`

---

## 4. Resend MCP — E-postautomasjon

### Mål: Transaksjonelle e-poster, overvåkingsvarsler, nyhetsbrev

### 4.1 Transaksjonelle e-poster

**Mål:** Send bekreftelser, kvitteringer, passord-reset via Resend.

**Metode:**
- `send_email` — send HTML/MJML-e-poster med norsk lokalisering
- `get_email` — sjekk leveringsstatus
- `list_emails` — spor alle utgående e-poster

**Verktøy:** `send_email`, `get_email`, `list_emails`

### 4.2 Automatiske varsler

**Mål:** Varsle ved kritiske hendelser:
- Deploy-feil → e-post til Tom
- DB-anomalier → e-post med detaljer
- Stripe-webhook-feil → e-post med payloaddump
- Trade-bot crash → e-post med recovery-status

**Verktøy:** `send_email`, `create_contact`

### 4.3 Kontakthåndtering

**Mål:** Automatisk synkronisering av brukere mellom Supabase og Resend.

**Metode:**
- `list_contacts` — sjekk eksisterende
- `create_contact` — legg til nye brukere
- `update_contact` — oppdater attributter (plan, status)

**Verktøy:** `list_contacts`, `create_contact`, `update_contact`

---

## 5. Browserbase MCP — E2E-testing og overvåking

### Mål: Automatisk visuell regresjonstesting, produksjonsovervåking

### 5.1 Automatisk E2E-røyktest

**Mål:** Kjør røyktest på alle kritiske paths hver time.

**Metode:**
- `start` → `navigate` til https://www.klarpakke.no/no
- `act` — logg inn med testbruker
- `navigate` til /dashboard, /trade, /dashboard/historikk
- `extract` — sjekk at saldo vises, priser oppdateres
- `observe` — verifiser at ingen JS-feil i konsoll
- `end` — lukk sesjon

**Verktøy:** `start`, `navigate`, `act`, `extract`, `observe`, `end`

### 5.2 Visuell regresjonstesting

**Mål:** Ta screenshots av nøkkelsider og sammenlign med baseline.

**Metode:**
- `start` → `navigate` → `observe` (ta screenshot)
- Sammenlign med forrige baseline
- Varsle ved signifikante forskjeller (>5% pikselforskjell)

**Verktøy:** `start`, `navigate`, `observe`

### 5.3 Konkurrent-overvåking

**Mål:** Overvåk konkurrenters landingssider for prisendringer, nye features.

**Metode:**
- `navigate` til konkurrent-URL
- `extract` priser, features, ordlyd
- Lagre i D1 for trendanalyse

**Verktøy:** `navigate`, `extract`

---

## 6. Supabase MCP + Cloudflare MCP — Synergi

### Mål: Helhetlig overvåking og automatisering på tvers av plattformer

### 6.1 Infrastruktur-helsesjekk

**Mål:** Daglig full-sjekk av hele stacken.

```
Cloudflare: analytics_get + worker_get + secret_list
Supabase: get_advisors + get_logs(api) + execute_sql("SELECT count(*) FROM trades")
GitHub: search_issues (open bugs)
Resend: list_emails (siste 24t)
```

### 6.2 Automatisk gjenoppretting

**Mål:** Ved detektert feil:
1. Supabase Edge Function-feil → `deploy_edge_function` (rollback)
2. Worker-krasj → `worker_deploy` (forrige versjon)
3. DB-treghet → `apply_migration` (indeks)
4. Varsle via Resend → `send_email`

---

## 7. Cron-jobb-plan

| Frekvens | Jobb | MCP |
|---|---|---|
| Hver 30 min | E2E-røyktest (Browserbase) | Browserbase |
| Hver time | Worker-helse + analytics | Cloudflare |
| Daglig 07:00 | Full infra-helsesjekk | Cloudflare + Supabase |
| Daglig 09:00 | PR-review av åpne PR-er | GitHub |
| Ukentlig mandag | Sikkerhetsrevisjon (RLS) | Supabase |
| Ukentlig mandag | Secrets-alder-sjekk | Cloudflare |
| Ved push | TypeScript-typer synkronisering | Supabase |

---

## Implementasjonsrekkefølge

```
Fase 1: Cloudflare-automasjon (deploy, analytics, secrets) → 2 timer
Fase 2: GitHub-automasjon (PR-review, issues) → 1 time
Fase 3: Supabase-optimalisering (types, advisors, queries) → 1 time
Fase 4: E2E-testing via Browserbase → 1 time
Fase 5: Resend-varsler + e-post → 30 min
Fase 6: Cron-jobber (overvåking 24/7) → 30 min
```

**Totalt: ~6 timer**

---

## Forventet effekt

| Metrikk | Før | Etter |
|---|---|---|
| Deploy-tid | 5 min (manuell) | 10 sek (auto) |
| PR-review-tid | 1-3 dager | ~5 min (auto) |
| DB-types synkronisert | Manuelt, ofte utdatert | Auto, alltid oppdatert |
| E2E-testdekning | 0% (ingen auto) | 100% kritiske paths |
| Feil-oppdagelse | Reaktiv (brukerrapporterer) | Proaktiv (varsler på <5 min) |
| E-post-levering | Manuell kode | Auto via Resend MCP |
