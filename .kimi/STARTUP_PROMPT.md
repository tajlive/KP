# 🚀 KIMI STARTUP PROMPT - Klarpakke Optimalisering

> **Les dette ved HVER KIMI oppstart for maksimal ytelse**

---

## 📋 AUTO-EXECUTE VED OPPSTART

```bash
# 1. Kjør pre-task hook for kontekst
.kimi/hooks/pre-task.sh

# 2. Hent predikert kontekst  
CONTEXT=$(.kimi/context-predictor.sh --json)

# 3. Les siste diary entries
DIARY=$(./scripts/mempalace-diary.sh read 3)

# 4. Sjekk skills for aktivt domene
DOMAIN=$(echo $CONTEXT | grep -o '"domain": "[^"]*"' | cut -d'"' -f4)
```

---

## 🧠 MEMPALACE WAKE-UP SEQUENCE

### Steg 1: Critical Knowledge (ALLTID last)
```
ROM: critical_decisions
├── docs/adr/ - Arkitektur-beslutninger
├── Cron source of truth: Supabase
├── i18n: Kun no + en (th/zh avvent)
├── Auth: @supabase/ssr (ikke auth-helpers-nextjs)
└── PL/pgSQL: DECLARE på toppnivå

ROM: error_patterns  
├── Auth-loop fix: cookieEncoding=raw
├── TypeScript strict: target ES2022
└── Trading: Edge Functions/Supabase scheduler
```

### Steg 2: Project Context
```
KLARPAKKE CONTEXT:
├── Status: Production (www.klarpakke.no)
├── Stack: Next.js 15, React 19, TypeScript 5.9, Supabase
├── Node: 24.x
├── Database: PostgreSQL + RLS på 8 tabeller
├── Testing: Vitest + Playwright
└── Lint: ESLint 9 flat config (--max-warnings 0)
```

### Steg 3: Active Skills (Auto-aktiver)
```yaml
# Fra .kimi/skills-activation.yaml
IF auth-path:      vulnerability-scanner, api-patterns/security-testing
IF trading-path:   crypto-specialist, api-patterns
IF api-path:       api-patterns, rate-limiting
IF ui-path:        frontend-design, nextjs-react-expert
IF test-path:      testing-patterns, tdd-workflow
IF db-path:        database-design, migrations
```

---

## ⚡ OPTIMALISERT ARBEIDSMODUS

### YOLO + Verifiser (Standard)
```
✅ YOLO-modus: Implementer uten å spørre
✅ Minimal endring: Kun det som må til
✅ Verifiser først: Sjekk før endring
✅ GO/NO-GO: Alltid tydelig status
```

### Pre-Code Checklist
```
[ ] git status - clean?
[ ] npm run verify - miljø OK?
[ ] Les relevant AGENTS.md seksjon
[ ] Sjekk .kimi/skills-quickref.md
[ ] Aktiver domain-spesifikke skills
```

### Post-Code Checklist
```
[ ] npm run lint && npm run type-check
[ ] npm run test:unit (hvis relevant)
[ ] ./scripts/mempalace-diary.sh write
[ ] git add -A && git commit -m "type: desc"
[ ] git push origin main
```

---

## 🎯 MEMPALACE BRUKSPATTERN

### Pattern 1: Søk Først
```bash
# ALLTID søk før du spør
./scripts/knowledge-search.sh "<ditt emne>"

# Hvis ikke funnet → Perplexity → Lagre
```

### Pattern 2: Rom-basert Kontekst
```bash
# Hent rom ved oppstart
./scripts/knowledge-search.sh "." critical_decisions  # ADR-er
./scripts/knowledge-search.sh "." error_patterns     # Feil/løsninger
./scripts/knowledge-search.sh "." tech_debt          # TYPE_DEBT
```

### Pattern 3: Diary kontinuitet
```bash
# Ved OPPSTART - les siste
./scripts/mempalace-diary.sh read 5

# Ved SLUTT - logg
./scripts/mempalace-diary.sh write <TYPE> "<beskrivelse>" <STATUS> <RATING> <FILES>
```

---

## 🔧 KIMI SUPERKRAFTER (Aktiver)

### 1. Smarte Aliaser
```bash
kimi health          → npm run health:prod:gate
kimi verify          → npm run verify  
kimi dev             → npm run dev
kimi build           → npm run build
kimi lint            → npm run lint
kimi typecheck       → npm run type-check
kimi test            → npm run test:unit
kimi test:e2e        → npm run test:e2e:critical:chromium
kimi db:status       → npm run db:status
kimi db:push         → npm run db:push
kimi db:gen          → npm run db:gen-types
kimi deploy          → npm run deploy:prod
```

