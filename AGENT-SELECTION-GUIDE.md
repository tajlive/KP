# 🎯 Agent Selection Guide - Hvilken Agent Når?

## Quick Reference

```bash
# Raskt valg
~/.kimi/agent-selector.sh "din oppgave her"

# Eksempler
agent-selector "fix auth bug"           # → Security + Trading
agent-selector "new trading feature"    # → Trading
agent-selector "redesign dashboard"     # → UX/UI
agent-selector "optimize strategy"      # → Strategy Research
```

## Agent-Matrise

| Oppgave-type | Primær Agent | Sekundær Agent | Prioritet |
|--------------|--------------|----------------|-----------|
| **Auth/Security** | `live-trading-trades` | `security-auditor` | P0 |
| **Trading (live/paper)** | `live-trading-trades` | - | P0 |
| **Execution/Risk** | `live-trading-trades` | - | P0 |
| **Strategi/Backtest** | `auto-trade-strategy-research` | - | P1 |
| **UI/UX/Komponenter** | `ux-ui-agent` | - | P1 |
| **Tilgjengelighet** | `accessibility-lead` | - | P1 |
| **Brukerflyt/IA** | `experience-architect` | - | P1 |
| **Refactor/Modernisering** | `modernization-lead` | `performance-optimizer` | P2 |
| **CI/Automatisering** | `automation-orchestrator` | - | P2 |
| **Database/Supabase** | `database-architect` | `live-trading-trades`* | P1 |
| **Testing** | `qa-automation-engineer` | - | P1 |
| **DevOps/Deploy** | `devops-engineer` | - | P2 |
| **Dokumentasjon** | `documentation-writer` | - | P2 |
| **Utforskning** | `explorer-agent` | - | P2 |

*Hvis trading-relatert

## Hvor Mange Agenter?

### Solo (1 agent)
**Når:** Standard UI-oppgaver, små fixes  
**Eksempel:** "Oppdater farge på knapp" → `ux-ui-agent`

### Duo (2 agenter)
**Når:** Kritisk funksjonalitet eller komplekse endringer  
**Eksempler:**
- Auth-fix: `live-trading-trades` + `security-auditor`
- Trading-UI: `live-trading-trades` + `ux-ui-agent`
- Database: `database-architect` + `live-trading-trades`

### Trio (3 agenter)
**Når:** Store features på tvers av domener  
**Eksempel:** "Ny trading-strategi med dashboard"
- `auto-trade-strategy-research` (strategi)
- `live-trading-trades` (execution)
- `ux-ui-agent` (dashboard UI)

### Swarm (4+ agenter)
**Når:** System-endringer eller høyest kvalitet kreves  
**Bruk:** `npm run swarm:feature <filer>`

## Beslutningstre

```
Er det security/auth/rls?
├── JA → live-trading-trades + security-auditor (P0)
│
Er det trading/live/paper/execution?
├── JA → live-trading-trades (P0)
│
Er det strategi/backtest/preset?
├── JA → auto-trade-strategy-research (P1)
│
Er det UI/design/komponent?
├── JA → ux-ui-agent (P1)
│
Er det tilgjengelighet/WCAG?
├── JA → accessibility-lead (P1)
│
Er det brukerflyt/navigasjon?
├── JA → experience-architect (P1)
│
Er det database/migrasjon?
├── Trading-relatert?
│   ├── JA → database-architect + live-trading-trades (P1)
│   └── NEI → database-architect (P1)
│
Er det test/e2e/coverage?
├── JA → qa-automation-engineer (P1)
│
Er det CI/automatisering/MCP?
├── JA → automation-orchestrator (P2)
│
Er det modernisering/refactor?
├── JA → modernization-lead + performance-optimizer (P2)
│
Fallback: ux-ui-agent (P2)
```

## Praktiske Eksempler

### Auth Callback Bug
```bash
# Feil: PKCE code verifier not found
agent-selector "fix pkce cookie bug in auth callback"

# Resultat:
# 🎯 live-trading-trades-agent + security-auditor
# 💡 Security-kritisk + operasjonelt ansvar for auth
# ⚡ P0 - Umiddelbar handling

# Workflow:
# 1. Sjekk RLS: npm run db:check-rls
# 2. Verifiser fix: npm run swarm:security src/app/auth/callback.ts
# 3. Logg til: .knowledge/errors/2026-04-08-auth-pkce.md
```

