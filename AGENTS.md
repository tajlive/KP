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
kimi prod:preview    # Full pipeline til preview
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

**Sist oppdatert:** 2026-04-11  
**Versjon:** 2.1 (+Agent Collaboration)
