# Klarpakke — Full Prosjektstyring Implementation Plan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen task-for-task. Tom skal godkjenne forslag FØR noe implementeres.

**Goal:** Etablere full prosjektstyring for Klarpakke slik at Tom alltid vet: hva jobbes det med, hva er blokkert, hva er neste, og hva koster det — uten å spørre.

**Architecture:** Ett kontrollpanel (Trello) + én sannhetskilde (DB-invarianter) + automatiske rapporter (morgen/kveld) + eskalasjon kun ved unntak. Tom skal aldri åpne Trello for å forstå status — han får den servert.

**Tech Stack:** Trello API (allerede konfigurert), Supabase (invarianter), GitHub Actions (CI), Hermes-cron (rapporter), Sentry (feil).

---

## Nåværende tilstand (fakta, ikke antagelser)

| Område | Status | Bevis |
|--------|--------|-------|
| **Trello** | 14 kort, 4 lister | `✅ Verifisert: 1`, `🔄 Under arbeid: 2`, `📋 Funnet automatisk: 10`, `🚨 Varsler: 1` |
| **Kritiske varsler** | 1 aktiv | 🚨 Autopilot-orchestrator nede (watchdog 01:15) — **MEN pg_cron viser succeeded 02:55** |
| **CI** | Grønn | `31290707350` (test-gate → deploy → e2e-smoke-prod) |
| **Åpne planer** | 6 stk | Infrastruktur-audit, Binance-fjerning, Én-knapp, Agentic-AI, Kraken-parity, Aldri-igjen |
| **Teknisk gjeld** | 10 kort i «Funnet automatisk» | Soft-404, llms.txt, vektlæring-gate, A/B-måler, orchestrator-krav, Bitwarden-migrering, OKX-datakilde, alpha-discovery, Binance-opprydding |
| **Inntektsmotor** | OKX Broker-søknad levert | Venter på godkjenning (ekstern) |
| **KIMI_API_KEY** | Suspendert (429) | Tom må lade saldo for Task 2–4 i agentic-plan |

**Kritisk avvik:** Watchdog sa orchestrator nede kl. 01:15, men pg_cron viser succeeded 02:35–02:55. Enten er watchdog feil, eller cron kjører men gjør ingenting (return_message: "1 row" = tom respons). **Dette må avklares før noe annet.**

---

## Forslag: 5 styringsmekanismer

### Mekanisme 1: Trello som eneste sannhetskilde — med auto-triagem

**Problem:** 10 kort i «Funnet automatisk» — ingen vet hva som er viktigst.

**Løsning:** Daglig auto-triagem (cron 06:00) som flytter kort til riktig liste basert på regler:

| Regel | Flytt til | Eksempel |
|-------|-----------|----------|
| Inneholder «KRAV» eller «P0» | `🚨 Varsler` | Orchestrator-krav, vektlæring-gate |
| Inneholder «deploy» eller «prod» | `🔄 Under arbeid` | llms.txt, soft-404 |
| Inneholder «plan» eller «design» | `📋 Backlog` | Agentic-masterplan, OKX-integrasjon |
| Ingen aktivitet 7 dager | `📋 Backlog` | Gamle kort |

**Filer:**
- Create: `scripts/trello-auto-triage.mjs`
- Modify: `vercel.json` (cron-schedule)
- Test: `scripts/__tests__/trello-auto-triage.test.mjs`

**Step 1:** Skriv script som henter alle kort, klassifiserer etter regler, flytter via Trello API.

**Step 2:** Test lokalt med mock-Trello.

**Step 3:** Kjør én gang manuelt — verifiser at kort flyttes riktig.

**Step 4:** Legg til i cron (06:00 daglig).

**Step 5:** Commit: `feat(trello): auto-triagem — daglig klassifisering av kort`.

---

### Mekanisme 2: Morgenrapport 2.0 — «Hva trenger Tom å vite»

**Problem:** Morgenrapport sier «ADVARSEL (5/7)» — men ikke hva som faktisk betyr noe.

**Løsning:** Ny rapport-struktur med tre seksjoner:

```markdown
## 🟢 Alt er bra (ingen handling nødvendig)
- CI: grønn (31290707350)
- Prod: 200 OK, 1.2s TTFB
- DB: 0 invarianter brutt
- Trading: 3 aktive grid, 0 lockout

## 🟡 Krever oppmerksomhet (ikke kritisk)
- KIMI_API_KEY: suspendert (Tom må lade saldo)
- 10 kort i «Funnet automatisk» — auto-triagem kjørt, 3 flyttet til Backlog

## 🔴 Kritisk (handling nødvendig)
- Autopilot-orchestrator: watchdog varslet 01:15, pg_cron OK 02:55 — AVKLAGR
```

**Filer:**
- Modify: `scripts/morning-report.mjs` (eller hvor rapporten genereres)
- Create: `scripts/lib/report-sections.mjs`
- Test: `scripts/__tests__/morning-report.test.mjs`

**Step 1–5:** TDD. Mock Supabase + Trello + GitHub API.

---

### Mekanisme 3: Eskalasjons-protokoll — når skal Tom kontaktes?

**Problem:** Watchdog varslet orchestrator nede, men det var falsk alarm (eller ikke). Tom skal ikke være redd for varsler.

**Løsning:** Tydelig eskalasjons-matrise:

