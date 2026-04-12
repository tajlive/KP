# 🤖 Agent Collaboration Guide - KIMI + MemPalace + Gemini/Antigravity

> **Komplett guide for automatisert AI-samarbeid i Klarpakke**

---

## 🎯 Oversikt

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTOMATISERT ARBEIDSFLYT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────────────────┐  │
│   │   GEMINI/    │─────▶│   MEMPALACE  │◄─────│        KIMI CLI          │  │
│   │  ANTIGRAVITY │      │  (Hub/Minne) │      │    (Execution/Deploy)    │  │
│   └──────────────┘      └──────────────┘      └──────────────────────────┘  │
│          ▲                                              │                    │
│          │                                              │                    │
│          └────────────── Håndoff ──────────────────────┘                    │
│                                                                              │
│   Flyt: Plan (Gemini) → Sync (MemPalace) → Execute (KIMI) → QA (Swarm)      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Kom i Gang (5 minutter)

### 1. Installasjon

```bash
cd ~/klarpakke

# Kjør setup-script
bash .kimi/SETUP_ANTIGRAVITY.sh

# Last aliaser
source ~/.zshrc  # eller ~/.bashrc
```

### 2. Verifiser oppsett

```bash
# Sjekk at alt er på plass
agent-status

# Forventet output:
# 🤖 Agent System Status
# 🗄️  MemPalace: 3 handoffs, 5 plans
# 📊 Siste aktivitet: ...
# 🔄 Aktive handoffs: ...
```

---

## 📋 Arbeidsflyter

### Flyt 1: Plan → Execute (Standard)

**Scenario:** Du vil implementere en ny feature

```bash
# STEG 1: Send til Gemini for planlegging
ask-gemini "Implementer mean reversion trading strategy med backtest"

# Output: Oppretter plan-fil: .mempalace/plans/TASK-20240411-143022-A1B2.md

# STEG 2: Gemini åpner plan-filen i Antigravity og fyller ut:
#   - Executive Summary
#   - Arkitektur
#   - Files to Create/Modify
#   - Implementation Steps
#   - Testing Strategy

# STEG 3: KIMI utfører planen
tell-kimi TASK-20240411-143022-A1B2.md

# KIMI gjør automatisk:
#   - Leser planen
#   - Kjører npm run verify
#   - Implementerer endringer
#   - Kjører Swarm QA
#   - Deployer til Vercel
#   - Verifiserer i produksjon
```

### Flyt 2: Bug Fix (Hurtig)

**Scenario:** Kritisk bug som må fikses raskt

```bash
# STEG 1: KIMI identifiserer og fikser
kimi --yolo "Fiks auth loop i callback route"

# STEG 2: KIMI logger til MemPalace
echo "$(date) | BUGFIX | Auth loop | Fixed" >> .mempalace/kimi_sessions/orchestrator.log

# STEG 3: Swarm QA (automatisk)
agent-swarm "src/app/auth/callback.ts"

# STEG 4: Gemini reviewer (valgfritt)
agent-handoff kimi gemini "Auth loop fix klar for review"
```

### Flyt 3: Complex Analysis → Implementation

**Scenario:** Kompleks arkitektur-endring

```bash
# STEG 1: Gemini analyserer
ask-gemini "Analyser trading execution pipeline og foreslå forbedringer"

# Gemini i Antigravity:
#   - Leser hele trading-modulen
#   - Identifiserer flaskehalser
#   - Skriver analyse-dokument

# STEG 2: Handoff til KIMI
agent-handoff gemini kimi "Trading pipeline optimalisering klar"

# STEG 3: KIMI implementerer
tell-kimi TASK-20240411-XXXX.md
```

---

## 🎮 Kommandoer

### Hovedkommandoer

| Kommando | Beskrivelse | Eksempel |
|----------|-------------|----------|
| `agent-plan` | Send oppgave til Gemini | `agent-plan "Ny dashboard feature"` |
| `agent-exec` | KIMI utfører plan | `agent-exec TASK-XXXX.md` |
| `agent-swarm` | Kjør QA på filer | `agent-swarm "src/lib/*.ts"` |
| `agent-handoff` | Overlever mellom agenter | `agent-handoff gemini kimi "Klar"` |
| `agent-status` | Vis systemstatus | `agent-status` |

### Hurtig-kommandoer

```bash
# Planlegging
ask-gemini "Din oppgave her"

# Utførelse
tell-kimi TASK-XXXX.md

# QA
check-swarm "file1.ts file2.ts"

# Status
agent-status
```

---

## 🗄️ MemPalace Integrasjon

### Automatisk Logging

Alle agent-aktiviteter logges automatisk:

```
.mempalace/
├── handoffs/           # Aktive handoffs mellom agenter
│   ├── HANDOFF-20240411-143022.md
│   └── TEMPLATE_*.md   # Maler for handoffs
├── plans/              # Planer fra Gemini
│   └── TASK-20240411-143022-A1B2.md
├── kimi_sessions/
│   └── orchestrator.log
└── SUMMARY.md          # Auto-generert oversikt
```

### Manuell Logging

```bash
# Fra KIMI - logg etter endring
echo "$(date '+%Y-%m-%d %H:%M:%S') | FEATURE | Trading-strategi | Implementert" \
  >> .mempalace/kimi_sessions/orchestrator.log

# Sync til MemPalace
mempalace-sync
```

---

## 🔄 Handoff Protokoll

### Gemini → KIMI

