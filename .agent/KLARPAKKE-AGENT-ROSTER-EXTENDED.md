# Klarpakke — Agent Roster (Extended)

Full oversikt over **18 spesialiserte agenter** for Klarpakke.

## 🎯 Core Agenter (Eksisterende)

| # | Agent | Bruk | Priority |
|---|-------|------|----------|
| 1 | **UX UI Agent** | UI/UX, tokens, komponenter | P1 |
| 2 | **Experience Architect** | IA, brukerflyt, premium helhet | P1 |
| 3 | **Accessibility Lead** | WCAG 2.1 AA, tastatur, skjermleser | P1 |
| 4 | **Modernization Lead** | Stack, TYPE_DEBT, refaktor | P2 |
| 5 | **Automation Orchestrator** | CI, MCP, Linear | P2 |
| 6 | **Live Trading & Trades** | Trading, RLS, execution | **P0** |
| 7 | **Auto-Trade Strategy** | Strategier, backtesting | P1 |

## 🆕 NEW: Spesialiserte Agenter

| # | Agent | Bruk | Priority |
|---|-------|------|----------|
| 8 | **Observability Engineer** | Logging, metrics, Sentry, tracing | P1 |
| 9 | **i18n Auditor** | Språk-paritet, oversettelser | P1 |
| 10 | **Microcopy Strategist** | Button text, errors, empty states | P1 |
| 11 | **Data Pipeline Engineer** | ETL, streaming, analytics | P1 |
| 12 | **Compliance Officer** | KYC/AML, GDPR, regulering | **P0** |
| 13 | **API Designer** | REST, typesafe, dokumentasjon | P1 |
| 14 | **Release Train Conductor** | Releases, rollback, koordinering | P2 |

## 🔧 Support Agenter (Eksisterende)

| # | Agent | Bruk |
|---|-------|------|
| 15 | automation-expert | Cron, webhooks |
| 16 | devops-engineer | Deploy, secrets |
| 17 | qa-automation-engineer | Testing |
| 18 | security-auditor | Sikkerhet |

## Agent-Map

```
┌─────────────────────────────────────────────────────────────┐
│                        USER FACING                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   UX/UI     │  │   i18n      │  │ Microcopy   │         │
│  │   Agent     │  │   Auditor   │  │ Strategist  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Experience │  │   API       │  │   Moderniz. │         │
│  │  Architect  │  │  Designer   │  │    Lead     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                      BUSINESS LOGIC                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Trading   │  │  Strategy   │  │  Compliance │         │
│  │   (Live)    │  │  Research   │  │   Officer   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                        PLATFORM                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Data     │  │Observability│  │  Release    │         │
│  │   Pipeline  │  │  Engineer   │  │   Train     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   DevOps    │  │     QA      │  │  Security   │         │
│  │  Engineer   │  │ Automation  │  │   Auditor   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Velge Agent - Quick Guide

### Trading & Finans
```
Trading-kode? → Live Trading & Trades (P0)
Strategi?     → Auto-Trade Strategy Research (P1)
Compliance?   → Compliance Officer (P0)
Tax/Reports?  → Compliance Officer (P0)
```

### Brukeropplevelse
```
UI komponenter?  → UX UI Agent (P1)
Flyt/Navigasjon? → Experience Architect (P1)
Tilgjengelighet? → Accessibility Lead (P1)
Tekster/Microcopy? → Microcopy Strategist (P1)
Oversettelser?   → i18n Auditor (P1)
```

### Teknisk
```
API endepunkt?   → API Designer (P1)
Database?        → Database Architect (+ Trading hvis relevant)
Observability?   → Observability Engineer (P1)
Data pipelines?  → Data Pipeline Engineer (P1)
Refactor?        → Modernization Lead (P2)
```

### Operasjonelt
```
Release?         → Release Train Conductor (P2)
CI/CD?           → Automation Orchestrator (P2)
Security audit?  → Security Auditor (P0)
Test strategi?   → QA Automation Engineer (P1)
```

## Kombinasjons-Mønstre

### Trading Feature (4 agenter)
```
Live Trading + Strategy Research + UX/UI + Compliance
```

### Major Release (6 agenter)
```
Release Train + QA + DevOps + Observability + Security + Trading
```

### International Launch (5 agenter)
```
i18n Auditor + Microcopy + UX/UI + Compliance + Experience Architect
```

## Agent-Induksjon

Nye agenter følger denne prosessen:
1. Opprett agent-fil: `.agent/agents/<navn>.md`
2. Lag Cursor-regel: `.cursor/rules/<navn>.mdc`
3. Oppdater roster (denne filen)
4. Test med 3 oppgaver
5. Dokumenter i `docs/agents/`

## Roadmap

### Q2 2026
- [ ] Observability Engineer - Sentry-integrasjon
- [ ] i18n Auditor - Thai/Chinese launch prep

### Q3 2026
- [ ] Compliance Officer - KYC-automatisering
- [ ] Release Train - Full release automation

### Q4 2026
- [ ] Data Pipeline - Real-time analytics
- [ ] API Designer - v2 API redesign

---

**Total:** 18 agenter  
**P0 (Critical):** 3 agenter  
**P1 (Important):** 10 agenter  
**P2 (Standard):** 5 agenter
