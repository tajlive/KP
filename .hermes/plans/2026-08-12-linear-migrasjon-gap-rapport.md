# Trello → Linear migrasjon — Gap-rapport (Fase 1, read-only)

> **Dato:** 2026-08-12 · **Forfatter:** Hermes (lokal executor for Blyt/Klarpakke)
> **Scope:** Kartlegging og forberedelse. INGEN Trello-/Linear-endringer, ingen commits, ingen deploys, ingen DB-endringer.
> **Fakta vs anbefalinger:** Avsnitt A–B + «Fakta»-blokker = verifisert via repo-inspeksjon, read-only API-kall (Trello REST, Linear GraphQL via lokal MCP) og Hermes cron/gh-status. Avsnitt C–J = anbefalinger.

---

## Bunnlinje

1. **Linear er allerede i drift som krav-SSoT i praksis** — team KLA, 9 prosjekter, 30 labels, KLA-263→305 i commit-meldinger, og en «Klarpakke Linear autofix»-cron (hver 10. min, status ok).
2. **Trello er en zombie-kanal:** 110 kort, 85 i «🚨 Varsler» (alert-kirkegård); «trello-plukker»-cronen FEILER; to Trello-scripts er foreldreløse (ingen scheduler); morgenrapporten poster ikke lenger til Trello.
3. **9 produktive Trello-forbrukere gjenstår å konvertere** (sentry-webhook, auto-rollback, synthetic-monitor, max-aggressive-monitor, escalation-rules, ARCHITECT.md, AGENTS.md, hermes-prompt-v3, 2 skills).
4. **Linear MCP finnes (14 verktøy, audit-logg) men er ikke registrert i Hermes** og wrapperen `run-linear-mcp.mjs` mangler — all Linear-bruk går via ad-hoc node-scripts.
5. **Codex CLI er installert** (`~/.codex`, gpt-5.5, approval_policy=never, sandbox danger-full-access) med tom AGENTS.md — klar til å arve K3-rollen, men uten klarpakke-kontekst.
6. **Blyt = Blyt AS (org.nr 929003292)** — selskapet. Finnes kun som juridisk/merkevare-referanse i kodebasen, ikke som programvare. I målmodellen er Blyt kontrollplanet (Toms beslutningslag), ikke en ny komponent.

---

## A. Nåværende arkitektur (fakta)

| Lag | Komponent | Tilstand |
|---|---|---|
| Oppgavekanal (offisiell) | Trello «Klarpakke Drift» (`6a77a7ac73020977260a3931`), 4 lister | Aktiv men degenerert: 85/110 kort i Varsler |
| Oppgavekanal (faktisk) | Linear Klarpakke-team (KLA) | Aktiv: KLA-numre i commit-meldinger siden ~2026-08-12 |
| Agent #1 | Hermes — hovedarkitekt (`ARCHITECT.md`, `.hermes/prompts/hermes-prompt-v3.md` v3.0.0 «Trello-native»), DeepSeek V4 Pro primary / Flash delegation | Kjører |
| Agent #2 | Kimi Desktop (K3/K2.7) via `kimi-bridge` (launchd port 3100, `MCP_API_KEY`), sonekart i `.hermes/ARBEIDSFORDELING-2026-08-10.md` | K3 suspendert til ~14. aug |
| Agent #3 | Codex CLI (`~/.codex`) — installert, gpt-5.5, danger-full-access | Konfigurert, tom AGENTS.md, aktiv i dag (state-filer rørt 2026-08-12 17:45) |
| Kode-SSoT | GitHub (`tajlive/KP`), main-branch, pre-merge-gates + deploy.yml-gates | ✅ |
| CI | `deploy.yml` (test-gate→deploy→e2e-smoke-prod→e2e-smoke-auth-prod→auto-rollback), `synthetic-monitor.yml` (5 min), `pre-merge-gates`, `health-monitor`, `e2e-lighthouse-qa`, `pilot-weekly-backtest` + 2 legacy (`deploy-staging`/`deploy-production`, kun workflow_dispatch) | ✅ |
| Data-SSoT | Supabase `pskhryjzkobytnfwucrb` | ✅ |
| Runtime-SSoT | Cloudflare Workers (wrangler versions) | ✅ |
| Orkestrering | 37 Hermes cron-jobber + pg_cron + launchd | ⚠️ ~11 jobber feiler (se G.4) |

