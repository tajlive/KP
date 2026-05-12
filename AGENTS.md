# 🤖 KIMI + MemPalace Master Guide

**Prosjekt:** Klarpakke - AI Trading Platform  
**Stack:** Next.js 15, React 19, TypeScript 5.9, Supabase, Vercel  
**Status:** Production (www.klarpakke.no)  
**Node:** 24.x (se `.nvmrc`)

---

## 🚀 Hurtigstart

```bash
# Start utvikling
npm run dev

# Verifiser miljø
npm run verify

# Sjekk OAuth-konfigurasjon
npm run oauth:check

# Test & bygg
npm run test:unit && npm run build

# Commit & push
git add -A && git commit -m "type: beskrivelse" && git push origin main
```

### KIMI Aliaser
```bash
kimi health          # npm run health:prod:gate
kimi verify          # npm run verify
kimi dev             # npm run dev
kimi build           # npm run build
kimi lint            # npm run lint
kimi typecheck       # npm run type-check
kimi test            # npm run test:unit
kimi test:e2e        # npm run test:e2e:critical:chromium
kimi db:status       # npm run db:status
kimi db:push         # npm run db:push
kimi deploy          # npm run deploy:prod

# Pipeline (NYTT)
kimi ci              # npm run lint:gate && npm run test:unit
kimi monitor         # Sjekk prod helse
kimi prod            # Full pipeline: ci → db → monitor → deploy → monitor
kimi architect       # Aktiver lead architect agent
kimi prod:preview    # Full pipeline til preview

# Auto-Maintenance v2.8 (NYTT)
kimi depcheck        # node scripts/dependency-report.mjs
kimi coverage        # node scripts/coverage-report.mjs
kimi refactor:client # node scripts/client-component-refactor.mjs --dry-run
```

### Lead Architect Agent (Anbefalt for alle større oppgaver)
```bash
# Aktiver lead architect agent — denne har full kontekst på Klarpakke
kimi --agent-file .kimi/agents/klarpakke-architect-agent.yaml

# Eller bruk alias
kimi architect       # Ekvivalent: kimi --agent-file .kimi/agents/klarpakke-architect-agent.yaml
```

### Auth Agent (Eksplisitt aktivering)
```bash
# Aktiver auth-spesialisert agent manuelt
kimi --agent-file .kimi/agents/auth-agent.yaml

# Eller bruk alias (hvis konfigurert i .kimi/commands.json)
kimi auth            # Ekvivalent: kimi --agent-file .kimi/agents/auth-agent.yaml
```

---

## 🧠 KIMI Smart Orchestrator v2.0 (NYTT — 2026-05-04)

> Komplett session-orkestrering: pre-session kontekst, auto-agent/MCP-valg,
> master system prompt injection, self-correction, og post-session analyse.

### Arkitektur
```
┌─────────────────────────────────────────────────────────────────────┐
│                         KIMI SESSION LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PRE-SESSION (kimi-smart-launch)                                    │
│    ├── MemPalace: search + recent_context + kg_query                │
│    ├── Git: branch, commits, modified files                         │
│    ├── Klassifiser: 10 domener → riktig agent                       │
│    ├── Velg: MCP-profil (minimal/medium/full)                       │
│    └── Generer: paste-ready brief + session context                 │
│                                                                      │
│  DURING SESSION (KIMI-MASTER-SYSTEM.md injected)                    │
│    ├── MANDATORY: MemPalace search før hver oppgave                 │
│    ├── MANDATORY: Self-correction etter >30 linjer                  │
│    ├── MANDATORY: Swarm review etter >5 filer                       │
│    └── MANDATORY: Memory sync (kg_batch + write_diary)              │
│                                                                      │
│  POST-SESSION (SessionEnd hook v2.0)                                │
│    ├── MemPalace flush                                              │
│    ├── Self-improve analyse (diary, GO-rate, patterns)              │
│    ├── Git-diff → verify-anbefalinger                               │
│    └── Session-summary til .kimi/session-summaries/                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Installasjon (én gang)
```bash
node scripts/install-kimi-orchestrator.mjs
source ~/.zshrc
```
Installerer:
- `~/.kimi/bin/kimi-smart` — interaktiv orchestrator
- `~/.kimi/bin/kimi-smart-brief` — genererer markdown-brief
- `~/.kimi/bin/kimi-smart-launch` — **komplett session wrapper**
- `~/.kimi/bin/kimi-self-improve` — post-økt analyse
- Aliaser: `kimis`, `kimib`, `kimil`, `kimi-self`, `kimi-super`

### `kimi-smart-launch` — Komplett Session Wrapper ⭐
```bash
# Generer brief + kontekst (manuell paste inn i KIMI)
kimil "fiks auth login session timeout"