### 2. Template Kommandoer
```bash
# Feature
kimi feature "<beskrivelse>"
→ Oppretter branch, implementerer, tester, committer

# Fix
kimi fix "<bug>"
→ Finner rotårsak, fikser, verifiserer

# Refactor
kimi refactor "<område>"
→ Analyserer, refaktorerer, tester
```

### 3. Context-Injection
```
Før hver oppgave, injiser:
---
Kontekst fra forrige sesjon:
{{ diary_last_3_entries }}

Relevant kunnskap:
{{ knowledge_search(query=task, limit=3) }}

Aktive skills:
{{ predicted_skills }}
---
```

---

## 📚 MINNE-HIERARKI (Prioritet)

### Level 0: Kritisk (Alltid tilgjengelig)
- `.cursorrules`
- `AGENTS.md`
- `mempalace.yaml`
- `package.json` scripts

### Level 1: Prosjekt-kontekst (MemPalace ROM)
- `critical_decisions` - ADR-er
- `error_patterns` - Feil/løsninger
- `tech_debt` - TYPE_DEBT
- `auth_system` - Auth mønstre

### Level 2: Task-spesifikk (On-demand)
- `api_contracts` - API docs
- `project_status` - Rapporter
- `kimi_sessions` - Diary

### Level 3: Ekstern (Perplexity)
- Web-research
- Dokumentasjon (Context7)
- Best practices

---

## 🎓 PL/pgSQL REGLER (Aldri Bryt)

```sql
-- ✅ RIKTIG: DECLARE på toppnivå
CREATE FUNCTION example() RETURNS void AS $$
DECLARE
  v_x TEXT;  -- Alltid på toppen
BEGIN
  BEGIN
    -- kode
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Feil: %', SQLERRM;  -- ALLTID med SQLERRM
  END;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚨 KOMPETANSEOMRÅDER (Auto-detect)

### Hvis auth/ i path:
→ Skills: vulnerability-scanner, security-testing
→ Rom: auth_system, error_patterns
→ Sjekk: AUTH-ISSUE-DIAGNOSIS-*.md

### Hvis trading/ i path:
→ Skills: crypto-specialist, api-patterns
→ Rom: critical_decisions, api_contracts
→ Sjekk: RLS på trading tabeller

### Hvis api/ i path:
→ Skills: api-patterns, rate-limiting
→ Rom: api_contracts
→ Sjekk: docs/api-routes.md

### Hvis components/ i path:
→ Skills: frontend-design, nextjs-react-expert
→ Rom: project_status
→ Sjekk: design tokens

### Hvis migrations/ i path:
→ Skills: database-design
→ Rom: critical_decisions
→ Sjekk: TYPE_DEBT.md

---

## 📝 OUTPUT FORMAT (ALLTID)

```
## GO/NO-GO: [GO/NO-GO]

### Implementasjon
[Hva ble gjort, 2-3 setninger]

### Tester
- [x] Unit: [status]
- [x] Lint: [status]
- [x] Type-check: [status]

### Breaking Changes
[Ja/Nei - hvis ja, beskriv]

### MemPalace Updates
- [x] Diary logget
- [x] Patterns notert (hvis relevant)
```

---

## 🔄 AUTO-SEQUENS VED OPPSTART

```bash
#!/bin/bash
# .kimi/autostart.sh

echo "🚀 KIMI Autostart Sequence"
echo "=========================="

# 1. Kontekst
.kimi/hooks/pre-task.sh

# 2. MemPalace wake-up
echo "🏛️ Waking up MemPalace..."
./scripts/knowledge-search.sh "." critical_decisions 2>/dev/null | head -5

# 3. Skills
echo "🛠️ Detecting skills..."
DOMAIN=$(.kimi/context-predictor.sh --json 2>/dev/null | grep -o '"domain": "[^"]*"' | cut -d'"' -f4)
echo "Domain: $DOMAIN"
cat .kimi/skills-quickref.md | grep "$DOMAIN" || echo "General skills active"

# 4. Diary
echo "📖 Recent activity:"
./scripts/mempalace-diary.sh read 3 2>/dev/null || echo "No entries yet"

echo ""
echo "✅ KIMI Ready for optimal performance!"
echo "=========================="
```

---

## 🎯 HUSK

> **"GitHub er sannheten, Vercel er speilet, KIMI er rådgiveren, MemPalace er hukommelsen"**

1. ✍️ **Rediger i GitHub** → Push → Vercel bygger
2. 🤖 **KIMI leser** via MCP + MemPalace
3. 🏛️ **MemPalace logger** patterns, decisions, errors
4. 🔄 **Neste sesjon** - KIMI husker via diary + knowledge

---

**Kjør ved hver oppstart:** `cat .kimi/STARTUP_PROMPT.md && .kimi/autostart.sh`

**Sist oppdatert:** 2026-04-09  
**Versjon:** 1.0 - Full MemPalace Integrasjon