| Nivå | Kriterium | Handling | Eksempel |
|------|-----------|----------|----------|
| **Info** | Systemet fungerer, men noe er suboptimalt | Logg, ikke varsle | «10 kort i backlog» |
| **Warning** | Noe kan bli kritisk | Trello-kort i «Varsler», ikke DM | «KIMI_API_KEY suspendert» |
| **Critical** | Penger i fare, eller prod nede | DM + Trello + telefon (hvis konfigurert) | «Live-trading feilet» |
| **Emergency** | Tap av penger | Alle kanaler + stopp trading | «Kraken API returnerte feil saldo» |

**Regel:** Watchdog skal kun varsle ved **Critical** eller **Emergency**. «Orchestrator nede» er Warning — ikke Critical.

**Filer:**
- Modify: `scripts/autopilot-watchdog.mjs` (eller hvor watchdog er)
- Create: `scripts/lib/escalation-rules.mjs`
- Test: `scripts/__tests__/escalation-rules.test.mjs`

---

### Mekanisme 4: Prosjekt-dashboard — én side som viser alt

**Problem:** Tom må sjekke Trello + GitHub + Supabase + Sentry for å forstå status.

**Løsning:** Intern side `/admin/status` (kun for Tom) som viser:

| Seksjon | Datakilde | Oppdatering |
|---------|-----------|-------------|
| **CI/CD** | GitHub API | Sanntid |
| **Trello** | Trello API | Sanntid |
| **DB-invarianter** | Supabase RPC | 15 min |
| **Trading** | Kraken API + DB | 5 min |
| **Feil** | Sentry API | Sanntid |
| **Kostnader** | Supabase + Cloudflare | Daglig |

**Filer:**
- Create: `src/app/[locale]/admin/status/page.tsx`
- Create: `src/app/api/admin/status/route.ts`
- Create: `src/lib/status/collectors.ts` (henter fra alle kilder)
- Test: `src/app/api/admin/status/__tests__/route.test.ts`

**Step 1:** Lag API-route som samler data fra alle kilder.

**Step 2:** Lag enkel side som viser det (tabell, ikke fancy design).

**Step 3:** Verifiser at alle datakilder returnerer riktig.

**Step 4:** Deploy + prod-verifiser.

**Step 5:** Commit: `feat(admin): status-dashboard — én side for all prosjektinfo`.

---

### Mekanisme 5: Ukentlig retro — automatisk generert

**Problem:** Prosjektet går fremover, men ingen vet hva som ble lært.

**Løsning:** Hver fredag 16:00 genereres ukentlig retro automatisk:

```markdown
## Uke 32 — Retro

### Hva ble levert?
- 3 Trello-kort fullført (soft-404, llms.txt, valuta-fiks)
- CI: 100% grønn (7/7 deployer)
- Prod: 99.8% uptime

### Hva gikk galt?
- Watchdog falsk alarm (orchestrator) — fikset eskalasjons-regler
- KIMI_API_KEY suspendert — Tom varslet for sent

### Hva lærte vi?
- Meta-refresh redirect fungerer for crawlere, ikke curl
- `notFound()` i generateMetadata gir 200 i OpenNext

### Neste uke
- [ ] OKX Broker-godkjenning (ekstern)
- [ ] Task 5: vektlæring-gate implementert
- [ ] Auto-triagem i prod
```

**Filer:**
- Create: `scripts/weekly-retro.mjs`
- Modify: `vercel.json` (fredag 16:00)
- Test: `scripts/__tests__/weekly-retro.test.mjs`

---

## Prioritert rekkefølge (Tom godkjenner)

| # | Mekanisme | Verdi | Effort | Avhengighet |
|---|-----------|-------|--------|-------------|
| 1 | **Avklar orchestrator-varsel** | Kritisk | 5 min | Ingen |
| 2 | **Eskalasjons-protokoll** | Høy | 30 min | Ingen |
| 3 | **Morgenrapport 2.0** | Høy | 45 min | Eskalasjon |
| 4 | **Auto-triagem** | Middel | 30 min | Ingen |
| 5 | **Status-dashboard** | Middel | 60 min | Ingen |
| 6 | **Ukentlig retro** | Lav | 30 min | Alle over |

**Anbefaling:** Start med #1 (avklar om orchestrator faktisk er nede), så #2 (eskalasjon), så #3 (morgenrapport). De tre første gir 80% av verdi.

---

## Risiko & åpne spørsmål

1. **Orchestrator-varsel:** Er watchdog feil, eller gjør cron ingenting? Må sjekkes manuelt før noe annet.
2. **Trello-rate-limit:** 300 requests/10s per token. Auto-triagem + status-dashboard + rapport = ~50 requests/dag. Trygt.
3. **Kostnad:** Status-dashboard krever ingen nye tjenester — alt er eksisterende API-er.
4. **Spørsmål til Tom:** Skal status-dashboard være på `/admin/status` (kun for deg) eller `/status` (offentlig, som statuspage.io)?

---

## Verifikasjonsplan (før «ferdig» erklæres)

1. Kjør auto-triagem manuelt — verifiser at 3 kort flyttes riktig.
2. Generer morgenrapport — verifiser at den viser «🟢 Alt er bra» når alt er grønt.
3. Test eskalasjon — simuler «Critical» og verifiser at DM sendes (mock).
4. Åpne `/admin/status` — verifiser at alle seksjoner viser data.
5. Tom godkjenner alle 5 mekanismer før de rulles ut fullt.