# Auto-detect fra git + start KIMI med riktig agent
kimil --launch

# Force super-agent (master system prompt)
kimil --super --launch
```

**Output:**
- Domain detection (confidence score)
- Anbefalt agent + MCP-profil
- Git-kontekst (branch, commits, modified files)
- MemPalace brief med kontekst
- Session context lagret til `.kimi/session-summaries/current-session-context.md`

### `kimi-super` — Super-Agent med Full Smart-Launch ⭐
```bash
# Start KIMI med super-agent + pre-session kontekst + post-session analyse
kimi-super
# Ekvivalent: kimi-smart-launch --super --launch
# Inkluderer: MemPalace search → git-kontekst → agent-launch → self-improve
```

**Prefer `kimi-super` over raw `kimi --agent-file`** — den gir deg:
- Pre-session MemPalace brief med kontekst
- Git-kontekst (branch, commits, modified files)
- Auto-detect domain + MCP profile
- Post-session self-improve + verify-anbefalinger

Super-agenten laster **KIMI-MASTER-SYSTEM.md** som inneholder:
- **MANDATORY pre-task protocol:** MemPalace search + recent_context + kg_query
- **MANDATORY self-correction:** Pause og verifiser etter >30 linjer
- **MANDATORY memory sync:** kg_batch + write_diary + auto_tag etter hver oppgave
- **MANDATORY status block:** GO/NO-GO/WIP med filer, validering, neste steg
- **MCP profile auto-selection:** Anbefaler riktig profil for oppgaven
- **Agent classification reference:** 10 domener med nøkkelord

### `kimi-smart-brief` — Pre-start Brief
```bash
# Generer paste-ready brief
kimib "implementer mean reversion strategy"

# Lim inn i KIMI for optimal kontekst
```

**Klassifiserer 10 domener:**
| Agent | Domene-nøkkelord | MCP |
|---|---|---|
| 🔐 Auth & Security | auth, login, oauth, session, jwt, permission | medium |
| 📈 Trading Engine | trading, strategy, bot, order, position, pnl | full |
| 🗄️ Database | migration, sql, supabase, postgres, trigger, rls | full |
| 🎨 Frontend | ui, component, react, tailwind, dashboard | minimal |
| 🔌 API | endpoint, route, handler, middleware, webhook | medium |
| 🚀 Deploy | vercel, ci, build, env, secret, domain | medium |
| 🧪 Testing | test, e2e, vitest, playwright, coverage | medium |
| 📝 Sanity CMS | sanity, schema, groq, studio, content | medium |
| 📱 Mobile | pwa, responsive, lighthouse, viewport | medium |
| 🤖 General (Super) | refactor, fix, bug, optimize, improve | auto |

### `kimi-self-improve` — Post-økt Analyse
```bash
kimi-self  # Analyserer diary.jsonl, gir anbefalinger
```
Analyserer:
- NO-GO mønstre → identifiserer gjentakende feil
- Gjentatte oppgaver → foreslår automatisering
- Agent-effektivitet → GO-rate og gjennomsnittsrating
- Lavt ratede økter → foreslår oppgave-brytning

### SessionEnd Hook v2.0
Konfigurert i `~/.kimi/config.toml`:
```toml
[[hooks]]
event = "SessionEnd"
command = "/Users/taj/.kimi/hooks/mempalace-smart-exit.sh"
```

Hooken kjører automatisk ved SessionEnd:
1. MemPalace flush
2. Self-improve analyse
3. Git-diff → verify-anbefalinger
4. Session-summary

### Alle agenter er oppgradert
Hver agent `.md` fil har nå en **MASTER SYSTEM header** som påminner om:
- Pre-task MemPalace-protokoll
- Self-correction etter >30 linjer
- Memory sync etter hver oppgave
- Status block på slutten

### Pre-loaded Context
```bash
# Kritisk prosjektkunnskap (3k tokens)
cat .kimi/PROJECT_CONTEXT.md

