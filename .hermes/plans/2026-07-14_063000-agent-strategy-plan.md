# Agent-strategi for Klarpakke

> **For Hermes:** Vurder behovet for flere permanente subagenter, og gi en anbefaling.

**Mål:** Avgjøre om prosjektet trenger flere AI-agenter, og i så fall hvilke.

**Kontekst:** Vi har nettopp satt opp self-hosted CI/CD, fikset vinnrate-bug, deployet helse-worker. Neste steg er å automatisere alt som kan automatiseres.

---

## Dagens agenter

| Agent | Type | Status | Oppgave |
|-------|------|--------|---------|
| **Hermes (meg)** | Hovedagent | ✅ Aktiv | Arkitekt, koding, debug |
| **Mac runner** | CI/CD | ✅ Online | Kjører workflows |
| **WSL runner** | CI/CD | ⏳ Oppsett | Tung bygg på PC |
| **Runner watchdog** | Cron | ✅ Online | Sjekker runner hvert 5. min |
| **pg_cron (7 stk)** | DB | ✅ Online | Health, trading, watchdog |

---

## Behovsvurdering

### 1. Bygg-agent (kritisk)
**Problem:** Mac M1 (8GB) kan ikke bygge OpenNext (OOM/timeout). PC (32GB) har WSL-utfordringer.

**Foreslått løsning:** Én dedikert subagent som:
- Overvåker bygg-køen
- Trigger bygg på PC via WSL
- Laster opp artefakter til Cloudflare eller Mac
- Rapporterer status

**Alternativ:** Fiks WSL-runner slik at auto-deploy workflow bygger på PC direkte.

### 2. DB-vedlikeholdsagent (anbefalt)
**Problem:** Session-data blir stale (som vi nettopp så — `losing_trades` viste 3 istedenfor 401).

**Foreslått løsning:** Cron-basert subagent som:
- Kjører `UPDATE trading_sessions SET ...` mot faktiske trades hver time
- Sjekker for orphan data, duplikater, inkonsistenser
- Logger og varsler ved avvik

**Gevinst:** Hindrer at vinnrate-buggen gjentar seg.

### 3. Syntetisk testagent (nice-to-have)
**Problem:** E2E-tester kjører kun ved deploy. Ingen overvåking av produksjon i sanntid.

**Foreslått løsning:** Subagent som:
- Logger inn som testbruker hver time
- Verifiserer at dashboard laster, trades vises, P&L er korrekt
- Tar skjermbilde ved feil
- Rapporterer til Sentry

### 4. Kodekvalitetsagent (nice-to-have)
**Problem:** Lint har 27 pre-existing errors som aldri blir ryddet.

**Foreslått løsning:** Subagent som:
- Analyserer lint-feil
- Fikser de trygge (auto-fix)
- Rapporterer de som krever manuell vurdering
- Kjører ved hver PR

### 5. Sikkerhetsscanner (nice-to-have)
**Problem:** Ingen automatisert sjekk av avhengigheter, secrets, eller sårbarheter.

**Forslått løsning:** Subagent som ukentlig:
- Kjører `npm audit`
- Sjekker etter hardkodede secrets i repo
- Rapporterer funn

---

## Anbefaling — som lead arkitekt

**Behov for FLERE agenter: NEI — optimaliser eksisterende først.**

### Hvorfor ikke flere agenter nå:

1. **Vi har allerede 7+ pg_cron jobs** som overvåker helse
2. **Self-hosted runner** på Mac kjører CI/CD
3. **WSL-runner på PC** løser bygg-problemet når den er ferdig
4. **Runner watchdog** overvåker at CI fungerer
5. **Flere agenter = mer kompleksitet** uten nødvendigvis mer verdi

### Hva vi BØR gjøre i stedet:

| Prioritet | Tiltak | Effekt |
|-----------|--------|--------|
| 🔴 1 | **Fullfør WSL-runner** — fiks GH token, få den online | Bygg på PC, auto-deploy |
| 🟡 2 | **Fiks dashboard RPC** — aggregér fra trades, ikke session-tabellen | Hindrer vinnrate-bug permanent |
| 🟡 3 | **Fiks lint-feilene** — dediker 15 min til auto-fix | Ryddigere kodebase |
| 🟢 4 | **Sett opp Slack-varsling** — webhook finnes, bare koble til | Varsler ved feil |
| 🟢 5 | **DB cleanup cron** — enkel SQL-job hver time | Hindrer stale data |

### Når flere agenter gir mening:

- **Etter WSL-runner er online** → auto-deploy via PC
- **Hvis produksjon vokser** → syntetisk testagent
- **Hvis feilraten øker** → DB-vedlikeholdsagent

---

## Konklusjon

**Du trenger ikke flere agenter.** Du trenger å **fullføre** det vi allerede har satt opp, og **feste** de to permanente løsningene (dashboard RPC + WSL-runner). Da har du et automatisert system som:
- Bygger og deployer automatisk (PC)
- Overvåker seg selv (Mac watchdog + pg_cron)
- Korrigerer data (DB cleanup)
- Varsler ved feil (Slack/Sentry)

Alt innenfor dagens arkitektur — uten ekstra agent-kompleksitet.