**Produktiv kjede i dag:** Trello (leses stille feil) + Linear (leses av autofix-cron) → Hermes (implementerer, committer til main) → GitHub Actions (gater + deploy) → Cloudflare/Supabase. Kimi Desktop er parallell arbeider med MCP-bro; Codex er enda ikke koblet på.

---

## B. Trello-avhengighetskart (fakta, komplett)

### Kode og config
| # | Fil | Linje(r) | Hva |
|---|---|---|---|
| 1 | `ARCHITECT.md` | hele filen | Roller (Hermes plukker kort, Kimi verifiserer, Tom prioriterer), Trello-flyt, credentials-avsnitt |
| 2 | `AGENTS.md` | 13 | Board-URL + henvisning til ARCHITECT.md |
| 3 | `.hermes/prompts/hermes-prompt-v3.md` | 2, 13, 29–30, 34–64, 157, 217 | «Trello-native»; TRELLO AUTOMATION-seksjon, kortformat, lister, forbudsregler |
| 4 | `scripts/trello-auto-triage.mjs` | hele | Auto-triagem kl. 06:00 — **foreldreløs: ingen scheduler funnet** (kommentar sier pg_cron, men pg_cron kan ikke kjøre node; ingen wrapper i `~/.hermes/scripts/`) |
| 5 | `scripts/morning-report-2.mjs` | 103–106, 221–239 | Poster rapportkort — **foreldreløs** (nåværende morgenrapport `klarpakke-morgenrapport.sh` er psql-only, ingen Trello) |
| 6 | `scripts/max-aggressive-monitor.mjs` | ~100–108 | Poster statuskort til Trello + Discord |
| 7 | `scripts/lib/escalation-rules.mjs` | 33–36, 72–74 | `trello`-flagg i INFO/WARNING/CRITICAL/EMERGENCY |
| 8 | `src/app/api/webhooks/sentry/route.ts` | 70–88, 145–147 | `postTrelloCard()` → «🚨 Varsler»; trenger `TRELLO_*` som Workers-secrets i prod |
| 9 | `.github/workflows/deploy.yml` | 221–231 | Auto-rollback poster Trello-kort (GH-secrets `TRELLO_KEY`/`TRELLO_TOKEN`) |
| 10 | `.github/workflows/synthetic-monitor.yml` | 8, 60–71 | Varsler Trello ved brudd (samme GH-secrets) |
| 11 | `.env.local` | — | `TRELLO_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID`, `TRELLO_LIST_FUNNET/UNDER_ARBEID/VARSLER/VERIFISERT` |

### Skills, cron og minne
| # | Sted | Hva |
|---|---|---|
| 12 | Skill `trello-krav-workflow` (`~/.hermes/skills/productivity/`) | Hele skillen: board-id, liste-id-er, curl-flyt, pitfalls |
| 13 | Skill `klarpakke-hermes-ops` — «Trello som krav-kanal»-seksjon + `references/trello-tool-ids-2026-08-09.md` | Trello som krav-kanal (Tom-mandat 2026-08-08) |
| 14 | Hermes cron `trello-plukker` (`cd45018dfca3`) | Daglig 08:04 LLM-jobb som leser tavla — **last_status: error** |
| 15 | `.hermes/ARBEIDSFORDELING-2026-08-10.md` | Linje 49: «kommunikasjon via … Trello-kort med bevis» |

### Linear — eksisterende grunnmur (fakta, verifisert read-only i dag)
- **Workspace:** Team «Klarpakke» (key KLA, id `a2b657ba-6d13-48b0-8570-25cbcb69f9c4`).
- **9 prosjekter:** Security & Compliance, Technical Debt, Growth & Marketing, Payments & Subscriptions, Core Product & Onboarding, UX/UI Cleanup, Paper Trading Integrity, Reliability & Trading Safety, Klarpakke (legacy).
- **30 labels** (p0–p3, incident, regression-test-required, needs-tom-approval, blocked + 15 produktområder).
- **Workflow:** Triage → Ready for Tom → Approved → Monitoring → In Progress → In Review → Code Review → Done → Canceled.
- **Eksempler:** KLA-261 (Paper Trading Integrity, state Monitoring), KLA-262 (UX/UI Cleanup, state Triage).
- **MCP:** `scripts/mcp/linear-mcp.ts` (14 verktøy; idempotent create; audit-logg med secret-redaksjon; commits `8a3235f49`, `e1aaa0f7e`). **Ikke registrert i `~/.hermes/config.yaml`** (0 treff på linear/trello) — `run-linear-mcp.mjs`-wrapperen refereres i kode og test men **finnes ikke på disk**.
- **Hermes cron:** «Klarpakke Linear autofix» (`9d5165445e0b`, hver 10. min, skill klarpakke-hermes-ops) — leser KLA-issues og fikser. Status ok.