### Ny Trading-Strategi
```bash
agent-selector "implement mean reversion strategy with backtest"

# Resultat:
# 🎯 auto-trade-strategy-research-agent
# 💡 Strategi-forskning krever research + forum-data
# ⚡ P1 - Normal prioritet

# Workflow:
# 1. Les SoT: docs/trading/AUTO-TRADE-STRATEGY-RESEARCH.md
# 2. Sjekk presets: src/lib/auto-trading/presets/
# 3. Dokumenter beslutning: .knowledge/decisions/
```

### Dashboard Redesign
```bash
agent-selector "redesign trading dashboard with dark mode"

# Resultat:
# 🎯 ux-ui-agent
# 💡 UI/UX standard inngang
# ⚡ P1 - Normal prioritet

# Workflow:
# 1. Design audit: .agent/workflows/premium-design-audit.md
# 2. WCAG sjekk: npm run a11y:audit
# 3. Tokens: src/styles/tokens/
```

### Database Migrasjon
```bash
agent-selector "migrate trades table to new schema"

# Resultat:
# 🎯 database-architect + live-trading-trades-agent
# 💡 Trading-data krever operasjonelt ansvar
# ⚡ P1 - Normal prioritet (men trading = P0 hvis live)

# Workflow:
# 1. Sjekk migrasjoner: supabase/migrations/
# 2. Trading impact: docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md
# 3. Swarm: npm run swarm:feature supabase/migrations/*.sql
```

## Kombinasjons-Mønstre

### Pattern 1: Security + Trading
**Når:** Auth i trading-kontekst  
**Agenter:** `live-trading-trades` + `security-auditor`  
**Sekvens:**
1. Security audit først
2. Trading integrity sjekk
3. Felles review

### Pattern 2: Strategy + Trading
**Når:** Ny strategi påvirker execution  
**Agenter:** `auto-trade-strategy-research` + `live-trading-trades`  
**Sekvens:**
1. Strategy research (hypoteser)
2. Trading review (risiko)
3. Backtesting + live verification

### Pattern 3: UX + Accessibility + Performance
**Når:** Stor UI-endring  
**Agenter:** `ux-ui-agent` + `accessibility-lead` + `performance-optimizer`  
**Sekvens:**
1. Design (ux-ui)
2. WCAG sjekk (accessibility)
3. Bundle/Lighthouse (performance)

### Pattern 4: Full Swarm
**Når:** System-arkitektur endring  
**Agenter:** Alle 4 swarm-agenter  
**Sekvens:**
```
Analyzer → Architect → Tester → Knowledge
```

## Antall Agenter etter Kompleksitet

| Endrings-størrelse | Agenter | Eksempel |
|-------------------|---------|----------|
| < 50 linjer | 1 | Bug fix, tekst-endring |
| 50-200 linjer | 1-2 | Ny komponent, liten feature |
| 200-500 linjer | 2-3 | Ny side, trading feature |
| > 500 linjer | 3-4+ | System-endring, refaktor |

## Konfigurasjon

### Legg til i .zshrc
```bash
# Agent selector alias
alias agent='~/.kimi/agent-selector.sh'

# Quick agents
alias agent-trading='echo "klarpakke-live-trading-trades-agent"'
alias agent-strategy='echo "klarpakke-auto-trade-strategy-research-agent"'
alias agent-ui='echo "klarpakke-ux-ui-agent"'
```

### Bruk i KIMI
```bash
# Start KIMI med agent-kontekst
AGENT=$(agent "fix auth bug" | grep "ANBEFALT:" | cut -d: -f2)
kimi -p "Du er $AGENT. Hjelp meg med..."
```

## Oppsummering

| Spørsmål | Svar |
|----------|------|
| **Standard valg?** | `ux-ui-agent` |
| **Trading?** | `live-trading-trades` |
| **Strategi?** | `auto-trade-strategy-research` |
| **Security?** | `live-trading-trades` + `security-auditor` |
| **Max agenter?** | 4 (swarm mode) |
| **Min agenter?** | 1 (solo mode) |
| **Raskt valg?** | `agent-selector "oppgave"` |

---

**Husk:** Trading alltid P0. Security alltid P0. Resten P1-P2.