```bash
# 1. Gemini fullfører plan
agent-plan "Implementer X"
# (Fyller ut plan-fil i Antigravity)

# 2. Gemini markerer klar
echo "Status: ✅ READY FOR IMPLEMENTATION" >> .mempalace/plans/TASK-XXXX.md

# 3. KIMI plukker opp
tell-kimi TASK-XXXX.md
```

### KIMI → Gemini

```bash
# 1. KIMI logger problem
agent-handoff kimi gemini "Trenger analyse av kompleks bug"

# 2. Gemini leser fra MemPalace
# (Åpner handoff-fil i Antigravity)

# 3. Gemini analyserer og svarer
# (Oppdaterer handoff-fil med anbefaling)

# 4. KIMI implementerer fix
# (Basert på Gemini sin analyse)
```

---

## 🐝 Swarm QA

### Automatisk QA

Swarm kjøres automatisk etter hver `agent-exec`:

```
🔍 Swarm Agents Analysis:
═══════════════════════════════════════════════════════════════
[Analyzer]  Checking complexity...
  ✓ Complexity: 8/15 (OK)
[Architect] Checking ADR compliance...
  ✓ ADR KLA-91: Compliant
[Tester]    Checking test coverage...
  ✓ Coverage: 85% (OK)
[Knowledge] Syncing to MemPalace...
  ✓ Patterns logged
```

### Manuell QA

```bash
# Sjekk spesifikke filer
agent-swarm "src/lib/trading/strategy.ts src/app/api/trade.ts"

# Sjekk hele modul
agent-swarm "src/lib/trading/*.ts"
```

---

## 📊 Dashboard & Monitoring

### Status Check

```bash
agent-status
```

Output:
```
🤖 Agent System Status
═══════════════════════════════════════════════════════════════

🗄️  MemPalace:
   Path: /Users/taj/klarpakke/.mempalace
   Handoffs: 3 filer
   Plans: 5 filer
   Diary entries: 42

📊 Siste aktivitet:
   2024-04-11 14:30:22 | PLAN | TASK-XXXX | Trading-strategi
   2024-04-11 14:25:10 | EXECUTE | TASK-YYYY | Completed
   2024-04-11 14:20:05 | SWARM | src/lib/auth | Passed

🔄 Aktive handoffs:
   • HANDOFF-20240411-143022.md
   • HANDOFF-20240411-140015.md

🤖 Agenter:
   [GEMINI] Gemini/Antigravity - Planlegging, analyse
   [KIMI] KIMI CLI - Utførelse, deploy
   [MemPalace] Shared memory
```

---

## 🛠️ Avansert Bruk

### Custom Workflows

```bash
# Lag custom workflow
cat > .kimi/workflows/my-workflow.sh << 'EOF'
#!/bin/bash
# Min custom workflow

echo "🚀 Starter custom workflow"

# Steg 1: Plan
agent-plan "$1"

# Steg 2: Vent på Gemini (manuelt)
read -p "Trykk enter når plan er klar..."

# Steg 3: Execute
LATEST_PLAN=$(ls -t .mempalace/plans/*.md | head -1)
agent-exec "$LATEST_PLAN"

# Steg 4: Deploy
npm run deploy:prod
EOF

chmod +x .kimi/workflows/my-workflow.sh
```

### MCP Servere

Antigravity/Gemini har tilgang til:

| MCP Server | Formål |
|------------|--------|
| `filesystem` | Lese/skrive filer i repo |
| `mempalace` | Query MemPalace knowledge |
| `supabase` | Database-operasjoner |
| `github` | Repo-operasjoner |

```bash
# Config: ~/.config/antigravity/mcp_config.json
cat ~/.config/antigravity/mcp_config.json
```

---

## 🚨 Troubleshooting

### Problem: "agent-orchestrator: command not found"

```bash
# Løsning: Last aliaser på nytt
source ~/.zshrc  # eller ~/.bashrc

# Verifiser
which agent-orchestrator
```

### Problem: "MCP server not connected"

```bash
# Sjekk at tokens er satt
echo $SUPABASE_ACCESS_TOKEN
echo $GITHUB_TOKEN

# Verifiser MCP-config
cat ~/.config/antigravity/mcp_config.json
```

### Problem: "MemPalace sync feiler"

```bash
# Kjør manuell sync
mempalace-sync

# Sjekk permissions
ls -la .mempalace/
```

---

## 📚 Best Practices

### 1. Alltid logg til MemPalace

```bash
# Etter viktige endringer
echo "$(date) | DECISION | Valg X | Begrunnelse" >> .mempalace/kimi_sessions/orchestrator.log
```

### 2. Bruk Swarm for >50 linjer

```bash
# Automatisk etter agent-exec
# Eller manuelt:
agent-swarm "store-endringer.ts"
```

### 3. Handoff for komplekse oppgaver

```bash
# Ikke hold all kontekst i hodet
agent-handoff kimi gemini "Trenger analyse"
```

### 4. Verifiser før deploy

```bash
# KIMI gjør dette automatisk, men:
npm run verify
npm run test:unit
npm run build
```

---

## 🎯 Oppsummering

| Hva | Verktøy | Kommando |
|-----|---------|----------|
| **Planlegge** | Gemini/Antigravity | `ask-gemini "..."` |
| **Utføre** | KIMI CLI | `tell-kimi TASK-XXXX.md` |
| **QA** | Swarm | `check-swarm "filer"` |
| **Minne** | MemPalace | `mempalace-sync` |
| **Handoff** | Orchestrator | `agent-handoff X Y` |

**Husk:** *Gemini tenker, KIMI gjør, MemPalace husker.*

---

**Sist oppdatert:** 2024-04-11  
**Versjon:** 1.0  
**Support:** Se `AGENTS.md` og `SWARM-GUIDE.md`