### Blyt og Codex (fakta)
- **Blyt** = selskapet Blyt AS (org.nr 929003292). Referanser: e-postfooterne (`src/lib/email/index.ts:245`, `branded-templates.ts:47`, `supabase/functions/send-notifications:102`, `welcome-email:45–80`, `_shared/email-templates.ts:46`, `api/cron/monitoring-alert:231`) + docs (`PRICING.md:5`, `BUSINESS-PLAN.md:5,154,158,222`). **Ingen programvarekomponent heter Blyt.**
- **Codex:** `~/.codex/config.toml` = model gpt-5.5, reasoning high, sandbox danger-full-access, approval_policy never, plugins github/browser/chrome/computer-use. Skills (cloudflare, wrangler, web-perf, agents-sdk m.fl.), `rules/default.rules`, **AGENTS.md tom (0 bytes)**. Ikke i PATH.

---

## C. Foreslått Linear-erstatningsarkitektur (anbefaling)

**Prinsipp: konsolider i den strukturen som allerede finnes — ikke lag et parallelt system.**

```
Linear (krav-SSoT)
  ├─ Triage                    ← morgenrapport-funn, Sentry, synthetic-monitor, auto-rollback
  ├─ Ready for Tom / Approved  ← Tom-prioritering og -godkjenning (kontrollplan)
  ├─ In Progress → Code Review → Done  ← Hermes/Codex arbeid m/ CI-bevis i kommentarer
  └─ Monitoring                ← ting som skal observeres (drift), istedenfor «🚨 Varsler»-listen
Hermes: leser Linear hvert 10. min (eksisterende autofix-cron utvides), committer med KLA-nummer
GitHub Actions: CI-gater; alarmer → Linear-issues (ikke Trello)
Supabase/Cloudflare: uendret SSoT for data/runtime
```

**Liste-mapping (én-til-én, minimal læringskurve):**

| Trello | Linear | Merknad |
|---|---|---|
| 📋 Funnet automatisk | `Triage` | Nye krav/funn lander her |
| 🔄 Under arbeid | `In Progress` | Hermes/Codex flytter selv ved start |
| ✅ Verifisert | `Done` | Kun med CI-grønn + prod-verifiseringsbevis i kommentar (eksisterende regel beholdes: skriver koden godkjenner ikke alene — Tom flytter til `Approved`/spot-sjekker, eller Kimi/Codex gjør uavhengig Code Review) |
| 🚨 Varsler | Label `incident` (+ `p0`/`p1`) i riktig prosjekt — INGEN egen catch-all-liste | Eliminerer kirkegårds-mønsteret; alerts lukkes/arkiveres |

**Alert-sinks:** `postTrelloCard()` → ny `postLinearIssue()` (idempotent på tittel, label `incident`). Samme mønster i sentry-route, auto-rollback, synthetic-monitor, max-aggressive-monitor. Trello-varsler var «fyr og glem»; Linear gir eierskap, tilstand og lukking.

**Slett/behold-regel:** Alt som poster KUN til Trello konverteres til Linear. `escalation-rules.mjs` får `linear: true`-flagg i stedet for `trello`. Ingen dobbeltposting (en alert = ett system).

---

## D. Hermes vs Codex ansvarsdeling (anbefaling)

Codex arver **K3-rollen** (K3 er suspendert; sonekartet og autonomi-reglene Tom allerede godkjente gjenbrukes). Codex = det dyre, kvalitetstunge verktøyet for koding; Hermes = billig, kontinuerlig drift + verifisering.

