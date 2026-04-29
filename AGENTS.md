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

**Merk:** KIMI CLI har ikke domene-basert auto-aktivering av agenter. Auth-reglene injiseres automatisk i default-agenten via `AGENTS.md`, men for full auth-spesialisering må du eksplisitt laste `.kimi/agents/auth-agent.yaml`.

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

---

## 🛠️ MemPalace (Minne-System)

> **Status:** Raw Mode (ChromaDB workaround for M1 Mac)

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

### Skills Auto-Aktivering
Konfigurasjon: `.kimi/skills-activation.yaml`

| Arbeider med | Auto-skills |
|--------------|-------------|
| `src/app/api/**/*.ts` | api-patterns, security-testing |
| `src/components/**/*.tsx` | frontend-design, nextjs-react-expert |
| `supabase/migrations/*.sql` | database-design |
| `e2e/**/*.spec.ts` | webapp-testing, testing-patterns |

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

**Sist oppdatert:** 2026-04-28  
**Versjon:** 2.2 (+KIMI CLI v1.40.0 + MemPalace v3.1.1)

---

## ⚡ KIMI CLI v1.40.0 Optimaliseringer (2026-04-28)

### Kontekst-tuning
```toml
max_steps_per_turn = 750              # økt fra 500
reserved_context_size = 45000         # ned fra 60000 → +15k arbeidsminne
compaction_trigger_ratio = 0.92       # opp fra 0.88 → mindre komprimering
agent_task_timeout_s = 1800           # 30 min for lange oppgaver
tool_call_timeout_ms = 120000         # 2 min — raskere fail
merge_all_available_skills = true     # auto-aktiver skills
```

### MemPalace v3.1.1 — Aktiv bruk
- **FØR oppgave:** `search()` + `recent_context(hours=48)` + `kg_query(entity=..., depth=2)`
- **ETTER oppgave:** `kg_add()` / `kg_batch()` + `write_diary()` + `auto_tag()`
- **Exit-hook:** `~/.kimi/hooks/mempalace-exit-save.sh` lagrer samtale ved avslutning
- **MCP-profiler:** `kimi-mcp minimal|medium|full` — bytt etter behov

### Rask diagnose
```bash
kimi --version                    # skal vise 1.40.0
kimi mcp list                     # sjekk at mempalace er grønn
npm run mempalace:status          # eller: node scripts/mempalace-search.mjs "test"
```
