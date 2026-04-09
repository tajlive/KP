# ⚡ KIMI QUICKSTART (Les på 30 sekunder)

## 🚀 Ved Oppstart

```bash
# 1. Kjør autostart
.kimi/autostart.sh

# 2. Sjekk kontekst
.kimi/context-predictor.sh

# 3. Søk kunnskap
./scripts/knowledge-search.sh "<ditt emne>"
```

## 🧠 MemPalace Pattern

```bash
# FØR oppgave - søk
./scripts/knowledge-search.sh "auth"

# ETTER oppgave - logg  
./scripts/mempalace-diary.sh write FEAT "beskrivelse" GO "★★★" 5
```

## 🛠️ Auto-Skills (Aktiveres automatisk)

| Path | Skills |
|------|--------|
| `auth/` | vulnerability-scanner, security-testing |
| `trading/` | crypto-specialist, api-patterns |
| `api/` | api-patterns, rate-limiting |
| `components/` | frontend-design, nextjs-react-expert |
| `migrations/` | database-design |

## ⚡ Kjappe Kommandoer

```bash
kimi health       # Health check
kimi verify       # Verifiser miljø
kimi dev          # Start dev
kimi build        # Bygg
kimi test         # Kjør tester
kimi deploy       # Deploy prod
```

## ✅ ALLTID Husk

- **YOLO**: Implementer uten å spørre
- **Minimal**: Kun det som må til
- **Verifiser**: Sjekk før endring
- **GO/NO-GO**: Tydelig status

## 📚 MEMPALACE ROM

- `critical_decisions` - ADR-er (høy)
- `error_patterns` - Feil (høy)
- `auth_system` - Auth (høy)
- `tech_debt` - TYPE_DEBT (medium)
- `api_contracts` - API (medium)

---

**Full guide:** `.kimi/STARTUP_PROMPT.md`