# Lim inn i KIMI ved session-start, eller referer:
# @.kimi/session-summaries/current-session-context.md
```

---

## 📋 Arbeidsflyt (ALLTID)

### FØR kodeendring:
1. `git status` – clean main
2. `npm run verify` – verifiser miljø
3. Les relevante filer – forstå kontekst

### UNDER kodeendring:
1. Gjør **minimal** endring
2. Test lokalt – `npm run test:unit`
3. Verifiser – `npm run lint && npm run type-check`

### ETTER kodeendring:
1. `git add -A`
2. `git commit -m "type: beskrivelse"`
3. `git push origin main`
4. Vent på Vercel deployment (~2-3 min)
5. Verifiser i produksjon

---

## 🎯 Regler (Breaking = Production Down)

| Regel | Konsekvens |
|-------|------------|
| **YOLO-modus** | Implementer uten å spørre |
| **Minimal endring** | Kun det som må til |
| **Verifiser først** | Sjekk før endring |
| **GO/NO-GO** | Alltid tydelig status |

### OAuth Redirect URIs (Aldri bryt)
- **ALLTID** bruk `getCallbackUrl()` fra `@/lib/auth/config` for OAuth `redirectTo`
- **FORBUDT** å hardkode `/auth/callback` — kodebasen bruker `/{locale}/callback` (f.eks. `/no/callback`)
- **FORBUDT** å sende passord-reset til callback — bruk `/no/update-password`
- **ALLTID** kjør `npm run oauth:check` før push av auth-endringer
- **ALLTID** oppdater både Google Cloud Console og Supabase Auth URL Configuration når callback-endringer gjøres

### PL/pgSQL (Aldri bryt)
- **DECLARE** på toppnivå, aldri nested
- **EXCEPTION WHEN OTHERS** skal ALLTID ha `RAISE WARNING`

### Caching & ISR (Aldri bryt)
- **Landingssiden** (`src/app/[locale]/page.tsx`) skal ALLTID bruke `force-dynamic`
- **App-ruter** (dashboard, admin, trading) skal ALLTID bruke `force-dynamic`
- **Legal-sider** (vilkår, personvern, cookies) kan bruke `revalidate = 86400`
- **Hjelp / Leksjoner** kan bruke `revalidate = 3600`
- **Catch-all** (`[...slug]`) skal bruke `revalidate = 60` ( Sanity webhook invaliderer )
- **Regel:** Sider som endres oftere enn 1× i uken skal IKKE bruke ISR > 60s
- **Deploy:** GitHub Actions kaller `/api/revalidate` etter hver deploy for å invalidere cache
- **Playwright smoke-test** kjøres etter deploy for å fange fantom-feil

### Agent Tenke-Disiplin (ALLTID)
> **Mål:** Match Claude Opus 4.7 sin reasoning-dybde ved å tvinge systematisk tenking.

1. **Les før du skriver** — Bruk `ReadFile` / `Grep` for å forstå eksisterende kode FØR du foreslår endringer.
2. **Tenk steg-for-steg** — Forklar din plan i tekst før du utfører den. Identifiser risikoer og edge cases.
3. **Selv-verifisering** — Etter kodeendringer, stil deg selv:
   - *"Bryter dette noen regler i AGENTS.md?"*
   - *"Har jeg oppdatert alle kallere hvis signaturen endret seg?"*
   - *"Er denne endringen virkelig minimal?"*
4. **Post-change verify** — Ved >3 filer endret eller >50 linjer:
   ```bash
   node scripts/verify/run-all.mjs
   ```
   Hvis det feiler, fiks FØR du rapporterer GO.
5. **Kontekst-bevissthet** — Vi har 262k tokens (ikke 1M som Opus). Vær selektiv:
   - Bruk `Grep` før `ReadFile` for å finne riktige filer.
   - Bruk MemPalace `search()` før du drar inn store dokumenter.
   - Unngå å lese hele filer hvis du kun trenger 20 linjer (bruk `line_offset` + `n_lines`).

---

## 🛠️ MemPalace (Minne-System)

> **Status:** v3.3.0 — SUPERKIMI: TF-IDF + Bigram + Cross-lingual + File watcher + Index persistens

> ⚠️ **NEVER use `mempalace mine` (Python CLI)** — it segfaults on Python 3.13/macOS due to ChromaDB Rust backend bug. Use the Node.js MCP server only. See `.knowledge/errors/mempalace-chromadb-segfault.md`.

### Kommandoer
```bash
# Søk i kunnskap
./scripts/knowledge-search.sh "auth pattern"
./scripts/knowledge-search.sh "trading" error_patterns

# Diary
./scripts/mempalace-diary.sh write FEAT "ny feature" GO "★★★" 5
./scripts/mempalace-diary.sh read 10