| Ansvarsområde | Hermes (DeepSeek V4 Pro/Flash) | Codex (gpt-5.5) |
|---|---|---|
| Linear-issue-triage, status-synk, autofix-loop | ✅ eier (cron hver 10. min) | ❌ |
| Små/mekaniske fikser: i18n, lint, enkeltfil-bugfix | ✅ ($0.14/M Flash ≈ 20× billigere) | ❌ |
| Drift/verifikasjon: prod-smoke, curl-bevis, CI-watch, cron-hygiene | ✅ | ❌ |
| Infrastruktur: Cloudflare/Supabase/secrets/migrasjoner (med Tom-godkjenning der påkrevd) | ✅ | ❌ |
| **Tunge flerfil-refaktoreringer** (>5 filer, kompleks TS-logikk) | Bare når Flash/Pro feiler 2× | ✅ primær |
| K3-sonen: `src/features/pilot`, `lib/llm`, `lib/backtest`, `app/pilot|kurs|priser|om-oss` | Leser/verifiserer | ✅ eier (arvet sonekart) |
| PR-arbeid, kodegjennomgang av Hermes-commits | ✅ kan gjøre | ✅ uavhengig reviewer |
| Live trading-konfig, kill switch, DB-schema, secrets, UI-fjerninger | Venter Tom | ❌ ALDRI (samme forbud som K3) |

**Codex-forutsetninger (før bruk):**
1. `~/.codex/AGENTS.md` (tom i dag) → fylles med repo-AGENTS.md + sonekart + Linear-flyt + gate-regler.
2. `approval_policy=never` + `danger-full-access` + push til main = samme risikoklasse som K3 — behold regelen: commit KUN med grønne gates (tsc+eslint+vitest), rapport ETTER commit med KLA-nummer.
3. Kostnadskontroll: Codex kjøres kun ved eksplisitt valg per issue («codex»-label eller >5-fil-scope), ikke som bakgrunns-loop. DeepSeek Flash er ~20× billigere — rutinearbeid skal aldri gå til Codex.
4. `merge-reconciler`-skillen gjelder ved konflikter mellom agentene.

---

## E. Blyt kontrollplan-grenser (fakta + tolkning)

**Fakta:** Blyt finnes i repoet kun som selskapet Blyt AS (org.nr 929003292) i juridiske/merkevare-referanser. Det finnes ingen «Blyt»-programvare, -agent eller -tjeneste.

**Tolkning av målmodellen «Linear → Blyt → Hermes → Codex»:** Blyt er **beslutnings-/kontrollplanet** (Tom som operatør av Blyt AS), ikke et nytt teknisk lag. Dets grenser:

| Grense | Mekanisme i Linear | Eier |
|---|---|---|
| Prioritering | Flytte issues til `Ready for Tom` | Tom |
| Godkjenning av arbeid | State `Approved` | Tom (Hermes/Codex flytter ALDRI hit selv) |
| Kravinntak | Ny issue i Triage (K3-regelen: agenter lager ikke Todo-kort — tilsvarende: agenter oppretter issues kun for funn/alerts, ikke for egne ønsker) | Tom |
| Penger/live | Kill switch, live-trading-flagg, prisendringer | Tom (uendret fra dagens regler) |
| Kode/kvalitet | GitHub + CI er fasit; Linear beskriver HVORFOR, GitHub beviser HVA | Hermes/Codex |

**Anbefalt grense-setting:** Blyt-kontrollplanet = det som i dag ligger i Linear-state `Ready for Tom`/`Approved` + eksisterende Tom-regler (DB-diff→godkjenning, UI-fjerninger, live-trading). Ingen ny programvare bygges. Hvis «Blyt» i oppdragsbeskrivelsen faktisk betyr et konkret verktøy/produkt, finnes det ikke i repoet og må avklares — men all repo-evidens peker på selskapet.

---

## F. Skills/prompts/regler som MÅ oppdateres (anbefaling)

