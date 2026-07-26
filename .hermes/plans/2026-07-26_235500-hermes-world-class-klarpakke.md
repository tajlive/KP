# Hermes → Verdens ledende programmer for Klarpakke (2026)

> **For Hermes:** Bruk `plan`-skill for implementering, `delegate_task` for parallelle oppgaver.

**Mål:** Gjøre Hermes Agent til den mest kapable AI-programmereren for Klarpakke-prosjektet — raskere, mer presis, og med dypere prosjektforståelse enn noen menneskelig utvikler.

**2026-standard:** Multi-modellruting, spesialiserte subagenter, adaptiv kontekst, verktøy-drevet autonomi, og kontinuerlig selv-forbedring via skills.

---

## 🧠 Diagnose — dagens tilstand

| Komponent | Status | Gap |
|---|---|---|
| **Modell** | DeepSeek V4 Pro (deepseek-chat) | Bra, men ingen multi-modell-ruting per oppgave |
| **Kontekst** | 131K tokens | Utmerket for kompleksitet, men kan overveldes |
| **Skills** | 130+ installert, ~10 aktive | Høy støy — mange irrelevante skills i system prompt |
| **Memory** | 42% fylt (1695/4000), user 54% (1353/2500) | Bra størrelse, men statiske facts — mangler adaptiv læring |
| **AGENTS.md** | 181 linjer, utdatert (K3-referanse) | Må oppdateres for DeepSeek + 2026-praksis |
| **Delegation** | deepseek-v4-flash, 4 concurrent | Bra, men ingen spesialiserte agent-profiler |
| **Cron** | `token-health`, `session-prune` | Mangler proaktive cron-jobber (DB-helse, deploy-sjekk) |
| **Pre-commit** | 7-stegs pipeline | Solid, men AST-verifisering skipper ofte |
| **Computer use** | macOS cua-driver | Underutnyttet — kun browser, ikke desktop-automasjon |
| **Fallback** | gemini → openrouter → nous | Bra redundans, men trege ved failover |
| **Browser** | Lokal, stealth=low | Ingen headless/residential proxy → bot-detection |

---

## 🎯 Målarkitektur (2026)

```
┌────────────────────────────────────────────────────────────┐
│                    HERMES PRIME                            │
│  DeepSeek V4 Pro (primary) + Kimi K3 (arkitektur/spesial) │
│  256K context, adaptiv komprimering, multi-modell ruting  │
├────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ BUILDER  │  │ REVIEWER │  │  TESTER  │  │ ARCHITECT │ │
│  │ V4 Flash │  │ V4 Pro   │  │ V4 Flash │  │ K3 (1M)   │ │
│  │ kode     │  │ review   │  │ testfix  │  │ design    │ │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘ │
├────────────────────────────────────────────────────────────┤
│  SKILLS (15 aktive, perfekt kuratert)                      │
│  MEMORY (adaptiv, selv-oppdaterende)                       │
│  CRON (overvåker DB, deploy, avhengigheter)                │
└────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementasjonsplan

### Fase 1: Fundament — Rydd og optimaliser (30 min)

#### 1.1 Oppdater AGENTS.md for 2026
- **Fil:** `AGENTS.md:8`
- Erstatt "Kimi K3 (Allegretto)" med "DeepSeek V4 Pro (primary) + Kimi K3 (arkitektur)"
- Legg til modellrutings-tabell (hvilken modell for hvilken oppgavetype)
- Legg til "Hermes 2026" seksjon med beste praksis for agent-bruk

#### 1.2 Skill-kuratering
- **Problem:** 130 skills lastes i system prompt — majoriteten er irrelevante
- **Løsning:** Reduser `skills.preload` til kun 15–20 essensielle:
  ```
  klarpakke-dev, klarpakke-build, klarpakke-deploy, klarpakke-architect,
  klarpakke-worker-patterns, klarpakke-optimization, klarpakke-qa,
  klarpakke-debug-patterns, klarpakke-sentry, klarpakke-auth-data-access,
  klarpakke-crash-fix, hermes-agent, github-code-review,
  github-pr-workflow, systematic-debugging, test-driven-development,
  requesting-code-review, plan, supabase-type-integrity
  ```
- **Kommando:** `hermes config set skills.preload '["klarpakke-dev", ...]'`

#### 1.3 Clean AGENTS.md redundans
- AGENTS.md og `.hermes.md` har overlapp — `.hermes.md` skal være Hermes-spesifikk, AGENTS.md skal være for alle agenter
- Flytt Hermes-spesifikke detaljer (modellparametere, provider-konfig) til `.hermes.md`
- Behold generell prosjektkunnskap i AGENTS.md

---

### Fase 2: Multi-modell intelligens (45 min)

#### 2.1 Konfigurer oppgave-basert modellruting

```yaml
# .hermes.md — Model Routing Table
model_routing:
  arkitektur_design:     { provider: kimi-coding, model: k3, reason: "1M context for helhetlig design" }
  kompleks_refaktorering: { provider: deepseek, model: deepseek-chat, reason: "V4 Pro — presis kodeforståelse" }
  rutineoppgaver:         { provider: deepseek, model: deepseek-v4-flash, reason: "Rask, billig for småfix" }
  kodegjennomgang:        { provider: deepseek, model: deepseek-chat, reason: "Nøyaktig diff-analyse" }
  testing_debugging:       { provider: deepseek, model: deepseek-v4-flash, reason: "Iterativ feilsøking" }