# Seed kunnskap
./scripts/mempalace-seed.sh
```

### Rom-Struktur
| Rom | Innhold | Prioritet |
|-----|---------|-----------|
| `critical_decisions` | ADR-er, arkitektur | 🔴 High |
| `error_patterns` | Feil + løsninger | 🔴 High |
| `tech_debt` | TYPE_DEBT | 🟡 Medium |
| `api_contracts` | API-dokumentasjon | 🟡 Medium |
| `project_status` | Statusrapporter | 🟢 Standard |
| `kimi_sessions` | Diary entries | 🟢 Standard |

---

## 👥 Swarm & Agenter

### Swarm Config
```yaml
# .kimi/swarm-config.json
coordinator: kimi
agents:
  - analyzer:     # Pre-task AST analysis
  - architect:    # On-decision ADR compliance
  - tester:       # Post-implementation
  - security:     # On-security-path
  - knowledge:    # Post-task MemPalace sync
```

### Agent Roster (50+ agenter)
Se `.agent/KLARPAKKE-AGENT-ROSTER.md` for full oversikt.

**Nøkkel-agenter:**
- `klarpakke-ux-ui-agent` – UI/UX, tokens, i18n
- `klarpakke-live-trading-trades-agent` – Trading, bevis
- `klarpakke-research-agent` – Systematisk Perplexity Pro research før beslutninger
- `klarpakke-auto-trade-strategy-research-agent` – Strategi-forskning
- `performance-agent` – Lighthouse, bundle, TTFB, Server Components
- `testing-agent` – Testdekning, Vitest, Playwright, mutation testing
- `security-agent` – RLS, npm audit, auth-hardening, secrets

### Skills Auto-Aktivering
Konfigurasjon: `.kimi/skills-activation.yaml`

| Arbeider med | Auto-skills |
|--------------|-------------|
| `src/app/api/**/*.ts` | api-patterns, security-testing |
| `src/components/**/*.tsx` | frontend-design, nextjs-react-expert |
| `supabase/migrations/*.sql` | database-design |
| `e2e/**/*.spec.ts` | webapp-testing, testing-patterns |
| `src/app/**/page.tsx` | performance-profiling, seo-fundamentals |
| `**/*.test.ts` | testing-patterns, tdd-workflow |

---

## 🔧 Templates

### Feature
```bash
kimi feature "implementer X"
```
Se `.kimi/templates/feature.md`

### Bugfix
```bash
kimi fix "fiks Y"
```
Se `.kimi/templates/bugfix.md`

### Refactor
```bash
kimi refactor "omstrukturer Z"
```
Se `.kimi/templates/refactor.md`

---

## 📚 Viktige Referanser

| Dokument | Beskrivelse |
|----------|-------------|
| `.cursorrules` | Tekniske regler for kode |
| `.kimi/AGENT-KLARPAKKE.md` | Detaljert KIMI-guide |
| `.agent/KLARPAKKE-AGENT-ROSTER.md` | Agent-oversikt |
| `docs/ARCHITECTURE.md` | System-arkitektur |
| `src/lib/supabase/TYPE_DEBT.md` | TypeScript gjeld |
| `docs/CRON-SOURCE-OF-TRUTH.md` | Cron-regler |

---

## 🧠 Prosjekt-Spesifikt Minne

### Kritisk Kontekst
```yaml
Cron source of truth: Supabase (ikke Vercel)
i18n: Kun no + en (th/zh avvent)
Trading: Edge Functions eller Supabase scheduler
Auth: @supabase/ssr (ikke auth-helpers-nextjs)
```

### Tekniske Detaljer
```yaml
Testing: Vitest + Playwright
Lint: ESLint 9 flat config
Types: Strict, target ES2022
Database: DECLARE på toppnivå
```

---

## 🔗 MCP Verktøy

| Verktøy | Bruk |
|---------|------|
| `mempalace_search` | Søk i lokalt minne |
| `mempalace_remember` | Lagre minne |
| `perplexity_research` | Web-research (deep) |
| `perplexity_ask` | Web-research (quick) |
| `query_database` | Supabase SQL |
| `search_docs` | Context7 docs |
| `checkSystemHealth` | System health (npm verify + memory) |
| `getUptimeStatus` | Sjekk klarpakke.no oppetid |
| `listAlerts` | GitHub bugs/issues |
| `listCronJobs` | pg_cron job management |
| `toggleCronJob` | Slå av/på cron jobs |
| `listFlags` | Feature flags |
| `searchTrades` | Søk i trades |
| `searchUsers` | Søk i brukere |
| `getVercelCost` | Vercel usage/estimat |
| `ai_health_report` | Ukentlig AI-helserapport |

---

## 🤖 Agent Collaboration (KIMI + Gemini/Antigravity)

### Hurtigstart

```bash
# 1. Setup (én gang)
npm run agent:setup
source ~/.zshrc

# 2. Planlegg med Gemini
npm run ask:gemini "Implementer mean reversion trading strategy"
# eller: agent-plan "din oppgave"

# 3. KIMI utfører
npm run tell:kimi TASK-20240411-143022-A1B2.md
# eller: agent-exec TASK-XXXX.md

# 4. Sjekk status
npm run agent:status
```

### Samarbeidsflyt

```
Gemini/Antigravity (Plan) → MemPalace (Hub) → KIMI (Execute) → Swarm (QA)
         ▲                                                            │
         └──────────────────── Handoff ←───────────────────────────────┘
```

### Nøkkelkommandoer

| Kommando | Beskrivelse |
|----------|-------------|
| `npm run agent:plan "..."` | Send til Gemini for planlegging |
| `npm run agent:exec <file>` | KIMI utfører plan |
| `npm run agent:swarm "filer"` | Kjør QA på filer |
| `npm run agent:handoff <fra> <til>` | Overlevering |
| `npm run agent:status` | Vis systemstatus |

### Dokumentasjon

- **Full guide:** `AGENT_COLLABORATION_GUIDE.md`
- **Swarm system:** `SWARM-GUIDE.md`
- **Antigravity:** `docs/antigravity.md`

---

**Sist oppdatert:** 2026-05-06  
**Versjon:** 2.8 (+Auto-Maintenance & Quality Gates: dependency-check.yml, coverage-report, client-component refactor, ai-health-report v1.1)

---

## ⚡ KIMI CLI v1.42.0 Optimaliseringer (2026-05-12)

### Kontekst-tuning
```toml
max_steps_per_turn = 1000             # v1.40.0: 500→1000
max_retries_per_step = 5              # økt fra 3 → mer robusthet
max_ralph_iterations = 2              # NY — aktiverer self-improvement loop
reserved_context_size = 40000         # ned fra 45000 → +5k arbeidsminne
compaction_trigger_ratio = 0.94       # opp fra 0.92 → enda mindre komprimering
agent_task_timeout_s = 1800           # 30 min for lange oppgaver
tool_call_timeout_ms = 120000         # 2 min — raskere fail
merge_all_available_skills = true     # auto-aktiver skills
```

### Ralph Loop (Self-Improvement)
> `max_ralph_iterations = 2` aktiverer KIMI CLI sin innebygde forbedrings-loop.
> Modellen itererer på samme oppgave og forbedrer svaret til den outputter `<choice>STOP</choice>`
> eller når iterasjonsgrensen nås. Tilsvarende Claude Code's `/ultrareview`.
>
> **Merk:** Øker latency med ~20-40%, men forbedrer kvaliteten på komplekse oppgaver betydelig.

### MemPalace v3.3.0 — SUPERKIMI Optimalisert
- **TF-IDF scoring:** Sjeldne tokens vektes høyere enn vanlige
- **Bigram index:** "KIMI CLI" scorer høyere enn "KIMI" + "CLI" separat
- **Cross-lingual:** 115 norsk↔engelsk mappings (søk på "optimalisering" finner "optimize")
- **Stemming:** enkle norske/engelske regler (optimalisering → optimal)
- **Index persistens:** <100ms oppstart fra `.mempalace/index-cache-v3.json`
- **File watcher:** fs.watch for inkrementell reindex ved runtime-endringer
- **Forbedret auto_tag:** semantiske tags fra KG + expansions, ikke bare filnavn
- **SUPERKIMI prompt:** `superkimi_boost` — aktiverer maksimal kontekst + tenke-disiplin

### MemPalace v3.1.1 — Aktiv bruk
- **FØR oppgave:** `search()` + `recent_context(hours=48)` + `kg_query(entity=..., depth=2)`
- **ETTER oppgave:** `kg_add()` / `kg_batch()` + `write_diary()` + `auto_tag()`
- **Exit-hook:** `~/.kimi/hooks/mempalace-exit-save.sh` lagrer samtale ved avslutning
- **MCP-profiler:** `kimi-mcp minimal|medium|full` — bytt etter behov

### Rask diagnose
```bash
kimi --version                    # skal vise 1.42.0
kimi mcp list                     # sjekk at mempalace er grønn
npm run mempalace:status          # eller: node scripts/mempalace-search.mjs "test"
```