| # | Artifact | Endring |
|---|---|---|
| 1 | `trello-krav-workflow` skill | Skriv om til `linear-krav-workflow` (Linear GraphQL-mønstre, KLA-identifikatorer, workflow-states, idempotens, label-sett-regelen) — slett deretter Trello-skillen med `absorbed_into` |
| 2 | `klarpakke-hermes-ops` skill | «Trello som krav-kanal»-seksjonen → «Linear som krav-kanal»; behold `references/linear-api-setup.md` (allerede god), arkiver `trello-tool-ids-2026-08-09.md` som historikk |
| 3 | `.hermes/prompts/hermes-prompt-v3.md` | v3.1: «Trello-native» → «Linear-native»; TRELLO AUTOMATION → LINEAR AUTOMATION med reelle state-navn; SYSTEM CONTEXT-tabell (Task Source), AUTOMATION HIERARCHY-punkt 4, PROHIBITED ACTIONS («Never mark Trello card…» → Linear-regel) |
| 4 | `ARCHITECT.md` | Hele Trello-flyten → Linear-states; «Kimi verifiserer» → Code Review-state/CI-bevis-modell |
| 5 | `AGENTS.md` | Linje 13 (board-URL) → Linear-workspace; modellruting-tabellen (linje 146–154) er foreldet — oppdater til DeepSeek Pro/Flash + Codex-gpt-5.5-rollen |
| 6 | `.hermes.md` | MCP-tabell: legg til Linear MCP; «CI/CD: manuell deploy.sh» (linje 8) er foreldet — deploy.yml er fasit |
| 7 | `.hermes/ARBEIDSFORDELING-2026-08-10.md` | Linje 49: Trello → Linear |
| 8 | `scripts/lib/escalation-rules.mjs` | `trello:`-flagg → `linear:`-flagg |
| 9 | Hermes memory | Gjort i denne økten (krav-kanal-fakta oppdatert) |

---

## G. Duplikater/foreldede deler (fakta)

1. `scripts/trello-auto-triage.mjs` — foreldreløs (ingen scheduler; pg_cron-kommentaren er ugyldig for node-scripts).
2. `scripts/morning-report-2.mjs` — foreldreløs (erstattet av psql-basert `klarpakke-morgenrapport.sh` uten Trello).
3. Hermes cron `trello-plukker` — error-status, plukker en kanal som ikke lenger oppdateres konsistent.
4. **Feilende Hermes-croner (2026-08-12):** trello-plukker, uke-rapport, DB-schema-backup ukentlig, update-coin-prices (Binance-proxy død), trading-agent-ukentlig, fetch-klines-daglig, Toms trading-overvåkning, Tom Kraken Live (begge kimi-k3-oauth-pinned), llm-saldo-monitor, autopilot-watchdog, Honcho OAuth-refresh (revokert grant). Flere peker på døde avhengigheter (K3-oauth, Binance, Honcho) — ryddes uavhengig av Trello→Linear.
5. `run-linear-mcp.mjs` — referert i `linear-mcp.ts`-header + test, men filen eksisterer ikke.
6. Linear MCP-dist bygget, men ikke registrert i `~/.hermes/config.yaml` → ingen `mcp__linear__*`-verktøy i Hermes-økter; kun terminal-scripts.
7. Trello «🚨 Varsler»: 85/110 kort — alert-kirkegård uten lukkemekanisme.
8. `deploy-staging.yml` + `deploy-production.yml` — legacy (kun workflow_dispatch, self-hosted staging); kandidat for arkivering hvis ubrukt (verifiseres i implementeringsfasen).
9. `~/.codex/AGENTS.md` — tom; Codex kjører uten Klarpakke-kontekst.
10. AGENTS.md-modellruting vs `.hermes.md`/memory — motstrid (K2.7-primary vs DeepSeek-primary).
11. `.hermes.md` MCP-tabell nevner ikke Linear; `hermes-prompt-v3.md` sier CI = `deploy.yml` uten auth-smoke/auto-rollback (utdatert beskrivelse).

---

## H. Sikkerhet/godkjenningsmatrise (anbefaling — bygger på eksisterende regler)

| Handling | Hermes | Codex | Krever Tom |
|---|---|---|---|
| Linear: lese, kommentere, flytte til In Progress/In Review/Monitoring | ✅ autonomt | ✅ (egen zone) | — |
| Linear: opprette issues (funn/alerts) | ✅ (idempotent) | ⚠️ kun i egen sone | — |
| Linear: `Ready for Tom` / `Approved` / arkivering | ❌ | ❌ | ✅ Tom |
| Linear-API-nøkkel | `lin_api_` i `.env.local` (ikke committet); MCP audit-logger redigerer secrets (verifisert av tester) | — | rotasjon = Tom |
| GitHub: commit til main | ✅ (grønne gates + KLA-nummer) | ✅ (samme regel som K3) | — |
| GitHub Actions-secrets (Linear-nøkkel for CI-alerts) | Opprette `LINEAR_API_KEY` GH-secret | ❌ | ✅ en gang |
| DB-schema/data | SQL-diff → «kjør» | ❌ | ✅ |
| Secrets/rotasjon | ✅ (etter prosedyre) | ❌ | Stripe = ✅ alltid |
| Live-trading, kill switch, UI-fjerninger, priser | ❌ | ❌ | ✅ alltid |

