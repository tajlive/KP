# 🐝 Klarpakke Swarm - Multi-Agent Quality System

> **Høyeste kvalitet gjennom spesialiserte AI-agenter**

## Oversikt

Swarm Mode bruker **4 spesialiserte agenter** som hver analyserer kodeendringer fra sitt perspektiv:

| Agent | Rolle | Når | Fokus |
|-------|-------|-----|-------|
| 🔍 **Analyzer** | Kodekvalitet | Først | Kompleksitet, duplisering |
| 🏛️ **Architect** | Arkitektur | Ved beslutninger | ADR-compliance, grenser |
| 🧪 **Tester** | Teststrategi | Etter implementasjon | Coverage, edge cases |
| 🧠 **Knowledge** | Kunnskapsbevaring | Alltid | MemPalace, patterns |

## Hurtigstart

```bash
# Sjekk en fil med swarm
npm run swarm:feature src/lib/trading/new-feature.ts

# Sjekk flere filer
npm run swarm:bugfix src/app/auth/callback.ts src/lib/auth/fix.ts

# Sjekk refaktorering
npm run swarm:refactor src/components/dashboard/*.tsx
```

## Arbeidsflyter

### Feature Development
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Analyzer   │───▶│  Architect  │───▶│   Tester    │───▶│  Knowledge  │
│  (kvalitet) │    │  (ADR/IA)   │    │  (coverage) │    │   (læring)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Bug Fix
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Analyzer   │───▶│   Tester    │───▶│  Knowledge  │
│  (root cause│    │  (regression)│   │  (error log)│
└─────────────┘    └─────────────┘    └─────────────┘
```

## Kvalitetsgater

Swarm håndhever automatisk:

| Gate | Krav | Hva skjer ved brudd |
|------|------|---------------------|
| **Complexity** | Max 15 CC | Warning |
| **File size** | Max 500 linjer | Warning |
| **Test coverage** | Min 80% | Block for P0 |
| **ADR compliance** | Må følge vedtatte ADR | Block |
| **Architecture** | Ingen grensebrudd | Block |

## Praktisk Bruk

### Før du starter
```bash
# 1. Aktiver swarm mode
export KIMI_SWARM=true

# 2. Start KIMI
kimi
```

### I KIMI-sesjon
```
> "Implementer ny trading-strategi"
  → Swarm analyzer: Sjekker kompleksitet
  → Swarm architect: Verifiserer ADR KLA-91
  → Swarm tester: Krever P0-test-dekning
  → Knowledge: Logger pattern

> "Fiks auth-bug"
  → Swarm analyzer: Sjekker root cause
  → Swarm tester: Krever regression test
  → Knowledge: Logger til errors/
```

### Etter endring
```bash
# Manuell swarm-sjekk
npm run swarm:check feature src/lib/trading/new-code.ts

# Resultat:
# ✅ Analyzer: proceed (complexity: 8)
# ✅ Architect: proceed (ADR compliant)
# ✅ Tester: proceed (P0 coverage OK)
# ✅ Knowledge: synced
#
# ✅ SWARM APPROVED
```

## Konfigurasjon

### Endre kvalitetsgater
Edit `.kimi/swarm-config.json`:
```json
{
  "quality_gates": {
    "min_test_coverage": 90,
    "max_complexity": 10,
    "max_file_lines": 400
  }
}
```

### Tilpass agenter
Edit agent-prompts i `.kimi/swarm/`:
- `analyzer.md` - Kodeanalyse
- `architect.md` - Arkitektur
- `tester.md` - Testing
- `knowledge.md` - Kunnskapsbevaring

## Sammenligning: Solo vs Swarm

| Aspekt | Solo KIMI | Swarm Mode |
|--------|-----------|------------|
| **Fokus** | En AI alt | Spesialiserte agenter |
| **Kvalitet** | Avhenger av prompt | Systematisk sjekk |
| **Dekning** | Hva AI husker | Alle 4 dimensjoner |
| **Konsistens** | Varierer | Standardisert |
| **Læring** | Session-basert | Permanent i MemPalace |
| **Hastighet** | Raskt | ~20% overhead |

## Swarm + MemPalace Synergi

```
Arbeid ──▶ Swarm ──▶ Knowledge Agent ──▶ MemPalace
              │                            │
              └──── Lærer fra ─────────────┘
```

1. **Knowledge Agent** logger hvert swarm-svar
2. **MemPalace** indekserer patterns
3. **Analyzer** sjekker mot historiske patterns
4. **Architect** bruker ADR fra MemPalace

## M1 Mac Optimalisering

Swarm er optimalisert for M1:
- **Parallel processing** med `Promise.all`
- **Fil-basert knowledge** (ikke ChromaDB)
- **Rust-baserte tools** der tilgjengelig
- **iTerm badges** viser swarm-status

## Best Practices

1. **Start med swarm for >50 linjers endringer**
2. **Hør på warnings** - de blir blocks neste gang
3. **Logg alltid** - Knowledge Agent skal alltid kjøre
4. **Revis swarm-config** månedlig
5. **Bruk riktig workflow** - feature/bugfix/refactor/security

## Troubleshooting

| Problem | Løsning |
|---------|---------|
| Swarm for tregt | Reduser antall filer per kjøring |
| For mange blocks | Sjekk `quality_gates` i config |
| Knowledge ikke synket | Kjør `npm run knowledge:sync` manuelt |
| iTerm badge viser ikke | Sjekk at `iterm-integration.sh` er sourcet |

## Roadmap

- [ ] **Observability Agent** - Sentry-integrasjon
- [ ] **Performance Agent** - Lighthouse/Bundle-analyse
- [ ] **Security Agent** - Automatisk sårbarhets-scan
- [ ] **i18n Agent** - Språk-paritet sjekk
- [ ] **Swarm Visualizer** - iTerm2 grafisk output

---

**Aktivert:** `export KIMI_SWARM=true`  
**Status:** Beta (M1-optimized)  
**Sist oppdatert:** 2026-04-08