```

#### 2.2 Spesialiserte subagent-profiler

Definer 4 spesialist-profiler for `delegate_task`:
- **builder** — deepseek-v4-flash, fokus på implementasjon
- **reviewer** — deepseek-chat, fokus på kodekvalitet  
- **tester** — deepseek-v4-flash, fokus på testdekning
- **architect** — kimi K3, fokus på systemdesign (1M context)

Bruk `--profile` eller miljøvariabler for å spinne opp spesialister.

---

### Fase 3: Adaptiv kontekst og minne (30 min)

#### 3.1 Dynamisk kontekstvindu

- **Nå:** Fast 131K context
- **Mål:** Adaptiv — 131K for komplekse oppgaver, 32K for enkle
- **Implementering:** Skill som detekterer oppgavetype og justerer `context_length` via `hermes config set`

#### 3.2 Selv-forbedrende memory

- **Nå:** Statiske facts (42% fylt)
- **Mål:** Memory oppdaterer seg selv basert på sesjonsutfall
- **Implementering:** 
  - Etter hver vellykket PR → lagre lærdom som memory
  - Etter hver feil → lagre rotårsak + fiks
  - Periodisk deduplisering av memory (cron)
  - Øk grenser: memory 6000 chars, user 3500 chars

#### 3.3 Session-gjenbruk

- Bruk `session_search` proaktivt før hver større oppgave
- Lag en skill `session-context` som automatisk henter relevant historikk

---

### Fase 4: Verktøy-evolusjon (60 min)

#### 4.1 Computer use-optimalisering

- **Nå:** Kun browser interaksjon
- **Mål:** Full desktop-kontroll:
  - Automatisk deploy-verifisering (åpne Safari, sjekk prod)
  - Systemovervåking (Activity Monitor, diskbruk)
  - Lokal testing med `hermes desktop` i bakgrunnen

#### 4.2 Browser-stack upgrade

- Legg til residential proxy (Browserbase) for å unngå bot-detection
- Konfigurer `browser.use_gateway: true`
- Bruk `browser.stealth_mode: maximum` for produksjonstesting

#### 4.3 Supabase MCP-utvidelse

- Legg til RLS-policy-sjekk i pre-commit
- Automatisk type-regenerering etter migrasjoner
- Database-helsesjekk som cron-job

---

### Fase 5: Automatisering og overvåking (45 min)

#### 5.1 Proaktive cron-jobber

```bash
# DB-helse — daglig
hermes cron create --schedule "0 8 * * *" --prompt "Sjekk Supabase DB: long-running queries, indeksbruk, tabellstørrelser. Rapporter avvik."

# Avhengighetshelse — ukentlig
hermes cron create --schedule "0 9 * * 1" --prompt "Kjør npm audit, sjekk Dependabot alerts, rapporter kritiske pakker."

# Deploy-verifisering — etter hver deploy
hermes cron create --schedule "*/30 * * * *" --prompt "Sjekk klarpakke.no: 200 OK, lastetid < 2s, ingen JS-feil i console."
```

#### 5.2 Pre-commit-forbedring

- Fiks AST-verifisering som skipper ofte — gjør den obligatorisk for `.ts`/`.tsx`
- Legg til `eslint --rule '...'` for nye regler
- Legg til i18n-validering i pre-commit (ikke bare pre-push)

#### 5.3 Automatisk rollback-deteksjon

- Cron som sjekker Sentry for error-spike siste 15 min
- Ved spike > 2x normal: alert + tilby rollback

---

### Fase 6: Kontinuerlig forbedring (løpende)

#### 6.1 Skill auto-generering

- Etter enhver session med >10 tool calls: tilby å lagre som skill
- Bruk `skill_manage(action='create')` med auto-generert innhold
- Kategoriser automatisk basert på domene (trading, frontend, devops)

#### 6.2 Metrikk-sporing

- Antall vellykkede PRs / feilede PRs
- Gjennomsnittlig tid per oppgave
- Cache-treff-rate for prompts
- Token-forbruk per sesjon

#### 6.3 Feedback-loop

- Etter hver PR: analyser review-kommentarer for mønster
- Juster AGENTS.md ved gjentatte feil
- Oppdater skills ved nye pitfalls

---

## 📊 Forventet effekt

| Metrikk | Nå | Mål | Forbedring |
|---|---|---|---|
| Kontekst-relevans | 130 skills i prompt | 15–20 essensielle | 85% reduksjon i støy |
| Oppgave-presisjon | God | Utmerket | Multi-modell for rett oppgave |
| Autonomi | Manuell dispatch | Automatisk | Cron + selv-forbedrende |
| Deploy-verifisering | Manuell | Automatisk | Desktop-automasjon |
| Feilrate | Medium | Lav | Adaptiv kontekst + bedre review |
| Token-effektivitet | 130K alltid | Adaptiv 32K–131K | ~40% besparelse på enkle oppgaver |

---

## ⚠️ Risikoer

| Risiko | Sannsynlighet | Mitigering |
|---|---|---|
| For få skills = mangler kontekst | Medium | Behold `klarpakke-*` alle; fjern kun generiske |
| K3-kostnad ved arkitektur | Høy ($15/M output) | Kun K3 for kompleks arkitektur (>5 filer) |
| Desktop-automasjon feiler | Medium | Start med browser-only; utvid gradvis |
| Cron-spam | Lav | Rate-limit på rapporter; kun ved avvik |

---

## 🚀 Anbefalt rekkefølge

1. **Fase 1** (umiddelbart) — AGENTS.md + skills-kuratering + memory-økning
2. **Fase 4.2** (umiddelbart) — Browser upgrade (unngår fremtidige login-feil)
3. **Fase 2** (denne uken) — Multi-modell-ruting + spesialist-agenter
4. **Fase 5** (denne uken) — Cron-jobber + pre-commit
5. **Fase 3** (neste uke) — Adaptiv kontekst + memory
6. **Fase 4.1** (neste uke) — Desktop-automasjon
7. **Fase 6** (løpende) — Metrikker + selv-forbedring