---

## I. Eksakt migreringssekvens (anbefaling — rekkefølge, ingen datoer)

**Fase 0 — Frys (Tom-aksjoner):**
1. Kunngjør frys på Trello-tavla («nye krav → Linear»). Ingen nye kort.
2. Tom godkjenner denne planen + kort-mappingen (neste punkt).

**Fase 1 — Teknisk grunnmur (Hermes, ingen produksjonspåvirkning):**
3. Opprett `scripts/mcp/run-linear-mcp.mjs` (laster `.env.local`, no-op-exit uten nøkkel — matcher testens kontrakt) + registrer Linear MCP i `~/.hermes/config.yaml` → ny økt → `mcp__linear__*`-verktøy tilgjengelige.
4. Utvid «Klarpakke Linear autofix»-cronen til full plukk-loop (Triage → In Progress → bevis → Code Review) og stopp cron `trello-plukker`.
5. Bygg `postLinearIssue()`-hjelper (idempotent på tittel, label `incident`) i `scripts/lib/`.

**Fase 2 — Alert-sinks (etter at 5 er testet lokalt):**
6. `src/app/api/webhooks/sentry/route.ts`: Trello → Linear (fjern `postTrelloCard`, behold signaturverifisering).
7. `.github/workflows/deploy.yml` auto-rollback-varsel → Linear (ny GH-secret `LINEAR_API_KEY`; fjern TRELLO-secrets når 8 er gjort).
8. `.github/workflows/synthetic-monitor.yml` → Linear.
9. `scripts/max-aggressive-monitor.mjs` + `scripts/lib/escalation-rules.mjs` → Linear-flagg.

**Fase 3 — Dokumentasjon og skills:**
10. Oppdater F-listen (prompt v3.1, ARCHITECT.md, AGENTS.md, .hermes.md, skills). Opprett `linear-krav-workflow`, slett `trello-krav-workflow` (absorbed_into).
11. Slett foreldreløse scripts: `trello-auto-triage.mjs`, `morning-report-2.mjs`.

**Fase 4 — Kortmigrering (krever Tom-godkjenning av mapping):**
12. Migrer de 17 aktive kortene (9 inbox + 8 under arbeid) til Linear med `Trello → KLA`-mapping i beskrivelsen. 8 verifiserte arkiveres som Done med historikk-lenke. De 85 Varsler-kortene: konsolideres til ÉN «Trello Varsler-arkiv»-issue med tabell over åpne alerts (bare de som fortsatt er relevante blir egne issues) — eksporteres som JSON-backup først.
13. Frys Trello-tavla (fjern TRELLO_* fra `.env.local`, GH-secrets, wrangler-secrets) — etter at Linear-sinks har kjørt feilfritt i en observert periode.

**Fase 5 — Codex-aktivering (etter Tom-OK):**
14. Fyll `~/.codex/AGENTS.md`, tildel K3-sonen, kjør første pilot-issue med «codex»-label, verifiser med merge-reconciler-øyne.

---

## J. Neste implementeringsoppgave (anbefalt start)

**Task 1: «Gjør Linear MCP førsteklasses i Hermes»** — minste muliggjørende steg:
1. Skriv `scripts/mcp/run-linear-mcp.mjs` (wrapper, env-loading, no-op ved manglende nøkkel).
2. Registrer `mcp_servers.linear` i `~/.hermes/config.yaml` (python yaml-edit — config set-lister-fellen).
3. `node scripts/mcp/smoke-linear.mjs` grønn → commit.
4. Neste økt: `tool_search("linear")` → `mcp__linear__*`-verktøy → Linear-arbeid direkte fra Hermes uten ad-hoc-scripts.

Alt annet i sekvensen (I.3–I.14) blokkerer på eller forenkles av dette.

---

*Rapporten er ucommittet. Ingen Trello-, Linear-, DB-, CI- eller prod-endringer er gjort i denne fasen.*
